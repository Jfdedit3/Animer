export function resolveInterfacePolicy(settings, device = {}) {
  const reducedMotion = !!settings.reduceMotion || !!device.prefersReducedMotion;
  const lowPower = settings.performanceMode === "eco" || (settings.performanceMode !== "quality" && (device.saveData || (device.memory > 0 && device.memory <= 4) || (device.cores > 0 && device.cores <= 4)));
  return { reducedMotion, glass: settings.glassEffects !== false, liteGlass: lowPower, animations: !reducedMotion };
}
