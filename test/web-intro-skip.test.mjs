import test from 'node:test';
import assert from 'node:assert/strict';
import { introSkipTarget, introSkipSeconds } from '../src/web/introSkip.js';

test('manual intro skip uses the current time and selected duration', () => {
  assert.equal(introSkipTarget(42,1440,90),132);
  assert.equal(introSkipTarget(42,1440,85),127);
  assert.equal(introSkipTarget(0,1440,120),120);
  assert.equal(introSkipSeconds('60'),60);
  assert.equal(introSkipSeconds('corrupt'),90);
});
test('skip never finishes an episode and refuses unavailable/live media', () => {
  assert.equal(introSkipTarget(1400,1440),1439);
  for (const [time,duration] of [[1439,1440],[0,0],[0,Infinity],[NaN,1440],[-1,1440]]) assert.equal(introSkipTarget(time,duration),null);
});
