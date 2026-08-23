# Contribuer à Aplat

Merci de regarder. Ce document dit ce qu'il faut savoir avant d'écrire une ligne, surtout ce que le projet refuse, qui ne se devine pas.

## Le projet en trois phrases

Aplat répond à une seule question : **à quoi ressemblera ce fond d'écran derrière mes icônes ?** Il ne calcule rien ailleurs que dans le navigateur : le motif, l'aperçu et le fichier exporté sortent tous du même code, sur l'appareil. Il n'a ni compte, ni serveur, ni stockage : ce qui est partageable tient dans l'URL, et rien d'autre ne survit à la fermeture de l'onglet.

Une proposition qui contredit une de ces trois phrases sera refusée, même bien écrite.

## Lire le design system d'abord

[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) est la référence unique de l'interface. Ce n'est pas un document d'intention : le code s'y réfère section par section, et une décision visuelle qui n'en découle pas est un défaut, pas un choix.

Le projet exclut aussi, explicitement et pour de bon :

- **la gamification** : aucune série à tenir, aucun score, aucun badge, aucune collection à compléter ;
- **les notifications** : l'application ne réclame rien, et ne demande aucune permission ;
- **les comptes** : rien à créer, rien à connecter, rien à retrouver ailleurs ;
- **toute mesure d'audience**, tout appel réseau à l'exécution, toute police ou script servi par un CDN — Anton et Archivo sont auto-hébergées, et un appel à un CDN transmet une adresse IP que le projet promet de ne pas faire voyager ;
- **les dark patterns** : aucune case précochée, aucun compte à rebours, aucun bouton dont le libellé ment sur ce qu'il fait, aucune sortie cachée ;
- **plus d'un appel primaire par écran** : il n'y en a qu'un, Télécharger, et il ne partage sa place avec rien ;
- **les emoji**, dans l'interface comme dans les libellés ;
- **les bibliothèques de composants ou de style** : le balisage, le CSS et l'accessibilité sont écrits ici.

L'écran unique n'est pas non plus négociable. La valeur du produit est de voir le rendu derrière de vraies icônes **avant** de télécharger : toute navigation qui sépare les réglages de l'aperçu — un onglet, une étape, une page de résultat — casse exactement ça, puisqu'on réglerait à l'aveugle avant d'aller vérifier.

Si une idée vous tient à cœur et figure dans cette liste, ouvrez une issue pour en parler : la réponse sera probablement non, mais elle sera argumentée.

## Démarrer

```bash
npm install
npm run dev        # serveur de développement
npm run test       # tests unitaires
npm run typecheck  # vérification TypeScript
npm run build      # notices + types + build de production
npm run preview    # sert le build (Service Worker actif)
```

Le Service Worker est désactivé en développement ; pour tester le mode hors ligne et l'installation, passez par `build` puis `preview`.

Les vérifications headless vivent dans [`tools/`](tools/) et se lancent avec `npm run check` : parcours complet dans un vrai navigateur, URL hostiles, contrastes réels calculés sur le DOM, cibles tactiles, débordements avec des libellés allongés de 30 %, marches du voile, amplitude du grain, absence de requête sortante, ouverture en `file://`, endurance. Elles demandent Chromium via Playwright et ne sont jamais servies à l'utilisateur.

## Les règles qui tiennent le code

1. **Le moteur génératif est pur.** `(famille, palette, densité, graine)` donne toujours la même image, à n'importe quelle résolution, sans React ni DOM. C'est du code qui se teste sans navigateur, et le projet le teste.
2. **L'aperçu est le fichier.** Les formes sont tracées en coordonnées relatives, et la mesure de lisibilité porte sur les dimensions d'export, jamais sur celles du canevas d'aperçu. Un aperçu qui ment sur ce qu'on va télécharger vide le produit de sa raison d'être.
3. **Aucune couleur, taille ou espacement n'est écrit en dur** hors des jetons du design system.
4. **Tout libellé passe par les deux dictionnaires**, français et anglais, tenus l'un contre l'autre. Un texte écrit dans un composant est un texte qui n'existe pas dans l'autre langue.
5. **Rien ne s'écrit sur l'appareil.** Pas d'IndexedDB, pas de `localStorage`, pas de cookie : une préférence qu'on veut voir survivre se met dans l'URL, ou nulle part.

## Ce qu'on attend d'une pull request

- `npm run typecheck` et `npm run test` passent.
- `npm run check` passe si vous avez touché l'interface ou le moteur.
- La logique ajoutée au moteur est testée. Le reste ne l'est pas encore automatiquement : vérifiez à la main, et dites-le dans la description.
- L'écran passe le plancher qualité : cible tactile de 44 px, focus visible et jamais masqué par les barres collantes, `prefers-reduced-motion`, contrastes, zoom à 200 %, et vérification à **320 px** de large.
- Un changement du moteur s'accompagne de ses chiffres : poids et netteté des PNG produits se mesurent avec les outils du dépôt, ils ne s'estiment pas.
- Les commentaires expliquent **pourquoi**, pas quoi. Le code dit déjà ce qu'il fait ; ce qu'on relit six mois plus tard, c'est la raison d'un choix et le piège qu'il évite. C'est le style du projet, tenez-le.
- Le vocabulaire de l'interface est celui du design system : français et anglais, casse normale, infinitif pour les actions, zéro emoji, zéro exclamation.

Les messages de commit sont en français et disent ce que le changement fait pour la personne qui utilise l'application, pas quel fichier a bougé.

## Signaler un bug

Passez par les [issues](https://github.com/alarboulletmarin/aplat/issues). Le gabarit demande le navigateur, l'appareil et la résolution visée : la mémoire disponible pour un canevas, le format d'image accepté et le geste qui mène de « téléchargé » à « dans la pellicule » divergent assez pour que la réponse en dépende.

Pour une faille de sécurité, ne passez pas par une issue publique : voir [SECURITY.md](SECURITY.md).

## Licence

En contribuant, vous acceptez que votre contribution soit distribuée sous la [licence AGPL-3.0](LICENSE) du projet.

Concrètement : votre code reste libre, et personne ne pourra l'enfermer dans un produit fermé. En contrepartie, qui héberge une version modifiée d'Aplat doit en publier les sources. Ajoutez l'en-tête `// SPDX-License-Identifier: AGPL-3.0-only` en tête des fichiers que vous créez, et gardez-le sur ceux qui le portent.

Les polices Anton et Archivo sont sous [SIL Open Font License 1.1](assets/fonts/), qui voyage avec elles dans le dépôt. Elles suffisent : le projet n'en ajoutera pas d'autre.
