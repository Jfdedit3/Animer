# Animer — Anime après minuit

Version web et PWA du client Anime Yoru, dérivée du client public [Nartya](https://github.com/NartyaTeam/nartya) sous licence ISC. Interface mobile et PC, effet glass réglable, catalogue, recherche, fiches et épisodes, planning, lecteur Artplayer/HLS, sous-titres, progression, favoris et listes. Les écrans de profil, communauté et mangas du client existant sont conservés.

Ce client est indépendant de Nartya. L’application Android existante n’est pas modifiée.

## Démarrer

Node.js 22.12 ou plus récent.

```sh
npm ci
cp .env.example .env
npm run dev
```

Le site de développement utilise `http://127.0.0.1:5175`, avec le relais sur `127.0.0.1:8788`. La navigation est gérée par hash (`/#/anime/...`), et le retour OAuth par `/auth/callback`.

```sh
npm test
npm run test:upstream
npm run build
npm run preview
```

Le build crée les ressources web dans `dist/client/` et un Worker ESM autonome dans `dist/server/index.js`. Le serveur Node de prévisualisation lance ce même Worker. Les illustrations de profil volumineuses sont servies depuis `public/profile-art/` de ce dépôt GitHub public ; elles restent incluses dans les sources.

## Configuration de la connexion

**Important : le domaine du site doit être autorisé par le service de compte.** Les valeurs Supabase de `.env.example` sont la configuration publique publiée par le client Nartya, pas des clés administrateur.

Pour utiliser le compte Nartya sur un nouveau domaine, l’équipe Nartya doit autoriser :

- l’URL `https://VOTRE-DOMAINE/BASE/auth/callback/` (sans `BASE/` pour un site à la racine) dans les redirections Supabase ;
- le domaine dans Cloudflare Turnstile, ou fournir une clé publique de captcha autorisée pour ce domaine (`VITE_TURNSTILE_SITEKEY`) ;
- l’accès du client aux services concernés, selon leurs règles.

Sans ces autorisations, le code de connexion peut être déployé, mais la connexion réelle peut être refusée. Le site ne contourne ni le captcha, ni l’authentification. L’API catalogue Nartya répond HTTP 401 sans session ; une première visite ouvre donc l’écran de connexion. Les flux restent soumis à l’accès du compte.

Pour une instance que vous administrez, adaptez les variables publiques Supabase et les contrats d’API. Aucun compte utilisateur, mot de passe, jeton personnel ou clé `service_role` n’est fourni dans le dépôt.

## Relais vidéo

Le navigateur remplace le proxy natif Android par un relais du même site :

- `/api/v1/*` relaie l’API configurée, avec le jeton de session du compte lorsque présent ;
- `/api/web/resolve` échange un jeton d’épisode, charge la recette publique du client et résout le flux ;
- `/api/media?t=...` diffuse uniquement une destination contenue dans une capacité chiffrée et limitée dans le temps ;
- les playlists HLS, variantes, clés et cartes d’initialisation sont réécrites ; les plages HTTP des MP4 et les statuts 206/416 sont conservés ;
- les sessions Nartya ne sont jamais transmises aux hébergeurs vidéo.

Variables **serveur**, à configurer chez l’hébergeur :

| Variable | Usage |
|---|---|
| `UPSTREAM_API_URL` | Origine de l’API, par défaut `https://anime.nartya.app` |
| `STREAM_SIGNING_KEY` | Clé aléatoire de 32 octets encodée en base64/base64url ; uniquement côté serveur |

Ne pas préfixer cette clé serveur par `VITE_`, ni la committer. Pour le serveur Node local, définissez-la dans l’environnement du processus. Une rotation invalide les anciens liens de lecture.

Certains hébergeurs peuvent refuser les adresses IP de datacenter, lier un flux à une IP, ou demander un navigateur complet. Le relais garde la résolution et la lecture côté serveur, mais ne garantit pas tous les fournisseurs. Une autre source peut être nécessaire. Aucun épisode réel n’a été validé avec un compte Nartya pendant ce travail.

## Déployer

### GitHub Pages

Le dépôt contient désormais un build **statique dédié** et le workflow `.github/workflows/pages.yml`. Les ressources, la PWA et le retour OAuth utilisent le préfixe `/Animer/`.

1. Dans [Settings → Pages](https://github.com/Jfdedit3/Animer/settings/pages), sélectionner **GitHub Actions** comme source.
2. Dans Actions, lancer **Publier sur GitHub Pages** ; les prochains pushes sur `main` relancent le déploiement.

Pages est activé avec la source GitHub Actions sur ce dépôt. Sur une copie du dépôt, si l’activation automatique retourne `403 Resource not accessible by integration`, le propriétaire doit effectuer le premier réglage dans Settings → Pages.

Adresse de publication : **https://jfdedit3.github.io/Animer/**. La page de retour de connexion réellement générée est :

```text
https://jfdedit3.github.io/Animer/auth/callback/
```

Cette adresse doit être ajoutée aux redirections autorisées du projet Supabase Nartya, et `jfdedit3.github.io` aux domaines du captcha Turnstile. Le site conserve le vérificateur PKCE dans le navigateur ; une redirection seule ne remplace pas l’autorisation du domaine par Nartya. Le code d’authentification est retiré de la barre d’adresse après réception. La confirmation par e-mail utilise aussi cette adresse.

```sh
npm run build:pages
# Ressources statiques : dist/pages/
```

Le build inclut `auth/callback/index.html`, un manifeste dont le scope est `/Animer/`, un service worker limité à ce projet et `.nojekyll`. Il n’utilise pas de route serveur pour le retour OAuth.

Sans relais, la version Pages interroge directement l’API Nartya avec le compte autorisé. Le préflight de l’API a été vérifié : elle accepte l’origine `https://jfdedit3.github.io`. La lecture utilise le lecteur du fournisseur dans une iframe protégée lorsque l’API l’autorise, ou une URL vidéo directe lorsqu’elle est fournie. Certains fournisseurs refusent les iframes ; une autre source peut être nécessaire. Le suivi automatique du temps, Anime4K et les contrôles avancés du lecteur Animer ne sont pas disponibles dans une iframe tierce.

Pour retrouver le lecteur Animer complet, déployer le relais sur un hébergement serveur public et configurer :

- la variable **de dépôt** GitHub `ANIMER_RELAY_URL` avec son adresse HTTPS (sans jeton ni clé) ;
- `ALLOWED_WEB_ORIGINS=https://jfdedit3.github.io` dans l’environnement **du relais** ;
- éventuellement la variable publique de dépôt `ANIMER_TURNSTILE_SITEKEY` avec une clé de captcha autorisée.

La publication Sites antérieure est privée et n’est pas utilisée comme relais public par GitHub Pages. Aucune clé d’accès à cette publication n’est embarquée dans le site.

### Hébergement avec relais

Le dépôt contient `wrangler.toml` pour Cloudflare Workers. Installez/utilisez le CLI Wrangler dans votre environnement authentifié, configurez `STREAM_SIGNING_KEY` avec `wrangler secret put STREAM_SIGNING_KEY`, puis lancez `npm run deploy:cloudflare`.

GitHub Pages ne peut pas exécuter le relais vidéo ; son build dédié propose le lecteur du fournisseur. Pour un autre serveur, `npm run build` puis `npm run preview` lance l’ensemble sur le port `PORT` (8788 par défaut) ; placez-le derrière HTTPS et un reverse proxy. Le serveur local écoute sur le loopback.

La configuration `.openai/hosting.json` identifie aussi la publication Sites créée pendant ce travail. Elle ne contient aucun secret. La publication Sites commence en accès privé et ne change pas l’accès du dépôt GitHub public.

## PWA et limites du navigateur

Manifest installable et service worker pour la coque du site. Le cache exclut les API, les retours d’authentification, les vidéos et les requêtes par plages. La PWA n’offre pas le téléchargement d’épisodes natif ni le visionnage hors ligne d’un flux.

Anime4K est proposé selon les capacités WebGL/WebGPU réelles du navigateur. Lecture normale disponible quand le filtre est incompatible. Les téléchargements natifs, la présence Discord et certains contrôles système Android ne sont pas disponibles sur le web.

## Vérifications

Les tests `web-*` couvrent les capacités chiffrées, adresses et redirections interdites, réécriture HLS, réponses par plages, routage et frontières des jetons, cache PWA. Le sous-ensemble de tests hérités couvre notamment les sessions, filtres, qualité vidéo et politiques Anime4K.

Les parcours Chromium utilisent des réponses d’API et de compte simulées, et une vidéo générée de test. Ils vérifient le rendu mobile/PC, les fiches, épisodes, résolution et décodage vidéo. Ils ne prouvent pas l’autorisation du nouveau domaine par Nartya ni la compatibilité de tous les hébergeurs réels.

Licence et attributions : [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
