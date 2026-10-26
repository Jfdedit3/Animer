import {isMobileAnime4kMode,mobileInputBudget} from "@/utils/anime4kPolicy";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  ShieldAlert,
  X,
} from "lucide-react";
import { assessAnime4kCapability } from "@/utils/anime4k";

const STATUS_META = {
  recommended: {
    Icon: CheckCircle2,
    border: "border-emerald-400/25",
    bg: "bg-emerald-400/[0.07]",
    text: "text-emerald-300",
  },
  caution: {
    Icon: Gauge,
    border: "border-amber-300/25",
    bg: "bg-amber-300/[0.07]",
    text: "text-amber-200",
  },
  poor: {
    Icon: AlertTriangle,
    border: "border-primary/30",
    bg: "bg-primary/[0.07]",
    text: "text-primary",
  },
  unsupported: {
    Icon: ShieldAlert,
    border: "border-primary/35",
    bg: "bg-primary/[0.09]",
    text: "text-primary",
  },
};

const fallbackReport = {
  status: "caution",
  title: "Compatibilité à confirmer",
  summary: "Comparez votre carte graphique au minimum conseillé avant d'activer l'effet.",
  gpu: "Lecture des informations graphiques…",
  memoryGb: null,
  cpuCores: null,
  webgpu: true,
};

export default function Anime4kWarningModal({ mode, sourceWidth, sourceHeight, onConfirm, onCancel }) {
  // Remplacé dès que le diagnostic GPU répond.
  const [report, setReport] = useState(fallbackReport);
  const [checking,setChecking]=useState(true);
  const [copyStatus,setCopyStatus]=useState("");

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    assessAnime4kCapability({ mode, sourceWidth, sourceHeight })
      .catch(() => fallbackReport)
      .then((result) => {
        if (!cancelled) {setReport(result || fallbackReport);setChecking(false);}
      });
    return () => {
      cancelled = true;
    };
  }, [mode, sourceWidth, sourceHeight]);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const portalTarget = document.fullscreenElement || document.webkitFullscreenElement || document.body;
  const meta = STATUS_META[report.status] || STATUS_META.caution;
  const StatusIcon = meta.Icon;
  const mobile=isMobileAnime4kMode(mode);
  const outputHeight = sourceHeight ? (mobile ? sourceHeight * 2 : Math.min(sourceHeight * 2, 2160)) : 0;
  const unavailable = checking || report.status === "unsupported";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Activer Anime4K" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Annuler"
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-md"
        onClick={onCancel}
      />

      <section className="animate-slide-up relative flex max-h-[90vh] w-full max-w-[30rem] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_28px_90px_-24px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
        <div className="h-[2px] shrink-0 bg-primary/80" />

        <header className="relative px-6 pb-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="absolute right-4 top-4 rounded-md p-1 text-muted transition-colors hover:bg-white/[0.06] hover:text-text"
          >
            <X size={18} />
          </button>
          <div className="pr-8">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-6 bg-primary" />
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-primary">
                Qualité d'image
              </p>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">Anime4K</h2>
            <p className="mt-1 text-sm text-muted">Amélioration visuelle en temps réel</p>
          </div>
        </header>

        <div className="overflow-y-auto px-6 pb-5">
          <p className="text-sm leading-relaxed text-text/90">
            Anime4K affine les contours et améliore la netteté de votre épisode en temps réel.
            En contrepartie, le traitement peut provoquer des saccades sur une carte graphique
            trop modeste.
          </p>

          <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3.5 ${meta.border} ${meta.bg}`}>
            <StatusIcon size={19} className={`mt-0.5 shrink-0 ${meta.text}`} />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${meta.text}`}>{report.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{report.summary}</p>
              <p className="mt-2 truncate text-[0.7rem] font-medium text-text/75" title={report.gpu}>
                {report.gpu}
              </p>
              {mobile && !checking && report.gpuIdentified===false && <p className="mt-2 text-xs leading-relaxed text-muted">Le nom peut être masqué par Android. La compatibilité dépend des vérifications ci-dessous, pas du nom du GPU.</p>}
            </div>
          </div>
          {mobile && !checking && report.checks && <details className="mt-4 rounded-lg border border-border p-3 text-xs">
            <summary className="cursor-pointer py-2 font-semibold">Vérifications graphiques</summary>
            <ul className="mt-2 space-y-2">{report.checks.map(item=><li key={item.id} className="flex justify-between gap-3"><span>{item.label}</span><strong className={item.supported?"text-emerald-300":"text-amber-200"}>{item.supported?"Disponible":"Manquant"}</strong></li>)}</ul>
            <button className="yoru-small-button mt-3" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify({gpu:report.gpu,gpuIdentified:report.gpuIdentified,compatible:report.status!=="unsupported",renderPath:report.renderPath,checks:report.checks,reason:report.reason||null,webView:navigator.userAgent},null,2));setCopyStatus("Diagnostic copié. Vous pouvez le coller dans la conversation.");}catch{setCopyStatus("Copie indisponible. Vous pouvez sélectionner le texte ci-dessous.");}}}>Copier le diagnostic</button>
            <p role="status" className="mt-2 text-muted">{copyStatus}</p>
            {copyStatus.startsWith("Copie indisponible")&&<textarea aria-label="Diagnostic à copier" readOnly rows={6} className="mt-2 w-full bg-bg p-2 text-text" value={JSON.stringify({gpu:report.gpu,checks:report.checks,reason:report.reason,webView:navigator.userAgent},null,2)}/>}
          </details>}

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.05] text-muted">
              <Cpu size={16} />
            </span>
            <div>
              <p className="text-xs font-semibold text-text">{mobile ? "Conseil Android" : "Minimum conseillé par Nartya"}</p>
              <p className="mt-0.5 text-xs text-muted">
                {mobile ? "WebView à jour, profil léger et source 720p pour commencer. Batterie et température à surveiller." : "GTX 1060, RX 580 ou Apple M1 — avec 8 Go de RAM"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[0.7rem] leading-relaxed text-muted/70">
            {mobile ? `WebGL · ${mode=== "mobile-s" ? "CNN S" : "CNN M"} · source ≤ ${mobileInputBudget(mode).height}p` : `Mode ${mode.toUpperCase().split("").join("+")}`}
            {sourceHeight && outputHeight ? ` · ${sourceHeight}p vers ${outputHeight}p` : " · résolution doublée"}.
            La détection reste une estimation locale et aucune information matérielle n'est envoyée.
          </p>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-bg/20 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!report || unavailable}
            className="btn-shu px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={16} />
            {checking ? "Vérification…" : unavailable ? "Indisponible" : "Compris"}
          </button>
        </footer>
      </section>
    </div>,
    portalTarget
  );
}
