# Outillage de vérification

Hors livraison : rien ici n'est servi à l'utilisateur. Chromium par Playwright,
et rien d'autre — l'application elle-même n'a que React pour dépendance.

```bash
npm run check          # build, puis tout enchaîner
```

Tout vise **le build livré**, servi par `vite preview` : politique de sécurité
comprise, Service Worker compris. Vérifier les sources reviendrait à vérifier
autre chose que ce qui part chez les gens.

Le moteur n'est pas exposé sur `window` : une application qui l'ouvre pour ses
propres tests l'ouvre à tout le monde. `banc.js` en construit une copie à part
(`vite.banc.config.mjs`) et l'injecte dans la page à la demande.

## Ce que `npm run check` enchaîne

| Fichier | Rôle |
|---|---|
| `e2e.js` | 80 contrôles dans un vrai navigateur : lecture et écriture de l'URL, déterminisme du rendu, les quatre états, téléchargement réel avec lecture de l'en-tête PNG, course à l'export, échec de copie, contenu du cache, clavier, focus non masqué, mouvement réduit |
| `pwa.js` | manifeste, icônes à la taille annoncée, Service Worker activé — puis réseau coupé : page, motif, vignettes, polices et téléchargement réel |
| `fuzz-url.js` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `a11y.js` | contrastes calculés sur le DOM, couleurs semi-transparentes recomposées sur leur pile de fonds, deux thèmes, deux langues |
| `reach.js` | cherche une position de défilement où chaque contrôle répond au pointage, sous les deux barres collantes, puis vérifie la cible de 44 px |
| `overflow.js` | débordements sur 8 largeurs × 2 langues × 4 résolutions cibles, avec et sans libellés allongés de 30 % |
| `band-test.js` | hauteur des marches du voile sur 32 cas |
| `dither-check.js` | amplitude du grain du `#101A2E` au `#FFFFFF` |
| `shot.js` | captures et absence de requête sortante |
| `soak.js` | 400 actions enchaînées : dérive du tas, des nœuds, des canevas et des écouteurs |

## Les autres

| Fichier | Rôle |
|---|---|
| `export-audit.js` | poids et durée des PNG — `quick`, `phone-full` (594 combinaisons) ou tout |
| `weight-lab.js` | contribution de chaque couche au poids du fichier |
| `perf.js` | coût de chaque action, processeur bridé six fois |
| `states.js` | captures des cinq états, atteints par les gestes d'un utilisateur |
| `greyscale.js` | test en niveaux de gris |
| `wide.js` | liste les éléments qui débordent à 320 px, libellés allongés |
| `shot2.js` | captures d'appoint |
| `planche.js` | planche-contact des 18 familles à la résolution d'un téléphone |
| `fidelity.js` | chaque déclaration et chaque jeton de la maquette se retrouvent-ils dans le portage |
| `banc.js` · `serveur.js` · `pw.js` | l'infrastructure : moteur injectable, serveur d'aperçu, Chromium |

## Comparaison avec la maquette d'origine

`geo-diff.js`, `pixel-diff.js` et `design-render.js` rendent
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
REF_DIR=/chemin/mon-dossier node tools/pixel-diff.js
```

Sans `REF_DIR`, ces trois outils s'arrêtent proprement.

## Note sur les modules

Le paquet racine est en modules ES ; ces scripts sont en CommonJS. Un
`package.json` imbriqué le dit, plutôt que de renommer vingt fichiers.
