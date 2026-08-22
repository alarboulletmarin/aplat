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
| **Erreur** | Carte à bordure et triangle d'alerte, cause exacte : au-delà de 40 Mpx on dit le nombre ; si le navigateur a refusé d'allouer le canevas — ce que font les navigateurs mobiles au-delà d'une certaine surface, en rendant une image noire sans le dire — on dit d'essayer plus petit ; sinon on dit que le fichier n'a pas pu être créé. Bouton Réessayer. | Réessayer, ou baisser la résolution. |
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

## Réactivité

L'aperçu et les vignettes ne dépendent pas des mêmes réglages : taper un chiffre
dans le champ largeur ne concerne que l'aperçu, changer de palette ne concerne
que les vignettes visibles. Les vignettes sont dessinées à l'entrée dans le
champ de vision, pas toutes d'un coup — neuf sur dix-huit au premier affichage
d'un téléphone.

Mesuré avec le processeur bridé six fois, ce qui correspond à un téléphone
d'entrée de gamme (`tools/perf.js`) :

| action | avant | après |
|---|---|---|
| frappe dans le champ largeur | 67 ms | **30 ms** |
| changement de palette | 163 ms | **20 ms** |
| changement de famille | 52 ms | **13 ms** |
| nouveau motif | 175 ms | **12 ms** |

## Accessibilité

Vérifié par `tools/a11y.js`, qui recompose les couleurs semi-transparentes sur
leur pile de fonds réelle avant d'appliquer la formule WCAG, dans les deux
thèmes et les deux langues :

- texte courant ≥ 4,5:1, texte large, bordures d'éléments d'interface et formes
  porteuses de sens ≥ 3:1 — 73 textes, 48 bordures et le trait de la carte
  d'erreur examinés dans chacune des six combinaisons de thème et de langue ;
- test en niveaux de gris : la sélection passe par la bordure, le fond **et**
  une coche — jamais par la seule couleur. La densité est aussi dite par un
  motif de points, la lisibilité par trois formes distinctes (disque, demi-disque,
  triangle), l'erreur par un triangle ;
- le corail est réservé aux aplats et aux formes, jamais au texte ;
- cibles tactiles ≥ 44 px, vérifiées de 320 à 1920 px de large, et
  atteignabilité de chaque contrôle testée sous les deux barres collantes ;
- focus visible partout et **jamais masqué** par les deux barres collantes : ni
  le défilement déclenché par le focus ni `scrollIntoView` n'appliquent
  `scroll-padding` aujourd'hui, la correction est donc faite sur `focusin`
  (WCAG 2.2, 2.4.11) ;
- les cinq groupes de réglages sont de vrais groupes radio : un arrêt de
  tabulation par groupe, flèches et Début/Fin. Le parcours passe de 42 arrêts
  à 11 ;
- lien d'évitement, points de repère, `aria-live` sur la lisibilité, sur le
  résultat de l'export et sur la confirmation de copie ;
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
| Les cinq grilles auto-fit passent de `minmax(Xpx, 1fr)` à `minmax(min(Xpx, 100%), 1fr)` | Le minimum forçait une piste plus large que l'écran sous 336 px. Au-dessus du seuil le rendu est identique au pixel. |
| La grille d'icônes de la maquette perd des rangées si l'appareil est large — 16 icônes en téléphone (inchangé), 12 en tablette au lieu de 24, 3 en ordinateur au lieu de 5 | Tout y est dimensionné en unités calées sur le petit côté ; sur une tablette 4:3 ou un écran 16:9 la grille complète emportait le dock et la barre de recherche hors du cadre, et la zone basse du fond d'écran n'était plus jugeable. |
| Polices auto-hébergées au lieu de Google Fonts | « Sans traceur, aucune donnée ne sort » : un appel à `fonts.gstatic.com` transmet l'adresse IP. |
| Le voile en bandes et le grain en mouchetis | Poids du fichier et tramage des palettes sombres, voir plus haut. |
| La résolution détectée est forcée en portrait sur pointeur grossier | Android fait pivoter `screen.width` avec l'appareil, pas iOS : en paysage on proposait un fond d'écran couché. |
| Lien d'évitement, points de repère, `aria-live`, `aria-hidden`, `role="img"` sur le canevas | Sans effet visuel au repos. |
| Les puces de réglage deviennent des groupes radio (`role="radio"` + `aria-checked` + tabulation tournante) | Ces cinq groupes sont à choix unique : `aria-pressed` disait « bascule ». Le parcours clavier passe de 42 arrêts à 11. Le rendu ne change pas. |
| Le défilement réserve la place des deux barres collantes, corrigé en JS | Ni le focus ni `scrollIntoView` n'appliquent `scroll-padding` aujourd'hui : un élément atteint au clavier finissait sous une barre, anneau de focus compris (WCAG 2.2, 2.4.11). |
| Trait de la carte d'erreur et de son triangle : jeton `--alert` en thème clair | Le corail `#FF6648` tombe à 2,7:1 sur la carte. Le corail décoratif et celui des palettes ne bougent pas. |
| Trait des surfaces lime en `--accent-ink` plutôt que `--ink` | En sombre `--ink` est la crème, qui disparaît sur le lime. En clair les deux valeurs sont identiques : le rendu de la maquette est inchangé. |
| Point de densité éteint : cercle évidé à pleine opacité | À 28 % d'opacité il tombait à 1,8:1, alors que ces trois points sont le seul dessin qui traduit le niveau. |
| Bouton d'export : `aria-disabled` pendant le rendu, `disabled` seulement à vide | `disabled` retirait le focus du bouton et renvoyait au début du document. |
| Boutons langue et thème : plancher lié au contenu | Avec un plancher de 44 px la rangée ne se repliait jamais et « Français » se coupait en plein mot. |
| Le bouton secondaire s'efface entièrement, le primaire ne rétrécit pas | Avec des facteurs voisins les deux libellés étaient coupés : « Télécharger » devenait « Téléch… » dès 320 px. |
| Espaces insécables dans les chaînes françaises | Le texte se coupait devant « % », « : » et à l'intérieur des guillemets. |
| Repli de copie manuelle quand le presse-papiers refuse | L'ancien code annonçait « Lien copié » même en cas d'échec, y compris quand l'API était absente. |
| La résolution détectée ne part pas dans le lien | C'est une mesure de l'appareil, pas un réglage : le lien promet « les réglages, rien d'autre ». Son absence veut dire « la résolution de celui qui ouvre le lien ». |
| Politique de sécurité `connect-src 'none'` en balise meta | La page promet « aucun réseau » : autant en faire une propriété du document. Aucune directive ne porte sur les scripts, les styles ni les images, pour que `file://` reste valide. |
| Favicon en ligne, préchargements de polices retirés | Zéro requête pour l'icône ; en `file://` les préchargements CORS échouaient et la police était téléchargée deux fois. |
| `display: standalone` retiré du manifeste | Sans cache de service worker — que le contrat interdit — une application installée ne s'ouvrirait pas sans réseau. |

## Vie privée, dans le code et pas seulement dans le texte

La page affiche « Aucun compte, aucun réseau, aucun stockage ». Ce qui le tient :

- une politique de sécurité en balise meta — `connect-src 'none'` coupe `fetch`,
  `XHR`, WebSocket, EventSource et `sendBeacon`. Aucune directive ne porte sur
  les scripts, les styles ni les images, pour que `file://` reste valide.
  Vérifié à l'exécution : une requête sortante est refusée ;
- zéro requête réseau : polices auto-hébergées, favicon en ligne. Une ouverture
  en `file://` déclenche 7 requêtes, toutes locales, aucune erreur console ;
- zéro stockage : ni `localStorage`, ni `sessionStorage`, ni IndexedDB, ni
  cookie, ni Cache API, ni service worker. Vérifié après un parcours complet,
  export compris ;
- la résolution détectée ne part pas dans le lien partagé : c'est une mesure de
  l'appareil, pas un réglage. Seule une saisie manuelle est transmise ;
- la copie du lien ne ment pas : si le presse-papiers refuse, l'échec est dit et
  le lien s'affiche à copier à la main ;
- les paramètres d'URL sont validés sur liste blanche. 241 URL hostiles ont été
  essayées — propriétés héritées d'`Object`, balises, `javascript:`, chiffres
  arabes, chaînes de 500 caractères : aucune erreur, aucune injection, la page
  rend toujours.

## Vérifications

```
npm install          # playwright, uniquement pour les vérifications
npm run check        # tout enchaîner
```

| Outil | Ce qu'il vérifie |
|---|---|
| `tools/e2e.js` | 66 contrôles : URL et sa robustesse, déterminisme, quatre états, téléchargement réel, course à l'export, échec de copie, politique réseau, clavier, focus non masqué, mouvement réduit |
| `tools/a11y.js` | contrastes réels sur le DOM, deux thèmes, deux langues |
| `tools/reach.js` | atteignabilité et taille des cibles, de 320 à 1920 px |
| `tools/overflow.js` | débordements et troncatures sur 256 combinaisons de largeur, langue et résolution cible, avec et sans libellés allongés de 30 % |
| `tools/export-audit.js` | poids et durée des PNG sur les 594 combinaisons |
| `tools/band-test.js` | hauteur des marches du voile |
| `tools/dither-check.js` | amplitude du grain sur toute la gamme tonale |
| `tools/edges.js` | découpes agrandies sur les bords |
| `tools/shot.js` | captures et absence de requête sortante |
| `tools/greyscale.js` | test en niveaux de gris |
| `tools/fileurl.js` | ouverture en `file://` : requêtes, doublons de police, erreurs console |
| `tools/fuzz-url.js` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `tools/planche.js` | planche-contact des 18 familles à la résolution d'un téléphone |
| `tools/perf.js` | coût de chaque action, processeur bridé six fois |
| `tools/states.js` | captures des quatre états |
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
