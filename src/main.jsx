import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import { useAchievementUnlockStore } from "./stores/useAchievementUnlockStore.js";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.jsx";
import InterfacePreferences from "./components/InterfacePreferences";
import { platform } from "./platform/index.js";
import { installGlobalErrorLogging } from "./api/clientLogs.js";
import { useSettingsStore } from "./stores/useSettingsStore.js";
import NartyaIntro from "./components/NartyaIntro.jsx";
import HalloweenIntro from "./components/HalloweenIntro.jsx";
import { isHalloween } from "./lib/season.js";
import "./index.css";
import "./styles/yoru.css";
import "./styles/glass.css";
import "./styles/web.css";
import WebInstall from "./components/WebInstall.jsx";

const AchievementUnlock = lazy(() => import("./components/achievements/AchievementUnlock.jsx"));

if (platform.isMobile) document.documentElement.classList.add("mobile-runtime");

// Avant le rendu, pour ne pas manquer une exception au montage.
installGlobalErrorLogging();

/** La fenêtre est créée cachée : on attend qu'elle soit visible pour jouer l'ident. */
function AppIntro() {
  const [state, setState] = useState(() =>
    !useSettingsStore.getState().nartyaIntro
      ? "done"
      : document.visibilityState === "visible"
        ? "playing"
        : "waiting"
  );

  useEffect(() => {
    if (state !== "waiting") return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") setState("playing");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [state]);

  if (state !== "playing") return null;
  const Intro = isHalloween() ? HalloweenIntro : NartyaIntro;
  return <Intro onDone={() => setState("done")} />;
}

function AchievementUnlockHost() {
  const hasPending = useAchievementUnlockStore((state) => state.queue.length > 0);
  if (!hasPending) return null;
  return (
    <Suspense fallback={null}>
      <AchievementUnlock />
    </Suspense>
  );
}

// The PWA worker caches only the shell, never sessions, API responses or video.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <InterfacePreferences />
      <WebInstall />
      <App />
      {/* La cérémonie de succès couvre toute l'app, lecteur compris. */}
      <AchievementUnlockHost />
      <AppIntro />
      {platform.isMobile ? (
        <ToastContainer
          theme="dark"
          position="bottom-center"
          autoClose={2600}
          transition={Slide}
          icon={false}
          limit={1}
          closeButton={false}
          hideProgressBar
          pauseOnFocusLoss={false}
          pauseOnHover={false}
          draggable="touch"
          draggableDirection="y"
          draggablePercent={30}
        />
      ) : (
        <ToastContainer theme="dark" position="bottom-right" autoClose={3500} />
      )}
    </HashRouter>
  </React.StrictMode>
);
