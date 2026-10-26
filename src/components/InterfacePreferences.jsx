import { useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { resolveInterfacePolicy } from "@/utils/interfacePolicy";
export default function InterfacePreferences() {
  const reduceMotion = useSettingsStore(s=>s.reduceMotion);
  const glassEffects = useSettingsStore(s=>s.glassEffects);
  const performanceMode = useSettingsStore(s=>s.performanceMode);
  useEffect(()=>{
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const apply=()=>{
      const p=resolveInterfacePolicy({reduceMotion,glassEffects,performanceMode},{prefersReducedMotion:query.matches,memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,saveData:navigator.connection?.saveData});
      document.documentElement.classList.toggle("reduce-motion",p.reducedMotion);
      document.documentElement.classList.toggle("yoru-glass-off",!p.glass);
      document.documentElement.classList.toggle("yoru-glass-lite",p.liteGlass);
    };
    apply();query.addEventListener("change",apply);navigator.connection?.addEventListener("change",apply);
    return ()=>{query.removeEventListener("change",apply);navigator.connection?.removeEventListener("change",apply);};
  },[reduceMotion,glassEffects,performanceMode]);
  return null;
}
