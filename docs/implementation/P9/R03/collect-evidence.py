"""Read completed R03 evidence; never execute providers or historical collectors."""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import csv
import json
import re
import subprocess

ROOT = Path.cwd()
OUT = ROOT / 'docs/implementation/P9/R03'
BASE = '27fee8408065b34ae7a8b798b06daa5636ddff98'
ENGINE = '99e00e13f8a39fa6730f3d3de773ac937b5ac915'
TAG = 'DEFERRED_OUT_OF_V1_BY_APPROVED_NCD_V1'


def git(*args, engine=False, raw=False):
    directory = ROOT.parent / 'next code' if engine else ROOT
    b = subprocess.check_output(['git', '-c', 'safe.directory='+directory.as_posix(), '-C', str(directory), *args], stderr=subprocess.DEVNULL)
    return b if raw else b.decode('utf-8').strip()


def digest(path):
    return sha256((ROOT/path).read_bytes()).hexdigest()


def load(path):
    b = (ROOT/path).read_bytes()
    return json.loads(b.decode('utf-16' if b.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'))


def save(name, value):
    (OUT/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def counts(records):
    result = dict(Counter(r['status'] for r in records))
    result.setdefault('FAIL', 0)
    return result


assert git('branch', '--show-current') == 'feature/p9-windows-integrated-acceptance'
assert git('rev-parse', 'HEAD', engine=True) == ENGINE
assert not git('status', '--porcelain', engine=True)
historical = []
paths = git('ls-tree', '-r', '--name-only', BASE, 'docs/implementation/P9', 'docs/engineering', 'docs/changes/proposed/CP-002-NCD-V1-DEEPSEEK-SCOPE.md', 'docs/implementation/P5/OWNER-ACCEPTANCE.md', 'docs/implementation/P5/IMPLEMENTATION-REPORT.md', 'docs/implementation/P7/OWNER-ACCEPTANCE.md', 'docs/implementation/P7/IMPLEMENTATION-REPORT.md').splitlines()
for path in paths:
    expected = sha256(git('show', BASE+':'+path, raw=True)).hexdigest()
    assert digest(path) == expected, path
    historical.append(dict(path=path, sha256=expected))
assert not git('diff', '--name-only', BASE, 'contracts', 'electron', 'bridge', 'renderer', 'package.json', 'package-lock.json')
assert '__r02AttachSupervisor' not in (ROOT/'out/main/index.js').read_text(encoding='utf-8')
raw_audits = {}
for folder in ['P9', 'P9/R01', 'P9/R02']:
    records = load('docs/implementation/'+folder+'/run-manifest.json')['rawArtifacts']
    mismatches = [dict(path=r['path'], expected=r['sha256'], observed=digest(r['path']) if (ROOT/r['path']).exists() else None)
                  for r in records if not (ROOT/r['path']).exists() or digest(r['path']) != r['sha256']]
    assert mismatches == (load('.cache/p9r01-historical-raw-audit.json') if folder == 'P9' else []), mismatches
    raw_audits[folder] = dict(checked=len(records), mismatches=mismatches)

catalog = {(r['file'], r['name']): dict(r, r03Origin='CARRIED_R01_OR_EARLIER') for r in load('docs/implementation/P9/R01/executable-results.json')}
for r in load('docs/implementation/P9/R02/executed-results.json'):
    catalog[r['file'], r['name']] = dict(r, r03Origin='CARRIED_R02')
executed = {}


def add(file, name, status, report, environment, duration=None):
    key = file, name
    old = catalog.get(key)
    row = dict(id=old['id'] if old else 'R03X%04d' % (1+sum(r['id'].startswith('R03X') for r in catalog.values())),
               file=file, name=name, status=status, evidence=report, evidenceSha256=digest(report),
               sourceSha256=digest(file), environment=environment, durationMs=duration,
               r03Origin='EXECUTED_R03', baselineStatus=old['status'] if old else None)
    catalog[key] = row
    executed[key] = row


for report in ['.cache/p9r03-scope-native-results-01.json', '.cache/p9r03-security-results-02.json', '.cache/p9r03-mount-results-01.json']:
    for suite in load(report)['testResults']:
        file = Path(suite['name']).resolve().relative_to(ROOT).as_posix()
        for case in suite['assertionResults']:
            if case['status'] in ['passed', 'failed']:
                status = 'PASS' if case['status'] == 'passed' else 'FAIL'
            elif 'R01-W02' in case['fullName'] or file.endswith('p9r03-mount.test.ts'):
                status = 'NOT_RUN'
            else:
                continue  # name-filtered: not an executed test
            add(file, case['fullName'], status, report, 'WINDOWS_UNIT_UI_NATIVE', case.get('duration'))


def visit(suite, report):
    for spec in suite.get('specs', []):
        for test in spec['tests']:
            result = test['results'][-1]
            add('tests/electron/'+spec['file'].replace('\\', '/').split('/')[-1], spec['title'],
                'PASS' if result['status'] == 'passed' else 'FAIL', report, 'ACTUAL_WINDOWS_ELECTRON', result['duration'])
    for child in suite.get('suites', []):
        visit(child, report)


for suite in load('.cache/p9r03-electron-results-03.json')['suites']:
    visit(suite, '.cache/p9r03-electron-results-03.json')
for r in load('.cache/p9r02-python-r03-01.json'):
    add('tests/python/'+r['name'].split('.')[0]+'.py', r['name'], r['status'], '.cache/p9r02-python-r03-01.json', 'PYTHON_ORIGINAL_GATEWAY_OFFLINE', r['durationMs'])
assert all(r['status'] != 'FAIL' for r in executed.values())
save('executed-results.json', list(executed.values()))

def evidence(pattern):
    matches = [dict(id=r['id'], name=r['name'], status=r['status'], evidence=r['evidence'], sha256=r['evidenceSha256'], origin=r['r03Origin'])
               for r in catalog.values() if re.search(pattern, r['name'])]
    assert matches, pattern
    return matches


variants = [
    ('I06-T03', 'Two genuine advertised production models', 'Stable IDs, unsupported/colliding labels and independent captured destination binding', r'R01-C02|R01_P01|R01_P04|P5-01'),
    ('I06-T04', 'Positive UI switching between two genuine available production models', 'Issued route immutable; unsupported preference rejected; future-only switching is fixture evidence', r'R01-C02|R01_P01|R01_P04|P5-01'),
    ('I06-T32', 'Positive second production provider and actual local-model capability', 'Exact project/provider/class grant, changed-class denial, revocation and wrong/unresolved destination rejection', r'grants exact scope|denies forged|R01-C02|P6-L02|R03-V02'),
    ('I07-T42', 'Actual local-model sensitive-file read', 'Sensitive-content denial for supported preview/discover/read/source handoff; native G6 remains separate', r'P6-B05|P6-B08|P6-B09|P6-B12'),
    ('E2E-05', 'Positive second production destination', 'Composite V1 discover/read, exact grant/revoke, captured handoff, unsupported destination rejection and honest crash partial', r'P6-B01|P6-B05|R03-V02|R01-C02|P6-E03|R01-C03'),
]
rows = list(csv.DictReader((ROOT/'docs/implementation/P9/R02/coverage-matrix.csv').open(encoding='utf-8')))
assert len(rows) == 304
ledger = []
for case, deferred, mandatory, pattern in variants:
    parent = next(r for r in rows if r['testId'] == case)
    refs = evidence(pattern)
    assert all(r['status'] == 'PASS' for r in refs), case
    # Recheck carried raw hashes as well; current scope is not missing evidence.
    for ref in refs:
        assert digest(ref['evidence']) == ref['sha256'], ref
    ledger.append(dict(testId=case, frozenParentClause=parent['frozenParentClause'], originalRequirement=parent['expectedResult'],
                       r02CaseVerdict=parent['status'], legacyWholeCaseVerdictRetained=parent['status'],
                       deferredVariant=dict(description=deferred, status='NOT_RUN', applicability=TAG),
                       mandatoryVariant=dict(description=mandatory, status='PASS', evidence=refs),
                       limits='Composite cited scope only; captured providers are not live/local inference. No G6 containment waiver.'))
save('APPLICABILITY-LEDGER.json', dict(authority='NCD-V1 v1.0 approved CP-002', historicalVerdictsUnchanged=True, variants=ledger))
for row in rows:
    row['r02Status'] = row['status']
    row['r02ObservedResult'] = row['observedResult']
    row['r03Applicability'] = 'UNCHANGED'
    row['r03Evidence'] = 'CARRIED_R02_OR_EARLIER'
    # Resolve unchanged paths from the preserved R02 matrix location.
    for key in ['evidence', 'r02Evidence']:
        row[key] = ';'.join('../R02/'+part if part and not part.startswith(('../', 'CARRIED', 'SEE_')) else part
                            for part in row[key].split(';'))
    if row['testId'] in [v[0] for v in variants]:
        row['r03Applicability'] = 'MANDATORY_SAFETY_PLUS_'+TAG
        row['r03Evidence'] = 'APPLICABILITY-LEDGER.json'
        row['observedResult'] = 'Prospective approved NCD-V1 applicability. Deferred positive variant NOT_RUN; mandatory variant PASS for exact cited evidence. Legacy whole-case verdict retained; no historical rewrite or G6 waiver.'
    elif row['testId'] in ['I06-T05', 'I06-T44']:
        row['status'] = 'PASS'
        row['r03Evidence'] = 'executed-results.json; evidence/v1-journey.json'
        row['evidence'] = 'executed-results.json'
        row['evidenceSha256'] = digest('docs/implementation/P9/R03/executed-results.json')
        row['outstandingFindings'] = ''
        row['observedResult'] = ('R03-V01 explicit unknown availability in actual React App with mocked input transport: selection/send disabled, no mutation; not provider probing proof.'
                                  if row['testId'] == 'I06-T05' else
                                  'R03-V02 actual Windows Electron Main/Python/original Gateway: multi-turn memory, denied read, exact grant and captured handoff, revoke denial, captured HTTP401 without retry (unknown retained), real destroyed source pipe; task/event admissions remain0. Existing explicit offline Coding success retained separately; no external receipt/paid request claimed.')
    elif row['testId'] == 'I08-T87':
        row['r03Evidence'] = 'P2-EXCEPTION.md;run-manifest.json:historicalRawAudits'
        row['observedResult'] = 'Owner accepted limited P2 documentary exception. Historical original secondary diagnostic remains unavailable; original/current hashes and primary evidence retained. ACCEPTED_EXCEPTION disposition is separate from INCONCLUSIVE full raw-retention proof; no lost-test PASS or G6/P0/P1 waiver.'
    elif row['testId'] == 'I08-T85':
        row['r03Evidence'] = 'APPLICABILITY-LEDGER.json;coverage-matrix.csv;run-manifest.json:inventoryAudit'
        row['observedResult'] = 'All304 original IDs/requirements retained; original case inventory and I06-T36 wording checked, approved five capability-variant annotations added without PASS for deferred variants. Current status audit only, not full acceptance.'
fields = list(rows[0])
with (OUT/'coverage-matrix.csv').open('w', encoding='utf-8', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
inventory = {}
for n, prefix, total in [(5, 'E05-', 36), (6, 'I06-T', 52), (7, 'I07-T', 56), (8, 'I08-T', 88)]:
    p = next((ROOT/'docs/engineering/01-normative').glob('*IIS-0'+str(n)+'-*'))
    wanted = {prefix+str(i).zfill(2) for i in range(1, total+1)}
    assert {r['testId'] for r in rows if r['testId'].startswith(prefix)} == wanted
    assert wanted <= set(re.findall(re.escape(prefix)+r'\d{2}', p.read_text(encoding='utf-8')))
    inventory[prefix] = dict(required=total, mapped=total, sourceSha256=sha256(p.read_bytes()).hexdigest())
assert 'does not expose a same-turn manual retry' in next(r['expectedResult'] for r in rows if r['testId'] == 'I06-T36')
baseline_rows = list(csv.DictReader((ROOT/'docs/implementation/P9/R02/coverage-matrix.csv').open(encoding='utf-8')))
assert [(r['testId'], r['expectedResult'], r['frozenParentClause']) for r in rows] == [(r['testId'], r['expectedResult'], r['frozenParentClause']) for r in baseline_rows]

budgets = {p:digest(p) for p in ['.cache/p5-live-budget.json', '.cache/p7-final-live-budget.json']}
assert list(budgets.values()) == ['edd0244f1ad016c2aa77c75deacb8e07bbd30815e7299a0e0921f6841c1de200', '06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e']
desktop = [r for r in catalog.values() if not r['environment'].startswith('ACTUAL_ENGINE_')]
engine = [r for r in catalog.values() if r['environment'].startswith('ACTUAL_ENGINE_')]
# Python Desktop tests are distinct from original Engine regression identities.
assert len(engine) == 72, Counter(r['environment'] for r in catalog.values())
result = dict(baseline=BASE, clientDate='2026-11-11', currentDesktop=counts(desktop), engineCarried=counts(engine),
              executedR03=counts(executed.values()), newCases=counts(r for r in executed.values() if r['id'].startswith('R03X')),
              normative={p:counts(r for r in rows if r['testId'].startswith(p)) for p in ['I08-', 'E05-', 'I06-', 'I07-', 'E2E-']},
              scope='CP-002 APPROVED AND PROSPECTIVELY RATIFIED; deferred variants NOT_RUN with approved applicability tag',
              g3='PASS for ratified V1 supported-route scope using cited actual/captured/current and hash-verified carried evidence; not G6 or full P9',
              p2Exception='ACCEPTED_EXCEPTION; I08-T87 INCONCLUSIVE retention evidence remains',
              humanSignoff='NOT_SIGNED_OFF', nativeSetup='Two actual Windows1314 results; native mount guard NOT_RUN',
              sessionEnd='Logoff/shutdown NOT_RUN, manual authorized VM procedure prepared',
              checks=dict(build='PASS run03', typescript='PASS run03', format='PASS run03', python='38 PASS', frozen='PASS working/archive; staged and HEAD publication evidence in COMMIT-RECEIPT.md'),
              conclusion='NO-GO full P9; P9-R03 OWNER REVIEW',
              limits='Cumulative counts include carried results. Current per-case identities in executed-results only. Earlier failing attempts are preserved, not erased by final PASS.')
save('VERIFICATION-RESULTS.json', result)
(OUT/'evidence').mkdir(exist_ok=True)
save('evidence/v1-journey.json', load('.cache/p9r03-v1-journey-03.json'))
save('evidence/native.json', load('.cache/p9r01-native-r03-native-01.json'))
save('evidence/qa-preflight.json', load('.cache/p9r03-qa-preflight-01.json'))
raw_paths = sorted(p for p in (ROOT/'.cache').glob('p9r03-*') if p.is_file() and p.suffix in ['.json', '.txt', '.zip'] and '-collection-' not in p.name)
raw_paths += [ROOT/p for p in ['.cache/p9r02-python-r03-01.json', '.cache/p9r02-python-r03-01.txt', '.cache/p9r01-native-r03-native-01.json']]
save('run-manifest.json', dict(runId='P9-R03-2026-11-11', desktopBaseline=BASE, engineCommit=ENGINE,
     branch='feature/p9-windows-integrated-acceptance', timestampPolicy='Client completion date; original host/runner timestamps retained verbatim.',
     historicalTrackedAudit=historical, historicalRawAudits=raw_audits, inventoryAudit=inventory,
     paidBudgetHashesUnchanged=budgets, inheritedG3RouteEvidence=['docs/implementation/P5/OWNER-ACCEPTANCE.md', 'docs/implementation/P5/IMPLEMENTATION-REPORT.md', 'docs/implementation/P7/OWNER-ACCEPTANCE.md', 'docs/implementation/P7/IMPLEMENTATION-REPORT.md'],
     rawArtifacts=[dict(path=p.relative_to(ROOT).as_posix(), sha256=sha256(p.read_bytes()).hexdigest(), bytes=p.stat().st_size) for p in raw_paths],
     approvedAddendaManifest=dict(path='docs/engineering/SHA256-APPROVED-ADDENDA-R03-MANIFEST.json', sha256=digest('docs/engineering/SHA256-APPROVED-ADDENDA-R03-MANIFEST.json')),
     unchangedProductEnvelope='contracts/electron/bridge/renderer/package files identical to27fee; no public API/JSONL/schema/Engine/dependency change; test adapters excluded from product bundle',
     runs=dict(vitest13plus8='21 PASS +2 actual unavailable native symlink attempts; name-filtered skips excluded', mount='NOT_RUN explicit QA authorization absent', electron='1 PASS final run03; earlier run02 assertion FAIL preserved', python='38 PASS offline', build='run01 TS unused import FAIL; run02/run03 PASS', formatting='run02/run03 PASS'),
     commands=[
         "NCD_R01_RUN_ID=r03-native-01 npx vitest run tests/ui/p9r03-scope.test.tsx tests/unit/discussion.test.ts tests/unit/p9r01-consent.test.ts tests/unit/broker-service.test.ts tests/unit/broker-limits.test.ts tests/unit/p9r01-windows.test.ts --testNamePattern 'R03-V01|P5-01|R01-C02|P6-B01|P6-B04|P6-B05|P6-B08|P6-B09|P6-B12|P6-B13|P6-L01|P6-L02|R01-W01|R01-W02' --reporter=json --outputFile=.cache/p9r03-scope-native-results-01.json",
         "NCD_P9_RUN_ID=r03-security-02 npx vitest run tests/unit/storage.test.ts tests/unit/broker-windows.test.ts --testNamePattern 'grants exact scope|denies forged|P6-W04|P6-W05|P6-W07|P6-W09|P6-W11|P6-W12' --reporter=json --outputFile=.cache/p9r03-security-results-02.json",
         'npx vitest run tests/unit/p9r03-mount.test.ts --reporter=json --outputFile=.cache/p9r03-mount-results-01.json',
         'NCD_R03_RUN_ID=03 npx playwright test tests/electron/p9r03-scope.spec.ts',
         'python -X utf8 docs/implementation/P9/R02/run-python.py r03-01',
         'npm run build; npm run format:check (separate recorded attempts; final03 PASS)',
         'python -X utf8 docs/implementation/P0/verify_delivery.py --git-ref : --archive <original-local-delivery-zip> (publication receipt)',
         'git fsck --no-reflogs; git ls-remote origin <authorized-branch-and-main> (read-only)',
         'python -X utf8 docs/implementation/P9/R03/collect-evidence.py'],
     corrections=['Removed unused test import after real TypeScript failure.', 'Captured HTTP401 yields conservative unknown, not guaranteed failed; corrected test expectation, no product change.'],
     reproduction='See WINDOWS-QA.md, test source and raw reports. Use unique run IDs; never historical collectors/fixed raw paths, paid commands or host session-end.'))
print(json.dumps(result, indent=2))
