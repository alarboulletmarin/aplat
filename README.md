# Aplat

[![Licence : AGPL-3.0-only](https://img.shields.io/badge/licence-AGPL--3.0--only-17243F.svg)](LICENSE)

Des fonds d'écran génératifs, exportés à la résolution exacte de l'appareil.
Tout est calculé dans le navigateur.

Gratuit, sans compte, sans pub, sans traceur, sans serveur. Aucune donnée ne
sort de l'appareil : ce qui est partageable tient dans l'URL, et les deux seules
choses écrites sur l'appareil sont la liste des dix derniers motifs regardés et
les palettes qu'on a composées, effaçables d'un bouton et une à une.
Installable, et pleinement utilisable hors ligne.

---

## Avant de dessiner

**La tâche et sa fin.** La personne arrive pour changer son fond d'écran ; elle
a fini quand l'image est dans sa pellicule, à la bonne taille, et que ses icônes
restent lisibles dessus.

**Le contexte d'usage.** Une main, deux minutes, sur téléphone, dans les
transports. Debout, en mouvement, l'écran peut-être en plein soleil.

**La hiérarchie de l'écran.** Il n'y en a qu'un.

- *Primaire* : le motif vu derrière de vraies icônes, et le bouton Télécharger.
  C'est là qu'on décide, c'est là qu'on finit. Sous le bouton, une ligne dit si
  le voile de lisibilité est dans le fichier, et un interrupteur l'en retire.
- *Secondaire* : dans la même barre, les deux raccourcis de hasard, côte à côte
  parce qu'on ne sait pas lequel on veut avant de voir. « Variante » ne change
  que la graine, « Surprends-moi » tire aussi une famille et une palette. Puis
  les trois réglages (famille, palette, densité) et la résolution, déjà
  détectée, repliée tant qu'on n'y touche pas.
- *Caché* : les autres formats, derrière un dépli attaché au bouton
  Télécharger ; le lien de partage, en bas du bloc ; puis, dans le pied de page,
  la langue, le thème, la version, la source et le lien de soutien. Pour qui
  les cherche.

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
| **Erreur** | Carte à trait d'alerte et triangle, cause exacte : au-delà de 40 Mpx on dit le nombre ; si le navigateur a refusé d'allouer le canevas (ce que font les navigateurs mobiles au-delà d'une certaine surface, en rendant une image noire sans le dire), on dit d'essayer plus petit ; s'il ne sait pas encoder le format demandé, on renvoie au PNG ; si le presse-papiers a refusé l'image, on renvoie au téléchargement ; sinon on dit que le fichier n'a pas pu être créé. Bouton Réessayer. | Réessayer, ou baisser la résolution. |
| **Succès** | Carte lime : dimensions produites, format, poids réel du fichier, le geste pour passer de « téléchargé » à « dans la pellicule », et un bouton Fermer. | Elle se retire seule après douze secondes ; le bouton Fermer, un glissement vers le bas ou n'importe quel réglage la retirent avant. |
| **Données trop longues** | Chaque libellé a son échappatoire prévue : les libellés de carte reviennent à la ligne, sur deux lignes s'il le faut, et ne s'élident jamais ; ellipse sur les icônes de la maquette ; colonnes qui s'étirent ; `overflow-wrap` sur les valeurs. Le bouton secondaire cède la place au primaire. | Sans objet. |

Le verdict de lisibilité est affiché en permanence, pas seulement en cas de
problème : rapport de contraste mesuré, couleur de libellé retenue, force du
voile appliqué, et une phrase qui dit quoi faire si c'est juste. Le
qualificatif suit trois bandes, et rien entre les deux : **bonne** au-dessus de
4,5:1, le seuil AA du petit texte qu'est un libellé d'icône ; **juste** entre
3:1 et 4,5:1 ; **insuffisante** en dessous. Chaque bande a sa forme, disque
plein, disque à moitié, triangle.

Un **rideau clair/sombre** traverse l'aperçu : un trait qu'on fait glisser, et
la moitié qu'il découvre se voit comme un thème sombre l'assombrirait. Il
s'ouvre au milieu, les deux conditions sont donc là d'emblée, sous les mêmes
libellés ; le fichier est à gauche du trait, et une bande en reste toujours
visible, un cinquième de la largeur, parce qu'un rideau qui se ferme
entièrement cesse d'être une comparaison pour devenir un aperçu faux. Le
verdict annonce les deux rapports côte à côte, celui du fichier et celui du
fond assombri, plutôt que d'en basculer un au passage du trait.
Il remplace une bascule qui montrait l'un *puis* l'autre : une limite qui passe
sous les mêmes libellés se juge d'un regard, deux états successifs demandent de
se souvenir du premier. C'est un `input[type=range]` et non un geste maison, si
bien que les flèches, Origine et Fin y marchent sans une ligne de script ; il ne
couvre qu'une bande de quarante-quatre pixels au milieu de l'appareil, sans quoi
il prendrait le geste de défilement sur téléphone. Le fichier téléchargé, lui,
ne change pas d'un octet, ce qu'une vérification compare pour de bon.

Deux colonnes dès 360 px, téléphone compris : l'aperçu épinglé à gauche, les
réglages qui défilent à droite. L'aperçu n'est plus devant ce qu'on choisit mais
à côté, et les grilles disposent de plus des trois quarts de la hauteur de
l'écran au lieu d'un tiers. Sous 360 px, où deux colonnes ne tiennent plus,
l'aperçu se replie en vignette dès qu'on défile et le verdict se condense sur
une ligne, dépliable au doigt ; le repli se fait à l'échelle, pas à la
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
src/main.tsx                  point d'entrée, et le choix des deux pages
src/App.tsx                   l'état, l'URL, l'export
src/lib/moteur.ts             le moteur génératif : palettes, familles, rendu
src/lib/lieux.ts              les lieux : scènes en champ d’encre, trame de gravure
src/lib/palettes.ts           les palettes composées à la main, et leur adresse
src/lib/svg.ts                le même motif en vectoriel, par un pinceau qui note
src/lib/route.ts              « / » ou « /app », et les liens partagés d'avant
src/lib/{resolution,url,export,geometrie,format,build}.ts
src/components/               l'interface, un fichier par pièce
src/components/accueil/       la page d'accueil, un fichier par section
src/hooks/                    horloge, tailles, focus, ajustement, économie
src/i18n/{fr,en,index}.ts     les libellés, à parité stricte
src/styles/                   tokens, reset, base, composants, écrans, accueil
public/polices/*.woff2        Anton et Archivo, auto-hébergées
scripts/                      icônes de la PWA, notices de licence
design/Aplat.dc.html          la maquette de référence de l'application
design/Aplat-accueil.dc.html  celle de la page d'accueil
tools/*.mjs                   vérifications headless (hors livraison)
.github/workflows/ci.yml      la CI : `verify` et `check`, en parallèle
```

## Deux adresses

`/` présente le projet. `/app` le fait tourner.

La page d'accueil n'est pas une deuxième section de l'application : c'est un
autre document, et l'application reste l'écran unique décrit plus haut. Elle ne
montre pas non plus de captures d'écran. Chacune de ses images sort du moteur,
au chargement, dans le navigateur qui la lit : la maquette de téléphone du
haut, les douze motifs de la galerie, la maquette de bureau et la comparaison
du voile. Il n'y a donc rien à tenir à jour, et rien qui puisse promettre un
rendu que l'application ne donnerait pas.

**Et chacune est un bouton.** Toucher un écran de la page en tire un autre
motif, et une ligne sous les appels le dit plutôt que de le laisser deviner.
C'est la démonstration la plus courte du produit, puisque c'est exactement ce
que fait « Surprends-moi » dans l'outil, et c'est ce qui répond à la question
que la page pose sans la poser : « ça donne quoi, les autres ? ». La maquette de
téléphone et celle de bureau tirent une famille, une palette et une graine ; la
galerie et la démonstration du voile ne tirent qu'une graine, l'une pour que ses
douze couples restent ceux de la composition, l'autre pour que la comparaison
reste faite là où le voile travaille le plus.

Le motif de départ, lui, ne se joue pas aux dés : la page se peint deux fois de
suite à l'identique, ce qu'une planche de recette peut vérifier et ce qu'une
composition dessinée réclame. La variation est offerte, jamais imposée.

**Quinze rendus du moteur sur une page, ça se paie.** Trois précautions, et
elles ne sont pas décoratives. On ne peint que ce qui approche du champ de
vision (`IntersectionObserver`), on peint quand le fil principal est libre
(`requestIdleCallback`, avec un délai de garde pour qu'aucune toile ne reste
blanche dans un onglet en arrière-plan), et on descend à un pixel par point dès
que l'appareil demande à économiser (`Save-Data`, ou le mouvement réduit, qui
vient souvent des mêmes réglages). Sans la deuxième, les toiles d'une même
section deviennent visibles ensemble et se peignent l'une derrière l'autre dans
la même image, ce qui refait exactement le pic que la première cherchait à
éviter.

Elle garde les règles de l'application, parce que c'est le même produit : un
seul appel primaire, répété en bas de page mais jamais dédoublé ; aucune
animation qui ne dise ni une origine, ni un état, ni une continuité ; et rien
d'écrit sur l'appareil, l'état tenant dans l'adresse. Cet état se réduit à la
langue et au thème, qui sont aussi ses deux boutons, dans l'enseigne épinglée :
quelqu'un qui arrive sur une page dans une langue qu'il ne lit pas doit trouver
la bascule avant le premier paragraphe. Le lien vers l'application les emporte,
personne ne choisit sa langue deux fois.

La marque, en haut, fait le chemin dans l'autre sens. Elle est un lien vers
`/` depuis les deux documents : depuis l'application, c'est sa seule sortie, et
elle est là où tout le monde cherche une sortie ; depuis la présentation, elle
ramène en haut de page plutôt que d'ouvrir l'outil, ce que la porte nommée fait
déjà, à droite. La langue et le thème traversent ce lien comme ils traversent
l'autre : revenir ne coûte pas le choix qu'on vient de faire. Aucun paramètre de
motif n'y entre, sinon la reconduction ci-dessous renverrait le retour vers
`/app` avant qu'il n'ait lieu.

Aplat a vécu à la racine. Les liens partagés de cette époque, `/?m=vagues&…`,
sont reconduits vers `/app` avec leur requête intacte, avant le moindre rendu :
la promesse « copier le lien suffit à retrouver exactement la même image » ne
s'annule pas parce que le produit s'est doté d'une porte d'entrée. Une adresse
nue, ou qui ne porte que la langue et le thème, reste sur l'accueil.

Le manifeste installe l'application sur `/app`, dans une portée qui reste la
racine : une application installée s'ouvre sur l'outil, pas sur sa
présentation. Son `id` n'a pas bougé, ce qui est précisément la raison pour
laquelle il était posé en dur : les installations existantes ont suivi au lieu
de se dédoubler.

## L'URL porte l'état

`?m=vagues&p=lime&d=1&s=7314&l=fr&r=1179x2556`

`m` famille, `p` palette, `d` densité (de 0 à 2), `s` graine, `l` langue,
`r` résolution (seulement si elle a été saisie à la main),
`t` thème (seulement s'il n'est pas « système »),
`v=0` (seulement si le voile de lisibilité a été retiré du fichier),
`k` les teintes d'une palette composée à la main (seulement si le motif en
porte une).

`v` a une valeur par défaut qui ne s'écrit pas, et c'est « oui » : les liens
partagés avant qu'il n'existe continuent d'ouvrir exactement la même image.

`k` mérite une phrase. Une palette composée à la main n'existe que sur
l'appareil qui l'a composée ; sans ses teintes, le lien ouvrirait un autre motif
chez la personne qui le reçoit. Le nom qui est dans `p` est l'empreinte de ces
teintes, si bien que les deux se vérifient l'un l'autre : une adresse dont
l'empreinte ne correspond pas aux couleurs est refusée, et une palette reçue ne
peut donc pas se faire passer pour une palette déjà enregistrée.

`l` et `t` valent pour les deux pages : la présentation n'a pas de motif à
relire, mais elle a une langue et un thème, et `?l=en&t=sombre` dit la même
chose des deux côtés.

Rien d'autre n'est transmis. Copier le lien suffit à retrouver exactement la
même image, sur n'importe quel appareil. Une URL forgée ne peut produire qu'un
motif valide : tout ce qui n'est pas reconnu retombe sur la valeur par défaut,
et jamais par un accès indexé, car `PALETTES['constructor']` est « vrai » et
suffisait à faire lever le rendu tout entier.

## Ce qui est enregistré, et ce qui ne l'est pas

Aucun compte, aucun réseau à l'exécution, aucune mesure d'audience. Ni cookie,
ni `sessionStorage`, ni base indexée. Les réglages du motif affiché vivent dans
la barre d'adresse.

**Deux clés de `localStorage`**, et pas une de plus.

`aplat:motifs` : les dix derniers motifs regardés, quatre réglages chacun, plus
une épingle facultative sur six d'entre eux au plus. Ni image (le rendu est
déterministe, le moteur les redessine), ni horodatage, ni identifiant, ni URL,
ni compteur de visites. Rien qui distingue un appareil d'un autre, rien qui
décrive une session. Deux cents octets pour cinq entrées, et un bouton
« Effacer » dans la carte « Derniers motifs ». Un motif n'y entre qu'après être
resté deux secondes et demie à l'écran : parcourir les familles ne remplit pas
la liste. Une épingle, elle, entre tout de suite : c'est un geste, pas un
passage.

`aplat:palettes` : les palettes composées à la main, douze au plus, un nom et
trois à six couleurs chacune. Rien n'y est écrit tant qu'on n'a pas enregistré,
pas même la palette qu'un lien vient d'apporter, et chacune se supprime seule.
La clé n'existe pas tant qu'aucune palette n'a été composée.

Ce que ces deux clés contiennent exactement est vérifié à chaque
`npm run check`, champ par champ, et une troisième clé y ferait échouer le
contrôle.

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

**Quarante et une familles, quatre groupes.**

- **Abstraits** (vingt-trois) : les douze libres, qui sèment des formes sur un
  aplat ; sept réglées, où une grille porte le motif, reconnaissables à une
  répétition qu'on peut suivre du doigt, ce que les blobs et le terrazzo n'ont
  pas ; et quatre déformées, où un champ lisse plie une forme répétée, ce qui
  se reconnaît à une règle qu'on voit se tordre.
- **Paysages** (trois) : Sommets, Horizon, Nuages. Elles ont un haut et un bas,
  et c'est ce qui les sépare des abstraits. C'est aussi ce qui les rend
  commodes en fond d'écran : la grille d'icônes tombe dans leur partie basse,
  et la sonde de lisibilité y trouve un aplat plutôt qu'un motif.
- **Lieux** (quatre) : Acropole, Phare, Pyramides, Torii. Des gravures tramées
  plutôt que des aplats : chaque scène est un champ de densité d'encre, une
  trame de demi-teintes à hachures croisées le transforme en points, et deux
  tons seulement sortent de la palette, le plus clair en papier, le plus
  sombre en encre. La densité y règle la finesse de la trame, pas le
  peuplement.
- **Figures** (onze) : des objets posés sur un fond, reconnaissables un par un.

**Quatre familles ignorent leur graine**, et c'est voulu : Écailles, Arcade,
Azulejos et Tresse sont des pavages entièrement réguliers, sans un seul tirage.
« Variante » ne change donc rien dessus ; il faut passer par la palette, la
densité ou une autre famille. Le fait est tenu par un contrôle
(`tools/e2e.mjs`) qui fige la liste des quatre : une cinquième famille devenue
sourde à sa graine s'y signale, et une des quatre qui se mettrait à varier
aussi.

Aucune famille n'a de taille en pixels : tout se rapporte au petit côté, ce qui
rend le motif indépendant de la résolution. Les deux seules exceptions sont un
plancher relatif sur le joint de Mosaïque et sur le filet d'Horizon, et elles
sont commentées à l'endroit où elles se lisent : sans elles, la vignette montre
un motif plus ajouré, ou perd son horizon.

**L'aperçu est le fichier.** Le canevas d'aperçu porte exactement le rapport
d'aspect de la résolution visée (la bordure de la maquette d'appareil est
défalquée), et la mesure de lisibilité porte sur les dimensions d'export, pas
sur celles du canevas. Vérifié sur les 1 056 combinaisons des trente-deux
premières familles : même voile, même verdict.

**Le voile de lisibilité.** Après les formes, le moteur mesure la luminance
moyenne de la zone des icônes, choisit la couleur de libellé la plus sûre
(claire ou sombre), puis pousse le fond vers elle juste ce qu'il faut. Le
rapport obtenu est affiché ; le voile n'est appliqué que s'il sert.

La mesure se fait sur une sonde de surface fixe, jamais sur l'image finale :
l'aperçu et l'export donnent exactement les mêmes chiffres, et un fond d'écran
4K ne réclame pas un `getImageData` de 100 Mo.

Il est **brûlé dans le fichier**, et une ligne sous le bouton Télécharger le
dit. Elle est là parce que rien d'autre ne pouvait le dire : le voile est déjà
peint dans l'aperçu, et personne ne compare une image à une image qu'il n'a pas
vue. Quelqu'un qui téléchargeait sans avoir lu la présentation recevait donc une
image plus sombre que celle qu'il croyait avoir choisie. L'interrupteur de cette
ligne le retire, du fichier comme de l'aperçu, l'écrit dans l'adresse (`v=0`) et
dans le nom du fichier, et le verdict de lisibilité se recalcule pour l'image
nue plutôt que pour celle qu'on n'exporte plus.

**Les palettes composées à la main.** Onze palettes suffisent à faire un fond
d'écran, elles ne suffisent pas à faire *le sien* : une marque a ses deux
teintes, un écran OLED demande un noir vrai. On en compose donc, de trois à six
couleurs, fond compris, douze au plus.

Leur identifiant n'est pas tiré au sort, c'est l'empreinte de leurs couleurs.
Trois choses en découlent, et ce sont les trois raisons du choix. Modifier une
palette lui donne un autre identifiant, si bien que la mémoire de la sonde de
lisibilité ne peut pas rendre un voile calculé pour des couleurs qui ne sont
plus là. Deux appareils qui composent la même palette lui donnent le même nom
interne. Et le lien porte l'identifiant *et* les couleurs, si bien qu'il se
vérifie tout seul.

Le moteur n'en connaît rien d'autre qu'un registre : c'est l'interface qui le
remplit, et le rendu ne fait pas la différence entre une palette livrée et une
palette écrite, puisque `formes()` prend ses couleurs par un modulo et n'a
jamais demandé un nombre fixe.

### Poids et netteté des images produites

Mesuré sur les **1 221 combinaisons** (37 familles × 11 palettes × 3 densités) en
1179 × 2556, soit 3,0 Mpx :

| | avant | après |
|---|---|---|
| médiane | 0,94 Mo | **0,43 Mo** |
| 9ᵉ décile | 2,33 Mo | **0,75 Mo** |
| maximum | 2,33 Mo | **1,35 Mo** |

Les chiffres « après » ont été remesurés à l'arrivée des quatorze familles de
la seconde série, puis à celle des cinq familles déformées. Le maximum est
passé de 0,98 à 1,04 Mo avec Azulejos en densité dense, dont le carrelage
remplit la page de courbes, puis à 1,35 Mo avec Mirage en dense, dont chaque
rayure pliée traverse la page de haut en bas : c'est le prix honnête d'un
motif qui couvre tout plutôt que de semer des formes sur un aplat.

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

### Ce qu'on peut emporter

Le PNG à la résolution de l'écran reste l'appel primaire : c'est le fond
d'écran, et neuf fois sur dix la tâche s'y termine. Les autres sorties sont
derrière un dépli attaché au bouton, parce qu'elles ne servent pas la même
chose.

| Sortie | À quoi elle sert |
|---|---|
| **PNG** | le fond d'écran, à la résolution détectée ou saisie |
| **PNG 2x** | la même image pour un écran qu'on ne connaît pas encore |
| **WebP** | le même fond d'écran, deux à trois fois plus léger, pour l'envoyer |
| **SVG** | non plus un fond d'écran mais un motif, à reprendre ailleurs |
| **Les trois appareils** | la même graine en téléphone, tablette et ordinateur, en une fois |
| **Copier l'image** | un PNG dans le presse-papiers, le chemin le plus court vers une conversation |

Le SVG ne recopie pas une ligne du moteur. `formes()` ne connaît qu'un pinceau,
et `src/lib/svg.ts` en fournit un second, qui note les tracés au lieu de les
peindre : une famille ajoutée au moteur est donc exportable en vectoriel le jour
même, et une primitive de tracé ajoutée sans être notée là-bas casse la
compilation plutôt que de sortir un fichier faux. Deux choses n'y passent pas,
et le produit le dit plutôt que de faire semblant : le grain, qui est une trame
d'image, et les familles trop peuplées, qu'un plafond refuse. Aucune famille dessinée
ne l'atteint (la plus dense, Mosaïque, compte moins de mille formes), et un
test unitaire l'y tient ; les gravures des lieux, elles, jouent avec ce
plafond, points fusionnés en rangées, et le panneau tranche motif par motif.

Les trois appareils partent en trois téléchargements et non en archive : un
fichier compressé demanderait une bibliothèque embarquée pour un gain nul sur un
téléphone où l'on ne sait pas l'ouvrir. Ils sont encodés en série, parce que
trois canevas de plusieurs mégapixels alloués ensemble sont justement ce qu'un
appareil modeste refuse.

---

## Réactivité

L'aperçu et les vignettes ne dépendent pas des mêmes réglages : taper un chiffre
dans le champ largeur ne concerne que l'aperçu, changer de palette ne concerne
que les vignettes visibles. Les vignettes sont dessinées à l'entrée dans le
champ de vision, pas toutes d'un coup : six ou sept sur quarante et une au premier
affichage d'un téléphone.

Mesuré avec le processeur bridé six fois, ce qui correspond à un téléphone
d'entrée de gamme (`tools/perf.mjs`) : moins de 3 ms par action, quelle qu'elle
soit.

Le rideau clair/sombre est le seul geste continu du produit, et il a demandé
trois corrections, toutes mesurées au même bridage. Les maquettes d'écran sont
mémoïsées : `useAjustement` mesure sa boîte après chaque rendu, dans un effet
sans liste de dépendances, ce qui forçait un recalcul de mise en page sur ses
cent vingt nœuds à chaque pixel glissé. Les boîtes du rideau se déplacent par
`transform` et non par `left` ni `clip-path`. Et ses deux jetons de position
sont posés sur les deux seules boîtes qui les lisent, jamais sur l'appareil, qui
les aurait transmis à toute la maquette. Résultat, par image : cinq millisecondes
de recalcul de style et une image sur quatre perdue avant, moins de deux
millisecondes et aucune tâche longue après, à la même cadence qu'au repos.

Après 400 changements de réglage enchaînés (`tools/soak.mjs`) : même nombre de
nœuds, même nombre de canevas, même nombre d'écouteurs.

## Accessibilité

Vérifié par `tools/a11y.mjs`, qui recompose les couleurs semi-transparentes sur
leur pile de fonds réelle avant d'appliquer la formule WCAG, dans les deux
thèmes et les deux langues :

- texte courant ≥ 4,5:1, texte large, bordures d'éléments d'interface et formes
  porteuses de sens ≥ 3:1 (91 textes et 54 bordures examinés dans chacune des
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
- les groupes de réglages sont de vrais groupes radio, les trois groupes de
  familles une vraie barre d'onglets, et l'historique une barre d'outils : un
  arrêt de tabulation par groupe, flèches et Début/Fin. Les flèches des onglets
  déplacent le focus **sans ouvrir**, sans quoi le clavier traverserait trois
  rendus complets de trente-sept vignettes pour atteindre le troisième ;
- le rideau clair/sombre est un `input[type=range]`, pas un geste maison : les
  flèches, Origine et Fin y marchent sans une ligne de script, et son nom
  accessible dit la position. `touch-action: pan-y` laisse le geste vertical au
  défilement ;
- les deux boutons secondaires de la barre rendent leur mot sous 600 px mais le
  gardent dans leur nom accessible : un `aria-label` posé par-dessus un libellé
  visible aurait cassé « le libellé dans le nom » aux largeurs supérieures ;
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
| Les puces de réglage deviennent des groupes radio, et l'historique une barre d'outils | Ces cinq groupes sont à choix unique : `aria-pressed` disait « bascule ». Un arrêt de tabulation par groupe au lieu d'un par puce ; seize en tout, historique plein compris. Dans l'historique les flèches déplacent le focus sans restaurer : ce sont dix actions, pas dix options d'un même réglage. |
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
npm run verify   # typographie, types, lint, tests unitaires, build
npm run check    # build, puis les contrôles dans Chromium
```

| Outil | Ce qu'il vérifie |
|---|---|
| `tools/typographie.mjs` | ni tiret cadratin, ni tiret demi-cadratin, ni point médian dans les sources |
| `tools/accueil.mjs` | la page d'accueil : les deux adresses, les liens partagés d'avant, les deux bascules, les toiles qui se peignent toutes, les cibles et la hiérarchie des titres |
| `tools/e2e.mjs` | 177 contrôles : URL et sa robustesse, déterminisme, les quatre pavages réguliers qui ignorent leur graine et eux seuls, quatre états, téléchargement réel de cinq sorties, course à l'export, échec de copie, politique réseau, contenu du cache, clavier, focus non masqué, mouvement réduit, onglets de familles, rideau clair/sombre, voile retiré, palette composée et son lien, épingle |
| `tools/pwa.mjs` | 18 contrôles : manifeste, icônes à la taille annoncée, Service Worker activé, puis réseau coupé (page, motif, vignettes, polices et téléchargement réel) |
| `tools/a11y.mjs` | contrastes réels sur le DOM, deux thèmes, deux langues |
| `tools/reach.mjs` | atteignabilité et taille des cibles, de 320 à 1920 px |
| `tools/repli.mjs` | le repli au défilement, et la part de la fenêtre laissée aux grilles |
| `tools/overflow.mjs` | débordements sur 128 combinaisons de largeur, langue et résolution cible, avec et sans libellés allongés de 30 % |
| `tools/fuzz-url.mjs` | 241 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `tools/band-test.mjs` | hauteur des marches du voile |
| `tools/dither-check.mjs` | amplitude du grain sur toute la gamme tonale |
| `tools/shot.mjs` | captures et absence de requête sortante |
| `tools/soak.mjs` | endurance : 400 actions, dérive mémoire, nœuds, canevas et écouteurs |
| `tools/export-audit.mjs` | poids et durée des PNG sur les 1 221 combinaisons |
| `tools/perf.mjs` | coût de chaque action, processeur bridé six fois |
| `tools/greyscale.mjs`, `tools/states.mjs`, `tools/planche.mjs` | captures en niveaux de gris, des cinq états, et des 37 familles |
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
ce build embarque n'a ainsi qu'un seul endroit à ouvrir. Le pied de page désigne les deux textes : « AGPL-3.0 » ouvre le LICENSE du commit du build, « Licences tierces » ouvre `THIRD-PARTY.txt` tel qu'il est servi.

Le pied porte aussi les mentions légales : ce que l'application ne collecte pas, puis le nom et l'adresse de l'hébergeur, la seule chose que la LCEN demande à un éditeur non professionnel.

## Documentation

| Document | Répond à |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | ce que le projet refuse, et comment il s'écrit. La partie qui ne se devine pas |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | la référence de l'interface, jetons compris. Le code y renvoie section par section |
| [`CHANGELOG.md`](CHANGELOG.md) | ce que chaque version change pour la personne qui l'utilise |
| [`SECURITY.md`](SECURITY.md) | comment signaler une faille, et ce qui n'en est pas une |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | ce qu'on attend dans les échanges |
| [`tools/README.md`](tools/README.md) | ce que chaque vérification vérifie, et comment la rejouer |
