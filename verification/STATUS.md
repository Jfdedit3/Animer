# Validation Animer 1.6.1 — retrait du saut d’introduction

- Bouton « Passer l’intro », réglages de durée et code associé retirés à la demande de l’utilisateur.
- 28 tests web réussis ; constructions GitHub Pages et Worker réussies.
- Les sections suivantes conservent les vérifications des versions précédentes.

# Validation Animer 1.6.0 — navigation et génériques

- Navigation aux flèches dans le catalogue et les boutons, focus visible, activation unique par Entrée et défilement des cartes hors écran. Texte et widgets natifs gardent leur gestion du clavier ; les dialogues restent limités à leur contenu.
- Le focus clavier active les raccourcis du lecteur Nartya ; Entrée permet lecture/pause. Les menus sont limités à la hauteur réelle du lecteur pour rester accessibles sur téléphone.
- Interface : historique local récent avec progression, surfaces de lecture glass, titre/langue de la lecture et indications du clavier. Les largeurs 320, 390, 768, 1024 et 1440 px ont été vérifiées sans débordement horizontal.
- Bouton manuel « Passer l’intro » : avance relative de 90 s, durée réglable (60/85/90/120), activation/désactivation persistante et visibilité en plein écran. Le saut n’atteint jamais la fin du média. Aucune détection automatique de générique ni contrôle du lecteur tiers en iframe.
- 30 tests web et 34 tests hérités réussis. Tests navigateur sur artefact Pages : navigation, champs texte, dialogues, historique réel du stockage local, lecture/pause/recherche au clavier, saut d’introduction et préférences persistantes.
- Régression du lecteur Nartya : MP4/HLS, reprise après rechargement, qualité, source, langue, épisode suivant et repli iframe réussis. Aucune erreur de page. Les tests vidéo utilisent des médias générés et un relais contrôlé ; ils ne valident pas de GPU physique ou tous les hébergeurs tiers.
- Le relais public utilise désormais son adresse canonique `https://animer-web-jfdedit3.z4trox.chatgpt.site` : l’ancienne adresse redirige sans en-têtes CORS, ce qui empêche son utilisation directe depuis Pages.
- Résultats complémentaires : `directional-browser.json`, `nartya-player-browser.json` ; journaux et captures disponibles localement.

# Validation Animer 1.4.0 — lecteur Nartya et sauvegarde locale

- Le lecteur Nartya existant (`components/player/VideoPlayer.jsx`, Artplayer) remplace le lecteur HTML natif pour les flux directs. Traductions françaises, menus langue/source, qualité HLS, vitesse, volume/boost, plein écran, PiP et réglage Anime4K selon les capacités du navigateur. Les lecteurs tiers restent protégés dans une iframe quand le flux est inaccessible.
- Chromium mobile et PC avec fixtures générées : MP4, HLS multi-qualité avec URL sans extension et format explicite, reprise après rechargement, qualité persistante, changement de langue et lecteur depuis les menus Nartya, épisode suivant et sauvegarde locale. Aucune erreur de page ni débordement horizontal ; contrôles mobiles relus sur capture. Une résolution ancienne ne peut pas rouvrir le lecteur après changement de contexte.
- Les contrôles avancés de qualité dépendent des variantes proposées par le HLS ; les modes Anime4K restent désactivés par défaut. Aucun test GPU physique ni PiP système.
- 25 tests web/local/relais/PWA et 34 tests hérités réussis. Les attentes du fournisseur par défaut ont été mises à jour : Anime-Sama public, sans session Nartya.
- Builds Pages et Worker ESM réussis ; interface sous `/Animer/`, bibliothèque locale et ancien chemin `#/login` redirigé vers l’accueil.
- Contrôle réel de `anime-sama.to` : catalogue Frieren, fiche, deux saisons, 28 épisodes de la saison 1, trois lecteurs. Les deux premiers lecteurs ont permis l’extraction d’un flux HLS public ; le troisième a utilisé le repli iframe. Les réponses Anime-Sama n’autorisent pas l’origine GitHub Pages par CORS, donc un relais est requis.
- Les listes d’épisodes et les appels de saisons sont analysés comme syntaxe JavaScript (Acorn) sans exécution. Les commentaires, publicités et scripts arbitraires ne sont pas exécutés. Les entrées non HTTPS, locales ou avec identifiants sont rejetées.
- Résolution serveur limitée aux coordonnées d’épisodes de la source. Le client ne fournit pas d’URL arbitraire à proxifier. Les médias extraits sont protégés par une capacité chiffrée expirante ; réécriture HLS et plages MP4 conservées. Aucun jeton Nartya/cookie de compte n’est transmis aux fournisseurs.
- Chromium mobile, avec relais contrôlé : choix saison/langue/lecteur, décodage MP4 généré, reprise après rechargement, épisodes vus en VF, favoris/listes persistants, lecteur iframe protégé. Aucune erreur de page, aucun débordement horizontal, aucun appel d’authentification.
- `nartya-player-browser.json` contient le parcours du lecteur Nartya 1.4. `animesama-browser.json` conserve le parcours de la version 1.3. Les fichiers `local-browser.json`, `pages-browser.json` et `browser.json` sont les validations historiques, avec leurs limites respectives.
- La sélection Anime-Sama embarquée contient 122 œuvres extraites de la page d’accueil réelle, avec sa provenance et sa date. Elle est explicitement présentée comme sélection enregistrée si le relais est inaccessible ; elle ne simule pas des fiches ou des vidéos en direct.
- Le propriétaire a autorisé le passage public du relais Sites. Accès public confirmé par le service d’hébergement et par des requêtes sans jeton ni cookie : catalogue et 28 épisodes de Frieren, CORS pour GitHub Pages. Chromium sur le vrai site Pages, contexte sans session : ouverture de la fiche et lecture du flux HLS réel du lecteur 1, temps vidéo supérieur à 0,5 seconde, aucune erreur de page. Le lecteur 2 peut refuser sa diffusion depuis le serveur ; le lecteur 3 utilise le mode iframe.
- Aucune garantie sur tous les fournisseurs, leurs restrictions d’IP/CORS/iframe ou un appareil GPU physique. Aucun DRM ou contrôle de compte n’est supprimé. Le mode iframe ne permet pas la mesure de progression et se marque vu manuellement.

Les sources actuelles sont empreintées dans `build-inputs.json`. Les journaux et captures locaux ne sont pas publiés dans Git.
