# Aplat

Un générateur de fonds d'écran génératifs, exportés à la résolution exacte de
l'appareil. Tout est calculé dans le navigateur.

Gratuit, sans compte, sans pub, sans traceur, sans serveur, sans stockage.
Aucune donnée ne sort de l'appareil. Ce qui est partageable tient dans l'URL.

---

## Avant de dessiner

**La tâche et sa fin.** La personne arrive pour changer son fond d'écran ; elle
a fini quand l'image est dans sa pellicule, à la bonne taille, et que ses icônes
restent lisibles dessus.

**Le contexte d'usage.** Une main, deux minutes, sur téléphone, dans les
transports. Debout, en mouvement, l'écran peut-être en plein soleil.

**La hiérarchie de l'écran.** Il n'y en a qu'un.
- *Primaire* : le motif vu derrière de vraies icônes, et le bouton Télécharger.
  C'est là qu'on décide, c'est là qu'on finit.
- *Secondaire* : les trois réglages — famille, palette, densité — et la
  résolution, déjà détectée, repliée tant qu'on n'y touche pas.
- *Caché* : langue, thème, lien de partage. En bas, sous le trait, pour qui les
  cherche.

### Pourquoi une seule section

La valeur du produit est de **voir le rendu derrière les icônes avant de
télécharger**. Toute navigation qui sépare les réglages de l'aperçu casse
exactement ça : on réglerait à l'aveugle, puis on irait vérifier. L'aperçu est
donc épinglé en haut de l'écran et les réglages défilent dessous ; sur
ordinateur, les deux sont côte à côte. Pas d'onglet, pas de barre de
navigation, pas d'étape.

---

## Les états

| État | Ce qu'on voit | Comment on en sort |
|---|---|---|
| **Vide** | Résolution absente ou incomplète. La maquette est remplacée par une hachure, avec « Indique une résolution ». Le bouton Télécharger est désactivé. | Saisir largeur et hauteur, ou reprendre un préréglage. |
| **Chargement** | Trois points au centre de la maquette pendant le rendu. Le bouton passe à « Rendu en cours » et devient `aria-busy`. | Se résout seul. |
| **Erreur** | Carte à bordure corail, triangle plein, cause exacte : au-delà de 40 Mpx on dit le nombre, sinon on dit que le fichier n'a pas pu être créé. Bouton Réessayer. | Réessayer, ou baisser la résolution. |
| **Succès** | Carte lime : dimensions produites, format, poids réel du fichier, et le geste pour passer de « téléchargé » à « dans la pellicule ». | Rien à faire, c'est fini. |
| **Données trop longues** | Chaque libellé a son échappatoire prévue : ellipse sur les puces de réglage et les icônes de la maquette, retour à la ligne dans les cartes, colonnes qui s'étirent, `overflow-wrap` sur la résolution. Le bouton secondaire cède la place au primaire. | — |

L'état de lisibilité est affiché en permanence, pas seulement en cas de
problème : rapport de contraste mesuré, couleur de libellé retenue, force du
voile appliqué, et une phrase qui dit quoi faire si c'est juste.

---

## Ouvrir

Aucune construction, aucune dépendance. Ouvrir `index.html` — y compris en
`file://`.

```
python3 -m http.server 8000    # ou n'importe quel serveur statique
```

## Ce que contient le dépôt

```
index.html                 la page, entière
src/app.css                jetons et styles — CSS pur, aucune librairie
src/engine.js              le moteur génératif — palettes, familles, rendu
src/i18n.js                les libellés FR et EN
src/app.js                 l'interface
assets/fonts/*.woff2       Anton et Archivo, auto-hébergées
design/Aplat.dc.html       la maquette de référence
tools/                     vérifications headless (hors livraison)
```

## L'URL porte l'état

`?m=vagues&p=lime&d=1&s=7314&l=fr&r=1179x2556`

`m` famille · `p` palette · `d` densité (0–2) · `s` graine · `l` langue ·
`r` résolution · `t` thème, seulement s'il n'est pas « système ».

Rien d'autre n'est transmis, rien n'est stocké. Copier le lien suffit à
retrouver exactement la même image, sur n'importe quel appareil.

---

## Le moteur

`(famille, palette, densité, graine)` donne toujours la même image, à
n'importe quelle résolution. Les formes sont tracées en coordonnées relatives :
l'aperçu et le fichier exporté sont le même dessin, à deux échelles.

**Le voile de lisibilité.** Après les formes, le moteur mesure la luminance
moyenne de la zone des icônes, choisit la couleur de libellé la plus sûre
(claire ou sombre), puis pousse le fond vers elle juste ce qu'il faut. Le
rapport obtenu est affiché ; le voile n'est appliqué que s'il sert.

La mesure se fait sur une sonde de taille fixe, jamais sur l'image finale :
l'aperçu et l'export donnent exactement les mêmes chiffres, et un fond d'écran
4K ne réclame pas un `getImageData` de 100 Mo.

### Poids et netteté des images produites

Mesuré sur les **594 combinaisons** (18 familles × 11 palettes × 3 densités) en
1179 × 2556, soit 3,0 Mpx :

| | avant | après |
|---|---|---|
| médiane | 0,94 Mo | **0,42 Mo** |
| 9ᵉ décile | 2,33 Mo | **0,73 Mo** |
| maximum | 2,33 Mo | **0,98 Mo** |

Trois causes, trois correctifs, tous mesurés :

1. **Le voile était un dégradé.** Le navigateur trame les `createLinearGradient`
   pixel par pixel ; le PNG devenait incompressible. Il est peint en 320 bandes
   à opacité constante — aucune marche ne dépasse un cran sur 255. Coût : 0 Ko.
2. **Le grain ne tramait pas les palettes sombres.** Un bruit gris en `overlay`
   ne bouge quasiment pas sur un fond foncé : Nuit, Orage et Encre n'étaient pas
   tramées, alors que c'est là qu'un cran sur 255 se voit le plus. Remplacé par
   un mouchetis blanc / noir / transparent en `source-over` : trois niveaux
   crête à crête du `#101A2E` au `#FFFFFF`, pour un tiers du poids.
3. **Deux familles perdaient en netteté au zoom.** Les vagues étaient
   échantillonnées tous les `W/260` px, soit des facettes visibles en 4K —
   passées à `W/2400`. Les cellules de la trame étaient posées sur des
   coordonnées fractionnaires, d'où des coutures adoucies — elles sont
   maintenant calées sur des bornes entières.

Le grain fait un pixel d'appareil de côté, quelle que soit la résolution : il ne
forme jamais de blocs quand on agrandit l'image.

---

## Accessibilité

Vérifié par `tools/a11y.js`, qui recompose les couleurs semi-transparentes sur
leur pile de fonds réelle avant d'appliquer la formule WCAG, dans les deux
thèmes et les deux langues :

- texte courant ≥ 4,5:1, texte large et bordures d'éléments d'interface ≥ 3:1 ;
- test en niveaux de gris : la sélection passe par la bordure, le fond **et**
  une coche — jamais par la seule couleur. La densité est aussi dite par un
  motif de points, la lisibilité par trois formes distinctes (disque, demi-disque,
  triangle), l'erreur par un triangle ;
- le corail est réservé aux aplats et aux formes, jamais au texte ;
- cibles tactiles ≥ 44 px, vérifiées de 320 à 1920 px de large, et
  atteignabilité de chaque contrôle testée sous les deux barres collantes ;
- focus visible partout, lien d'évitement, points de repère, `aria-live` sur la
  lisibilité et sur le résultat de l'export ;
- la fausse maquette d'écran est `aria-hidden` — un lecteur d'écran ne lit pas de
  faux noms d'application ; l'aperçu porte une description de ce qu'il montre ;
- `prefers-reduced-motion` respecté : le fondu du canevas et l'animation
  d'attente s'effacent.

## Écarts assumés par rapport à la maquette

Tous mesurés, tous en faveur d'une contrainte du cahier des charges.

| Écart | Pourquoi |
|---|---|
| `--line-strong` passe de `.45` à `.56` en thème clair | Les bordures de champs et de boutons passaient sous 3:1. |
| Les puces de réglage prennent `--line-strong` au lieu de `--line` | Sur une puce texte seul, la bordure est ce qui dit « ceci se touche » : 1,37:1 → 3,5:1. |
| Une coche apparaît dans la case sélectionnée | En niveaux de gris, l'aplat lime et le fond de la puce sélectionnée se ressemblent trop. |
| Boutons langue et thème : `min-width: 44px`, rangée qui passe à la ligne | Ils tombaient à 42 px de large sur certaines largeurs. |
| Le bouton « Nouveau motif » peut rétrécir | Un libellé traduit 30 % plus long poussait « Télécharger » hors de l'écran sur un 320 px. |
| Les grilles utilisent `minmax(min(320px, 100%), 1fr)` | `minmax(320px, …)` forçait une piste plus large que l'écran sur un 320 px. |
| La grille d'icônes de la maquette perd des rangées si l'appareil est large | Sur une tablette 4:3 ou un écran 16:9, la grille complète emportait le dock et la barre de recherche hors du cadre : la zone basse du fond d'écran n'était plus jugeable. |
| Polices auto-hébergées au lieu de Google Fonts | « Sans traceur, aucune donnée ne sort » : un appel à `fonts.gstatic.com` transmet l'adresse IP. |
| Le voile en bandes et le grain en mouchetis | Poids du fichier et tramage des palettes sombres, voir plus haut. |
| La résolution détectée est forcée en portrait sur pointeur grossier | Android fait pivoter `screen.width` avec l'appareil, pas iOS : en paysage on proposait un fond d'écran couché. |
| Lien d'évitement, points de repère, `aria-live`, `aria-hidden`, `role="img"` | Sans effet visuel au repos. |

## Vérifications

```
npm install          # playwright, uniquement pour les vérifications
npm run check        # tout enchaîner
```

| Outil | Ce qu'il vérifie |
|---|---|
| `tools/e2e.js` | parcours complet : URL, déterminisme, états, téléchargement réel, clavier, mouvement réduit |
| `tools/a11y.js` | contrastes réels sur le DOM, deux thèmes, deux langues |
| `tools/reach.js` | atteignabilité et taille des cibles, de 320 à 1920 px |
| `tools/overflow.js` | débordements, y compris libellés allongés de 30 % |
| `tools/export-audit.js` | poids et durée des PNG sur les 594 combinaisons |
| `tools/band-test.js` | hauteur des marches du voile |
| `tools/dither-check.js` | amplitude du grain sur toute la gamme tonale |
| `tools/edges.js` | découpes agrandies sur les bords |
| `tools/shot.js` | captures et absence de requête sortante |
| `tools/greyscale.js` | test en niveaux de gris |
| `tools/fidelity.js` | chaque déclaration de la maquette est-elle présente dans le portage |
| `tools/geo-diff.js` · `tools/pixel-diff.js` | maquette d'origine et portage rendus côte à côte |

### Fidélité mesurée

`tools/fidelity.js` relit les 307 déclarations et les 21 jetons des styles en
ligne de `design/Aplat.dc.html`. Les 21 jetons et 290 déclarations se retrouvent
tels quels ; les 17 restantes sont exactement les substitutions listées
ci-dessus (`color-mix` précalculé en rgba, `minmax(min(…))`, `--line-strong`
sur les puces, `animation-delay` séparé).

`tools/geo-diff.js` rend la maquette d'origine — React et Babel servis en
local, mêmes polices, même graine — et compare 28 repères : **27 identiques**
au pixel près (position, taille, corps, graisse, interlettrage, interligne,
couleur, rayon, bordure, remplissage) ; le 28ᵉ écart vient du gabarit qui
enveloppe le texte dans un élément de plus.

`tools/pixel-diff.js` compare les deux rendus pixel à pixel : **96,9 %** des
pixels sont identiques. Les 3,1 % restants sont, un par un, les écarts assumés :
bordures des puces, coche de sélection, rangées d'icônes retirées de la maquette
d'écran, cellules de la trame calées sur des bornes entières, et le grain.

## Licences

Le code est publié sous licence MIT (`LICENSE`).
Anton et Archivo sont sous SIL Open Font License 1.1
(`assets/fonts/OFL-Anton.txt`, `assets/fonts/OFL-Archivo.txt`).
