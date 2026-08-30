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
| `e2e.mjs` | environ deux cents contrôles dans un vrai navigateur : lecture et écriture de l'URL, déterminisme du rendu, **les quatre pavages réguliers qui ignorent leur graine, et eux seuls**, les quatre états, téléchargement réel avec lecture de l'en-tête PNG, course à l'export, échec de copie, contenu du cache **et des quatre clés du stockage local**, clavier, focus non masqué, mouvement réduit, la version sombre téléchargée telle qu'affichée |
| `accueil.mjs` | la page d'accueil, sur « / » : les adresses et la reconduite des liens partagés du temps où l'application vivait à la racine, les deux bascules (adresse écrite, document retourné, nom accessible qui dit ce qu'un appui donnera), les quinze toiles qui finissent toutes par se peindre, une vignette touchée qui redessine, les cibles de 44 px et la hiérarchie des titres |
| `moteur.mjs` | la page du mécanisme, sur « /moteur » : la troisième adresse, et qu'un lien portant un motif y **reste** au lieu de rebondir vers l'application ; les dix-neuf toiles qui finissent toutes par se peindre ; le fil du motif, un réglage de la première étape qui se retrouve dans le lien de la dernière, et les fiches de gestes qui, elles, ne bougent pas ; l'escalier des couches, dont la dernière marche redonne exactement l'image entière ; les cibles de 44 px et les libellés allongés de 30 % sur cinq cadrages |
| `pwa.mjs` | manifeste, icônes à la taille annoncée, Service Worker activé. Puis réseau coupé : page, motif, vignettes, polices, téléchargement réel et la page du mécanisme |
| `fuzz-url.mjs` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours, et le compte de puces ne bouge pas (relevé sur une adresse saine, jamais écrit en dur) |
| `a11y.mjs` | contrastes calculés sur le DOM, couleurs semi-transparentes recomposées sur leur pile de fonds, deux thèmes, deux langues |
| `reach.mjs` | cherche une position de défilement où chaque contrôle répond au pointage, sous les deux barres collantes, puis vérifie la cible de 44 px et que la scène collée tient entière au-dessus de la barre d'action |
| `repli.mjs` | le repli de l'aperçu au défilement : ce qu'il rend aux grilles, le dépli du verdict, et que chaque contrôle se dégage entièrement des deux couches collantes |
| `overflow.mjs` | débordements sur 12 cadrages (dont deux fenêtres couchées) × 2 langues × 4 résolutions cibles, avec et sans libellés allongés de 30 %. Les libellés de carte y sont tenus à deux lignes et à zéro ellipse |
| `band-test.mjs` | hauteur des marches du voile sur 32 cas |
| `dither-check.mjs` | amplitude du grain du `#101A2E` au `#FFFFFF` |
| `shot.mjs` | captures et absence de requête sortante |
| `perf.mjs` | coût de chaque action du geste à la peinture, processeur bridé six fois : médiane et max par scénario, budgets qui font échouer |
| `soak.mjs` | 400 actions enchaînées, historique plein : dérive du tas, des nœuds, des canevas et des écouteurs |

## La recette des quatre cadrages

La revue d'ergonomie demande de tenir quatre cadrages : iPhone en portrait,
iPhone en paysage, iPad en portrait, ordinateur en 1440 px. Chacun est dans les
listes des outils ci-dessus, et voici qui répond de quoi.

| Ce qu'on exige | Qui le vérifie |
|---|---|
| tous les contrôles atteignables, non recouverts, pied de page compris | `reach.mjs` (pointage et 44 px) et `repli.mjs` (dégagement complet des deux couches) |
| la scène collée tient entière au-dessus de la barre d'action | `reach.mjs` |
| la hauteur rendue aux grilles une fois défilé | `repli.mjs` |
| un seul appel visuel primaire par écran | `shot.mjs` et `cadrages.mjs`, à l'œil : le lime ne sert qu'à Télécharger et à la carte de succès |
| parcours clavier complet, focus visible et jamais masqué | `e2e.mjs` |
| aucune information portée par la seule couleur | `a11y.mjs` (contraste des formes) et `greyscale.mjs` (captures désaturées) |
| français et anglais complets, aucune chaîne en dur | `src/i18n/i18n.test.ts` (parité stricte) et `overflow.mjs` (gabarits à +30 %) |
| ce que le stockage local contient, champ par champ | `e2e.mjs`, section 15, et `src/lib/historique.test.ts` |

`reach.mjs`, `repli.mjs`, `soak.mjs` et `greyscale.mjs` écrivent un historique
plein avant le premier rendu. C'est le cas le plus lourd (dix vignettes de plus
à dégager des deux couches collantes), et surtout une mise en page qui ne bouge
plus sous la mesure : sans lui, la carte apparaît au bout de deux secondes et
demie, en plein balayage.

## Les autres

| Fichier | Rôle |
|---|---|
| `export-audit.mjs` | poids et durée des PNG : `quick`, `phone-full` (toutes les combinaisons en 1179 × 2556) ou tout |
| `weight-lab.mjs` | contribution de chaque couche au poids du fichier |
| `states.mjs` | captures des cinq états, atteints par les gestes d'un utilisateur |
| `greyscale.mjs` | test en niveaux de gris |
| `wide.mjs` | lequel déborde à 320 px, et de combien : ce qu'on ouvre quand `overflow.mjs` vient de dire non |
| `cadrages.mjs` | neuf cadrages dans la fenêtre : ce qui tient au-dessus de la ligne de flottaison, et ce que recouvrent les deux barres collantes |
| `planche.mjs` | planche-contact de toutes les familles à la résolution d'un téléphone |
| `vitrine.mjs` | les images d'exemple du README, écrites dans `docs/vitrine/` : galerie de familles, le même motif en PNG, WebP et SVG, versions claire et sombre. Graine fixe : chaque image se refait à l'identique |
| `social.mjs` | les images des réseaux, dans `.social/` : trois stories 9:16, huit stories, une planche de quatre panneaux 4:5 qui tiennent seuls et se recousent en 2160 × 2700, une mosaïque de quatre quarts de story pour la mise en page 2×2 d'Instagram, deux cartes de manifeste en français et en anglais, et cinq affiches où le motif porte le nom. Les motifs sortent du moteur, les maquettes de l'application qui tourne, la feuille de style est celle que `dist/index.html` déclare, et aucun chiffre n'est recopié. Un corps qui déborde de ses zones sûres est signalé plutôt que rogné. Drapeaux `--courte`, `--longue`, `--planche`, `--mosaique`, `--manifeste`, `--affiches`, adresse publique en argument |
| `film.mjs` | le film des réseaux, dans `.social/` : « De 2,8 à 4,8 », un reel de 20 s et une story de 15 s, 1080 × 1920 à trente images par seconde, muets, calés sur 120 BPM, quinze images par temps. Six plans : la presse pose le fichier couche par couche, le nom est découpé dedans, la thèse tient sur un aplat, la démonstration occupe cinq secondes d'un seul plan sans une coupe (la grille d'icônes noie les libellés, puis le voile monte force par force jusqu'à ce que le rapport franchisse le seuil AA), la galerie donne huit secondes à huit fichiers, le prix referme la boucle sur un aplat clair. **Rien ne change plus d'une fois par seconde** : au-delà, une alternance clair-sombre est un stroboscope. Les fichiers de la galerie ne se coupent pas, ils arrivent par une lame lissée de douze images qui passe sur le précédent, une bande d'aplat en tête et le motif derrière : aucune image de la galerie n'est vide. Ce qui n'est pas saisi à la main : le héros est trouvé par balayage de graine sur ce que la sonde AFFICHE, l'ordre de la galerie sort de la luminance mesurée (du plus clair au plus sombre, si bien que la suite descend en fondu au lieu d'alterner), et l'encre de chaque carton est celle des deux encres du produit qui contraste le plus avec les pixels que le carton recouvre vraiment, mesurés. La seule formule copiée au moteur, le contraste à une force intermédiaire, est vérifiée contre ses deux bouts au démarrage et arrête l'outil si elle diverge. Aucune animation CSS : `etat(i)` calcule ce qu'il faut voir à l'image `i`, et deux exports sont le même fichier. Les images partent à l'encodeur par un tube, jamais par le disque. La story n'est pas le reel accéléré ni rogné : c'est la même pellicule, trois fichiers de galerie en moins. `FFMPEG_EXE` désigne un H.264 : celui que Playwright embarque ne sait faire que du WebM, qu'Instagram refuse. Drapeau `--story` |
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
