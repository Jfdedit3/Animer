# Validation Animer 1.2.0 — sans connexion, sauvegarde locale

- L’accueil, les fiches et la bibliothèque sont accessibles sans connexion. L’ancien chemin `#/login` redirige vers l’accueil. Aucun client Supabase distant n’est initialisé ; les anciennes API de bibliothèque utilisent un adaptateur local sans jeton.
- 19 tests web/local/relais/PWA et 34 tests hérités réussis. Les tests hérités du relais ne signifient pas que les fonctions de compte ou Anime4K du client d’origine sont actives dans le site local.
- Builds Pages et Vite + Worker réussis ; chemins, manifeste et service worker limités à `/Animer/`.
- Chromium mobile et PC : favoris, listes, épisodes vus, historique, préférences, rechargement et export/import JSON. Aucune erreur de page ni débordement horizontal mobile, aucun appel de connexion/Supabase/Nartya dans ces parcours.
- Source publique compatible simulée : décodage réel d’un MP4 généré, sauvegarde du temps et reprise après rechargement, puis reprise après export/import malgré un ancien checkpoint contradictoire.
- Catalogue Jikan simulé en succès puis en HTTP 503 : le véritable catalogue de secours fourni dans le build reste consultable. Les comptes et API de test sont simulés ; aucune lecture d’un épisode protégé n’est validée.
- Contrôle réseau réel depuis cet environnement : Jikan HTTP 503 ; AniList et Kitsu HTTP 403. Le secours est dérivé de la publication 2026-27 d’anime-offline-database, datée du 2026-07-04, avec les textes ODbL/DbCL et la transformation inclus dans le dépôt.
- Les métadonnées publiques ne contiennent aucun flux vidéo. La lecture exige une source publique compatible que l’utilisateur configure ; un lecteur externe ne permet pas la mesure de progression et se marque vu manuellement.
- Stockage : navigateur et appareil actuels uniquement. Effacer les données du site efface la bibliothèque. L’import remplace la bibliothèque et rejette un fichier invalide avant modification. Les erreurs d’écriture sont remontées.

`local-browser.json` contient les assertions actuelles. `browser.json` et `pages-browser.json` sont les parcours historiques des versions 1.0 et 1.1 avec connexion ; ils ne décrivent pas cette version sans compte. `build-inputs.json` contient les empreintes actuelles des sources. Les journaux et captures locaux ne sont pas publiés dans Git.
