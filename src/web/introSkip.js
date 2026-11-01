export function introSkipSeconds(value) {
  const seconds = Number(value);
  return [60, 85, 90, 120].includes(seconds) ? seconds : 90;
}

export function introSkipTarget(time, duration, seconds = 90) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 1 || time < 0) return null;
  const target = Math.min(time + introSkipSeconds(seconds), duration - 1);
  return target > time + 0.5 ? target : null;
}
