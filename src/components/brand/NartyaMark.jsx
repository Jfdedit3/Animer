/** Yoru's own crescent mark. The original client is credited in THIRD_PARTY_NOTICES.md. */
export function Fox({ className = "h-12 w-12", ...rest }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true" {...rest}>
      <path d="M46 8a25 25 0 1 0 10 37A26 26 0 0 1 46 8Z" fill="currentColor" />
      <path d="m28 24 14 9-14 9V24Z" fill="currentColor" />
      <path d="m52 11 1.5 4.5L58 17l-4.5 1.5L52 23l-1.5-4.5L46 17l4.5-1.5L52 11Z" fill="currentColor" />
    </svg>
  );
}
export function HalloweenFox({ children, ...rest }) {
  return <span className="inline-flex"><Fox {...rest} />{children}</span>;
}
export function NartyaLockup({ className = "" }) {
  return (
    <div className={`yoru-lockup ${className}`} aria-label="Animer, client indépendant pour Nartya">
      <Fox className="h-14 w-14 text-primary" />
      <div><p className="yoru-wordmark">animer<span>.</span></p><p className="yoru-caption">L’ANIME APRÈS MINUIT</p></div>
    </div>
  );
}
