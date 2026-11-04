import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';
import { enhancementSettings } from '../src/utils/playerEnhancement.js';
import { anime4kQualityPreference } from '../src/utils/anime4kPolicy.js';

test('Movie 4K starts off independently and disabling it preserves Anime4K preferences', () => {
  const state = { anime4kMode: 'aa', anime4kWarningAcknowledged: true, anime4kQuality: '1080', setSetting: (key, value) => { state[key] = value; } };
  assert.equal(enhancementSettings(state, 'movie').anime4kMode, 'off');
  assert.equal(enhancementSettings(state, 'movie').anime4kWarningAcknowledged, false);
  const movies = enhancementSettings(state, 'movie');
  movies.setSetting('anime4kMode', 'mobile-s');
  movies.setSetting('anime4kWarningAcknowledged', true);
  movies.setSetting('anime4kMobileQuality', '1080');
  assert.equal(anime4kQualityPreference(enhancementSettings(state, 'movie')), '720');
  movies.setSetting('anime4kMode', 'off');
  assert.equal(state.anime4kMode, 'aa');
  assert.equal(state.anime4kQuality, '1080');
  assert.equal(enhancementSettings(state).anime4kMode, 'aa');
});

test('HLS quality follows Movie 4K instead of Anime4K and restores ABR when disabled', async () => {
  const state = { anime4kMode: 'aa', anime4kQuality: '1080', movie4kMode: 'off', playbackQuality: 'auto' };
  const result = await build({ entryPoints: ['src/utils/hlsConfig.js'], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': path.resolve('src') }, plugins: [{ name: 'runtime-fixture', setup(api) {
    api.onResolve({ filter: /^(hls\.js|@\/stores\/useSettingsStore|@\/platform)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'hls.js'
      ? 'export default class Hls { constructor(config) { this.config=config; this.levels=[{height:360},{height:720},{height:1080}]; this.currentLevel=0; } }'
      : args.path.includes('useSettingsStore') ? 'export const useSettingsStore={getState:()=>globalThis.__movie4kTestState};'
        : 'export const platform={isMobile:false,os:"linux"};' }));
  } }] });
  globalThis.__movie4kTestState = state;
  try {
    const { createFastStartHlsInstance, applyPreferredQuality, addQualitySettingToPlayer } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
    state.setSetting = (key, value) => { state[key] = value; };
    const hls = createFastStartHlsInstance({}, null, () => enhancementSettings(state, 'movie'));
    applyPreferredQuality(hls);
    assert.equal(hls.loadLevel, -1);
    assert.equal(hls._nartyaAnime4kLockedLevel, -1);
    state.movie4kMode = 'a'; state.movie4kQuality = '720';
    applyPreferredQuality(hls);
    assert.equal(hls.loadLevel, 1);
    let menu;
    const art = { setting: { add: option => { menu = option; }, update: option => { menu = option; } } };
    addQualitySettingToPlayer(art, hls);
    menu.onSelect({ value: 0 });
    await Promise.resolve();
    assert.equal(state.movie4kQuality, '360');
    assert.equal(state.anime4kQuality, '1080');
    state.movie4kMode = 'off';
    applyPreferredQuality(hls);
    assert.equal(hls.loadLevel, -1);
    assert.equal(hls.config.preserveManualLevelOnError, false);
  } finally { delete globalThis.__movie4kTestState; }
});
