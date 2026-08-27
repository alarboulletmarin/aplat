# Aplat

[![CI](https://github.com/alarboulletmarin/aplat/actions/workflows/ci.yml/badge.svg)](https://github.com/alarboulletmarin/aplat/actions/workflows/ci.yml)
[![Licence : AGPL-3.0-only](https://img.shields.io/badge/licence-AGPL--3.0--only-17243F.svg)](LICENSE)

**Des fonds d'écran génératifs, calculés entièrement dans le navigateur et
exportés à la résolution exacte de l'appareil.**

Gratuit, sans compte, sans pub, sans traceur, sans serveur. Aucune donnée ne
sort de l'appareil : ce qui est partageable tient dans l'URL, et l'application
est installable et pleinement utilisable hors ligne.

[English version](README.md)

<p align="center">
  <img src="docs/vitrine/vagues.png" alt="Motif Vagues, palette Lime et crème" width="140">
  <img src="docs/vitrine/demilunes.png" alt="Motif Demi-lunes, palette Soleil" width="140">
  <img src="docs/vitrine/cubes.png" alt="Motif Cubes, palette Ardoise" width="140">
  <img src="docs/vitrine/torii.png" alt="Motif Torii, palette Nuit" width="140">
  <img src="docs/vitrine/constellations.png" alt="Motif Constellations, palette Orage" width="140">
</p>

## Sommaire

- [L'essentiel](#lessentiel)
- [Galerie](#galerie)
- [Un motif, plusieurs formats](#un-motif-plusieurs-formats)
- [Essayer](#essayer)
- [Comment ça marche](#comment-ça-marche)
- [Confidentialité](#confidentialité)
- [Développement](#développement)
- [Documentation](#documentation)
- [Contribuer](#contribuer)
- [Licence](#licence)

## L'essentiel

- **L'aperçu derrière de vraies icônes.** Toute la valeur du produit : on voit
  le fond d'écran derrière une maquette d'écran d'accueil avant de le
  télécharger, et une sonde de lisibilité affiche en permanence le rapport de
  contraste mesuré des libellés d'icônes.
- **La résolution exacte.** La taille de l'écran est détectée ; n'importe
  quelle résolution se saisit à la main. L'aperçu et le fichier exporté sont
  le même dessin à deux échelles, et cette égalité est vérifiée par des tests.
- **76 familles de motifs** en huit groupes (abstraits, pavages, volumes,
  instruments, matières, paysages, lieux, figures), **11 palettes composées à
  la main**, trois densités, et des palettes personnelles de trois à six
  couleurs.
- **Un moteur déterministe.** `(famille, palette, densité, graine)` donne
  toujours la même image, à n'importe quelle résolution. Partager un lien,
  c'est partager l'image.
- **Plusieurs sorties** : PNG, PNG 2x, WebP, SVG, copie dans le
  presse-papiers, et les trois appareils (téléphone, tablette, ordinateur)
  depuis la même graine.
- **Version claire et version sombre**, brûlées dans le fichier exporté, pas
  simulées.
- **PWA installable**, pleinement fonctionnelle hors ligne, avec React pour
  seule dépendance d'exécution.
- **L'accessibilité comme plancher** : contrastes WCAG calculés sur le vrai
  DOM, clavier complet, focus visible, cibles tactiles de 44 px et mouvement
  réduit, le tout tenu par l'outillage du dépôt.

## Galerie

Dix familles parmi les soixante-seize. Chaque image de ce README sort du
moteur lui-même, graine fixe, et se régénère à l'identique avec
`node tools/vitrine.mjs` : aucune ne peut promettre un rendu que l'application
ne donnerait pas.

| | | | | |
|:---:|:---:|:---:|:---:|:---:|
| <img src="docs/vitrine/vagues.png" alt="Vagues" width="150"> | <img src="docs/vitrine/demilunes.png" alt="Demi-lunes" width="150"> | <img src="docs/vitrine/penrose.png" alt="Penrose" width="150"> | <img src="docs/vitrine/cubes.png" alt="Cubes" width="150"> | <img src="docs/vitrine/kintsugi.png" alt="Kintsugi" width="150"> |
| Vagues | Demi-lunes | Penrose | Cubes | Kintsugi |
| <img src="docs/vitrine/cernes.png" alt="Cernes" width="150"> | <img src="docs/vitrine/moire.png" alt="Moiré" width="150"> | <img src="docs/vitrine/dunes.png" alt="Dunes" width="150"> | <img src="docs/vitrine/torii.png" alt="Torii" width="150"> | <img src="docs/vitrine/constellations.png" alt="Constellations" width="150"> |
| Cernes | Moiré | Dunes | Torii | Constellations |

## Un motif, plusieurs formats

Le PNG à la résolution de l'écran est l'appel primaire : c'est le fond
d'écran. Les autres sorties servent d'autres usages, et le même motif
(Méandres, palette Nuit, graine 7314) donne ceci dans chacune d'elles, ici en
590 × 1278 :

| PNG, 295 Ko | WebP, 31 Ko | SVG, 38 Ko |
|:---:|:---:|:---:|
| <img src="docs/vitrine/formats.png" alt="Méandres en PNG" width="180"> | <img src="docs/vitrine/formats.webp" alt="Méandres en WebP" width="180"> | <img src="docs/vitrine/formats.svg" alt="Méandres en SVG" width="180"> |

| Sortie | À quoi elle sert |
|---|---|
| **PNG** | le fond d'écran, à la résolution détectée ou saisie |
| **PNG 2x** | la même image pour un écran qu'on ne connaît pas encore |
| **WebP** | le même fond d'écran, deux à trois fois plus léger, pour l'envoyer |
| **SVG** | non plus un fond d'écran mais un motif, à reprendre ailleurs |
| **Les trois appareils** | la même graine en téléphone, tablette et ordinateur, en une fois |
| **Copier l'image** | un PNG dans le presse-papiers, le chemin le plus court vers une conversation |

Chaque motif existe aussi en **version sombre** : le même dessin amené à une
obscurité cible dans le fichier lui-même, si bien que toutes les palettes en
sortent également sombres. Ici Sommets sur la palette Soleil, en clair et en
sombre :

| Claire | Sombre |
|:---:|:---:|
| <img src="docs/vitrine/version-claire.png" alt="Sommets, version claire" width="180"> | <img src="docs/vitrine/version-sombre.png" alt="Sommets, version sombre" width="180"> |

## Essayer

```bash
git clone https://github.com/alarboulletmarin/aplat.git
cd aplat
npm install
npm run dev
```

Trois adresses : `/` présente le projet, `/app` le fait tourner, `/moteur`
explique comment il tourne, étape par étape, avec des rendus en direct.

Le Service Worker est désactivé en développement. Pour éprouver
l'installation et le mode hors ligne, construire d'abord :

```bash
npm run build
npm run preview
```

## Comment ça marche

Le moteur trace chaque forme en coordonnées rapportées au petit côté du
canevas : un motif n'a pas de taille en pixels, et l'aperçu à l'écran comme le
fichier 4K exporté sont la même image. Après les formes, une sonde mesure la
luminance de la zone des icônes, choisit la couleur de libellé la plus sûre et
pousse le fond juste ce qu'il faut pour que les libellés d'icônes restent
lisibles ; le rapport de contraste obtenu est affiché, et le voile n'est
appliqué que s'il sert.

**L'URL porte l'état, et rien d'autre :**

```
/app?m=vagues&p=lime&d=1&s=7314&r=1179x2556
```

| Paramètre | Sens |
|---|---|
| `m` | famille |
| `p` | palette |
| `d` | densité (de 0 à 2) |
| `s` | graine |
| `r` | résolution, seulement si elle a été saisie à la main |
| `v=0` | seulement si le voile de lisibilité a été retiré du fichier |
| `n=1` | seulement si c'est la version sombre qui est exportée |
| `k` | les teintes d'une palette personnelle, seulement si le motif en porte une |

Copier le lien suffit à retrouver exactement la même image, sur n'importe
quel appareil. Une URL forgée ne peut produire qu'un motif valide : tout ce
qui n'est pas reconnu retombe sur la valeur par défaut.

Le pourquoi de chaque choix (ce qui a été essayé puis retiré, l'écran unique,
la version sombre, les palettes personnelles) est dans les
[notes de conception](docs/notes-de-conception.md).

## Confidentialité

Aucun compte, aucun appel réseau à l'exécution, aucune mesure d'audience. Ni
cookie, ni `sessionStorage`, ni base indexée. Les réglages du motif affiché
vivent dans la barre d'adresse, et l'appareil ne porte que **quatre clés de
`localStorage`, et pas une de plus** :

| Clé | Contenu |
|---|---|
| `aplat:motifs` | les dix derniers motifs regardés, quatre réglages chacun, plus six épingles au plus ; ni image, ni horodatage, ni identifiant |
| `aplat:palettes` | les palettes composées à la main, douze au plus, un nom et trois à six couleurs chacune |
| `aplat:langue` | la langue choisie, un mot, écrit seulement le jour où on la choisit |
| `aplat:theme` | le thème choisi, un mot, écrit seulement le jour où on le choisit |

Tout s'efface depuis l'interface. Le contenu exact de ces clés est vérifié
champ par champ à chaque `npm run check`, et une cinquième clé fait échouer le
contrôle. La politique de sécurité du document (`connect-src 'none'`) coupe
`fetch`, XHR, WebSocket, EventSource et `sendBeacon` : « aucun réseau » est
une propriété du document, pas une promesse. Les polices sont auto-hébergées
pour la même raison.

## Développement

Demande **Node 22**. La pile est React 19, TypeScript et Vite ; React est la
seule dépendance d'exécution.

```bash
npm install
npm run dev         # serveur de développement
npm run verify      # la porte de sortie : typographie, types, lint, tests, build
npm run check       # les vérifications dans un vrai navigateur (demande Chromium)

npm run test        # tests unitaires seuls
npm run typecheck   # types seuls
npm run lint        # règles des hooks React, que tsc ne voit pas
npm run build       # notices + types + build de production
npm run preview     # sert le build, Service Worker actif
```

`verify` ne demande que Node ; `check` demande Chromium
(`npx playwright install --with-deps chromium`), c'est pourquoi il vit à part.
La CI rejoue les deux, dans deux travaux parallèles.

`npm run check` enchaîne quinze suites de vérifications headless : parcours
complets, URL hostiles, contrastes réels calculés sur le DOM, cibles
tactiles, débordements avec libellés allongés de 30 %, installation hors
ligne, endurance, budgets de performance avec le processeur bridé six fois,
et le reste. Chacune est décrite dans [`tools/README.md`](tools/README.md).

### Ce que contient le dépôt

```
src/lib/          le moteur génératif : palettes, familles, rendu, SVG, URL
src/components/   l'interface, un fichier par pièce
src/hooks/        horloge, tailles, focus, ajustement, économie
src/i18n/         les libellés français et anglais, à parité stricte
src/styles/       tokens, reset, base, composants, écrans
public/polices/   Anton et Archivo, auto-hébergées
tools/            vérifications headless (hors livraison)
scripts/          icônes de la PWA, notices de licence
design/           les maquettes de référence
docs/             notes de conception et images du README
```

## Documentation

| Document | Répond à |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | ce que le projet refuse, et comment il s'écrit |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | la référence de l'interface, jetons compris |
| [`docs/notes-de-conception.md`](docs/notes-de-conception.md) | les notes de conception : le pourquoi de chaque choix |
| [`CHANGELOG.md`](CHANGELOG.md) | ce que chaque version change pour la personne qui l'utilise |
| [`SECURITY.md`](SECURITY.md) | comment signaler une faille, et ce qui n'en est pas une |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | ce qu'on attend dans les échanges |
| [`tools/README.md`](tools/README.md) | ce que chaque vérification vérifie, et comment la rejouer |

L'interface est entièrement bilingue (français et anglais), et les documents
de référence sont écrits en français, comme les identifiants du code : lire
[`CONTRIBUTING.md`](CONTRIBUTING.md) avant d'ouvrir une pull request.

## Contribuer

Les contributions sont bienvenues. Lire [`CONTRIBUTING.md`](CONTRIBUTING.md)
d'abord : il dit ce que le projet refuse par principe (comptes, traceurs,
gamification, notifications, bibliothèques de composants, plus d'un appel
primaire par écran), les règles qui tiennent le code, et ce qu'on attend d'une
pull request. Les bugs passent par les
[issues](https://github.com/alarboulletmarin/aplat/issues) ; les failles par
[`SECURITY.md`](SECURITY.md).

## Licence

Le code est publié sous licence **AGPL-3.0-only** ([`LICENSE`](LICENSE)). Le
pied de page de l'application pointe le commit exact d'où sort le build :
c'est ce que l'AGPL appelle la source correspondante.

Anton et Archivo sont sous SIL Open Font License 1.1
(`public/polices/OFL-Anton.txt`, `public/polices/OFL-Archivo.txt`). Les
licences des composants tiers embarqués dans le build sont rassemblées à
chaque `npm run build` dans `public/THIRD-PARTY.txt`.
