# Validation Animer 1.1.0 — GitHub Pages

- 15 tests web/relais/PWA et 34 tests hérités réussis.
- Build statique Pages réussi : ressources sous `/Animer/`, vraie page `auth/callback/index.html`, manifeste et service worker limités au projet.
- Build Vite + Worker également vérifié pour conserver la variante avec relais.
- Chromium mobile 390×844 sur un serveur statique sans réécriture ni API : retour OAuth avec le SDK Supabase, challenge et vérificateur PKCE, nettoyage du code dans l’URL, message de refus OAuth, lecture et décodage d’un MP4 dans une iframe protégée, passage à l’épisode suivant. Aucune erreur JavaScript, aucune requête API vers Pages, aucun jeton de compte transmis au fournisseur.
- Les comptes, réponses Supabase/Nartya et lecteur fournisseur sont simulés ; la vidéo est générée pour les tests. Ce parcours ne prouve pas une connexion réelle ou la compatibilité des hébergeurs réels.
- Pages est activé avec la source workflow sur le dépôt. Le workflow dédié publie `dist/pages/`.
- L’administrateur Nartya doit autoriser `https://jfdedit3.github.io/Animer/auth/callback/` dans Supabase et `jfdedit3.github.io` dans Turnstile. Aucune autorisation administrative Nartya n’est disponible depuis ce dépôt.
- Sans relais, les contrôles avancés Animer, Anime4K et le suivi automatique de progression ne fonctionnent pas dans une iframe tierce. Les fournisseurs peuvent refuser leur intégration.
- Un relais HTTPS optionnel peut être configuré par `ANIMER_RELAY_URL`, avec une origine CORS explicite côté serveur. La publication Sites antérieure reste privée et n’est pas utilisée par Pages.

`pages-browser.json` contient les assertions du parcours Pages. `browser.json` conserve le précédent parcours de la variante avec relais (1.0.0). `build-inputs.json` contient les empreintes des sources actuelles ; journaux et captures locaux ne sont pas publiés dans Git.
