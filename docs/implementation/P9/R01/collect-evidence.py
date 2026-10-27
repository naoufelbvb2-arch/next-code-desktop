"""Collect completed R01 reports only. No tests/provider calls/ledger writes.

Run from the repository root. Historical P9 files are immutable inputs. Raw test
reports remain local; publish exact identities, hashes and reviewed safe metrics.
Filtered-out tests never replace an executed result. Counts are unique identities,
not the sum of retries. New and carried evidence stay distinguishable.
"""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import csv
import json
import subprocess

ROOT = Path.cwd()
OLD = ROOT / 'docs/implementation/P9'
OUT = OLD / 'R01'
BASE = 'b4ae63cd34d8d3c84dae68b5697ea53bccf515f4'
ENGINE = '99e00e13f8a39fa6730f3d3de773ac937b5ac915'


def load(path):
    raw = (ROOT / path).read_bytes()
    return json.loads(raw.decode('utf-16' if raw.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'))


def digest(path):
    return sha256((ROOT / path).read_bytes()).hexdigest()


def save(name, value):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def git(*args, engine=False, raw=False):
    directory = ROOT.parent / 'next code' if engine else ROOT
    data = subprocess.check_output(['git', '-c', f'safe.directory={directory.as_posix()}',
                                    '-C', str(directory), *args], stderr=subprocess.DEVNULL)
    return data if raw else data.decode('utf-8').strip()


assert git('branch', '--show-current') == 'feature/p9-windows-integrated-acceptance'
assert git('rev-parse', 'HEAD', engine=True) == ENGINE
assert not git('status', '--porcelain', engine=True)
# Compare actual bytes with each historical Git blob, including reports/matrices.
historical = []
for path in git('ls-tree', '-r', '--name-only', BASE, 'docs/implementation/P9').splitlines():
    expected = sha256(git('show', BASE + ':' + path, raw=True)).hexdigest()
    assert digest(path) == expected, path
    historical.append(dict(path=path, sha256=expected))

baseline = load('docs/implementation/P9/executable-results.json')
catalog = {(c['file'], c['name']): dict(c, evidenceOrigin='CARRIED_P9') for c in baseline}


def add(environment, file, name, status, artifact, duration=None):
    key = file, name
    existing = catalog.get(key)
    catalog[key] = dict(id=existing['id'] if existing else 'R%04d' % (1 + sum(c['id'].startswith('R') for c in catalog.values())),
                        environment=environment, file=file, name=name, status=status,
                        evidence=artifact, evidenceSha256=digest(artifact), durationMs=duration,
                        sourceSha256=digest(file) if (ROOT / file).is_file() else None,
                        sourceHashBasis='REVIEWED_FINAL_FILE_AT_COLLECTION; not a captured per-run source snapshot',
                        evidenceOrigin='EXECUTED_R01', baselineStatus=existing.get('baselineStatus', existing['status']) if existing else None)


# The fourth native run includes an unfixed consent failure. Only its native file
# is final; the later full broker/consent run supersedes the consent identities.
unit_runs = [
    ('.cache/p9r01-native-results-01.json', lambda f: 'p9r01-' not in f),
    ('.cache/p9r01-native-consent-results-04.json', lambda f: f.endswith('p9r01-windows.test.ts')),
    ('.cache/p9r01-consent-broker-results-06.json', lambda f: True),
    ('.cache/p9r01-affected-unit-07.json', lambda f: True),
]
for path, include in unit_runs:
    for suite in load(path)['testResults']:
        file = Path(suite['name']).resolve().relative_to(ROOT).as_posix()
        if not include(file):
            continue
        for case in suite['assertionResults']:
            # Native full-file runs attempted setup, then skipped on1314.
            # Only the affected unit run uses a name filter; its skipped cases
            # were not executed and cannot supersede prior actual results.
            if case['status'] in ('pending', 'skipped', 'todo') and path.endswith('affected-unit-07.json'):
                continue
            add('WINDOWS_UNIT_UI_NATIVE', file, case['fullName'],
                'PASS' if case['status'] == 'passed' else 'NOT_RUN' if case['status'] in ('pending', 'skipped', 'todo') else 'FAIL',
                path, case.get('duration'))


def electron_cases(suite):
    for spec in suite.get('specs', []):
        for test in spec['tests']:
            result = test['results'][-1]
            if result['status'] == 'skipped':
                continue
            yield 'tests/electron/' + spec['file'].replace('\\', '/').split('/')[-1], spec['title'], result
    for child in suite.get('suites', []):
        yield from electron_cases(child)


for path in [
    '.cache/p9r01-soak-results-03.json', '.cache/p9r01-discussion-results-01.json',
    '.cache/p9r01-faults-results-01.json', '.cache/p9r01-topology-results-03.json',
    '.cache/p9r01-pipe-results-01.json', '.cache/p9r01-affected-electron-results-04.json',
]:
    for suite in load(path)['suites']:
        for file, name, result in electron_cases(suite):
            add('ACTUAL_WINDOWS_ELECTRON', file, name,
                'PASS' if result['status'] == 'passed' else 'FAIL', path, result['duration'])
for case in load('.cache/p9r01-python-results-01.json'):
    add('PYTHON_ORIGINAL_GATEWAY_OFFLINE', 'tests/python/' + case['name'].split('.')[0] + '.py',
        case['name'], case['status'], '.cache/p9r01-python-results-01.json', case['durationMs'])

entries = list(catalog.values())
assert not [c for c in entries if c['status'] == 'FAIL']
save('executable-results.json', entries)


def select(*patterns):
    found = [c for c in entries if any(p.replace('-', '_') in c['name'].replace('-', '_') for p in patterns)]
    assert found, patterns
    assert all(c['status'] == 'PASS' for c in found), patterns
    return found


# These dispositions address the literal row wording; alternate real-provider,
# high-rate, native-privilege, human and intentional-quit claims remain open.
updates = {}


def change(ids, status, observation, patterns, finding=''):
    cases = select(*patterns)
    for ident in ids.split(','):
        updates[ident] = dict(status=status, observed=observation,
                              cases='; '.join(c['id'] + ': ' + c['name'] for c in cases),
                              finding=finding)


change('I08-T03,I08-T83', 'PASS',
       'Actual Windows CIM inventory scoped to live Main/Discussion/Coding: no unclassified TCP connection/listener or owned service. Two Main harness debugger listeners independently matched runtime ports; Coding non-listening CPython Proactor socketpair and BOUND reservation matched actual loop ports. Development runtime only; packaged artifact remains NOT_RUN.', ['R01-N01'])
change('I08-T36', 'PASS',
       'Actual Windows Main and Python restarted, persisted prior messages used by a fresh original-Gateway captured request; no call on startup. Pressure candidates persist with same-conversation source IDs and are used next turn; new conversation has zero history/summaries. R01 explicitly permits MockTransport. P5 live proof is historical; no new genuine inference claimed.', ['R01-D01'])
change('I08-T63,I06-T49,I07-T41', 'PASS',
       'Actual authorized Main source write and T5 observation precede a paused Python provider gate. Revoke commits before original Gateway captured HTTP call; already released source can still reach that captured endpoint. Later Main release denied and call count unchanged. Native crash86 before observation COMMIT restores Renderer partial. No remote receipt/deletion/recall claim.', ['R01-C01'])
change('I08-T79', 'PASS',
       'Native Main TerminateProcess exit87 after independent SQLite reader sees actual T4 task.started COMMIT, before notification publish. Restart replays sequence1 exactly once, holds writer lease and needs_reconciliation; no automatic execution/cleanup claim.', ['R01-F01'])
change('I06-T06', 'PASS',
       'Original Gateway captured synthetic401 and timeout each make one request/reservation, sanitized no key/body/fallback/retry; existing missing-key rejection is carried. These prove controlled failure behavior, not a new real remote authentication failure.', ['R01-P02', 'R01-P03'])
change('I06-T21,I06-T48', 'PASS',
       'Two bounded 14k synthetic pressure turns through actual original Gateway persist two valid source-message-backed candidates; subsequent turn sees two summaries, increasing revision and no duplicate current input. Existing pre-send cap/overflow tests carried. No claim that a genuine model generated these captured summaries.', ['R01-D01'])
change('I07-T13', 'PASS',
       'Actual isolated NTFS case-sensitive root contains distinct Case/case native IDs and is rejected WORKSPACE_MISMATCH; NFC/NFD objects distinct, NFC read exact and NFD selector denied without wrong-file bytes. Existing Windows alias/short-name defenses retained.', ['R01-W03', 'R01-W04'])
change('I07-T14', 'PASS',
       'Real Windows named pipe(FILE_TYPE_PIPE), NUL character device, live Winsock AF_UNIX filesystem socket and binary Shell Link to synthetic outside target all denied; no target content released. No string-only substitute claimed.', ['R01-W05', 'R01-W06', 'R01-W08'])
change('I07-T38,I07-T40', 'PASS',
       'Main-issued parent/grant cannot authorize altered provider/model/destination, or an actually registered second project after UI selection. Exact NOT_AUTHORIZED and no B canary; original A remains bound. Later Main release after revoke denied. Alternate routes exist in harness only, no genuine second/local model claim.', ['R01-C02', 'R01-C03', 'R01-C01'])
change('I07-T50', 'PASS',
       'After actual authenticated source prepare, destroy real anonymous stdio writer then call original Node write: actual ERR_STREAM_DESTROYED callback, one attempt, zero read observations/provider requests/task/events; no fabricated callback error.', ['R01-C04'])
change('I07-T53', 'PASS',
       'UNIT metadata injection through real production discover covers 0, MAX_SAFE-1, MAX_SAFE, MAX_SAFE+1, uint64max: exact safe Number or null. No huge/native file claim; explicitly allowed by R01 section6.', ['R01-W07'])
change('I08-T71', 'INCONCLUSIVE',
       'Real Windows AgentOS/Offline Gateway combined run: configured60s, measured61.509s,25 committed events,11 actual worker starts/reports,50 navigation cycles,13 reloads, no observed gaps, native retained-process-handle cleanup and durable verified cancellation. Captured resources/queue bounds pass. This is not arbitrary-rate saturation or proof of the entire long high-rate contract.', ['R01-S01'], 'P9-F04')
change('I08-T87', 'INCONCLUSIVE',
       'R01 evidence retention finding: inherited test initially reused its default run ID and overwrote secondary passing .cache/p9-native-native-01.json. Prior SHA retained; exact old bytes unavailable. All tracked historical P9 bytes and primary full diagnostic/results preserved and checked. No historical checksum rewritten or automatic waiver. See run-manifest retentionAudit.', ['R01-W01'], 'P9-R01-F01')
change('I06-T04', 'INCONCLUSIVE',
       'Original Gateway captures independent A/B test routes: issued A stays A while preference changes and next request uses B. Main unsupported-B preference/binding rejects and A remains unchanged. Production exposes only one supported route, so actual valid two-model UI switch is still unproved.', ['R01-P01', 'R01-C02'], 'P9-F02')
change('I07-T11', 'INCONCLUSIVE',
       'Actual junction/reparse and swap defenses from P9 retained and targeted rerun passes; additional native socket/case/Unicode defenses pass. Genuine separate-volume mount fixture not run: SeManageVolumePrivilege absent. No privilege/global setting change.', ['R01-W01', 'R01-W04'], 'P9-F01')

rows = list(csv.DictReader((OLD / 'coverage-matrix.csv').open(encoding='utf-8', newline='')))
fields = list(rows[0]) + ['baselineStatus', 'baselineObservedResult', 'baselineEvidenceSha256', 'baselineOutstandingFindings',
                          'r01Disposition', 'r01ExecutableTests', 'r01Evidence', 'r01EvidenceSha256']
seen = set()
for row in rows:
    row['baselineStatus'] = row['status']
    row['baselineObservedResult'] = row['observedResult']
    row['baselineEvidenceSha256'] = row['evidenceSha256']
    row['baselineOutstandingFindings'] = row['outstandingFindings']
    if row['evidence'] == 'executable-results.json':
        row['evidenceSha256'] = digest('docs/implementation/P9/R01/executable-results.json')
    row['r01Disposition'] = 'CARRIED_P9: not re-executed unless listed in R01 executable catalog; historical evidence retained.'
    row['r01ExecutableTests'] = ''
    row['r01Evidence'] = ''
    row['r01EvidenceSha256'] = ''
    if row['testId'] in updates:
        update = updates[row['testId']]
        row['status'] = update['status']
        row['r01Disposition'] = update['observed']
        row['observedResult'] = update['observed']
        row['r01ExecutableTests'] = update['cases']
        row['r01Evidence'] = 'executable-results.json;run-manifest.json'
        row['r01EvidenceSha256'] = digest('docs/implementation/P9/R01/executable-results.json')
        row['outstandingFindings'] = update['finding']
        seen.add(row['testId'])
assert seen == set(updates), set(updates) - seen
with (OUT / 'coverage-matrix.csv').open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)


def counts(cases):
    result = dict(Counter(c['status'] for c in cases))
    result.setdefault('FAIL', 0)
    return result


desktop = [c for c in entries if c['environment'] != 'ACTUAL_ENGINE_OFFLINE_WINDOWS']
engine = [c for c in entries if c['environment'] == 'ACTUAL_ENGINE_OFFLINE_WINDOWS']
new = [c for c in entries if c['id'].startswith('R')]
executed = [c for c in entries if c['evidenceOrigin'] == 'EXECUTED_R01']
save('VERIFICATION-RESULTS.json', dict(
    scope='P9-R01 WINDOWS DEVELOPMENT-INTEGRATED; owner review required', clientCompletionDate='2026-10-27',
    baselineDesktop={'PASS':528,'FAIL':0,'NOT_RUN':3}, baselineEngine={'PASS':69,'FAIL':0,'NOT_RUN':3},
    currentDesktop=counts(desktop), currentEngineCarried=counts(engine), newUniqueCases=counts(new),
    executedR01UniqueCases=counts(executed), carriedUniqueCases=counts([c for c in entries if c not in executed]),
    byEnvironment={e:counts([c for c in entries if c['environment']==e]) for e in sorted({c['environment'] for c in entries})},
    normative={p:counts([r for r in rows if r['testId'].startswith(p)]) for p in ['I08-','E2E-','E05-','I06-','I07-']},
    invariants=dict(noPaidCalls=True, engineUnchanged=True, frozenWorkingGitArchive='PASS',
                    noMainMerge=True, noPublicApiSchemaDependencyChange=True, historicalTrackedP9Bytes='PASS'),
    checks=dict(typecheck='PASS', build='PASS', formatting='PASS', frozenWorkingGitArchive='PASS'),
    conclusion='NO-GO full P9 acceptance; stop for P9 FINAL OWNER REVIEW',
    note='Unique latest-executed identities plus explicitly carried historical results, not a complete fresh rerun. Failed earlier executions remain in run-manifest. Symlink setup attempted but containment NOT_RUN on Windows1314. Engine69 PASS/3 paid NOT_RUN carried, no new69-case Engine regression claim.'))

# Publish only reviewed safe diagnostics; raw reports contain local paths/traces.
safe_names = ['native-04', 'topology-03', 'memory-01', 'consent-01', 'soak-03', 't4-crash-01', 'broken-pipe-01']
for name in safe_names:
    save('evidence/' + name + '.json', load('.cache/p9r01-' + name + '.json'))
for name in ['soak-03', 'consent-01']:
    (OUT / 'evidence' / (name + '.png')).write_bytes((ROOT / ('.cache/p9r01-' + name + '.png')).read_bytes())

soak = load('.cache/p9r01-soak-03.json')
samples = soak['samples']
metrics = dict(durationMs=soak['durationMs'], configuredDurationMs=60000,
               cycles=soak['cycles'], reloads=soak['reloads'], events=soak['final']['eventCount'],
               workersStarted=soak['final']['workersStarted'], workerReports=soak['final']['workersCompleted'],
               cancellationLatencyMs=soak['cancellationLatencyMs'],
               maxMainRSSBytes=max(s['metrics']['memory']['rss'] for s in samples),
               maxRendererHeapBytes=max(s['renderer']['heap'] for s in samples),
               maxRendererFrameLatencyMs=max(s['renderer']['frameLatencyMs'] for s in samples),
               maxMainAndMissionReadRoundTripMs=max(s['mainRoundTripAndMissionReadMs'] for s in samples),
               maxObservedIncomingRecords=max(s['metrics']['incomingRecords'] for s in samples),
               maxObservedOutgoingRecords=max(s['metrics']['outgoingRecords'] for s in samples),
               evidenceLimit='Point samples, not continuous worst-case bounds or new CPU/RSS/latency SLA; 25-event stream not high-rate saturation.')
save('evidence/soak-summary.json', metrics)

raw_artifacts = sorted(p for p in (ROOT / '.cache').glob('p9r01-*') if p.is_file())
checks = [dict(path=p.relative_to(ROOT).as_posix(), sha256=sha256(p.read_bytes()).hexdigest()) for p in raw_artifacts]
runs = []
for p in raw_artifacts:
    if p.suffix != '.json':
        continue
    data = load(p.relative_to(ROOT))
    if isinstance(data, dict) and 'numTotalTests' in data:
        runs.append(dict(path=p.relative_to(ROOT).as_posix(), runner='vitest',
                         passed=data['numPassedTests'], failed=data['numFailedTests'],
                         skippedIncludingFiltered=data['numPendingTests'],
                         startTime=data.get('startTime')))
    elif isinstance(data, dict) and 'suites' in data and 'stats' in data:
        runs.append(dict(path=p.relative_to(ROOT).as_posix(), runner='playwright', stats=data['stats']))
    elif p.name == 'p9r01-python-results-01.json':
        runs.append(dict(path=p.relative_to(ROOT).as_posix(), runner='unittest', outcomes=counts(data)))
old_raw = load('docs/implementation/P9/run-manifest.json')['rawArtifacts']
raw_mismatches = [dict(path=r['path'], expected=r['sha256'], observed=digest(r['path']) if (ROOT/r['path']).is_file() else None)
                  for r in old_raw if not (ROOT/r['path']).is_file() or digest(r['path']) != r['sha256']]
assert raw_mismatches == load('.cache/p9r01-historical-raw-audit.json'), raw_mismatches
budgets = {p:digest(p) for p in ['.cache/p5-live-budget.json','.cache/p7-final-live-budget.json']}
assert budgets['.cache/p5-live-budget.json'] == 'edd0244f1ad016c2aa77c75deacb8e07bbd30815e7299a0e0921f6841c1de200'
assert budgets['.cache/p7-final-live-budget.json'] == '06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e'
save('run-manifest.json', dict(
    runId='P9-R01-2026-10-26-27', desktopBaseline=BASE, engineCommit=ENGINE,
    branch='feature/p9-windows-integrated-acceptance', clientCompletionDate='2026-10-27',
    timestampPolicy='Raw test report UTC timestamps retained as emitted; owner/client completion date used here.',
    engineState='clean read-only, local and remote exact pinned SHA',
    mainRefs=dict(desktop='af682b74375a0b5827aa1fca0ff0815434803650', engine='834d0ca62cc9b2c03e530bafe4090024d98f31d3'),
    environment=load('docs/implementation/P9/run-manifest.json')['environment'],
    environmentPolicy='Same pinned installed Windows development environment as P9; native token state newly measured. No dependency/admin/global changes.',
    historicalTrackedByteAudit=historical,
    retentionAudit=dict(status='INCONCLUSIVE; P9-R01-F01', auditedHistoricalRawArtifacts=len(old_raw), secondaryRawMismatch=raw_mismatches,
        explanation='Inherited test default run ID reused on first R01 targeted run. Old secondary passing diagnostic exact bytes unavailable. Historical reports/results hashes unchanged; primary .cache/p9-native-full-01.json and original unit report preserved. Disclosed to owner. Future inherited commands must set unique NCD_P9_RUN_ID.'),
    paidBudgetHashesUnchanged=budgets, rawArtifacts=checks, runs=runs, metrics=metrics,
    corrections=[
        'Native initial fixture used Python AF_UNIX unavailable in this CPython build; final fixture uses actual Winsock AF_UNIX. Initial per-directory case flag on nonempty root failed145; final isolated empty native root succeeds.',
        'Consent scope test found denied foreign conversation misclassified BROKER_IO_ERROR. Narrow FileBroker maps only StoreError NOT_AUTHORIZED to proper auth refusal; real IO errors retain safe IO path. Initial/final denial retained.',
        'First soak failed needs_reconciliation. Fixture audit initially lived in browsed workspace; moved outside. Exact initial engine exception not captured, so causal attribution remains unverified. Reproduction passes.',
        'Second soak queried retired current-child Job metrics as zero; API correctly returns null when no current child. Final proof uses independent retained native HANDLE + creation identity + DB verified cancellation and zero writer lease.',
        'Topology initial assertion zero Python TCP was overbroad: actual CPython ProactorEventLoop uses non-listening socketpair. Final classifier matches actual runtime ports plus native BOUND reservation; no Python server/unclassified connection accepted.'
    ],
    commands=[
        'npx vitest run tests/unit/broker-windows.test.ts tests/unit/p9-windows-acceptance.test.ts tests/unit/p9r01-windows.test.ts --reporter=json --outputFile=.cache/p9r01-native-results-01.json (initial; inherited default diagnostic collision disclosed)',
        'NCD_R01_RUN_ID=04 npx vitest run tests/unit/p9r01-windows.test.ts tests/unit/p9r01-consent.test.ts --reporter=json --outputFile=.cache/p9r01-native-consent-results-04.json (native final; consent later fixed)',
        'npx vitest run tests/unit/broker-service.test.ts tests/unit/p9r01-consent.test.ts --reporter=json --outputFile=.cache/p9r01-consent-broker-results-06.json',
        "NCD_P9_RUN_ID=r01-affected-07 npx vitest run tests/unit/coding-integration.test.ts tests/unit/p8-real-workers.test.ts --testNamePattern 'P7-E01|P7-E03-worker|E05-04/05' --reporter=json --outputFile=.cache/p9r01-affected-unit-07.json",
        'python -X utf8 .cache/p9r01-run-python.py (credential-filtered native subprocess, test_p9r01_gateway + test_discussion + test_broker,22 cases)',
        'npx playwright test tests/electron/p9r01-soak.spec.ts (final03)',
        'npx playwright test tests/electron/p9r01-discussion.spec.ts (D01/C01 run01; C04 separately)',
        'npx playwright test tests/electron/p9r01-faults.spec.ts (F01 run01; N01 final03 separately)',
        "npx playwright test tests/electron/broker.spec.ts --grep 'P6-E0[234]' (affected04)",
        'npm run build', 'npm run format:check',
        'python -X utf8 docs/implementation/P0/verify_delivery.py --git-ref HEAD --archive <original-local-delivery-zip>',
        'python -X utf8 docs/implementation/P9/R01/collect-evidence.py'
    ],
    reproduction='Use pinned local deps/Engine SHA, synthetic isolated profiles only; no test:live. Raw reports in .cache are local. Before repeating Electron R01 specs archive their fixed-named diagnostic outputs and use unique raw report copies; Playwright replaces test-results. Always unique NCD_P9_RUN_ID for inherited P9 native tests; NCD_R01_RUN_ID for new native test. Do not run historical P9 collector (would overwrite historical files).'))

changed = git('diff', '--name-only', BASE).splitlines()
untracked = git('ls-files', '--others', '--exclude-standard').splitlines()
paths = sorted(set(changed + untracked))
exclude = {'docs/implementation/P9/R01/CHANGE-MANIFEST.json', 'docs/implementation/P9/R01/COMMIT-RECEIPT.md'}
save('CHANGE-MANIFEST.json', dict(baseline=BASE,
    exclusion='This manifest and later commit receipt excluded to avoid self-reference. No frozen/Engine/schema/dependency changes.',
    files=[dict(path=p, action='MODIFIED' if p in changed else 'NEW', sha256=digest(p), bytes=(ROOT/p).stat().st_size)
           for p in paths if p not in exclude]))
print(json.dumps(dict(desktop=counts(desktop), new=counts(new), executed=counts(executed),
                     engine=counts(engine), rows=len(rows), normative={p:counts([r for r in rows if r['testId'].startswith(p)]) for p in ['I08-','E2E-','E05-','I06-','I07-']}),indent=2))
