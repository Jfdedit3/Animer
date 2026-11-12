# Animer — Anime après minuit

Site anime et PWA **sans inscription ni connexion**, publié sur **https://jfdedit3.github.io/Animer/**. Interface responsive avec effet glass et bibliothèque enregistrée dans le navigateur.

## Interface

Accueil avec sélection illustrée, recherche distincte, navigation regroupée et compteur de favoris. Les trois œuvres mises en avant proviennent du catalogue Anime-Sama inclus ; c'est une sélection éditoriale, sans classement de popularité. Les fiches, listes, favoris et réglages partagent les couleurs et les surfaces en verre. Navigation tactile en bas sur téléphone, grille responsive, chargement progressif, lien d'accès au contenu et respect des préférences de réduction des animations.

La version 1.6 ajoute une rangée « Récemment regardés » alimentée par l’historique local, des cartes de progression et un lecteur mieux encadré avec titre et langue. Les flèches déplacent la sélection visible entre liens, cartes et boutons ; Entrée active la sélection. Les champs de texte et sélecteurs gardent leurs commandes habituelles. Les dialogues limitent la navigation à leur contenu. Dans le lecteur, les flèches gauche/droite cherchent de 10 secondes, haut/bas règlent le volume et Entrée contrôle lecture/pause ; Tab permet de rejoindre les commandes.

Dans Réglages → Interface du site, choisir **Animer** (l’apparence actuelle, conservée par défaut) ou **Nartya Anime** (disposition distincte avec le carrousel Nartya, menu latéral repliable, recherche dans l’en-tête, rangées horizontales et fiche avec fond illustré). Le choix s’applique immédiatement et reste enregistré dans le navigateur, sans changer les données de la bibliothèque. Les deux apparences conservent les réglages glass et de réduction des animations.

## Fonctionnement

- Catalogue de secours inclus : jusqu’à 500 fiches TV/films issues d’anime-offline-database (ODbL / DbCL), datées et signalées à l’écran en cas de panne de Jikan.
- Catalogue Anime-Sama par défaut : recherche, fiches, saisons, langues et listes d’épisodes récupérés sur `https://anime-sama.to/` par le relais.
- Jikan / MyAnimeList reste disponible dans Réglages pour les métadonnées sans vidéo.
- Fiches, synopsis, notes, bandes-annonces et épisodes répertoriés.
- Favoris, listes, épisodes vus et historique conservés dans `localStorage` sur cet appareil.
- Export/import JSON depuis Réglages. L’import remplace la bibliothèque locale. Effacer les données du site supprime la bibliothèque : exportez-la pour la conserver.
- Préférences d’interface persistantes : effet glass et réduction des animations.
- Aucune synchronisation de compte, aucun appel Supabase, aucun jeton de compte envoyé.

## Anime-Sama et lecteurs vidéo

Les pages Anime-Sama, leurs listes `epsN` intégrées dans les scripts `data-source="bdd"`, et les anciens fichiers `episodes.js?filever=…` sont publics mais n’envoient pas d’autorisation CORS pour GitHub Pages. Un serveur est donc nécessaire ; GitHub Pages héberge l’interface statique et le relais récupère les données à la demande, avec un cache de dix minutes.

Le relais expose `/api/animesama/catalog`, `/api/animesama/anime/:slug`, `/api/animesama/anime/:slug/episodes?season=…&lang=…` et `POST /api/animesama/resolve`. La résolution accepte uniquement des coordonnées d’épisode, relit les listes de la source (format inline actuel, références publiques `lien:…` résolues à la demande, ou ancien fichier externe, sans exécuter de JavaScript distant) et tente d’extraire le flux public du lecteur choisi. Les URL média passent par des capacités chiffrées limitées dans le temps ; le relais réécrit les playlists HLS et prend en charge les plages MP4. Aucun compte Nartya ni script distant exécuté pour analyser les listes. L’extraction n’enlève aucun DRM ou contrôle de compte.

En cas de refus ou de lecteur non reconnu, le lecteur public d’origine est proposé dans une iframe protégée. Certains fournisseurs peuvent refuser leur intégration : choisissez alors un autre lecteur. La progression d’une iframe ne peut pas être mesurée ; marquez l’épisode vu manuellement.

La version Pages utilise par défaut le relais public `https://animer-web-jfdedit3.z4trox.chatgpt.site`, accessible sans connexion avec l’accord du propriétaire. Le catalogue, les fiches, les épisodes et la lecture HLS du premier lecteur de Frieren ont été vérifiés depuis GitHub Pages dans un navigateur sans session. Une sélection Anime-Sama datée, incluse dans le build, reste disponible si le relais est indisponible ; elle est signalée comme sélection enregistrée.

Pour utiliser un autre hébergement serveur, déployer `npm run build` avec le Worker `dist/server/index.js` (ou `npm run preview` derrière HTTPS). Configurer `STREAM_SIGNING_KEY` côté serveur avec 32 octets aléatoires encodés en base64, et `ALLOWED_WEB_ORIGINS=https://jfdedit3.github.io`. La clé reste uniquement côté serveur. Configurer ensuite la variable de dépôt GitHub `ANIMER_RELAY_URL` avec l’origine HTTPS du relais, sans secret, puis relancer le workflow Pages.

Les captures réseau réelles ont confirmé le catalogue Frieren, deux saisons, 28 épisodes de la saison 1 et trois lecteurs. Deux lecteurs ont donné un flux HLS extractible ; le troisième a utilisé le mode iframe. Cela ne garantit pas la lecture de tous les hébergeurs. Les tests navigateur de décodage utilisent une vidéo générée.

Le catalogue Jikan ne fournit pas de flux vidéo. La liste des épisodes peut être incomplète selon MyAnimeList ; son secours local est fourni en cas de panne.

Une API publique compatible peut être configurée dans Réglages. Elle doit accepter CORS depuis `https://jfdedit3.github.io` et exposer des enveloppes `{data:…}` :

- `/v1/anime/catalog?search=…&page=…` : tableau de cartes `{slug,title,image}` ou `{items,hasNext}` ;
- `/v1/anime/:slug` : `{anime:{title,image,synopsis},images:{poster},seasons:[{id,name}]}` ;
- `/v1/anime/:slug/seasons/:season/episodes` : `{episodes:[{episode,title,lecteurs:{vostfr:{source:{id}}}}]}` ;
- `/v1/streams/:id` : `{url}` avec une vidéo ou un lecteur public HTTPS autorisé.

Les flux MP4/WebM/HLS utilisent le **lecteur Nartya existant (Artplayer)** : contrôles personnalisés en français, sauts et raccourcis, vitesse, volume/boost audio, qualité HLS automatique ou manuelle, plein écran et PiP selon le navigateur. Ses menus permettent de changer la langue et le lecteur Anime-Sama. Navigation entre épisodes, reprise locale et sauvegarde toutes les cinq secondes, à la pause, au changement de visibilité et à la fermeture. Les lecteurs tiers sont intégrés dans une iframe protégée : leur progression ne peut pas être mesurée, et l’épisode se marque vu manuellement. Certains fournisseurs refusent les iframes ou les accès vidéo CORS. Aucun accès protégé n’est contourné. Le réglage Anime4K du lecteur Nartya est conservé lorsque le navigateur et le GPU le permettent ; il reste désactivé par défaut. Aucune compatibilité GPU physique ni PiP n’est garantie par les tests navigateur.

## Développement

Node.js 22.12 ou plus récent :

```sh
npm ci
npm run dev
npm test
npm run test:upstream
npm run build:pages
npm run preview:pages
```

La prévisualisation statique se trouve sur `http://127.0.0.1:4175/Animer/`. Aucune clé Supabase ni variable secrète n’est nécessaire. Les tests hérités couvrent aussi des utilitaires et le relais serveur conservés dans les sources ; cela ne signifie pas que les fonctions de compte du client d’origine sont exposées dans le site public.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` construit `dist/pages/` et publie automatiquement chaque push sur `main`. Le dépôt utilise **Settings → Pages → GitHub Actions**.

Les ressources, le manifeste et le service worker sont limités à `/Animer/`. La navigation utilise des hash (`/Animer/#/favorites`) et ne nécessite pas de réécriture serveur. Les anciennes adresses `#/login` retournent à l’accueil ; il n’y a plus de parcours OAuth, captcha ni page de connexion.

Le service worker met en cache la coque et les ressources. Il met aussi en cache le catalogue de secours ; les métadonnées à jour nécessitent Internet. Il ne télécharge pas les épisodes. La bibliothèque locale reste accessible depuis les pages déjà chargées et la coque en cache.

## Origine et licence

Interface et composants de bibliothèque dérivés du client public [Nartya](https://github.com/NartyaTeam/nartya), licence ISC. Le client Android d’origine n’est pas modifié. Le relais Sites est accessible publiquement avec l’accord du propriétaire.

[LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## Application Linux

La page `#/downloads` propose l’AppImage et le paquet Debian/Ubuntu pour **Linux x86_64**. Les fichiers sont hébergés dans les releases GitHub et les mêmes liens sont accessibles depuis GitHub Pages et le site ChatGPT.

L’application embarque l’interface et le relais Node, sans serveur à installer. Le contenu utilise une origine locale virtuelle stable ; aucun port TCP n’est ouvert. La bibliothèque et les réglages restent dans le profil Electron de l’utilisateur, séparément des données du navigateur. Pour migrer la bibliothèque du site, exporter son JSON puis l’importer dans l’application. Internet reste nécessaire pour récupérer les épisodes et lire les flux.

Construction : `npm ci` puis `npm run build:linux` (Linux, Node 24). Le packager est isolé dans `desktop/` et utilise Electron 44.4.3. Les résultats et leurs empreintes SHA-256 sont écrits dans `dist/linux/`. Le workflow manuel **Construire Animer Linux** reproduit cette construction. Pour utiliser une distribution Electron déjà extraite, passer `--config.electronDist=/chemin/du/runtime` à electron-builder.

L’AppImage peut demander FUSE selon la distribution ; `--appimage-extract-and-run` permet de l’exécuter sans montage FUSE. Installer le `.deb` avec `sudo apt install ./Animer-1.11.0-linux-x86_64.deb`. Les paquets ne sont pas des builds ARM. Aucun démarrage automatique ni suppression des données du navigateur n’est effectué.

Vérification Linux de cette version : le `.deb` a été extrait et exécuté sur un affichage Xorg de test, et l’AppImage lancé avec `--appimage-extract-and-run`. Le test a vérifié le relais embarqué, les lecteurs Anime-Sama actuels, le décodage natif d’un MP4 généré et l’import JSON. Après relancement, les favoris, la progression et le choix d’interface sont conservés. Les options `--no-sandbox` et `--disable-gpu` utilisées dans cet environnement de test ne sont pas ajoutées au lanceur distribué. GPU physique et compatibilité de toutes les distributions non vérifiés. Résultats : `verification/linux-native.json` et `verification/linux-appimage.json`.
