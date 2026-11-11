"""Credential-free offline unittest runner; unique R02 reports, never live tests."""
from pathlib import Path
import json
import os
import subprocess
import sys
import time
import unittest

run = sys.argv[1] if len(sys.argv) > 1 else str(time.time_ns())
if not run.replace('-', '').isalnum():
    raise SystemExit('Invalid run ID')
output = Path('.cache') / ('p9r02-python-' + run)
if '--child' not in sys.argv:
    assert not output.with_suffix('.txt').exists()
    env = {k: v for k, v in os.environ.items() if not any(s in k.upper() for s in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD'))}
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    with output.with_suffix('.txt').open('wb') as stream:
        result = subprocess.run([sys.executable, '-X', 'utf8', __file__, run, '--child'], env=env, stdout=stream, stderr=subprocess.STDOUT)
    print('Offline Python native exit:', result.returncode)
    raise SystemExit(result.returncode)
sys.dont_write_bytecode = True


class Result(unittest.TextTestResult):
    records = []

    def startTest(self, test):
        self.started = time.perf_counter()
        super().startTest(test)

    def record(self, test, status):
        self.records.append(dict(name=test.id(), status=status, durationMs=(time.perf_counter()-self.started)*1000))

    def addSuccess(self, test):
        super().addSuccess(test)
        self.record(test, 'PASS')

    def addError(self, test, error):
        super().addError(test, error)
        self.record(test, 'FAIL')

    def addFailure(self, test, error):
        super().addFailure(test, error)
        self.record(test, 'FAIL')

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.record(test, 'NOT_RUN')


suite = unittest.defaultTestLoader.discover('tests/python')
result = unittest.TextTestRunner(verbosity=2, resultclass=Result).run(suite)
output.with_suffix('.json').write_text(json.dumps(result.records, indent=2)+'\n', encoding='utf-8', newline='\n')
raise SystemExit(not result.wasSuccessful())
