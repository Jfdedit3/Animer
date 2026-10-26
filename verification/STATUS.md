# Validation Animer 1.0.0

- Installation propre : npm ci --ignore-scripts réussie ; aucune dépendance du projet Android modifiée.
- 8 tests relais/PWA réussis, 34 tests hérités réussis.
- Build Vite et Worker ESM réussis avec les dépendances du verrou npm.
- Chromium, 390×844 et 1440×1000 : connexion e-mail avec SDK Supabase et captcha simulés, recherche/filtre année, fiche, épisodes, résolution, décodage et lecture d’un MP4 de test. Aucune erreur de page ; aucun débordement horizontal. CSP conservée pendant les tests.
- Les services et comptes sont simulés pour ces parcours. Aucun mot de passe personnel ni épisode réel utilisé.
- Vérification live sans session : santé Nartya HTTP 200 ; catalogue Nartya HTTP 401. L’accès exige une session autorisée.
- Le nouveau domaine OAuth et Turnstile doit être autorisé par l’administrateur Nartya. Cette autorisation n’a pas pu être effectuée depuis ce projet.
- Relais serveur avec destinations chiffrées, expiration, rejet des adresses locales et des redirections dangereuses ; les jetons de compte ne vont pas aux hébergeurs vidéo.
- Pas de validation live d’une lecture Nartya, ni de garantie sur les blocages d’IP de datacenter des hébergeurs.
- Anime4K est conservé sous réserve des capacités du navigateur ; pas de validation GPU sur appareil physique.
- Hébergement Sites : les helpers du plugin n’étaient pas installés dans cet environnement. Le Worker ESM est construit localement, puis source et archive sont synchronisées au même commit avant déploiement.

Les empreintes du code ayant servi au build sont dans build-inputs.json et les résultats navigateur dans browser.json. Les journaux et captures locaux ne sont pas publiés dans Git.
