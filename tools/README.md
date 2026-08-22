# Outillage de vérification

Hors livraison : rien ici n'est servi à l'utilisateur. Chromium et Playwright
uniquement, aucune dépendance dans l'application elle-même.

```
npm install
npm run check          # e2e, contrastes, cibles, débordements, voile, grain, captures
```

| Fichier | Rôle |
|---|---|
| `e2e.js` | parcours complet dans un vrai navigateur : URL, déterminisme, quatre états, téléchargement réel avec lecture de l'en-tête PNG, clavier, mouvement réduit |
| `a11y.js` | contrastes calculés sur le DOM, couleurs semi-transparentes recomposées sur leur pile de fonds, deux thèmes, deux langues |
| `reach.js` | cherche une position de défilement où chaque contrôle répond au pointage, sous les deux barres collantes, puis vérifie la cible de 44 px |
| `overflow.js` | débordements sur 8 largeurs × 2 langues × 4 résolutions cibles, avec et sans libellés allongés de 30 % |
| `export-audit.js` | poids et durée des PNG — `quick`, `phone-full` (594 combinaisons) ou tout |
| `band-test.js` | hauteur des marches du voile sur 32 cas |
| `dither-check.js` | amplitude du grain du `#101A2E` au `#FFFFFF` |
| `edges.js` | découpes agrandies sur les bords, pour juger la netteté au zoom |
| `greyscale.js` | test en niveaux de gris |
| `shot.js` / `shot2.js` | captures et absence de requête sortante |
| `fidelity.js` | chaque déclaration de la maquette est-elle présente dans le portage |
| `mock-probe.js` | géométrie de la maquette d'écran |
| `check.js` | enchaîne tout |

## Comparaison avec la maquette d'origine

`geo-diff.js`, `pixel-diff.js` et `design-render.js` rendent
`design/Aplat.dc.html` à côté du portage. La maquette est un gabarit
« DCLogic » : elle a besoin de React, ReactDOM et Babel, que `support.js` va
chercher sur unpkg. Pour la rendre hors ligne, préparer un dossier :

```
mon-dossier/
  Aplat.dc.html        copie, avec le <link> Google Fonts remplacé par
                       les @font-face de src/app.css (chemins ./assets/fonts/)
  support.js           copie, avec les trois URL unpkg pointées sur ./vendor/
  assets/fonts/*.woff2 copie de assets/fonts
  vendor/react.production.min.js
  vendor/react-dom.production.min.js
  vendor/babel.min.js
```

```
npm i react@18.3.1 react-dom@18.3.1 @babel/standalone@7.29.0
REF_DIR=/chemin/mon-dossier node tools/pixel-diff.js
```

Sans `REF_DIR`, ces trois outils s'arrêtent proprement.
