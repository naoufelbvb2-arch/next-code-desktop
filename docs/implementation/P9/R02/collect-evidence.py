"""Collect completed R02 runs, never execute tests/providers or prior collectors.

Run from repository root. Historical P9/R01 bytes and recorded raw hashes are
checked before writing only R02 outputs. Executed identities plus a hash-pinned
R01 catalog define current totals; no all-suite fresh-run claim.
"""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import csv
import json
import re
import subprocess

ROOT = Path.cwd()
OUT = ROOT / 'docs/implementation/P9/R02'
BASE = 'c49de4af558d72f88e8593e66da4f6d63f889b9e'
ENGINE = '99e00e13f8a39fa6730f3d3de773ac937b5ac915'


def git(*args, engine=False, raw=False):
    directory = ROOT.parent / 'next code' if engine else ROOT
    b = subprocess.check_output(['git', '-c', 'safe.directory='+directory.as_posix(), '-C', str(directory), *args], stderr=subprocess.DEVNULL)
    return b if raw else b.decode('utf-8').strip()


def load(path):
    b = (ROOT/path).read_bytes()
    return json.loads(b.decode('utf-16' if b.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'))


def digest(path):
    return sha256((ROOT/path).read_bytes()).hexdigest()


def save(name, data):
    p = OUT/name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def counts(rows):
    c = dict(Counter(r['status'] for r in rows))
    c.setdefault('FAIL', 0)
    return c


assert git('branch', '--show-current') == 'feature/p9-windows-integrated-acceptance'
assert git('rev-parse', 'HEAD', engine=True) == ENGINE
assert not git('status', '--porcelain', engine=True)
historical = []
for path in git('ls-tree', '-r', '--name-only', BASE, 'docs/implementation/P9').splitlines():
    original = sha256(git('show', BASE+':'+path, raw=True)).hexdigest()
    assert digest(path) == original, path
    historical.append(dict(path=path, sha256=original))
raw_audits = {}
for folder in ['P9', 'P9/R01']:
    raw = load('docs/implementation/'+folder+'/run-manifest.json')['rawArtifacts']
    mismatches = [dict(path=r['path'], expected=r['sha256'], observed=digest(r['path']) if (ROOT/r['path']).exists() else None)
                  for r in raw if not (ROOT/r['path']).exists() or digest(r['path']) != r['sha256']]
    assert mismatches == (load('.cache/p9r01-historical-raw-audit.json') if folder == 'P9' else []), mismatches
    raw_audits[folder] = dict(checked=len(raw), mismatches=mismatches)

baseline = load('docs/implementation/P9/R01/executable-results.json')
catalog = {(r['file'],r['name']): dict(r, r02Origin='CARRIED_R01_OR_EARLIER') for r in baseline}
baseline_status = {(r['file'],r['name']): r['status'] for r in baseline}
executed = {}


def add(environment, file, name, status, report, duration=None):
    key = file, name
    old = catalog.get(key)
    row = dict(id=old['id'] if old else 'R02X%04d' % (1+sum(x['id'].startswith('R02X') for x in catalog.values())),
               environment=environment, file=file, name=name, status=status, evidence=report,
               evidenceSha256=digest(report), durationMs=duration,
               sourceSha256=digest(file), sourceHashBasis='Reviewed final source at collection, not a captured source snapshot for every earlier retry',
               r02Origin='EXECUTED_R02', baselineStatus=baseline_status.get(key))
    catalog[key] = row
    executed[key] = row


for report in ['.cache/p9r02-affected-unit-results-01.json', '.cache/p9r02-lifecycle-results-02.json',
               '.cache/p9r02-supervisor-regression-02.json', '.cache/p9r02-security-regression-02.json',
               '.cache/p9r02-native-results-01.json']:
    for suite in load(report)['testResults']:
        file = Path(suite['name']).resolve().relative_to(ROOT).as_posix()
        for case in suite['assertionResults']:
            if case['status'] != 'passed' and case['status'] != 'failed':
                if report.endswith('native-results-01.json') and 'R01-W02' in case['fullName']:
                    status = 'NOT_RUN'  # actual setup attempted, Windows1314
                else:
                    continue  # name-filtered, never ran
            else:
                status = 'PASS' if case['status']=='passed' else 'FAIL'
            add('WINDOWS_UNIT_UI_NATIVE', file, case['fullName'], status, report, case.get('duration'))


def visit(suite, report):
    for spec in suite.get('specs', []):
        for test in spec['tests']:
            r = test['results'][-1]
            add('ACTUAL_WINDOWS_ELECTRON','tests/electron/'+spec['file'].replace('\\','/').split('/')[-1],
                spec['title'],'PASS' if r['status']=='passed' else 'FAIL',
                report,r['duration'])
    for child in suite.get('suites', []):
        visit(child, report)


for report in ['.cache/p9r02-electron-results-05.json', '.cache/p9r02-window-close-results-07.json', '.cache/p9r02-window-regression-results-08.json']:
    for suite in load(report)['suites']:
        visit(suite, report)
for r in load('.cache/p9r02-python-01.json'):
    add('PYTHON_ORIGINAL_GATEWAY_OFFLINE','tests/python/'+r['name'].split('.')[0]+'.py',
        r['name'],r['status'],'.cache/p9r02-python-01.json',r['durationMs'])
assert all(r['status']!='FAIL' for r in catalog.values())
save('executed-results.json',list(executed.values()))

rows = list(csv.DictReader((ROOT/'docs/implementation/P9/R01/coverage-matrix.csv').open(encoding='utf-8')))
inventory = {}
for n,prefix,total in [(5,'E05-',36),(6,'I06-T',52),(7,'I07-T',56),(8,'I08-T',88)]:
    path = next((ROOT/'docs/engineering/01-normative').glob('*IIS-0'+str(n)+'-*'))
    wanted = {prefix+str(i).zfill(2) for i in range(1,total+1)}
    assert {r['testId'] for r in rows if r['testId'].startswith(prefix)} == wanted
    assert wanted <= set(re.findall(re.escape(prefix)+r'\d{2}',path.read_text(encoding='utf-8')))
    inventory[prefix] = dict(required=total, mapped=total, sourceSha256=sha256(path.read_bytes()).hexdigest())
assert 'does not expose a same-turn manual retry' in next(r['expectedResult'] for r in rows if r['testId']=='I06-T36')
assert len(rows)==304
for r in rows:
    r['r01Status'] = r['status']
    r['r01ObservedResult'] = r['observedResult']
    r['r01Evidence'] = r['evidence']
    if r['evidence'] in ['executable-results.json','run-manifest.json']:
        r['evidence'] = '../R01/'+r['evidence']
    r['r02ScopeClassification'] = 'UNCHANGED'
    r['r02Evidence'] = 'CARRIED_R01_OR_EARLIER'
    r['r02ExecutableTests'] = ''
    if r['testId']=='I08-T71':
        r['status']='PASS'
        r['observedResult']='R02-H01 actual Windows,40k explicitly synthetic rows in separate SQLite,30k new commits over33.970s,35 navigation cycles/12 reloads; real AgentOS task separately yields4 worker starts/3 reports. Actual cancel at writer batch77/150 while commits continue,309.541ms visible cancellation,lease0,verified_cancelled. Every observed replay page40 rows or fewer; visible timeline<=100, separate unit128hint/400cache/4page bounds pass. Bounded measured volume/rate, not infinite guarantee or proof synthetic records came from Engine.'
        r['outstandingFindings']=''
        r['r02Evidence']='executed-results.json;evidence/high-rate.json'
        r['evidence']='executed-results.json'
        r['evidenceSha256']=digest('docs/implementation/P9/R02/executed-results.json')
        r['r02ExecutableTests']='; '.join(c['id']+': '+c['name'] for c in executed.values() if c['name'].startswith('R02-H01'))
    elif r['testId']=='I08-T85':
        r['status']='PASS'
        r['observedResult']='R02 inventory audit: all304 baseline rows preserve exact wording/IDs; 88I08/36E05/52I06/56I07 verified against frozen catalogs, authoritative I06-T36 no same-turn retry preserved. All remaining verdicts and proposed/non-adopted scope conflicts visible. This is inventory compliance, not execution PASS for remaining cases or G9 acceptance.'
        r['outstandingFindings']=''
        r['r02Evidence']='run-manifest.json:inventoryAudit;coverage-matrix.csv'
        r['evidence']='run-manifest.json'
        r['evidenceSha256']='SEE_RUN_MANIFEST_INVENTORY_AUDIT'
    elif r['testId'] in ['I08-T75','IIS03:§14 REISSUE:App exit']:
        r['observedResult']='R02 actual original before-quit/application/supervisor code, test-only owned supervisor binding and automated native dialog choice: Wait leaves task running; confirm cooperatively commits cancel and releases lease after native workspace verification; forced15s path empties retained Job,signals held Coding/descendant handles,warns and keeps lease/needs_reconciliation. T3.cleanup failure and queued-admission shutdown negatives pass. Actual OS logoff/system shutdown still NOT_RUN; no global session action authorized. Full row remains INCONCLUSIVE.'
        r['r02Evidence']='executed-results.json;evidence/quit-worker.json;evidence/quit-stubborn.json'
        r['r02ExecutableTests']='; '.join(c['id']+': '+c['name'] for c in executed.values() if c['name'].startswith('R02-Q'))
    elif r['testId']=='I08-T87':
        r['observedResult']='All historical tracked P9/R01 bytes and R01 raw artifacts rechecked. The one known earlier secondary raw diagnostic loss persists with original/observed hashes; no reconstructed original or waiver. Documentary P2 exception proposed for owner disposition, I08-T87 remains INCONCLUSIVE.'
        r['r02Evidence']='run-manifest.json:historicalRawAudits;WINDOWS-AND-RETENTION.md'
    if r['testId'] in ['I06-T03','I06-T32','I07-T42','E2E-05']:
        r['r02ScopeClassification']='CONTRACT_CONFLICT — CP-002 PROPOSED NOT ADOPTED; status unchanged'
    elif r['testId']=='I06-T04':
        r['r02ScopeClassification']='CORE_INVARIANT_MANDATORY; unavailable positive two-model UI variant proposed only; status unchanged'
fields=list(rows[0])
with (OUT/'coverage-matrix.csv').open('w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');writer.writeheader();writer.writerows(rows)

for name,source in [('quit-worker','p9r02-quit-worker-07'),('quit-stubborn','p9r02-quit-stubborn-05'),
                    ('high-rate','p9r02-high-rate-05'),('native','p9r01-native-r02-native-01')]:
    save('evidence/'+name+'.json',load('.cache/'+source+'.json'))
(OUT/'evidence/mission.png').write_bytes((ROOT/'.cache/p9r02-mission-05.png').read_bytes())
high=load('.cache/p9r02-high-rate-05.json')
summary={k:high[k] for k in ['committedRows','measuredWriterMs','cycles','reloads','cancellationLatencyMs','cancellationAtBatch','cancelledWhileWriterActive','cleanupState','leases','integrity']}
summary.update(newRowsPerSecond=30000/(high['measuredWriterMs']/1000),
               actualWorkerStarts=high['finalActualEventNames'].count('worker.started'),
               actualWorkerReports=high['finalActualEventNames'].count('worker.completed'),
               actualEvents=len(high['finalActualEventNames']),
               maxMainRSSBytes=max(s['metrics']['memory']['rss'] for s in high['samples']),
               maxRendererHeapBytes=max(s['renderer']['heap'] for s in high['samples']),
               maxMainRoundTripMs=max(s['mainRoundTripMs'] for s in high['samples']),
               maxRendererFrameMs=max(s['renderer']['frameMs'] for s in high['samples']),
               limit='Point samples, not continuous peak bounds or a new SLA. Synthetic SQL history is isolated from actual AgentOS ledger; not Engine wire throughput.')
save('evidence/high-rate-summary.json',summary)

all_cases=list(catalog.values())
desktop=[r for r in all_cases if r['environment']!='ACTUAL_ENGINE_OFFLINE_WINDOWS']
engine=[r for r in all_cases if r['environment']=='ACTUAL_ENGINE_OFFLINE_WINDOWS']
assert counts(desktop)=={'PASS':552,'NOT_RUN':5,'FAIL':0}
save('VERIFICATION-RESULTS.json',dict(baseline=BASE,clientDate='2026-11-10',
    baselineCatalog=dict(path='../R01/executable-results.json',sha256=digest('docs/implementation/P9/R01/executable-results.json')),
    currentDesktop=counts(desktop),engineCarried=counts(engine),executedR02=counts(executed.values()),
    newCases=counts([r for r in executed.values() if r['id'].startswith('R02X')]),
    normative={p:counts([r for r in rows if r['testId'].startswith(p)]) for p in ['I08-','E05-','I06-','I07-','E2E-']},
    intentionalQuit='PASS tested wait/cooperative/forced/unknown/COMMIT-fault/queued scope; OS logoff/system shutdown NOT_RUN',
    highRate='PASS bounded measured case, synthetic SQLite volume plus separate genuine AgentOS evidence',
    scopeProposal='CP-002 PROPOSED NOT ADOPTED; no capability status automatically changed',
    humanSignoff='NOT_SIGNED_OFF',checks=dict(build='PASS',typescript='PASS',format='PASS',python='38 PASS',frozen='PASS',engineUnchanged=True,publicContractsSchemaDependenciesUnchanged=True),
    conclusion='NO-GO full P9; stop at P9-R02 FINAL OWNER REVIEW',
    note='Current cumulative identity merge; only executed-results identities freshly run. Engine69/3paid carried. Earlier failing runs retained separately; no fresh paid call.'))

raw_paths=sorted(p for p in (ROOT/'.cache').glob('p9r02-*') if p.is_file())
raw_paths.append(ROOT/'.cache/p9r01-native-r02-native-01.json')
raw_records=[dict(path=p.relative_to(ROOT).as_posix(),sha256=sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size) for p in raw_paths]
runs=[]
for p in raw_paths:
    if p.suffix!='.json':continue
    d=load(p.relative_to(ROOT))
    if isinstance(d,dict) and 'numTotalTests' in d:
        runs.append(dict(path=p.relative_to(ROOT).as_posix(),runner='vitest',passed=d['numPassedTests'],failed=d['numFailedTests'],skippedIncludingFiltered=d['numPendingTests']))
    elif isinstance(d,dict) and 'suites' in d and 'stats' in d:
        runs.append(dict(path=p.relative_to(ROOT).as_posix(),runner='playwright',stats=d['stats']))
budgets={p:digest(p) for p in ['.cache/p5-live-budget.json','.cache/p7-final-live-budget.json']}
assert budgets['.cache/p5-live-budget.json']=='edd0244f1ad016c2aa77c75deacb8e07bbd30815e7299a0e0921f6841c1de200'
assert budgets['.cache/p7-final-live-budget.json']=='06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e'
assert not git('diff','--name-only',BASE,'contracts','bridge','electron/main/storage/schema.ts','package.json','package-lock.json','docs/engineering')
assert '__r02AttachSupervisor' not in (ROOT/'out/main/index.js').read_text(encoding='utf-8')
save('run-manifest.json',dict(runId='P9-R02-2026-11-10',desktopBaseline=BASE,engineCommit=ENGINE,
    branch='feature/p9-windows-integrated-acceptance',clientDate='2026-11-10',
    timestampPolicy='Client completion date here; raw runner UTC/host timestamps retained verbatim, not silently normalized.',
    environment=load('.cache/p9r02-environment.json'),
    environmentBasis='Current Node/Python/Windows version and installed pinned package versions newly read; native privileges newly measured, no dependency/global changes.',
    historicalTrackedAudit=historical,historicalRawAudits=raw_audits,paidBudgetHashesUnchanged=budgets,
    inventoryAudit=inventory,rawArtifacts=raw_records,runs=runs,metrics=summary,
    mainRefs=dict(desktop='af682b74375a0b5827aa1fca0ff0815434803650',engine='834d0ca62cc9b2c03e530bafe4090024d98f31d3'),
    proofLimits=['Existing before-quit handler and application.ts lifecycle source used; index.ts adds tested native window-close guard. Isolated esbuild adds only owned-supervisor binding into test Main global. Production build has no hook. Native dialog choice automated, no human/native dialog rendering signoff.',
                 'QUERY-only duplicate Job handle kept in observer across app exit. It extends Job handle lifetime; empty Job and signaled processes proved before closing that observer handle. No reliance on last-handle-close cleanup.',
                 'Synthetic stress worker inserts typed rows in its own SQLite database/transaction. It is not T4/Engine emission evidence. Real task ledger is separate,4actual starts/3reports/10events in final pressure run.',
                 'Actual OS logoff/system shutdown not invoked on owner host; conservative forced Main/recovery evidence retained, not renamed logoff proof.'],
    corrections=['Run01 fixture accidentally supplied a fourth argument to installCoding; fixed and typed before meaningful lifecycle proof.',
                 'Quit run02 exposed production Main exit before native workspace verification/T3 lease finalization. Narrow begin-quit/drain callbacks, stable owned-child reference and unresolved-warning return fix it; no relaxed assertion or forced lease release.',
                 'Initial fault fixture targeted T3 instead of actual T3.cleanup; corrected operation makes real rollback observable,final R02-QF01 passes with blocked lease/unverified.',
                 'High-rate run03 failed UI cancellation update because test IPC takeover still published real hints to retired boundary. Fixed test-only boundary ownership; run04 passes,run05 additionally proves cancellation while synthetic writer is still active.',
                 'Native window-close run06 proved Wait kept task alive but destroyed its usable window. index.ts now confirms through the existing quit handler before destroying a window with active Coding. Run07 retains window/task, then confirms cancellation/recovery; three original startup/isolation/navigation regressions pass in run08.'],
    commands=['NCD_R02_RUN_ID=05 npx playwright test tests/electron/p9r02-acceptance.spec.ts',
              'NCD_R02_RUN_ID=07 npx playwright test tests/electron/p9r02-acceptance.spec.ts --grep R02-Q-worker',
              "npx playwright test tests/electron/desktop.spec.ts --grep 'P1-WIN|P1-SEC|P1-NAV'",
              'npx vitest run tests/unit/p9r02-lifecycle.test.ts tests/unit/mission-replay.test.ts tests/unit/mission-ingestion.test.ts tests/unit/discussion.test.ts --reporter=json --outputFile=<uniqueR02> (initial fault retargeted in lifecycle run02)',
              'npx vitest run tests/unit/p9r02-lifecycle.test.ts --reporter=json --outputFile=.cache/p9r02-lifecycle-results-02.json',
              "npx vitest run tests/unit/supervisor.test.ts tests/unit/coding-integration.test.ts --testNamePattern 'P4-|P7-E01|P7-E03-worker|P7-E05|P7-E06|P7-E07' --reporter=json --outputFile=.cache/p9r02-supervisor-regression-02.json",
              "NCD_P9_RUN_ID=r02-security-02 npx vitest run tests/unit/broker-windows.test.ts --testNamePattern 'P6-W04|P6-W05|P6-W07|P6-W09|P6-W11|P6-W12' --reporter=json --outputFile=.cache/p9r02-security-regression-02.json",
              "NCD_R01_RUN_ID=r02-native-01 npx vitest run tests/unit/p9r01-windows.test.ts --testNamePattern 'R01-W01|R01-W02' --reporter=json --outputFile=.cache/p9r02-native-results-01.json",
              'python -X utf8 docs/implementation/P9/R02/run-python.py 01',
              'npm run build','npm run format:check','python -X utf8 docs/implementation/P0/verify_delivery.py --git-ref HEAD --archive <original-local-delivery-zip>',
              'python -X utf8 docs/implementation/P9/R02/collect-evidence.py'],
    reproduction='Fresh NCD_R02_RUN_ID and Python runner ID required for every repeat. Preserve raw copies outside Playwright test-results before the next run. Never run historical collectors/fixed-name R01 specs. No test:live or real user project. No OS logoff/global/elevation action.'))

paths=sorted(set(git('diff','--name-only',BASE).splitlines()+git('ls-files','--others','--exclude-standard').splitlines()))
existing=set(git('ls-tree','-r','--name-only',BASE).splitlines())
exclude={'docs/implementation/P9/R02/CHANGE-MANIFEST.json','docs/implementation/P9/R02/COMMIT-RECEIPT.md'}
save('CHANGE-MANIFEST.json',dict(baseline=BASE,exclusion='This manifest and later receipt excluded to avoid self-reference.',
    files=[dict(path=p,action='MODIFIED' if p in existing else 'NEW',sha256=digest(p),bytes=(ROOT/p).stat().st_size) for p in paths if p not in exclude]))
print(json.dumps(dict(currentDesktop=counts(desktop),executedR02=counts(executed.values()),newCases=counts([r for r in executed.values() if r['id'].startswith('R02X')]),
                     i08=counts([r for r in rows if r['testId'].startswith('I08-')]),historicalFiles=len(historical)),indent=2))
