"""Collect completed, local P9 runs; never execute a provider or change a ledger.

Run from the Desktop root after the commands in run-manifest.json. The curated
dispositions below are deliberately independent of executable-test totals.
Raw reports stay ignored; only names, outcomes, hashes and sanitized metrics ship.
"""
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import csv
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path.cwd()
OUT = ROOT / 'docs/implementation/P9'
SPEC = ROOT / 'docs/engineering/01-normative'
BASE = 'ca59509dfcce66c7680dddfe80554570dce516bd'
ENGINE = '99e00e13f8a39fa6730f3d3de773ac937b5ac915'


def load(path):
    data = (ROOT / path).read_bytes()
    return json.loads(data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig'))


def digest(path):
    return sha256((ROOT / path).read_bytes()).hexdigest()


def save(name, value):
    p = OUT / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def git(*args, engine=False):
    directory = ROOT.parent / 'next code' if engine else ROOT
    return subprocess.check_output(
        ['git', '-c', f'safe.directory={directory.as_posix()}', '-C', str(directory), *args],
        stderr=subprocess.DEVNULL).decode('utf-8').strip()


def relative(path):
    return Path(path).resolve().relative_to(ROOT).as_posix()


assert git('branch', '--show-current') == 'feature/p9-windows-integrated-acceptance'
assert git('rev-parse', 'HEAD', engine=True) == ENGINE
assert not git('status', '--porcelain', engine=True), 'Engine must remain unchanged'
unit = load('.cache/p9-unit-full-01.json')
assert unit['numPassedTests'] == 457 and unit['numFailedTests'] == 0
catalog = []


def add(environment, file, name, status, artifact, duration=None):
    ident = f'X{len(catalog) + 1:04d}'
    catalog.append(dict(id=ident, environment=environment, file=file, name=name,
                        status=status, evidence=artifact, evidenceSha256=digest(artifact),
                        durationMs=duration,
                        sourceSha256=digest(file) if (ROOT / file).is_file() else None))


for suite in unit['testResults']:
    for case in suite['assertionResults']:
        add('WINDOWS_UNIT_UI_NATIVE', relative(suite['name']), case['fullName'],
            'PASS' if case['status'] == 'passed' else 'NOT_RUN',
            '.cache/p9-unit-full-01.json', case.get('duration'))


def electron_cases(path):
    cases = []

    def visit(suite, parent=''):
        for spec in suite.get('specs', []):
            for test in spec['tests']:
                result = test['results'][-1]
                cases.append(dict(file='tests/electron/' + spec['file'].replace('\\', '/').split('/')[-1],
                                  name=spec['title'], status=result['status'],
                                  duration=result['duration'], artifact=path))
        for child in suite.get('suites', []):
            visit(child)
    for suite in load(path)['suites']:
        visit(suite)
    return cases


# Last actual result for each identity replaces only that identity, not a suite.
electron = {}
for path in ['.cache/p9-electron-01.json', '.cache/p9-electron-02.json', '.cache/p9-electron-03.json', '.cache/p9-electron-04.json', '.cache/p9-electron-05.json', '.cache/p9-electron-06.json']:
    for c in electron_cases(path):
        electron[c['file'], c['name']] = c
assert len(electron) == 37 and all(c['status'] == 'passed' for c in electron.values())
for c in electron.values():
    add('ACTUAL_WINDOWS_ELECTRON', c['file'], c['name'], 'PASS', c['artifact'], c['duration'])
python_log = (ROOT / '.cache/p9-python-01.txt').read_text(encoding='utf-8')
python_cases = re.findall(r'^(test_\w+) \(([^)]+)\) \.\.\. ', python_log, re.M)
assert len(python_cases) == 34 and '\nOK' in python_log and 'FAILED (' not in python_log
for name, module in python_cases:
    add('PYTHON_ORIGINAL_GATEWAY_OFFLINE', 'tests/python/' + module.split('.')[0] + '.py',
        module, 'PASS', '.cache/p9-python-01.txt')
desktop = dict(Counter(c['status'] for c in catalog))
desktop.setdefault('FAIL', 0)
assert desktop == {'PASS': 528, 'NOT_RUN': 3, 'FAIL': 0}
engine_start = len(catalog)
for case in ET.parse(ROOT / '.cache/p9-engine-full-01.xml').iter('testcase'):
    add('ACTUAL_ENGINE_OFFLINE_WINDOWS', 'ENGINE:' + case.get('classname', ''),
        case.get('name'), 'NOT_RUN' if case.find('skipped') is not None else
        'FAIL' if case.find('failure') is not None or case.find('error') is not None else 'PASS',
        '.cache/p9-engine-full-01.xml', float(case.get('time', '0')) * 1000)
engine_totals = dict(Counter(c['status'] for c in catalog[engine_start:]))
assert engine_totals == {'PASS': 69, 'NOT_RUN': 3}
engine_totals.setdefault('FAIL', 0)
save('executable-results.json', catalog)


unmatched_selectors = set()


def find(*patterns):
    found = []
    for pattern in patterns:
        hits = [c for c in catalog if re.search(pattern, c['file'] + ' ' + c['name'], re.I)]
        if not hits:
            unmatched_selectors.add(pattern)
        # At most four exact identities per selector; full file inventory is in
        # executable-results.json. This keeps the cross-reference matrix bounded.
        for c in hits[:4]:
            if c not in found:
                found.append(c)
    return found


matrix = []


def row(ident, path, line, parent, expected, patterns=(), status='PASS', observed=None,
        severity='P1', finding='', applicability='MANDATORY_DEV'):
    cases = find(*patterns)
    assert cases or status != 'PASS' or ident in ('I08-T01', 'I08-T02', 'I08-T84', 'I08-T87'), ident
    if status == 'PASS':
        assert all(c['status'] == 'PASS' for c in cases), ident
    matrix.append(dict(testId=ident, frozenParentClause=f'{path.as_posix()}:{line} [{parent}]',
                       applicability=applicability,
                       environment=';'.join(sorted({c['environment'] for c in cases})) or 'DOCUMENTARY_BYTE_AUDIT',
                       actualExecutableTests='; '.join(c['id'] + ': ' + c['name'] for c in cases),
                       expectedResult=expected,
                       observedResult=observed or 'Current P9 rerun passed the named assertions. See exact executable identities and evidence kinds; no paid/provider or packaging claim inferred.',
                       evidence='executable-results.json' if cases else 'run-manifest.json',
                       evidenceSha256=digest('docs/implementation/P9/executable-results.json') if cases else 'SEE_RUN_MANIFEST_HASHES',
                       status=status, severity=severity, outstandingFindings=finding))


specs = {n: next(SPEC.glob(f'*IIS-0{n}-*')) for n in (1, 2, 3, 4, 5, 6, 7, 8)}
# IIS-02 base, rather than its independently approved C01/C02 addenda.
specs[2] = next(SPEC.glob('*IIS-02-ELECTRON*'))
parents = {n: p.relative_to(ROOT) for n, p in specs.items()}
p5 = load('docs/implementation/P5/VERIFICATION-RESULTS.json')
p6 = load('docs/implementation/P6/VERIFICATION-RESULTS.json')
p8 = load('docs/implementation/P8/VERIFICATION-RESULTS.json')

# Each integrated row has a curated source selector, never a blanket inference
# from the total number of passing tests.
i08 = {
1: (), 2: (), 3: ('P1-SEC', 'security.test.ts', 'no_filesystem_shell'),
4: ('P1-WIN:', 'P2-WIN: exact'), 5: ('P4-PY01', 'P5-06', 'no_filesystem_shell'),
6: ('precisely the independent 23', 'exactly five types', 'P2-WIN: exact'),
7: ('matches all 22', 'P3-WIN: actual'), 8: ('nonexistent retry', 'P5-11', 'P5-12', 'CP-001 scoped'),
9: ('roundtrips every canonical', 'python-parity'), 10: ('P4-P01', 'P4-P02'),
11: ('IIS-01 closed framing', 'P4-P01'), 12: ('shared ID set', 'P4-P03'),
13: ('refuses cross-role', 'P6-B09'), 14: ('record exact hard cap', 'record above hard cap', 'P4-P02'),
15: ('read unsafe metadata', 'accepted result must', 'P4-P01'),
16: ('P4-C01', 'P4-Q01', 'P4-Q02', 'limits general inflight'),
17: ('P2-WIN: exact', 'facade enforces arity'), 18: ('P2-WIN: real unregistered', 'rejects cycles'),
19: ('P6-B08', 'P7-U03'), 20: ('P5-02', 'duplicate first sends', 'P3-WIN: isolated'),
21: ('P7-WIN02', 'P5-10', 'C01 proposal cap'), 22: ('C01 proposal cap', 'P7-A07'),
23: ('P9-E2E01', 'P5-07', 'C01 proposal cap'), 24: ('P2-WIN: typed', 'P9-E2E03'),
25: ('six simultaneous identical', 'duplicate first sends'),
26: ('racing changed payload', 'changed text/model/project'), 27: ('competing Run requests', 'P7-A02', 'P7-U01'),
28: ('P7-A04', 'concurrent distinct admissions'), 29: ('canonical aliases use', 'P7-A06', 'P7-WIN04'),
30: ('E05-08/09/10', 'preserves sparse sequence'), 31: ('P5-11', 'P5-12', 'rejects foreign/missing'),
32: ('grants exact scope', 'denies forged, expired', 'P6-L02'),
33: ('P6-E04', 'real_gateway_class_explicit', 'P9-E2E01'),
34: ('P5-01', 'missing_key_never', 'secret_echo'), 35: ('P5-02', 'P5-05', 'P6-E04'),
36: ('P6-E04', 'P9-E2E01', 'P5-03'), 37: ('P5-15', 'P5-14', 'history_current_user_once'),
38: ('P5-04', 'P5-07', 'P4-L04'), 39: ('P5-10', 'P7-WIN01'), 40: ('P5-11', 'P5-12'),
41: ('P7-WIN02', 'P7-A02', 'P7-E09'), 42: ('P4-C01', 'P7-P02'),
43: ('P7-E03-worker', 'P7-E03-shell', 'P7-WIN03'), 44: ('P7-E05', 'P4-C02', 'P4-W01'),
45: ('P7-WIN06', 'P7-A10'), 46: ('P7-WIN04', 'P4-WIN03', 'P4-W01'),
47: ('P7-A04', 'P7-E06', 'P7-WIN05'), 48: ('P7-E01', 'P7-A08'),
49: ('P8-WIN02', 'actual original AgentOS production factory', 'E05-02'),
50: ('E05-18', 'P7-E07'), 51: ('P8-WIN01', 'P8-WIN03'),
52: ('E05-10/21/33',), 53: ('E05-08/09/10', 'E05-10/21/33'),
54: ('P8-WIN02', 'E05-04/05 I08'), 55: ('P7-WIN04', 'E05-07/24'),
56: ('P9-E2E03', 'P8-WIN03', 'E05-35 initial'),
57: ('P6-PATH', 'P9-G6-02', 'P6-W11'), 58: ('P6-W04', 'P6-W07', 'P9-G6-03'),
59: ('P6-W09', 'P9-G6-03', 'P6-B12'), 60: ('P6-S3', 'P6-B05', 'P6-DECODE'),
61: ('P6-B03', 'P6-B13'), 62: ('P6-E03', 'P6-B06'),
63: ('P6-L02', 'P6-E02', 'P6-B13'), 64: ('P6-L06', 'P6-L07', 'P8-B01'),
65: ('P1-FIT',), 66: ('P1-DPI: Windows Electron forced device scale 1.25', 'P1-A11Y'),
67: ('P5-UI02', 'never fakes message'), 68: ('E05-07/24', 'P7-U02'),
69: ('P4-WIN02', 'P5-01', 'P7-U02'), 70: ('P1-DOCK', 'P1-SEC'),
71: ('P9-RES01', 'P9-E2E03', 'E05-16/17'), 72: ('P8-WIN03', 'P1-DOCK', 'CP-001 saved'),
73: ('native online backup', 'P3-WIN: isolated', 'P6-L06'),
74: ('SQLITE_FULL', 'SQLITE_BUSY', 'fails closed on newer', 'P3-WIN: corrupt'),
75: ('P4-P02', 'P4-W01', 'P4-WIN03'), 76: ('P4-S01', 'P4-Q02', 'P4-C01'),
77: ('P5-04', 'P4-L04', 'P4-P04'), 78: ('P6-L08', 'P8-B01', 'P6-B06'),
79: ('E05-19/20/36', 'P8-WIN01', 'commits before notification'),
80: ('P9-E2E03', 'duplicate first sends', 'P2-WIN: typed'),
81: ('P4-R01', 'P4-R02', 'P7-G01'), 82: (), 83: ('P1-SEC',), 84: (),
85: ('nonexistent retry',), 86: ('P1-A11Y', 'P1-FIT'), 87: (), 88: ()}
holds = {
3: ('INCONCLUSIVE', 'P9-F06', 'Static topology/CSP/role tests passed, but no complete actual Windows socket/service inventory correlated to the entire integrated run was captured.'),
36: ('INCONCLUSIVE', 'P9-F03', 'Actual two-turn Gateway mock and current historical real-answer restore pass separately; no fresh real-provider two-turn inference after process restart was performed.'),
58: ('BLOCKED', 'P9-F01', 'Actual junction, held-handle/ancestor-swap and concurrent writer defenses pass; native file and directory symlink fixtures fail creation with Windows error 1314. Mount/Unicode variants remain unproved.'),
63: ('INCONCLUSIVE', 'P9-F02', 'Main-local grant/revoke order and actual safe stdio release pass. No alternate registered provider switch or controlled post-release/provider-send race; no remote recall claimed.'),
71: ('INCONCLUSIVE', 'P9-F04', 'Actual 2001-event SQLite replay is bounded; actual busy-Worker navigation/reloads pass. A single long-duration high-rate Renderer navigation soak was not performed.'),
75: ('INCONCLUSIVE', 'P9-F06', 'READY/orphan/Main-crash tests pass; exact full app-quit user-choice lifecycle under each active-task condition was not separately exercised.'),
79: ('INCONCLUSIVE', 'P9-F06', 'Committed rows survive readers/reloads and lost hints recover. Main was not actually killed at an instrumented T4-COMMIT-before-push boundary in P9.'),
82: ('NOT_RUN', 'FUTURE_DISTRIBUTION', 'NOT_RUN — FUTURE DISTRIBUTION; no packaging or clean-machine install authorized.'),
83: ('INCONCLUSIVE', 'P9-F06', 'Dev build isolation and network CSP tests pass; no distribution artifact exists and full dev OS socket inventory is not captured.'),
85: ('BLOCKED', 'P9-F01;P9-F02;P9-F03;P9-F06', 'Every inherited register is preserved below using final wording, including corrected I06-T36. Mandatory security/provider/pressure variants remain non-PASS; inventory completion is not test completion.'),
86: ('INCONCLUSIVE', 'P9-F05', 'Current Windows keyboard/focus/reduced-motion/axe tests and 125% display evidence pass; human accessibility/readability signoff remains for owner review.'),
88: ('BLOCKED', 'P9-F01', 'G6 and other explicit evidence holds prevent G9-dev PASS; owner acceptance has not been granted.')}
for line, text in enumerate(specs[8].read_text(encoding='utf-8').splitlines(), 1):
    if not text.startswith('| **I08-T'):
        continue
    cells = [c.strip() for c in text.strip('|').split('|')]
    ident = cells[0].strip('*')
    n = int(ident[-2:])
    status, finding, observed = holds.get(n, ('PASS', '', None))
    if n in (1, 2, 84, 87):
        observed = 'Current source/contract hashes, accepted authority and clean read-only Engine checked; source and evidence hash inventory in run-manifest.json. Lost historical originals remain unverified, closure is prospective.'
    if n == 33:
        observed = 'Supported DeepSeek Flash route: accepted P5 actual two-request evidence carried explicitly; unchanged original Gateway sources; current Main/bridge/original Gateway HTTP-mock integration and historical ledger restore pass. Zero new paid requests; no present live readiness claim.'
    row(ident, parents[8], line, cells[1], cells[2] + ' => ' + cells[3], i08[n],
        status, observed, cells[4], finding,
        'FUTURE_DISTRIBUTION' if n == 82 else 'MANDATORY_DEV')

# Frozen E05/I06/I07 identities and wording come directly from their current
# parent tables, not historical draft summaries.
i06_patterns = {
1: ('P6-E04', 'P9-E2E01', 'real_gateway_class_explicit'), 2: ('P5-01', 'model_mismatch_before'),
3: (), 4: ('P5-01',), 5: ('P4-WIN02',), 6: ('missing_key_never', 'secret_echo'),
7: ('duplicate first sends', 'P5-07', 'P9-E2E01'), 8: ('P5-02', 'changed text/model/project'),
9: ('P5-05', 'P5-UI02'), 10: ('Unicode within code-point', 'oversized text'),
11: ('P5-08', 'P4-P01'), 12: ('roundtrips every canonical', 'python-parity'),
13: ('P5-03', 'P6-B04'), 14: ('P5-02', 'persists real-attempt'),
15: ('refuses cross-role', 'rejects duplicate acceptance'), 16: ('overlong_answer', 'P4-P01'),
17: ('P5-15', 'context_over_budget'), 18: ('P5-09', 'rejects foreign/missing'),
19: ('P5-03', 'history_current_user_once'), 20: ('P5-01', 'P5-15'),
21: ('P5-14',), 22: ('P5-11', 'rejects foreign/missing'), 23: ('P5-11',),
24: ('P5-12',), 25: ('P5-11', 'rejects foreign/missing'), 26: ('P5-10', 'P7-WIN01'),
27: ('P7-A07', 'P7-WIN02', 'P7-U01'), 28: ('P6-B01', 'P6-B04', 'P6-B09'),
29: ('P6-W04', 'P6-W08', 'P6-SIZE'), 30: ('P6-B01', 'P6-E02'),
31: ('P6-E02', 'P6-L02'), 32: ('P6-L02', 'route_destination_mismatch'),
33: ('P6-L02', 'P6-E02'), 34: ('denial_never_turns', 'no_source_intent'),
35: ('P5-04', 'P4-L04'), 36: ('nonexistent retry', 'P5-02'),
37: ('P5-08', 'P4-P03', 'persists real-attempt'), 38: ('P4-P04', 'P5-04'),
39: ('P9-E2E03', 'P4-WIN01'), 40: ('P4-L04', 'P6-B04'), 41: ('P5-05',),
42: ('precisely the independent 23', 'exactly five types', 'matches all 22'),
43: ('P7-E01', 'P7-A08'), 44: ('P6-E02', 'P7-WIN02'),
45: ('C01 proposal cap', 'P7-WIN02', 'P7-A07'), 46: ('P9-E2E01', 'C01 proposal cap', 'P5-07'),
47: ('P5-11', 'P5-12'), 48: ('P5-14', 'P5-15'), 49: ('P6-L02', 'P6-E02'),
50: ('P5-08', 'P5-02'), 51: ('route_destination_mismatch', 'model_mismatch_before'),
52: ('overlong_answer', 'finish_length', 'record above hard cap')}
i06_holds = {
3: ('NOT_RUN', 'P9-F02', 'Only one approved discussion model/provider route exists; two-model routing was not executed or added.'),
4: ('INCONCLUSIVE', 'P9-F02', 'Persisted route immutability/unsupported choice tested; no second registered model for actual preference-switch journey.'),
5: ('INCONCLUSIVE', 'P9-F02', 'Unavailable readiness and credential-free registry tested; no explicitly unknown model-availability fixture was added.'),
6: ('INCONCLUSIVE', 'P9-F03', 'Missing key/secret echo and mock provider errors tested; actual remote invalid-key 401 not run, no real credential used in adversarial tests.'),
21: ('INCONCLUSIVE', 'P9-F03', 'Valid visible summary sources tested in current unit/Gateway fixtures; pressure-triggered actual model summary generation not executed.'),
29: ('BLOCKED', 'P9-F01', 'Real junction/mtime/size attacks pass, native symlink cannot be created (1314); do not substitute path strings.'),
32: ('NOT_RUN', 'P9-F02', 'No second registered provider or genuine local inference route for the complete switch/local case; T6 scope negatives alone do not complete it.'),
44: ('INCONCLUSIVE', 'P9-F02', 'Current actual consent/stdIO and real offline Coding tests pass separately; one complete multi-turn provider-error/consent/Coding combined journey not demonstrated.'),
48: ('INCONCLUSIVE', 'P9-F03', 'Whole optional-entry pruning/later-turn fixture summaries pass; actual pressure-triggered provider summarization not demonstrated.'),
49: ('INCONCLUSIVE', 'P9-F02', 'Main release/revoke order tested, downstream uncertainty documented; actual controlled post-release provider-send race not injected.')}
e05_patterns = {
1: ('actual original AgentOS production factory', 'P4-P01'),
2: ('E05-02', 'python-parity'),
3: ('distinguishes acceptance, actual start', 'P7-P02'),
4: ('E05-04/05 I08', 'P8-WIN02'), 5: ('E05-04/05 I08', 'P8-WIN02'),
6: ('actual original AgentOS production factory', 'actual_patch_digest', 'actual_failed_and_successful_pinned'),
7: ('E05-04/07/34', 'E05-07/24'),
8: ('E05-08/09/10', 'E05-08/23/35'),
9: ('E05-08/09/10', 'E05-09 actual supervised'),
10: ('E05-10/21/33', 'E05-08/09/10'),
11: ('E05-11/16/32', 'P7-A12'),
12: ('P7-E01', 'P7-WIN04', 'P4-D04'),
13: ('P7-E03-worker', 'P7-E03-shell', 'P7-WIN03'),
14: ('P9-E2E03', 'P7-WIN03'), 15: ('P8-WIN01', 'P9-E2E03'),
16: ('E05-16/17/32', 'P4-C01'),
17: ('P4-Q01', 'P4-Q02'), 18: ('E05-18', 'P7-E07'),
19: ('P4-P03', 'E05-27 event metadata', 'E05-19/20/36'),
20: ('P8-WIN03', 'E05-07/24'), 21: ('E05-10/21/33',),
22: ('E05-15/22',), 23: ('P8-WIN03', 'E05-23/35 unknown'),
24: ('E05-07/24',), 25: ('pasSED_prose', 'P4-S01'),
26: ('P6-E02', 'P5-06'),
27: ('E05-27 event metadata', 'E05-27 foreign'),
28: ('P8-WIN03', 'P7-WIN04'),
29: ('E05-08/09/10', 'E05-09 actual supervised'),
30: ('E05-09/30', 'E05-07/24'), 31: ('E05-07/24', 'P8-WIN03'),
32: ('E05-16/17/32', 'P9-RES01'),
33: ('E05-33 actual supervised', 'E05-10/21/33'),
34: ('E05-04/07/34',),
35: ('E05-35 initial', 'E05-08/23/35', 'P8-WIN03'),
36: ('E05-19/20/36', 'E05-07/24')}
for n in (5, 6, 7):
    for line, text in enumerate(specs[n].read_text(encoding='utf-8').splitlines(), 1):
        match = re.match(r'\| (E05-\d\d|I06-T\d\d|I07-T\d\d) \|', text)
        if not match:
            continue
        ident = match[1]
        # Preserve inner type unions containing | in the frozen wording.
        expected = text.strip().strip('|').strip()[len(ident):].lstrip(' |')
        number = int(ident[-2:])
        if n == 5:
            old = next(c for c in p8['E05'] if c['id'] == ident)
            patterns = e05_patterns[number]
            row(ident, parents[n], line, 'IIS-05 §18', expected, patterns,
                observed='Current P9 re-execution of P8 accepted assertions: ' + old['reason'],
                severity='P0' if number in (1,2,3,5,9,10,11,12,13,14,15,18,19,22,24,25,26,27,28,29,30,31) else 'P1')
        elif n == 6:
            status, finding, observation = i06_holds.get(number, ('PASS', '', None))
            if number == 1:
                observation = 'Accepted P5 real DeepSeek two-request proof + unchanged original Gateway + current HTTP-mock integration and actual Windows history restore; zero new paid requests.'
            if number == 36:
                observation = 'Final frozen IIS-06 §24/25 / FFR08-R03: no same-turn retry method/control. New send is a new logical turn; mutation replay is only acceptance idempotency.'
            row(ident, parents[n], line, 'IIS-06 §20; final §§24–25', expected,
                i06_patterns[number], status, observation,
                severity='P0' if number in (1,3,4,6,11,18,22,25,26,27,28,29,31,32,33,34,35,36,40,42,43,44,45,47,49,51) else 'P1', finding=finding)
        else:
            old = next(c for c in p6['iis07Cases'] if c['id'] == ident)
            patterns = []
            for evidence in old['evidence']:
                if evidence.startswith('P6-'):
                    patterns.append(re.escape(evidence))
                elif evidence.startswith('tests/'):
                    patterns.append(re.escape(evidence.split(' ')[0]))
            status = {'PASS': 'PASS', 'PARTIAL': 'INCONCLUSIVE', 'NOT_RUN': 'NOT_RUN'}[old['status']]
            observation = 'Current rerun; inherited exact limitation retained: ' + old['reason']
            finding = '' if status == 'PASS' else 'P9-F02'
            if number == 10:
                status, finding = 'BLOCKED', 'P9-F01'
                observation = 'Real inside/outside junction denied; native file and directory symlink creation both failed with error 1314. Native symlink containment remains NOT_RUN.'
            elif number in (11, 13, 14):
                finding = 'P9-F01'
            elif number == 47:
                status, finding = 'PASS', ''
                patterns = ['P6-E03', 'P9-E2E05']
                observation = 'Current P9 native Main exit86 after real stdio callback before observation COMMIT, then actual Renderer opens its WAL-consistent ledger copy twice: partial, 0 handed reads, 2 original user messages, no assistant. Source-ledger hash unchanged; no replay/provider.'
            elif number in (50, 53):
                finding = 'P9-F06'
            row(ident, parents[n], line, 'IIS-07 §19', expected, tuple(patterns),
                status, observation, 'P0' if number in (*range(1,22),26,27,28,29,38,39,40,41,42,48,52,54,56) else 'P1', finding)

e2e = {
1: ('PASS', ('P9-E2E01', 'P6-E04', 'P5-02'), 'Historical real P5 two-turn provider evidence explicitly reused; unchanged Gateway, current isolated Main/bridge mock integration and credential-free actual app restore. No new paid smoke or present live readiness asserted.'),
2: ('PASS', ('P7-WIN02', 'P7-U01', 'P7-A02', 'P9-E2E03'), 'Actual original AgentOS through Offline Gateway; explicit Run Task, duplicate mutation/click, T2/T4, true events, Mission Control and independent cleanup.'),
3: ('PASS', ('P9-E2E03', 'P8-WIN03'), 'Actual busy worker survives Chat/Agents/Projects/Files/Settings and five reloads, independent new Discussion turn, exact original conversation selection, no extra task; final genuine cancellation.'),
4: ('PASS', ('P7-E03-worker', 'P7-E03-shell', 'P7-E05', 'P7-WIN04'), 'Actual busy engine/worker/tool cancellation; hanging Gateway+descendants escalate after 15s; actual Main death/restart retains blocked Writer Lease, no replay.'),
5: ('INCONCLUSIVE', ('P6-E02', 'P9-E2E05', 'P6-L02', 'P6-U03'), 'Actual safe source/consent/stdio with Gateway MockTransport, secrets denied and exact post-crash Renderer partial-inspection restore. No second registered provider switch or full controlled downstream race; P9-F02.'),
6: ('PASS', ('P5-UI02', 'P5-05', 'E05-18', 'P3-WIN: isolated'), 'Actual SQLite faults and isolated before/after COMMIT interruption, UI draft preservation, no false event push; existing durable receipts and WAL backup verified.'),
7: ('PASS', ('P4-WIN02', 'E05-07/24', 'P7-WIN01', 'P7-U02'), 'Actual unavailable runtime/provider/engine gate plus UI no-hook/unknown projections; honest unavailable, no fixture workers in production.'),
8: ('NOT_RUN', (), 'NOT_RUN — FUTURE DISTRIBUTION; no clean-install/sidecar artifact authorized.')}
for line, text in enumerate(specs[8].read_text(encoding='utf-8').splitlines(), 1):
    match = re.match(r'\*\*E2E-(\d\d) —', text)
    if match:
        number = int(match[1]); status, patterns, observation = e2e[number]
        row(f'E2E-{number:02}', parents[8], line, 'IIS-08 §10 / FFR08-R04', text,
            patterns, status, observation, finding='P9-F02' if number == 5 else '',
            applicability='FUTURE_DISTRIBUTION' if number == 8 else 'MANDATORY_DEV')

# Parents IIS01–04 have named table groups rather than published numeric case
# IDs. These local identifiers retain every original row without renumbering it.
earlier = {
1: (671, 683, '§18.2', ('jsonl.test.ts', 'python-parity', 'supervisor.test.ts')),
2: (211, 225, '§10', ('ipc.test.ts', 'storage.test.ts', 'P2-WIN')),
3: (301, 317, '§14 REISSUE', ('supervisor.test.ts', 'coding-integration.test.ts', 'P7-WIN')),
4: (282, 299, '§17', ('storage.test.ts', 'storage-concurrency.test.ts', 'P3-WIN'))}
earlier_selectors = {
1: {
 'Framing': ('missing LF', 'record above hard cap', 'P4-P01'),
 'Envelope': ('extra root key', 'missing root field', 'boolean sequence'),
 'Identity': ('shared ID set', 'P4-P03'), 'Startup': ('P4-P01', 'P4-P02'),
 'Allowlist': ('refuses cross-role', 'P6-B09'),
 'Approval': ('P7-A07', 'explicit trusted execution admission', 'P7-A02'),
 'Read broker': ('P6-B04', 'P6-W04', 'P6-W08', 'P6-B05'),
 'Result': ('accepted result must', 'rejects duplicate acceptance', 'failed native outcome'),
 'Cancellation': ('P4-C01', 'P4-C02', 'P7-E03-worker'),
 'Events': ('E05-08/09/10', 'E05-04/07/34', 'P4-D05'),
 'Crash/reload': ('P8-WIN01', 'E05-18', 'P7-WIN04'),
 'Flow': ('P4-Q02', 'overlong_answer', 'P5-15'),
 'Compatibility': ('unknown version', 'P4-S01', 'secret_echo')},
2: {
 'Typed restricted Preload': ('P2-WIN: exact', 'P1-WIN:', 'P1-SEC'),
 'Conversation first message': ('P5-02', 'P5-UI02'),
 'Message retry': ('duplicate first sends', 'changed text/model/project', 'P5-02'),
 'Model choice': ('P5-01', 'P6-E04'),
 'Source-disclosure consent': ('P6-E02', 'denies forged, expired', 'P6-L02'),
 'Per-conversation Dock': ('P8-WIN03', 'P1-DOCK'),
 'Staged inspection UI': ('P9-E2E05', 'P6-U03', 'P6-B01'),
 'Project scope': ('P6-E01', 'P6-W04', 'P9-G6-03'),
 'Proposal approval': ('P7-WIN02', 'P7-A07'),
 'Per-workspace writer': ('P7-A04', 'P7-WIN05', 'P7-E06'),
 'Cancel': ('P7-WIN03', 'P4-D04', 'P7-A05'),
 'Task UI replay': ('P8-WIN01', 'E05-10/21/33'),
 'Sender validation': ('P2-WIN: real unregistered', 'rejects cycles'),
 'Logging and rendering': ('P4-S01', 'Inspector escape XSS', 'P1-SEC'),
 'Restart': ('P7-WIN04', 'P7-A10', 'P5-07')},
3: {
 'Dev interpreter path': ('P4-R01', 'P4-R02', 'P7-G01'),
 'Startup one-way handshake': ('P4-P01', 'P4-P02'),
 'Child identity and replay': ('P4-P03', 'P4-L03'),
 'Discussion isolation': ('P4-PY01', 'P6-B09', 'no_filesystem_shell'),
 'Run Task admission': ('P7-WIN02', 'P7-A02', 'P7-E09'),
 'Per-workspace writer': ('P7-WIN05', 'P7-E06', 'P7-A04'),
 'Coding cancellation under load': ('P7-E03-worker', 'P7-E05', 'P4-C01'),
 'Windows descendants': ('P7-WIN04', 'P4-W01', 'P4-D04'),
 'Truthful engine outcome': ('P7-E01', 'P7-E02', 'P4-S01'),
 'Durable event UI': ('P8-WIN01', 'E05-18', 'P9-RES01'),
 'Discussion retries': ('P4-L04', 'P5-04', 'P5-07'),
 'Main crash/restart': ('P7-WIN04', 'P7-WIN06', 'P4-WIN03'),
 'Renderer route/reload': ('P9-E2E03',),
 'App exit': ('P4-WIN03', 'P7-WIN04'),
 'Resource ceilings': ('P4-Q01', 'P4-Q02', 'limits general inflight'),
 'Security/logging': ('P4-S01', 'P1-SEC', 'P2-WIN: real unregistered'),
 'Packaging compatibility': ()},
4: {
 'Fresh schema/migration': ('matches all 22', 'fails closed on newer', 'rolls failed fresh migration'),
 'First message': ('duplicate first sends', 'actual isolated Node process exits', 'P5-UI02'),
 'Client mutation binding': ('racing changed payload', 'changed text/model/project'),
 'Run Task': ('P7-A02', 'P7-A07', 'P7-E09'),
 'Canonical aliasing': ('canonical aliases use', 'P7-WIN05', 'P6-W04'),
 'Global capacity': ('P7-A04', 'concurrent distinct admissions'),
 'Queue and cancellation': ('P7-E06', 'queued cancel racing'),
 'Active cancel': ('P7-A05', 'P7-E03-worker'),
 'Process cleanup': ('P7-E01', 'P7-WIN04', 'P4-D04'),
 'Event dedup': ('E05-08/09/10', 'preserves sparse sequence'),
 'Event DB fault': ('E05-18', 'T4 commit failure emits'),
 'Decision provenance': ('P5-11', 'P5-12', 'rejects foreign/missing'),
 'Summary and context': ('P5-14', 'P5-15', 'per-attempt lineage'),
 'Consent': ('grants exact scope', 'denies forged, expired', 'P6-L02'),
 'Inspection': ('counts committed unique', 'P6-E03', 'P6-B06'),
 'Dock & prefs': ('P8-WIN03', 'scopes Dock receipts'),
 'Crash recovery': ('P7-WIN04', 'P5-07', 'P7-WIN06'),
 'Offline runtime': ('P4-WIN02', 'P9-E2E01', 'never fakes message')}}
for n, (start, end, clause, patterns) in earlier.items():
    for line, text in enumerate(specs[n].read_text(encoding='utf-8').splitlines(), 1):
        if not start <= line <= end or not text.startswith('| '):
            continue
        name = text.split('|')[1].strip()
        patterns = earlier_selectors[n][name]
        status, finding, observation = 'PASS', '', None
        if (n == 1 and name == 'Read broker') or (n == 2 and name == 'Project scope') or (n == 4 and name == 'Canonical aliasing'):
            status, finding = 'BLOCKED', 'P9-F01'
            observation = 'Grammar/junction/scoped native tests pass, but actual symlink/mount/Unicode variants remain unproved; see native evidence and I07 register.'
        if (n == 2 and name == 'Source-disclosure consent') or (n == 4 and name == 'Consent'):
            status, finding = 'INCONCLUSIVE', 'P9-F02;P9-F06'
            observation = 'Current local scoped consent/evidence tests pass; full second-provider change remains unproved. Exact reopened-Renderer inspection was executed separately in P9-E2E05.'
        if n == 3 and name == 'Packaging compatibility':
            status, finding = 'NOT_RUN', 'FUTURE_DISTRIBUTION'
            observation = 'NOT_RUN — FUTURE DISTRIBUTION'
        if n == 3 and name == 'App exit':
            status, finding = 'INCONCLUSIVE', 'P9-F06'
            observation = 'Actual Main crash/Job descendants tested; complete intentional app-quit user-choice lifecycle not separately exercised.'
        row(f'IIS0{n}:{clause}:{name}', parents[n], line, clause, text,
            patterns, status, observation, severity='P0' if finding == 'P9-F01' else 'P1', finding=finding,
            applicability='FUTURE_DISTRIBUTION' if finding == 'FUTURE_DISTRIBUTION' else 'MANDATORY_DEV')

row('IIS01:§18.1:Positive wire fixtures', parents[1], 637, '§18.1;§18.3',
    'Both exact normative positive streams accepted by independent Python/TypeScript schema and connection-role validators.',
    ('accepts both normative fixture streams', 'roundtrips every canonical', 'python-parity'))

assert Counter(r['testId'].split('-T')[0] for r in matrix if '-T' in r['testId']) == {'I08': 88, 'I06': 52, 'I07': 56}
assert len([r for r in matrix if r['testId'].startswith('E05-')]) == 36
assert len([r for r in matrix if r['testId'].startswith('E2E-')]) == 8
assert len(matrix) == len({r['testId'] for r in matrix}) == 304
with (OUT / 'coverage-matrix.csv').open('w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(matrix[0]), lineterminator='\n'); w.writeheader(); w.writerows(matrix)

native = load('.cache/p9-native-full-01.json')
save('windows-evidence/native-probes.json', native)
save('windows-evidence/resources.json', dict(
    replay=load('.cache/p9-replay-metrics-full-01.json'),
    actualElectron=load('.cache/p9-electron-resources-02.json'),
    interpretation='Finite observations, not a long-duration soak or new CPU/RAM/latency SLA. Node replay metrics are not Electron Main metrics. RSS includes test/runtime caches; no leak guarantee inferred.'))
save('privacy-and-provider/historical-restore.json', load('.cache/p9-historical-provider-restore-01.json'))
save('db-evidence/renderer-inspection-restore.json', load('.cache/p9-inspection-restore-05.json'))
save('ui-evidence/runtime.json', load('.cache/p9-runtime-observed-04.json'))
save('protocol-fixtures/contract-summary.json', dict(
    publicMethods=23, subscriptions=3, requestActions=5, outerMessageTypes=5,
    eventSubtypes=9, sqliteTables=22,
    cases=[c['id'] for c in find('exactly five types', 'precisely the independent 23', 'matches all 22', 'python-parity')],
    fixtureFiles=[dict(path=p, sha256=digest(p)) for p in
                  ['contracts/ipc.ts', 'contracts/jsonl.ts', 'tests/fixtures/protocol.ts'] if (ROOT / p).is_file()],
    noPublicChanges=True))
save('db-evidence/fault-boundaries.json', dict(
    evidenceKind='Actual isolated SQLite, native online backup and controlled process exits; assertions named below',
    cases=[dict(id=c['id'], name=c['name']) for c in find('SQLITE_FULL', 'SQLITE_BUSY', 'exits before/after COMMIT', 'native online backup', 'P7-E07', 'P6-E03', 'E05-18')],
    interpretation='Before-COMMIT rollback is distinct from committed receipt; post-source-write/pre-evidence-COMMIT is partial undercount. No raw user DB or content attached. Exact event-COMMIT-before-push Main kill is not claimed.'))
paid = {p: digest(p) for p in ['.cache/p5-live-budget.json', '.cache/p7-final-live-budget.json']}
assert paid['.cache/p5-live-budget.json'] == 'edd0244f1ad016c2aa77c75deacb8e07bbd30815e7299a0e0921f6841c1de200'
assert paid['.cache/p7-final-live-budget.json'] == '06fcb97499f258eb5a8d1ea1d96928ad39e3ba74d0f3068800eca349fb973d7e'
gateway = []
for path in git('ls-files', 'kernel/gateway/*', engine=True).splitlines():
    before = git('rev-parse', f'834d0ca62cc9b2c03e530bafe4090024d98f31d3:{path}', engine=True)
    now = git('rev-parse', f'HEAD:{path}', engine=True)
    assert before == now
    gateway.append(dict(path=path, originalGitBlob=before, currentGitBlob=now, unchanged=True))
save('privacy-and-provider/boundaries.json', dict(
    paidCallsInP9=0, paidJournalSHA256=paid,
    originalGatewayUnchangedSinceAcceptedP5= gateway,
    carriedEvidence=[dict(path=p, sha256=digest(p)) for p in ['docs/implementation/P5/VERIFICATION-RESULTS.json', 'docs/implementation/P5/COMMIT-RECEIPT.md']],
    limitations=['Only DeepSeek Flash is an implemented Discussion route.', 'No genuinely local inference or second provider switch executed.', 'No new real-provider invalid-key or pressure-summary trial.', 'Main release is not remote receipt or recall. Discussion application separation is not arbitrary hostile-Python OS sandboxing.', 'Synthetic MockTransport credentials/budgets are not a paid route or replacement key.']))
groups = {}
for label, prefix in [('I08', 'I08-'), ('E2E', 'E2E-'), ('E05', 'E05-'), ('I06', 'I06-'), ('I07', 'I07-'), ('IIS01', 'IIS01:'), ('IIS02', 'IIS02:'), ('IIS03', 'IIS03:'), ('IIS04', 'IIS04:')]:
    groups[label] = dict(Counter(r['status'] for r in matrix if r['testId'].startswith(prefix)))
gates = {
    'G0': 'PASS', 'G1': 'INCONCLUSIVE', 'G2': 'PASS', 'G3': 'INCONCLUSIVE',
    'G4': 'INCONCLUSIVE', 'G5': 'INCONCLUSIVE', 'G6': 'BLOCKED', 'G7': 'INCONCLUSIVE',
    'G8-dev': 'PASS', 'G8-package': 'NOT_RUN — FUTURE DISTRIBUTION', 'G9-dev': 'BLOCKED'}
save('VERIFICATION-RESULTS.json', dict(
    phase='P9', tier='WINDOWS DEVELOPMENT-INTEGRATED ACCEPTANCE', date='2026-10-26',
    status='P9 FINAL OWNER REVIEW — NO-GO FOR FULL DEV ACCEPTANCE',
    branch='feature/p9-windows-integrated-acceptance', startingCommit=BASE,
    acceptedP8='b527a44bb5da47e63c835e71d902c3c6bc1ab1ac', enginePinnedCommit=ENGINE,
    desktopUniqueExecutableTotals=desktop, desktopComponents=dict(unitUIAndNative=dict(PASS=457, FAIL=0, NOT_RUN=3), python=dict(PASS=34, FAIL=0, NOT_RUN=0), windowsElectron=dict(PASS=37, FAIL=0, NOT_RUN=0)),
    engineRegression=engine_totals,
    counting='Latest executed result per (file,name), not a sum of diagnostic reruns. 304 normative rows counted separately. Historical paid P5 evidence is carried, never added to current executable totals.',
    conformance=groups, gates=gates, paidCallsThisPhase=0,
    checks=dict(buildTypeScript='PASS (.cache/p9-build-04.txt)', formatting='PASS (.cache/p9-format-03.txt)', frozenWorkingGitZIP='PASS (.cache/p9-frozen-01.json)', dependencies='UNCHANGED', engineSource='UNCHANGED'),
    preservedFailures=[dict(run='p9-build-01', status='FAIL', cause='New harness TypeScript: Playwright timeout signature and optional replay query limit; fixed harness types only, build02/03/04 pass.'), dict(run='p9-electron-01', passed=35, failed=1, cause='New historical-profile fixture omitted fileBroker:true; isolated profiles disable services, unlike default real launch. Enabled only local history/Broker, never model configuration.'), dict(run='p9-electron-02', passed=1, failed=1, cause='New independent Discussion exercise selected history index 1, which was the new conversation. Corrected to exact original conversation identity; unchanged running-state assertion.'), dict(run='p9-electron-03', passed=2, failed=0, cause='Both corrected P9 journeys pass.'), dict(run='p9-electron-04', passed=36, failed=0, cause='Full final suite of 36 identities passes; only new inspection-recovery case added afterwards.'), dict(run='p9-electron-05/06', passed=1, failed=0, cause='Additional exact inspection Renderer recovery passes; repeated with source-hash preservation assertion, counted once.')],
    findings=[dict(id='P9-F01', severity='P0', kind='MISSING_MANDATORY_SECURITY_PROOF', status='BLOCKED', detail='Native symlinks lack privilege (1314); mount/case-sensitive/Unicode/special-native variants incomplete. No demonstrated escape; G6/G9 cannot pass.'), dict(id='P9-F02', severity='P0', kind='MISSING_ROUTE_AND_CONSENT_INTEGRATION_PROOF', status='INCONCLUSIVE', detail='Second provider/model and genuine local inference unavailable; provider-switch/full handoff races not executed. No feature added by implication.'), dict(id='P9-F03', severity='P1', kind='PROVIDER_EVIDENCE_LIMIT', status='INCONCLUSIVE', detail='Current offline binding and restored accepted real answers proven; fresh post-restart inference/invalid remote key/pressure summary not run. No new API spend authorized.'), dict(id='P9-F04', severity='P1', kind='SOAK_EVIDENCE_LIMIT', status='INCONCLUSIVE', detail='2001-event real DB replay and five actual worker/UI reload cycles measured; not a long-duration combined high-rate GUI soak.'), dict(id='P9-F05', severity='P2', kind='HUMAN_REVIEW_PENDING', status='INCONCLUSIVE', detail='Automated functional accessibility passes on actual 125% display; human readability/accessibility approval pending. Visual redesign separately deferred; no waiver invented.'), dict(id='P9-F06', severity='P1', kind='SPECIFIC_FAULT_AND_TOPOLOGY_EVIDENCE_LIMIT', status='INCONCLUSIVE', detail='Complete OS service/socket inventory, exact T4-after-COMMIT/Main-kill-before-push, every intentional quit choice, actual broken-stdio at prepared boundary and huge-size native metadata remain incomplete; see per-row register. Exact inspection Renderer reopen is now PASS in P9-E2E05.')],
    engineChangeRequestRequired=False, productionCodeChanges=False,
    publicationPreflight=dict(initial='FAIL: Windows Python default CRLF differed from the Git LF-normalized index; caught by byte review before any P9 commit', correction='Generated P9 UTF-8 JSON explicitly writes LF; regenerate all dependent hashes and repeat exact index verification. Frozen/raw evidence bytes untouched.'),
    stop='P9 FINAL OWNER REVIEW; no P10, packaging, paid smoke, Engine edits or main merge.'))
raw = sorted(p for p in (ROOT / '.cache').glob('p9-*') if p.is_file() and p.suffix in ('.json', '.txt', '.xml', '.py'))
contracts = [dict(path=p.relative_to(ROOT).as_posix(), sha256=digest(p.relative_to(ROOT))) for p in sorted((ROOT / 'docs/engineering').rglob('*')) if p.is_file()]
save('run-manifest.json', dict(
    artifactType='iis08_test_run_manifest', runId='P9-WIN-2026-10-26', tier='WINDOWS DEVELOPMENT-INTEGRATED ACCEPTANCE',
    collectedAtUTC=datetime.now(timezone.utc).isoformat(), desktopBaseline=BASE, engineCommit=ENGINE,
    desktopMain='af682b74375a0b5827aa1fca0ff0815434803650', engineMain='834d0ca62cc9b2c03e530bafe4090024d98f31d3',
    environment={**load('.cache/p9-host-environment.json'), **load('.cache/p9-runtime-observed-04.json'), 'windowsUBR': 9711, 'windowsDisplayVersion': '25H2', 'profile': 'ISOLATED_SYNTHETIC_ONLY', 'configuration': 'Existing pinned local development runtime; no Administrator/global changes'},
    commands=['npm test -- --reporter=json --outputFile=.cache/p9-unit-full-01.json (NCD_P9_RUN_ID=full-01)', 'python -X utf8 -m unittest discover -s tests/python -v (credential variables removed; native stdout/stderr runner)', 'Engine .venv/Scripts/python.exe tests/run_offline.py -q -p no:cacheprovider --junitxml <isolated-report> (credential-free allowlist; no bytecode; source read-only)', 'npm run test:electron', "npx playwright test tests/electron/coding-engine.spec.ts tests/electron/p9-history.spec.ts --grep P9-E2E (two corrected identities only, runs02/03)", 'npm run build', 'npm run format:check', 'python -X utf8 docs/implementation/P0/verify_delivery.py --git-ref HEAD --archive <original-delivery-zip>', 'python -X utf8 docs/implementation/P9/collect-evidence.py'],
    runs=[dict(run='unit-full01', artifact='.cache/p9-unit-full-01.json', environment='WINDOWS_UNIT_UI_NATIVE', passed=457, failed=0, notRun=3, startedAtUTC=datetime.fromtimestamp(unit['startTime']/1000, timezone.utc).isoformat()),
          *[dict(run=f'electron-{n:02}', artifact=f'.cache/p9-electron-{n:02}.json', environment='ACTUAL_WINDOWS_ELECTRON', stats=load(f'.cache/p9-electron-{n:02}.json')['stats']) for n in range(1,7)],
          dict(run='python01', artifact='.cache/p9-python-01.txt', environment='PYTHON_ORIGINAL_GATEWAY_OFFLINE', passed=34, failed=0, seconds=3.841),
          dict(run='engine-full01', artifact='.cache/p9-engine-full-01.xml', environment='ACTUAL_ENGINE_OFFLINE_WINDOWS', passed=69, failed=0, notRun=3, seconds=38.27)],
    rawArtifacts=[dict(path=p.relative_to(ROOT).as_posix(), sha256=digest(p.relative_to(ROOT)), bytes=p.stat().st_size, publication='LOCAL_IGNORED_RAW; sanitized counterpart attached') for p in raw],
    contracts=contracts, frozenVerification=load('.cache/p9-frozen-01.json'), paidJournals=paid,
    provenance=dict(iis03ReissueSha256='d79d0f5a0960b64c7c806047407c7632d564c1cf4331ae7c5f185c0df129df48', closure='FCCR-01-C01 controlled reissue / N04-H01 prospective owner adoption CLOSED', historicalLostIIS03Original='NOT_VERIFIED; not recovered; never substituted by new prospective hash'),
    reproducibility='Run the existing pinned development install against a separate accepted read-only Engine checkout, isolated synthetic profiles/projects and Offline Gateway only. Native symlink execution needs a separately approved suitable test environment, not an automatic OS setting change. Historical restore requires the accepted isolated P5 live test ledger; absent ledger is unavailable evidence, never a reason to run paid tests.',
    evidence=[dict(path=p.relative_to(OUT).as_posix(), sha256=digest(p.relative_to(ROOT)), bytes=p.stat().st_size) for p in sorted(OUT.rglob('*')) if p.is_file() and p.name not in ('run-manifest.json', 'CHANGE-MANIFEST.json', 'COMMIT-RECEIPT.md')]))
print(json.dumps(dict(desktop=desktop, engine=engine_totals, normative=groups, matrixRows=len(matrix), unmatchedSelectors=sorted(unmatched_selectors)), indent=2))
