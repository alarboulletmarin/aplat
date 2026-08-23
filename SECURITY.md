# Sécurité

## Ce qu'il y a à attaquer

Aplat n'a **ni serveur, ni compte, ni API, ni base**. Rien n'est transmis, rien n'est reçu à l'exécution : le motif est calculé dans le navigateur, l'image est produite dans le navigateur, et le téléchargement ne passe par personne. La surface se limite donc à :

- le code servi au navigateur et les dépendances qu'il embarque ;
- le Service Worker et ses caches, qui ne contiennent que les fichiers de l'application elle-même ;
- les paramètres d'URL, seul point d'entrée de données extérieures à l'application ;
- l'hébergement statique, s'il est mal configuré.

**Aplat ne stocke aucune donnée.** Ni IndexedDB, ni `localStorage`, ni cookie : fermer l'onglet ne laisse rien derrière. L'état qui survit à un rechargement est celui que l'URL porte, et il est visible dans la barre d'adresse.

## Signaler une faille

**N'ouvrez pas d'issue publique.** Utilisez les [avis de sécurité privés](https://github.com/alarboulletmarin/aplat/security/advisories/new) de GitHub, qui permettent d'en discuter sans que la faille soit visible.

Décrivez ce que vous avez trouvé, comment le reproduire, et ce qu'un attaquant obtiendrait. Un correctif proposé est bienvenu, il n'est pas exigé.

C'est un projet personnel : la réponse est de bonne foi, pas contractuelle. Comptez quelques jours.

## Ce qui n'est pas une faille

- **Une URL forgée qui donne un motif inattendu.** Les paramètres sont lus un par un, et une valeur inconnue, hors bornes ou absurde retombe sur la valeur par défaut plutôt que d'arrêter la page. `tools/fuzz-url.mjs` passe une série d'URL hostiles pour vérifier qu'aucune ne provoque d'erreur, d'injection, ni de page vide. Si vous en trouvez une qui y échappe, c'est un bug intéressant, signalez-le.
- **Le lien de partage révèle vos réglages.** C'est ce qu'il est fait pour faire : famille, palette, densité, graine, langue, thème. Il ne porte ni identifiant, ni horodatage, ni la résolution détectée de votre appareil ; celle-ci est une mesure du matériel, pas un réglage, et elle ne part pas dans le lien.
- **Le PNG téléchargé n'est pas protégé.** C'est un fichier image dans votre dossier de téléchargements, comme n'importe quel autre. Aplat ne le voit plus une fois qu'il est écrit.
- **Le Service Worker sert une version antérieure après une mise à jour.** C'est le fonctionnement normal d'un cache hors ligne : la nouvelle version est récupérée en arrière-plan et prend la main au chargement suivant.
- **Effacer les données du site depuis le navigateur.** Il n'y a rien à perdre : cela vide le cache de l'application, qui se remplira au prochain chargement avec une connexion.

## Pour qui héberge Aplat

L'application est un lot de fichiers statiques, sans route à réécrire ni processus à faire tourner. Deux points valent d'être vérifiés côté hébergement : servir en **HTTPS**, et ne pas mettre en cache `index.html` plus longtemps que les fichiers versionnés, sans quoi un Service Worker périmé peut rester en place bien après une mise à jour.

La page déclare sa propre politique de sécurité en balise `meta`, dont un `connect-src 'none'` qui coupe `fetch`, `XHR` et les WebSockets. Si vous servez l'application derrière un proxy ou un CDN qui ajoute ses propres en-têtes, vérifiez qu'ils ne l'assouplissent pas : la promesse « aucun appel réseau à l'exécution » est vérifiable par le navigateur, et c'est ce qui la rend crédible.

Un troisième point relève de la licence, pas de la sécurité, mais se règle au même moment. Aplat est sous **AGPL-3.0** : si vous hébergez une version **modifiée**, l'article 13 vous oblige à en publier les sources et à les rendre atteignables depuis l'application que vous servez. Héberger la version d'origine sans y toucher ne demande rien de plus.
