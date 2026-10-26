# Animer — Anime après minuit

Site anime et PWA **sans inscription ni connexion**, publié sur **https://jfdedit3.github.io/Animer/**. Interface responsive avec effet glass et bibliothèque enregistrée dans le navigateur.

## Fonctionnement

- Catalogue de secours inclus : jusqu’à 500 fiches TV/films issues d’anime-offline-database (ODbL / DbCL), datées et signalées à l’écran en cas de panne de Jikan.
- Catalogue et recherche publics via [Jikan](https://jikan.moe/) / MyAnimeList, sans clé de compte.
- Fiches, synopsis, notes, bandes-annonces et épisodes répertoriés.
- Favoris, listes, épisodes vus et historique conservés dans `localStorage` sur cet appareil.
- Export/import JSON depuis Réglages. L’import remplace la bibliothèque locale. Effacer les données du site supprime la bibliothèque : exportez-la pour la conserver.
- Préférences d’interface persistantes : effet glass et réduction des animations.
- Aucune synchronisation de compte, aucun appel Supabase, aucun jeton de compte envoyé.

**Le catalogue public ne fournit pas les vidéos des épisodes.** Il n’utilise pas l’API protégée de Nartya. La liste des épisodes peut être incomplète selon MyAnimeList. Jikan a répondu HTTP 503 pendant le contrôle dans cet environnement ; le catalogue de secours conserve une navigation utilisable sans ce service.

Une API publique compatible peut être configurée dans Réglages. Elle doit accepter CORS depuis `https://jfdedit3.github.io` et exposer des enveloppes `{data:…}` :

- `/v1/anime/catalog?search=…&page=…` : tableau de cartes `{slug,title,image}` ou `{items,hasNext}` ;
- `/v1/anime/:slug` : `{anime:{title,image,synopsis},images:{poster},seasons:[{id,name}]}` ;
- `/v1/anime/:slug/seasons/:season/episodes` : `{episodes:[{episode,title,lecteurs:{vostfr:{source:{id}}}}]}` ;
- `/v1/streams/:id` : `{url}` avec une vidéo ou un lecteur public HTTPS autorisé.

Les URL MP4/WebM/HLS utilisent un lecteur avec reprise locale et sauvegarde toutes les cinq secondes, à la pause et à la fermeture. Les lecteurs tiers sont intégrés dans une iframe protégée : leur progression ne peut pas être mesurée, et l’épisode se marque vu manuellement. Certains fournisseurs refusent les iframes ou les accès vidéo CORS. Aucun accès protégé n’est contourné. Le filtre Anime4K du client natif n’est pas proposé dans ce lecteur web local.

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

Interface et composants de bibliothèque dérivés du client public [Nartya](https://github.com/NartyaTeam/nartya), licence ISC. Le client Android d’origine n’est pas modifié. La publication Sites antérieure reste privée et n’est pas utilisée comme relais par le site Pages.

[LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
