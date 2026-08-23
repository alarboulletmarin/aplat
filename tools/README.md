# Outillage de vérification

Hors livraison : rien ici n'est servi à l'utilisateur. Chromium par Playwright,
et rien d'autre. L'application elle-même n'a que React pour dépendance.

```bash
npm run check          # build, puis tout enchaîner
```

Tout vise **le build livré**, servi par `vite preview` : politique de sécurité
comprise, Service Worker compris. Vérifier les sources reviendrait à vérifier
autre chose que ce qui part chez les gens.

Le moteur n'est pas exposé sur `window` : une application qui l'ouvre pour ses
propres tests l'ouvre à tout le monde. `banc.mjs` en construit une copie à part
(`vite.banc.config.mjs`) et l'injecte dans la page à la demande.

## Ce que `npm run check` enchaîne

| Fichier | Rôle |
|---|---|
| `typographie.mjs` | ni tiret cadratin, ni tiret demi-cadratin, ni point médian dans les sources |
| `e2e.mjs` | 80 contrôles dans un vrai navigateur : lecture et écriture de l'URL, déterminisme du rendu, les quatre états, téléchargement réel avec lecture de l'en-tête PNG, course à l'export, échec de copie, contenu du cache, clavier, focus non masqué, mouvement réduit |
| `pwa.mjs` | manifeste, icônes à la taille annoncée, Service Worker activé. Puis réseau coupé : page, motif, vignettes, polices et téléchargement réel |
| `fuzz-url.mjs` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `a11y.mjs` | contrastes calculés sur le DOM, couleurs semi-transparentes recomposées sur leur pile de fonds, deux thèmes, deux langues |
| `reach.mjs` | cherche une position de défilement où chaque contrôle répond au pointage, sous les deux barres collantes, puis vérifie la cible de 44 px et que la scène collée tient entière au-dessus de la barre d'action |
| `overflow.mjs` | débordements sur 10 cadrages (dont deux fenêtres couchées) × 2 langues × 4 résolutions cibles, avec et sans libellés allongés de 30 % |
| `band-test.mjs` | hauteur des marches du voile sur 32 cas |
| `dither-check.mjs` | amplitude du grain du `#101A2E` au `#FFFFFF` |
| `shot.mjs` | captures et absence de requête sortante |
| `soak.mjs` | 400 actions enchaînées : dérive du tas, des nœuds, des canevas et des écouteurs |

## Les autres

| Fichier | Rôle |
|---|---|
| `export-audit.mjs` | poids et durée des PNG : `quick`, `phone-full` (594 combinaisons) ou tout |
| `weight-lab.mjs` | contribution de chaque couche au poids du fichier |
| `perf.mjs` | coût de chaque action, processeur bridé six fois |
| `states.mjs` | captures des cinq états, atteints par les gestes d'un utilisateur |
| `greyscale.mjs` | test en niveaux de gris |
| `wide.mjs` | lequel déborde à 320 px, et de combien : ce qu'on ouvre quand `overflow.mjs` vient de dire non |
| `cadrages.mjs` | neuf cadrages dans la fenêtre : ce qui tient au-dessus de la ligne de flottaison, et ce que recouvrent les deux barres collantes |
| `planche.mjs` | planche-contact des 18 familles à la résolution d'un téléphone |
| `fidelity.mjs` | chaque déclaration et chaque jeton de la maquette se retrouvent-ils dans le portage |
| `banc.mjs`, `serveur.mjs`, `pw.mjs` | l'infrastructure : moteur injectable, serveur d'aperçu, Chromium |

## Comparaison avec la maquette d'origine

`geo-diff.mjs`, `pixel-diff.mjs` et `design-render.mjs` rendent
`design/Aplat.dc.html` à côté du portage. La maquette est un gabarit
« DCLogic » : elle a besoin de React, ReactDOM et Babel, que `support.js` va
chercher sur unpkg. Pour la rendre hors ligne, préparer un dossier :

```
mon-dossier/
  Aplat.dc.html        copie, avec le <link> Google Fonts remplacé par
                       les @font-face de src/styles/tokens.css
                       (chemins ./assets/fonts/)
  support.js           copie, avec les trois URL unpkg pointées sur ./vendor/
  assets/fonts/*.woff2 copie de public/polices
  vendor/react.production.min.js
  vendor/react-dom.production.min.js
  vendor/babel.min.js
```

```bash
npm i react@18.3.1 react-dom@18.3.1 @babel/standalone@7.29.0
REF_DIR=/chemin/mon-dossier node tools/pixel-diff.mjs
```

Sans `REF_DIR`, ces trois outils s'arrêtent proprement.

## Note sur les modules

Ces scripts sont des modules ES, comme le reste du dépôt, d'où l'extension
`.mjs`. Ils n'ont aucune dépendance en dehors de Playwright, et `eslint` les
couvre au même titre que le code de l'application.
