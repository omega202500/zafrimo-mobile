import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('les catalogues de traduction sont synchronises', () => {
  const result = spawnSync(process.execPath, ['scripts/check-i18n.js'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
