// Give Movies independent preferences while reusing the Anime4K renderer and HLS policy.
export const enhancementLabel = scope => scope === 'movie' ? 'Movie 4K' : 'Anime4K';
export const enhancementKey = (scope, key) => scope === 'movie' ? key.replace(/^anime4k/, 'movie4k') : key;
export function enhancementSettings(settings, scope = 'anime') {
  if (scope !== 'movie') return settings;
  return {
    ...settings,
    anime4kMode: settings.movie4kMode || 'off',
    anime4kWarningAcknowledged: !!settings.movie4kWarningAcknowledged,
    anime4kQuality: settings.movie4kQuality || 'max',
    anime4kMobileQuality: settings.movie4kMobileQuality || '720',
    setSetting: (key, value) => settings.setSetting(enhancementKey(scope, key), value),
  };
}
