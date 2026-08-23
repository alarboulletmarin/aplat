# Aplat

[![Licence : AGPL-3.0-only](https://img.shields.io/badge/licence-AGPL--3.0--only-17243F.svg)](LICENSE)

Des fonds d'écran génératifs, exportés à la résolution exacte de l'appareil.
Tout est calculé dans le navigateur.

Gratuit, sans compte, sans pub, sans traceur, sans serveur. Aucune donnée ne
sort de l'appareil : ce qui est partageable tient dans l'URL, et la seule
chose écrite sur l'appareil est la liste des dix derniers motifs regardés,
effaçable d'un bouton. Installable, et pleinement utilisable hors ligne.

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
- *Secondaire* : les trois réglages (famille, palette, densité) et la
  résolution, déjà détectée, repliée tant qu'on n'y touche pas. Deux raccourcis
  de hasard, aux effets distincts : « Variante », dans la barre, ne change que
  la graine ; « Surprends-moi », dans la carte Famille, tire aussi une famille
  et une palette.
- *Caché* : le lien de partage, en bas du bloc ; puis, dans le pied de page,
  la langue, le thème, la version et la source. Pour qui les cherche.

### Pourquoi une seule section

La valeur du produit est de **voir le rendu derrière les icônes avant de
télécharger**. Toute navigation qui sépare les réglages de l'aperçu casse
exactement ça : on réglerait à l'aveugle, puis on irait vérifier. L'aperçu est
donc épinglé en haut de l'écran et les réglages défilent dessous ; sur
ordinateur, les deux sont côte à côte. Pas d'onglet, pas de barre de navigation,
pas d'étape.

Le panneau de réglages ne contient que ce qui agit sur le fichier téléchargé :
famille, palette, densité, résolution. La langue et le thème sont dans le pied
de page, à côté de la version et du lien vers la source, parce qu'ils ne
changent que l'affichage.

Le parti visuel et les règles d'interface sont dans
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

---

## Les états

| État | Ce qu'on voit | Comment on en sort |
|---|---|---|
| **Vide** | Résolution absente ou incomplète. La maquette est remplacée par une hachure, avec « Indique une résolution ». Le bouton Télécharger est désactivé. | Saisir largeur et hauteur, ou reprendre un préréglage. |
| **Chargement** | Trois points au centre de la maquette pendant le rendu. Le bouton passe à « Rendu en cours » et devient `aria-busy`. | Se résout seul. |
| **Erreur** | Carte à trait d'alerte et triangle, cause exacte : au-delà de 40 Mpx on dit le nombre ; si le navigateur a refusé d'allouer le canevas (ce que font les navigateurs mobiles au-delà d'une certaine surface, en rendant une image noire sans le dire), on dit d'essayer plus petit ; sinon on dit que le fichier n'a pas pu être créé. Bouton Réessayer. | Réessayer, ou baisser la résolution. |
| **Succès** | Carte lime : dimensions produites, format, poids réel du fichier, et le geste pour passer de « téléchargé » à « dans la pellicule ». | Rien à faire, c'est fini. |
| **Données trop longues** | Chaque libellé a son échappatoire prévue : les libellés de carte reviennent à la ligne, sur deux lignes s'il le faut, et ne s'élident jamais ; ellipse sur les icônes de la maquette ; colonnes qui s'étirent ; `overflow-wrap` sur les valeurs. Le bouton secondaire cède la place au primaire. | Sans objet. |

Le verdict de lisibilité est affiché en permanence, pas seulement en cas de
problème : rapport de contraste mesuré, couleur de libellé retenue, force du
voile appliqué, et une phrase qui dit quoi faire si c'est juste. Le
qualificatif suit trois bandes, et rien entre les deux : **bonne** au-dessus de
4,5:1, le seuil AA du petit texte qu'est un libellé d'icône ; **juste** entre
3:1 et 4,5:1 ; **insuffisante** en dessous. Chaque bande a sa forme, disque
plein, disque à moitié, triangle.

Une bascule **Assombri**, au bout de la rangée du verdict, simule le fond
d'écran tel qu'un thème sombre l'assombrit : les libellés clairs y gagnent, les
sombres y perdent, et le rapport annoncé suit. Le fichier téléchargé, lui, ne
change pas d'un octet, ce qu'une vérification compare pour de bon.

Sur téléphone en portrait, l'aperçu se replie en vignette dès qu'on défile, et
le verdict se condense sur une ligne, dépliable au doigt : les grilles passent
de 37 % à 58 % de la hauteur de l'écran. Le repli se fait à l'échelle, pas à la
géométrie, si bien que le motif n'est pas redessiné pour l'occasion.

---

## Démarrer

```bash
npm install
npm run dev        # serveur de développement
npm run verify     # la porte de sortie : typographie, types, lint, tests, build
npm run check      # les vérifications dans un vrai navigateur

npm run test       # tests unitaires seuls
npm run typecheck  # types seuls
npm run lint       # règles des hooks React, que tsc ne voit pas
npm run typographie # ni tiret cadratin, ni point médian dans les sources
npm run build      # notices + types + build de production
npm run preview    # sert le build, Service Worker actif
```

`verify` ne demande que Node ; `check` demande Chromium
(`npx playwright install --with-deps chromium`), c'est pourquoi il vit à part.
La CI rejoue les deux, dans deux travaux parallèles.

Le Service Worker est désactivé en développement : pour éprouver l'installation
et le mode hors ligne, passer par `build` puis `preview`.

## Ce que contient le dépôt

```
index.html                    le document, et le thème résolu avant la peinture
vite.config.ts                build, PWA, politique de sécurité
eslint.config.js              les règles des hooks React, que tsc ne voit pas
vercel.json                   les en-têtes de cache qui décident des mises à jour
src/main.tsx                  point d'entrée
src/App.tsx                   l'état, l'URL, l'export
src/lib/moteur.ts             le moteur génératif : palettes, familles, rendu
src/lib/{resolution,url,export,geometrie,format,build}.ts
src/components/               l'interface, un fichier par pièce
src/hooks/                    horloge, tailles, focus, ajustement
src/i18n/{fr,en,index}.ts     les libellés, à parité stricte
src/styles/                   tokens, reset, base, composants, écrans
public/polices/*.woff2        Anton et Archivo, auto-hébergées
scripts/                      icônes de la PWA, notices de licence
design/Aplat.dc.html          la maquette de référence
tools/*.mjs                   vérifications headless (hors livraison)
.github/workflows/ci.yml      la CI : `verify` et `check`, en parallèle
```

## L'URL porte l'état

`?m=vagues&p=lime&d=1&s=7314&l=fr&r=1179x2556`

`m` famille, `p` palette, `d` densité (de 0 à 2), `s` graine, `l` langue,
`r` résolution (seulement si elle a été saisie à la main),
`t` thème (seulement s'il n'est pas « système »).

Rien d'autre n'est transmis. Copier le lien suffit à retrouver exactement la
même image, sur n'importe quel appareil. Une URL forgée ne peut produire qu'un
motif valide : tout ce qui n'est pas reconnu retombe sur la valeur par défaut,
et jamais par un accès indexé, car `PALETTES['constructor']` est « vrai » et
suffisait à faire lever le rendu tout entier.

## Ce qui est enregistré, et ce qui ne l'est pas

Aucun compte, aucun réseau à l'exécution, aucune mesure d'audience. Ni cookie,
ni `sessionStorage`, ni base indexée. Les réglages du motif affiché vivent dans
la barre d'adresse.

**Une seule clé de `localStorage`**, `aplat:motifs` : les dix derniers motifs
regardés, quatre réglages chacun. Ni image (le rendu est déterministe, le
moteur les redessine), ni horodatage, ni identifiant, ni URL, ni compteur de
visites. Rien qui distingue un appareil d'un autre, rien qui décrive une
session. Deux cents octets pour cinq entrées, et un bouton « Effacer » dans la
carte « Derniers motifs ». Un motif n'y entre qu'après être resté deux secondes
et demie à l'écran : parcourir les familles ne remplit pas la liste. Ce que
cette clé contient exactement est vérifié à chaque `npm run check`, champ par
champ.

L'application étant installable, un cache existe, celui du Service Worker. Il
ne contient **que les fichiers de l'application** : le document, le script, la
feuille de style, les polices, les icônes et les notices de licence. Aucun
réglage, aucune image produite, aucune URL portant un état. C'est vérifié à
chaque `npm run check`, en énumérant le contenu réel du cache.

La politique de sécurité du document (`connect-src 'none'`) coupe `fetch`, XHR,
WebSocket, EventSource et `sendBeacon` : « aucun réseau » est une propriété du
document, pas une promesse.

---

## Le moteur

`(famille, palette, densité, graine)` donne toujours la même image, à n'importe
quelle résolution. Les formes sont tracées en coordonnées relatives : l'aperçu
et le fichier exporté sont le même dessin, à deux échelles.

**L'aperçu est le fichier.** Le canevas d'aperçu porte exactement le rapport
d'aspect de la résolution visée (la bordure de la maquette d'appareil est
défalquée), et la mesure de lisibilité porte sur les dimensions d'export, pas
sur celles du canevas. Vérifié sur les 594 combinaisons : même voile, même
verdict.

**Le voile de lisibilité.** Après les formes, le moteur mesure la luminance
moyenne de la zone des icônes, choisit la couleur de libellé la plus sûre
(claire ou sombre), puis pousse le fond vers elle juste ce qu'il faut. Le
rapport obtenu est affiché ; le voile n'est appliqué que s'il sert.

La mesure se fait sur une sonde de surface fixe, jamais sur l'image finale :
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
   à opacité constante, dont aucune marche ne dépasse un cran sur 255.
   Coût : 0 Ko.
2. **Le grain ne tramait pas les palettes sombres.** Un bruit gris en `overlay`
   ne bouge quasiment pas sur un fond foncé : Nuit, Orage et Encre n'étaient pas
   tramées, alors que c'est là qu'un cran sur 255 se voit le plus. Remplacé par
   un mouchetis blanc / noir / transparent en `source-over` : trois niveaux
   crête à crête du `#101A2E` au `#FFFFFF`, pour un tiers du poids.
3. **Deux familles perdaient en netteté au zoom.** Les vagues étaient
   échantillonnées tous les `W/260` px, soit des facettes visibles en 4K. Le
   pas d'échantillonnage est passé à `W/2400`. Les cellules de la trame étaient
   posées sur des coordonnées fractionnaires, d'où des coutures adoucies ;
   elles sont maintenant calées sur des bornes entières.

Le grain fait un pixel d'appareil de côté, quelle que soit la résolution : il ne
forme jamais de blocs quand on agrandit l'image.

---

## Réactivité

L'aperçu et les vignettes ne dépendent pas des mêmes réglages : taper un chiffre
dans le champ largeur ne concerne que l'aperçu, changer de palette ne concerne
que les vignettes visibles. Les vignettes sont dessinées à l'entrée dans le
champ de vision, pas toutes d'un coup : six ou sept sur dix-huit au premier
affichage d'un téléphone.

Mesuré avec le processeur bridé six fois, ce qui correspond à un téléphone
d'entrée de gamme (`tools/perf.mjs`) : moins de 3 ms par action, quelle qu'elle
soit.

Après 400 changements de réglage enchaînés (`tools/soak.mjs`) : même nombre de
nœuds, même nombre de canevas, même nombre d'écouteurs.

## Accessibilité

Vérifié par `tools/a11y.mjs`, qui recompose les couleurs semi-transparentes sur
leur pile de fonds réelle avant d'appliquer la formule WCAG, dans les deux
thèmes et les deux langues :

- texte courant ≥ 4,5:1, texte large, bordures d'éléments d'interface et formes
  porteuses de sens ≥ 3:1 (69 textes et 45 bordures examinés dans chacune des
  six combinaisons de thème et de langue, carte d'erreur comprise) ;
- test en niveaux de gris : la sélection est un aplat inversé, la densité un
  nombre de points allumés, la lisibilité trois formes distinctes (disque,
  demi-disque, triangle), le thème un disque plein, vide ou à moitié, l'erreur
  un triangle. Jamais la couleur seule ;
- le corail est réservé aux aplats et aux formes, jamais au texte ;
- cibles tactiles ≥ 44 px, vérifiées de 320 à 1920 px de large, fenêtres
  couchées comprises, et atteignabilité de chaque contrôle testée sous les deux
  barres collantes. Plus exigeant encore : chacun doit se dégager
  *entièrement* des deux couches à quelque position de défilement, ce que les
  cartes de motif ne faisaient pas sur un petit téléphone avant le repli ;
- focus visible partout et **jamais masqué** par ces deux barres : ni le
  défilement déclenché par le focus ni `scrollIntoView` n'appliquent
  `scroll-padding` aujourd'hui, la correction est donc faite sur `focusin`
  (WCAG 2.2, 2.4.11) ;
- les cinq groupes de réglages sont de vrais groupes radio : un arrêt de
  tabulation par groupe, flèches et Début/Fin. Le parcours passe de 42 arrêts
  à 11 ;
- lien d'évitement, points de repère, `aria-live` sur la lisibilité, sur le
  résultat de l'export et sur la confirmation de copie, sans rien y réécrire
  quand rien ne change ;
- la fausse maquette d'écran est `aria-hidden` : un lecteur d'écran ne lit pas
  de faux noms d'application ; l'aperçu porte une description de ce qu'il
  montre ;
- `prefers-reduced-motion` respecté : le fondu du canevas et l'animation
  d'attente s'effacent.

## Écarts assumés par rapport à la maquette

Tous mesurés, tous en faveur d'une contrainte du cahier des charges.

| Écart | Pourquoi |
|---|---|
| `--filet-franc` passe de `.45` à `.56` en thème clair | C'est le trait de toutes les puces de réglage et des champs. À `.45` il tombe à 2,7:1, sous les 3:1 exigés pour un élément d'interface. |
| Trait de la carte d'erreur et de son triangle : jeton `--alerte` | Le corail `#FF6648` tombe à 2,7:1 sur la carte. Le corail décoratif et celui des palettes ne bougent pas. |
| Trait du bouton primaire en `--accent-encre` plutôt que `--encre` | En sombre `--encre` est la crème, qui disparaît sur l'aplat lime. En clair les deux valeurs sont identiques : le rendu de la maquette est inchangé. |
| Le carré de sélection reçoit un filet à la couleur du texte | Sur la puce inversée du thème sombre (un aplat crème), le lime tombait à 1,1:1 et disparaissait. |
| La colonne des préférences passe de 150 à 200 px de seuil | À 150, la colonne Thème tombait à 52 px par bouton : « Système » partait seul sur une deuxième rangée, étiré sur toute la largeur. |
| Les libellés de carte reviennent à la ligne au lieu de s'élider | « Marguerites » tronqué en « Margueri… » ne nomme plus rien, et la piste d'une grille à quatre colonnes est trop étroite pour lui dès 1024 px de fenêtre. |
| Boutons langue et thème : plancher lié au contenu | Avec un plancher fixe la rangée ne se repliait jamais et « Français » se coupait en plein mot. |
| Le bouton secondaire s'efface entièrement, le primaire ne rétrécit pas | Avec des facteurs voisins les deux libellés étaient coupés : « Télécharger » devenait « Téléch… » dès 320 px. |
| Les grilles auto-fit passent de `minmax(Xpx, 1fr)` à `minmax(min(Xpx, 100%), 1fr)` | Le minimum forçait une piste plus large que l'écran sous 336 px. Au-dessus du seuil le rendu est identique au pixel. |
| Langue et thème sont dans le pied de page, pas dans le panneau | Ils ne changent rien au fichier téléchargé. Mêlés à la famille et à la palette, ils laissaient croire qu'un thème sombre s'exportait. |
| Le pied de page prend 44 px de haut par élément | Le lien vers la source n'est pas une mention légale en petit : l'AGPL en fait une obligation, et une obligation doit être cliquable. |
| La boîte de contenu de l'appareil porte le rapport d'aspect, bordure défalquée | Le canevas est en `inset:0` : sans ça l'aperçu était un format décalé de 1,5 % et sa mesure de lisibilité portait sur une image qui n'existait pas. |
| La grille d'icônes de la maquette perd des rangées si l'appareil est large | Tout y est dimensionné en unités calées sur le petit côté ; sur un écran large la grille complète emportait le dock et la barre de recherche hors du cadre, et la zone basse du fond d'écran n'était plus jugeable. |
| Le type d'appareil est déduit du rapport d'aspect, plus du petit côté en pixels | Le seuil de 1200 px classait un iPhone 15 Pro Max (1290 × 2796) comme une tablette. |
| La résolution détectée est forcée en portrait sur pointeur grossier | Android fait pivoter `screen.width` avec l'appareil, pas iOS : en paysage on proposait un fond d'écran couché. |
| Les champs de résolution sont en `type="text" inputmode="numeric"` | `type="number"` renvoie une chaîne vide dès que la saisie est mal formée, alors que le champ affiche toujours le texte tapé. |
| La saisie est bornée à 8000 dès la frappe, l'erreur de borne basse est visible | Le champ disait 9999, la carte 8 000, le lien `r=8000` et le fichier 8000 px. Et `aria-invalid` n'avait aucune expression visuelle. |
| Le bloc lisibilité n'affiche rien tant qu'il n'a rien mesuré | Il partait sur un repli codé en dur (5,4:1, voile 18 %), écrit dans une région live avant toute mesure. |
| Le qualificatif de lisibilité tient à trois bandes nommées, et le composant le prend dans le dictionnaire par le nom du niveau | Le titre disait « correcte » pour 3,5:1 pendant que le corps disait « un peu juste » : deux mots pour une seule mesure, et le plus rassurant des deux sous le seuil AA du petit texte. |
| L'historique garde quatre réglages par motif, jamais une vignette | Le rendu est déterministe : une image enregistrée ne serait qu'un cache de calcul, mille fois plus lourd, et ferait du stockage autre chose qu'une liste de réglages. |
| La promesse de confidentialité a été réécrite en même temps que l'historique est arrivé | « Aucune donnée enregistrée » est devenu faux le jour où quelque chose l'a été. Un test l'interdit maintenant dans les deux langues. |
| Les puces de réglage deviennent des groupes radio | Ces cinq groupes sont à choix unique : `aria-pressed` disait « bascule ». Le parcours clavier passe de 42 arrêts à 11. Le rendu ne change pas. |
| Le défilement réserve la place des deux barres collantes, corrigé en JS | Ni le focus ni `scrollIntoView` n'appliquent `scroll-padding` aujourd'hui : un élément atteint au clavier finissait sous une barre, anneau de focus compris. |
| Bouton d'export : `aria-disabled` pendant le rendu, `disabled` seulement à vide | `disabled` retirait le focus du bouton et renvoyait au début du document. |
| Espaces insécables dans les chaînes françaises | Le texte se coupait devant « % », « : » et à l'intérieur des guillemets. |
| Repli de copie manuelle quand le presse-papiers refuse | L'ancien code annonçait « Lien copié » même en cas d'échec, y compris quand l'API était absente. |
| La résolution détectée ne part pas dans le lien | C'est une mesure de l'appareil, pas un réglage : le lien promet « les réglages, rien d'autre ». |
| « Système » est résolu en JavaScript, la feuille de style n'a qu'un bloc sombre | La maquette déclarait le sombre deux fois, sous `[data-theme]` et sous `prefers-color-scheme`. Quinze jetons y étaient répétés à l'identique, sans que rien ne dise que les deux copies devaient bouger ensemble. Le thème est maintenant résolu avant la première peinture, et `data-theme` ne porte que « clair » ou « sombre ». |
| Politique de sécurité `connect-src 'none'`, injectée au build | La page promet « aucun réseau » : autant en faire une propriété du document. Au build seulement, le développement ayant besoin de son WebSocket. |
| Polices auto-hébergées au lieu de Google Fonts | « Sans traceur, aucune donnée ne sort » : un appel à `fonts.gstatic.com` transmet l'adresse IP. |
| `color-mix()` précalculé en `rgba()` | Même résultat exact, sans recalcul à chaque peinture d'une maquette qui se redessine à la frappe. |

### Fidélité mesurée

Trois angles, tous automatisés et reproductibles.

`tools/fidelity.mjs` relit les 299 déclarations et les 22 jetons des styles en
ligne de `design/Aplat.dc.html`, après avoir normalisé l'écriture des deux côtés
et traduit les noms de jetons. **Les 22 jetons et 291 déclarations se retrouvent
tels quels** ; les 8 restantes sont une à une les substitutions du tableau
ci-dessus : quatre grilles bornées en `min(…, 100%)`, le pied de page, et le
corail remplacé par `--alerte` là où il porte un trait d'interface.

`tools/geo-diff.mjs` rend la maquette d'origine (React et Babel servis en local,
mêmes polices auto-hébergées, même graine) et compare 27 repères sur position,
taille, corps, graisse, interlettrage, interligne, couleur, rayon, bordure et
remplissage. **19 identiques au pixel près.** Les écarts sont les boutons de
langue et de thème, dont le plancher est lié au contenu pour ne plus couper les
mots, et le décalage vertical dû à la phrase de confidentialité, plus longue
d'une ligne depuis qu'elle dit exactement ce que le cache contient.

`tools/pixel-diff.mjs` compare les deux rendus pixel à pixel : **96,6 %** des
pixels sont identiques. Les 3,1 % restants se lisent un par un sur la carte des
écarts.

## Vérifications

```bash
npm run verify   # typographie, types, lint, 69 tests unitaires, build
npm run check    # build, puis 98 contrôles dans Chromium
```

| Outil | Ce qu'il vérifie |
|---|---|
| `tools/typographie.mjs` | ni tiret cadratin, ni tiret demi-cadratin, ni point médian dans les sources |
| `tools/e2e.mjs` | 80 contrôles : URL et sa robustesse, déterminisme, quatre états, téléchargement réel, course à l'export, échec de copie, politique réseau, contenu du cache, clavier, focus non masqué, mouvement réduit |
| `tools/pwa.mjs` | 18 contrôles : manifeste, icônes à la taille annoncée, Service Worker activé, puis réseau coupé (page, motif, vignettes, polices et téléchargement réel) |
| `tools/a11y.mjs` | contrastes réels sur le DOM, deux thèmes, deux langues |
| `tools/reach.mjs` | atteignabilité et taille des cibles, de 320 à 1920 px |
| `tools/overflow.mjs` | débordements sur 128 combinaisons de largeur, langue et résolution cible, avec et sans libellés allongés de 30 % |
| `tools/fuzz-url.mjs` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `tools/band-test.mjs` | hauteur des marches du voile |
| `tools/dither-check.mjs` | amplitude du grain sur toute la gamme tonale |
| `tools/shot.mjs` | captures et absence de requête sortante |
| `tools/soak.mjs` | endurance : 400 actions, dérive mémoire, nœuds, canevas et écouteurs |
| `tools/export-audit.mjs` | poids et durée des PNG sur les 594 combinaisons |
| `tools/perf.mjs` | coût de chaque action, processeur bridé six fois |
| `tools/greyscale.mjs`, `tools/states.mjs`, `tools/planche.mjs` | captures en niveaux de gris, des cinq états, et des 18 familles |
| `tools/cadrages.mjs`, `tools/wide.mjs` | ce qui tient au-dessus de la ligne de flottaison, et qui déborde à 320 px |
| `tools/fidelity.mjs`, `tools/geo-diff.mjs`, `tools/pixel-diff.mjs` | maquette d'origine et portage, comparés de trois façons |

Le moteur n'est pas exposé sur `window` : une application qui l'ouvre pour ses
propres tests l'ouvre à tout le monde. L'outillage en construit sa propre copie
(`tools/banc.mjs`) et l'injecte dans la page quand il en a besoin.

## Licences

Le code est publié sous licence **AGPL-3.0-only** ([`LICENSE`](LICENSE)). Le
pied de page pointe le commit exact d'où sort le build : c'est ce que l'AGPL
appelle la source correspondante, et un lien vers la branche principale ne la
désigne pas.

Anton et Archivo sont sous SIL Open Font License 1.1
(`public/polices/OFL-Anton.txt`, `public/polices/OFL-Archivo.txt`).

Les licences des composants tiers embarqués dans le build sont rassemblées à
chaque `npm run build` dans `public/THIRD-PARTY.txt`, polices comprises : c'est
l'OFL qui est la raison première de ce fichier, et un lecteur qui cherche ce que
ce build embarque n'a ainsi qu'un seul endroit à ouvrir.

## Documentation

| Document | Répond à |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | ce que le projet refuse, et comment il s'écrit. La partie qui ne se devine pas |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | la référence de l'interface, jetons compris. Le code y renvoie section par section |
| [`CHANGELOG.md`](CHANGELOG.md) | ce que chaque version change pour la personne qui l'utilise |
| [`SECURITY.md`](SECURITY.md) | comment signaler une faille, et ce qui n'en est pas une |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | ce qu'on attend dans les échanges |
| [`tools/README.md`](tools/README.md) | ce que chaque vérification vérifie, et comment la rejouer |
