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

- l’URL `https://VOTRE-DOMAINE/auth/callback` dans les redirections Supabase ;
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

Le dépôt contient `wrangler.toml` pour Cloudflare Workers. Installez/utilisez le CLI Wrangler dans votre environnement authentifié, configurez `STREAM_SIGNING_KEY` avec `wrangler secret put STREAM_SIGNING_KEY`, puis lancez `npm run deploy:cloudflare`.

Un hébergement purement statique comme GitHub Pages ne suffit pas au relais vidéo. Pour un autre serveur, `npm run build` puis `npm run preview` lance l’ensemble sur le port `PORT` (8788 par défaut) ; placez-le derrière HTTPS et un reverse proxy. Le serveur local écoute sur le loopback.

La configuration `.openai/hosting.json` identifie aussi la publication Sites créée pendant ce travail. Elle ne contient aucun secret. La publication Sites commence en accès privé et ne change pas l’accès du dépôt GitHub public.

## PWA et limites du navigateur

Manifest installable et service worker pour la coque du site. Le cache exclut les API, les retours d’authentification, les vidéos et les requêtes par plages. La PWA n’offre pas le téléchargement d’épisodes natif ni le visionnage hors ligne d’un flux.

Anime4K est proposé selon les capacités WebGL/WebGPU réelles du navigateur. Lecture normale disponible quand le filtre est incompatible. Les téléchargements natifs, la présence Discord et certains contrôles système Android ne sont pas disponibles sur le web.

## Vérifications

Les tests `web-*` couvrent les capacités chiffrées, adresses et redirections interdites, réécriture HLS, réponses par plages, routage et frontières des jetons, cache PWA. Le sous-ensemble de tests hérités couvre notamment les sessions, filtres, qualité vidéo et politiques Anime4K.

Les parcours Chromium utilisent des réponses d’API et de compte simulées, et une vidéo générée de test. Ils vérifient le rendu mobile/PC, les fiches, épisodes, résolution et décodage vidéo. Ils ne prouvent pas l’autorisation du nouveau domaine par Nartya ni la compatibilité de tous les hébergeurs réels.

Licence et attributions : [LICENSE](LICENSE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
