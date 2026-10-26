export function apiErrorMessage(status, retryAfter) {
  if (status === 401) return "Votre session a expiré. Reconnectez-vous pour continuer.";
  if (status === 403) return "Votre compte n’a pas accès à ce contenu.";
  if (status === 404) return "Ce contenu n’est plus disponible chez ce fournisseur.";
  if (status === 410) return "Le lien a expiré. Rechargez l’épisode.";
  if (status === 429) return `Le service reçoit trop de demandes. Réessayez${retryAfter > 0 ? ` dans ${retryAfter} s` : " dans un instant"}.`;
  if (status >= 500) return "Le fournisseur ne répond pas correctement. Réessayez dans un instant.";
  return `La requête a échoué (HTTP ${status}).`;
}
export function isRetryableStatus(status) { return status >= 500 && status <= 599; }
