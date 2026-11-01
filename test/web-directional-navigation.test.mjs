import test from 'node:test';
import assert from 'node:assert/strict';
import { directionalTarget } from '../src/web/directionalNavigation.js';

const rect = (left, top, width = 120, height = 180) => ({ left, top, width, height });
const grid = Array.from({length: 12}, (_, id) => ({ id, rect: rect((id % 4) * 150, Math.floor(id / 4) * 210) }));
test('directional keys keep a film grid row and column', () => {
  for (const [key, id] of [['ArrowLeft',4], ['ArrowRight',6], ['ArrowUp',1], ['ArrowDown',9]]) {
    assert.equal(directionalTarget(grid, grid[5].rect, key).id, id);
  }
});
test('no wrap at an edge; scrollable offscreen cards remain reachable', () => {
  assert.equal(directionalTarget(grid, grid[3].rect, 'ArrowRight'), null);
  const far = {id:'offscreen', rect:rect(0,2000)};
  assert.equal(directionalTarget([far], grid[0].rect, 'ArrowDown'), far);
  assert.equal(directionalTarget([], grid[0].rect, 'ArrowDown'), null);
});
test('an aligned control wins over an adjacent diagonal card', () => {
  const aligned = {id:'same-row', rect:rect(600,0)};
  const diagonal = {id:'other-row', rect:rect(150,210)};
  assert.equal(directionalTarget([diagonal,aligned], grid[0].rect, 'ArrowRight'), aligned);
  assert.equal(directionalTarget(grid, grid[0].rect, 'Enter'), null);
});
