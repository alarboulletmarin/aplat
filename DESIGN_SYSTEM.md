# Design system

La référence unique de l'interface d'Aplat. Le code s'y réfère section par
section ; une décision visuelle qui n'en découle pas est un défaut, pas un
choix.

Les valeurs vivent dans [`src/styles/tokens.css`](src/styles/tokens.css). Ce
document dit **pourquoi** elles valent ce qu'elles valent.

---

## 1. Ce que l'écran doit faire

**La tâche et sa fin.** La personne arrive pour changer son fond d'écran ; elle
a fini quand l'image est dans sa pellicule, à la bonne taille, et que ses icônes
restent lisibles dessus.

**Le contexte.** Une main, deux minutes, sur téléphone, dans les transports.
Debout, en mouvement, l'écran peut-être en plein soleil.

**La hiérarchie.** Il n'y a qu'un écran.

| Rang | Quoi | Où |
|---|---|---|
| Primaire | le motif derrière de vraies icônes, et **Télécharger** | sous l'en-tête, épinglé ; le bouton en bas, dans la zone du pouce |
| Primaire | ce que le fichier contient de plus que le motif : le voile, et de quoi l'ôter | une ligne sous le bouton |
| Secondaire | **Surprends-moi** et **Variante**, les deux tirages au sort | la même rangée, à gauche du primaire |
| Secondaire | famille, palette, densité, version claire ou sombre, l'historique des motifs regardés, puis la résolution déjà détectée | le bloc de réglages, sous l'aperçu |
| Caché | les autres formats : PNG 2x, WebP, SVG, presse-papiers, les trois appareils | un dépli attaché au primaire |
| Caché | lien de partage | en bas du bloc, sous un filet |
| Caché | langue, thème, version, licence, licences tierces, source, soutien, mentions légales | le pied de page : rien de ce qui s'y trouve n'agit sur le fichier |

Un seul appel primaire. **Télécharger** ne partage sa place avec rien : les deux
secondaires perdent leur mot avant que lui ne perde un pixel, et son libellé ne
s'élide ni ne se coupe jamais.

Les deux tirages au sort sont côte à côte parce qu'ils répondent à la même
question et qu'on ne sait pas laquelle on veut avant de voir : « Variante » ne
change que la graine, « Surprends-moi » tire aussi une famille et une palette.
Les séparer, l'un dans la barre et l'autre à mille pixels plus bas dans le
panneau, revenait à cacher la moitié du geste. La place se trouve sans toucher
au primaire : sous 600 px les deux gardent leur pictogramme et rendent leur mot,
qui reste dans leur nom accessible ; sous 360 px, c'est le pictogramme du
primaire qui cède, et lui seul.

Les autres sorties sont derrière un dépli attaché au primaire, et non à côté de
lui. Un PNG doublé, un WebP, un SVG, le presse-papiers et les trois appareils
sont cinq façons de finir la même tâche : elles n'ont pas à disputer sa place à
celle qui la finit dans neuf cas sur dix.

---

## 2. Le parti visuel

Papier découpé, façon Matisse : des aplats francs, aucune ombre portée, un grain
très léger, des coins largement arrondis.

Une **page imprimée**, pas une pile de cartes. La marque, le titre en pleine
chasse et la frise d'arches tiennent l'en-tête ; les réglages sont dans un
seul bloc cerné d'un trait franc et découpé par des filets ; les titres sont des
titres, pas de petites capitales interlettrées.

**L'arche est la forme du produit.** Elle est la marque, elle ouvre chaque titre
de section, elle dit la place vide de l'image, et elle donne leur silhouette aux
rayons : partout un coin haut largement ouvert et un bas presque droit, dans un
rapport constant de trois pour dix. Une carte, un bouton, une note, le bloc
entier se lisent ainsi comme une arche, quelle que soit leur taille. C'est ce
qui remplace le rayon uniforme, et c'est ce qu'il ne faut pas défaire en
écrivant `border-radius: 16px` sans y penser.

Ce que ce parti exclut, et qui reviendrait tout seul si on n'y prenait pas
garde : les cartes flottantes avec ombre, les libellés minuscules en majuscules
espacées, les formes décoratives posées derrière le titre, les dégradés, et les
quatre coins au même rayon.

---

## 3. Les couleurs

Une palette de six. Le rapport tient : **un neutre chaud, deux bleus, un acide,
un très sombre**, plus un accent chaud réservé aux aplats.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--lime` | `#DFF478` | l'acide : accent, appel primaire |
| `--creme` | `#F7F3E6` | le neutre chaud |
| `--ciel` | `#92BAD5` | le premier bleu : décor en thème clair |
| `--violet` | `#788CE3` | le second bleu : décor en thème sombre |
| `--navy` | `#17243F` | le très sombre : l'encre |
| `--corail` | `#FF6648` | l'accent chaud |

**Le corail ne porte jamais de texte.** 2,9:1 sur crème : il est réservé aux
aplats et aux formes. Là où une teinte d'alerte doit tenir le 3:1 d'un élément
d'interface (le trait de la carte d'erreur, le triangle de saisie invalide),
c'est `--alerte` qui sert : `#E8481F` en clair, et le corail lui-même en sombre,
où il passe.

### Les jetons d'usage

Jamais une couleur brute dans une règle : toujours un jeton d'usage.

`--fond` `--surface` `--surface-2` `--surface-74` `--champ` `--papier`
`--encre` `--encre-douce` `--filet` `--filet-franc`
`--accent` `--accent-encre` `--deco-1` `--deco-2`
`--lien` `--lien-survol` `--focus` `--alerte` `--ombre-plate`

### Le sombre n'est pas une inversion

Les aplats sont repensés :

- le fond descend à `#0E1729`, plus bas que la simple négation du crème, pour
  que la surface `#17243F` s'en détache ;
- `--deco-1` passe du bleu clair au bleu-violet : le bleu clair, sur un fond
  sombre, n'est plus une couleur froide mais une couleur claire ;
- `--filet-franc` descend de `.56` à `.46` : sur fond sombre un trait clair
  paraît plus appuyé à opacité égale ;
- `--focus` passe du bleu au lime, qui est le seul à tenir sur les deux surfaces ;
- l'accent, lui, ne bouge pas. C'est la constante qui fait reconnaître l'appel
  primaire d'un thème à l'autre.

---

## 4. Typographie

Deux familles, un contraste franc entre les deux.

| Rôle | Famille | Où |
|---|---|---|
| Display | **Anton** (`--display`) | le titre, le quantième de la maquette |
| Texte | **Archivo** (`--texte`) | tout le reste |

Les deux sont auto-hébergées (`public/polices/`) et découpées en deux sous-
ensembles Unicode chacune : rien ne part vers un CDN, et le latin étendu n'est
téléchargé que s'il sert.

Le titre : `25px`, interligne `1`, interlettrage `-.03em`, en capitales. Presque
collé. C'est le seul geste typographique de la page, et il ne se répète nulle
part ailleurs. Il ne prend plus toute la largeur comme la version d'avant
(`clamp(56px, 15.5vw, 98px)`) : l'en-tête est devenu collant, et une capitale de
quatre-vingt-dix-huit pixels ne peut pas rester à l'écran en permanence. Ce
qu'il perd en taille, il le gagne en présence.

C'est aussi, au pixel près, le mot de l'enseigne de la présentation, et les deux
sortent d'une seule déclaration (`.titre, .enseigne-mot`). Ils ont vécu
séparément, `33px` ici et `25px` là, au-dessus d'une marque de `38px` d'un côté
et de `30px` de l'autre : le logo changeait de taille sous les yeux au passage
d'un document à l'autre. Deux copies d'un même objet finissent toujours par
diverger ; il n'y en a plus qu'une.

Échelle du texte courant : `12,5` `13` `13,5` `14` `14,5` `15` `16` `16,5` px.
Les titres de section sont à 16,5 px en gras, avec `-.012em` d'interlettrage.

---

## 5. Formes, rayons, filets

Coins largement arrondis, jamais uniformes, et jamais les quatre au même
rayon : **tout objet est une arche**, largement ouverte en haut, presque droite
en bas. Le rayon du bas vaut trois dixièmes de celui du haut, et les deux
suivent la taille de l'objet.

| Objet | Rayon |
|---|---|
| bloc de réglages | 42 px en haut, 12 px en bas |
| bouton d'action, dépli des formats | 24 / 7 px |
| note | 22 / 7 px |
| puce de famille et de palette, select, bouton de partage | 19 / 6 px |
| champ, puce de densité | 17 / 5 px |
| puce de langue et de thème, bouton secondaire d'une carte | 16 / 5 px |
| vignette d'une puce de famille | 13 / 4 px |
| vignette d'historique | 14 / 4 px, canevas 10 / 3 px |
| échantillon de palette | 7 px, les quatre coins : c'est un aplat, pas un objet |
| onglet de groupe, interrupteur du voile | 16 / 5 px |
| éditeur de palette, feuille des formats | 20 / 6 px |
| palette reçue d'un lien | 18 / 6 px |
| appareil de la maquette | 13 % du petit côté (téléphone), 5,5 % (tablette), 2,4 % (ordinateur) |
| marque | 23 % de son côté |

Filets : 3 px sous les arches de la frise, 2 px pour le contour du bloc et ses
séparations, 1,5 px pour le trait d'une puce au repos, 2,5 px pour signaler une
erreur.

### Le vocabulaire décoratif

Blobs, vagues, marguerites, étoiles à pointes, arches. **Ils habillent et
repèrent, ils ne portent jamais d'information seule** : l'arche d'un titre de
section et la goutte d'un sous-titre accompagnent un mot, elles ne le remplacent
pas. Il en va de même de l'épingle sur une vignette d'historique, doublée du mot
« Épinglé » dans le nom du bouton.

Tous sont **dessinés en aplats**, jamais importés : la tasse du lien de soutien
comme l'étincelle du tirage au sort. Le bouton officiel de Ko-fi est une image
servie par leur CDN ; elle n'entre pas ici, puisque la page ne fait aucune
requête vers un tiers et que `tools/shot.mjs` le vérifie.

**L'arche mordue** est le dessin de la marque, et le seul qui se répète à trois
échelles : trente pixels dans l'en-tête de l'application comme dans l'enseigne
de la présentation (aplat lime sur navy, une seule règle `.marque` pour les
deux), quinze devant un titre de groupe et dans la note de mise à jour, douze
devant chaque titre de section. Un aplat en arche dont la base est mordue par une seconde
arche à la couleur du fond ; les mêmes fractions partout, celles de
`public/favicon.svg` et de `scripts/generate-icons.mjs`. La marque garde son
lime sur son navy dans les deux thèmes, avec un filet `--filet` qui la détache
du fond sombre : une marque ne s'inverse pas.

Dans l'en-tête comme dans l'enseigne de la présentation, **la marque et le mot
font un lien vers « / »** : un logo ramène chez soi, et c'est la seule sortie de
l'application. Il ne prend ni l'encre des liens ni leur soulignement, parce
qu'une marque garde ses couleurs. Sa cible fait quarante-quatre pixels de haut
comme toutes les autres, mais des marges négatives lui rendent ce qu'elle
prendrait à la bande. Quarante-quatre pixels de cible sur trente de marque ne
laissant qu'un pixel au-dessus du lien, et l'en-tête étant collé à `top: 0`,
l'anneau de focus y passe dedans (`outline-offset: -3px`) : entier, plutôt que
coupé par le bord de l'écran.

La frise d'arches sous le titre est la silhouette d'un motif du générateur :
un aplat par arche, cinq hauteurs et sept couleurs en cycles premiers entre
eux, posées sur un seuil d'encre de trois pixels. C'est la même frise qui
sépare les sections de la présentation : la marque garde sa silhouette d'un
document à l'autre.

Les pictogrammes sont dessinés dans la direction artistique, en CSS, à partir de
formes pleines et de `clip-path` : ni Material, ni Lucide, **jamais d'emoji**.

---

## 6. Gabarits

**Deux colonnes dès 360 px** : l'aperçu à gauche, épinglé, les réglages à
droite, qui défilent à côté de lui. C'est la mise en page de la maquette, et
elle est tenue jusqu'au téléphone. En dessous de 360 px, une seule colonne :
le panneau y tomberait à cent trente pixels, et une vignette de famille par
rangée n'est plus une grille.

Le partage n'est pas la moitié. Sous 760 px, la colonne de l'aperçu prend 38 %
et le panneau 62 %. À parts égales, un téléphone de 390 px laisse 166 px au
panneau, soit une seule vignette par rangée et des dizaines de rangées à parcourir ;
à 38 %, l'aperçu reste jugeable et les vignettes tiennent deux de front. Au-delà
de 760 px on revient au partage de la maquette, à parts égales.

Ce que les deux colonnes changent, et qui vaut plus que la fidélité : l'aperçu
n'est plus **devant** les réglages mais **à côté**. Sur une colonne, la scène
collante prenait la moitié de la fenêtre à ceux qui choisissent ; à côté, elle
ne leur prend plus rien. Les grilles passent d'un tiers de la hauteur à plus des
trois quarts.

Trois couches collantes. L'**en-tête** est épinglé en haut à toute largeur : la
marque, le mot et la résolution visée restent lisibles pendant qu'on règle.
L'**aperçu** est collant sous lui, dans sa colonne, et la **barre d'action**
collante en bas : on règle à droite, on juge à gauche, on termine en dessous,
sans aller-retour. Les trois hauteurs sont publiées en variables CSS (`--bar`,
`--scene-h`, `--barre-h`) par `useHauteursCollantes`, pour que la réserve de
défilement les suive et que la scène sache où s'arrêter de monter
(`top: var(--bar)`). `--scene-h` ne vaut quelque chose que sous 360 px : c'est
la seule largeur où la scène recouvre encore les réglages.

**Dans la colonne étroite, le rembourrage cède, jamais la cible.** Entre 360 et
760 px, le panneau ne fait plus que deux cents pixels : les rembourrages des
cartes et des puces se resserrent, la piste minimale des grilles descend à
72 px, et les libellés de carte prennent la césure de la langue
(`hyphens: auto`) avant la coupure franche. Les cibles restent à 44 px. Ce sont
les seules valeurs du portage qui s'écartent de la maquette pour une raison de
largeur, et elles ne s'appliquent qu'en dessous de son gabarit.

La hauteur de l'en-tête entre aussi dans le calcul de la scène en paysage court
(`ENTETE_PAYSAGE` dans `lib/geometrie.ts`) : sans elle, le verdict passait sous
la barre d'action sur une fenêtre couchée.

Les grilles sont en `repeat(auto-fit, minmax(min(Xpx, 100%), 1fr))`. Le
`min(…, 100%)` n'est pas décoratif : sans lui, la piste minimale force une
largeur plus grande que l'écran sous 336 px et la page défile
horizontalement.

**Paysage court.** Une fenêtre couchée de moins de 560 px de haut n'a plus la
hauteur d'un écran debout : l'en-tête se replie, la barre d'action passe en
variante compacte (cibles toujours à 44 px, c'est le rembourrage qui cède), et
la hauteur de la scène cesse d'être une fraction de l'écran pour devenir ce qui
reste une fois la barre et le verdict servis. Sans ça, le bas du téléphone et
le verdict passaient sous la barre, à toute position de défilement. Le seuil
est écrit deux fois, dans `@media (orientation: landscape)` d'`ecrans.css` et
dans `PAYSAGE_COURT` de `lib/geometrie.ts` : les deux basculent ensemble ou pas
du tout.

**Repli au défilement.** Il ne sert que sur une seule colonne, c'est-à-dire
sous 360 px, la seule largeur où la scène collante recouvre encore les réglages.
Là, elle prenait avec le verdict et la barre les deux tiers de l'écran, et il ne
restait presque rien pour choisir parmi quarante-six familles et onze palettes : dès
que la page défile, l'aperçu se replie en vignette et le verdict se condense sur
une ligne, dépliable au doigt. Dès 360 px l'aperçu est dans sa colonne, à côté
du panneau et non devant lui, et il n'a plus rien à rendre en se repliant.

Le verdict, lui, se condense aussi ailleurs : en paysage court, et dans toute
colonne d'aperçu de moins de 300 px, où son détail déplié ferait dix lignes de
quatre mots. Il reste à un appui dans tous les cas.

Les planchers mesurés de hauteur rendue aux grilles, par fenêtre, sont dans
`tools/repli.mjs`. Sous 360 px le repli reste seul à les tenir, et l'en-tête
collant lui coûte douze points : la barre, le verdict replié et les cibles de
44 px y sont tous au minimum, il n'y a rien à reprendre ailleurs.
Le repli passe par l'échelle et non par la géométrie : la boîte de l'appareil
garde la taille qu'elle aurait dépliée, le motif n'est donc pas redessiné et la
maquette ne se réajuste pas. Deux seuils, 140 px pour replier et 56 px pour
déplier : avec un seul, le repli raccourcit le document, la position retombe
sous le seuil, et l'aperçu clignote.

**Deux natures de réglage, deux endroits.** Le panneau ne contient que ce qui
agit sur le fichier téléchargé : famille, palette, densité, version claire ou
sombre, résolution. La langue et le thème sont dans le pied de page, à côté du
numéro de version et du lien vers la source, parce qu'ils ne changent que
l'affichage. La règle tient en une phrase, et se vérifie d'un coup d'œil.

Pas de navigation : il n'y a qu'une section.

### Les cinq groupes de familles, en cinq onglets

La liste des familles est longue, et une liste longue se range. Cinq
groupes : les **abstraits**, les **matières**, les **paysages**, les
**lieux**, les **figures**.

Les paysages se sont détachés des abstraits le jour où ils ont été trois. Une
silhouette de montagne, un couchant et des nuages ne se cherchent pas au milieu
des trames et des damiers, et le critère de séparation s'énonce en une phrase :
un paysage a un haut et un bas.

Les matières sont nées du même mouvement, quand les nouveaux gestes du moteur
ont apporté du bois, de la peau, du tissu et des interférences : un motif de
matière n'est pas abstrait, c'est quelque chose qu'on touche, et le critère
tient lui aussi en une phrase : la main le reconnaît avant l'oeil. Elles se
placent entre les abstraits et les paysages, sur le chemin qui descend du
plus géométrique au plus figuratif.

Les trois grilles se suivaient, et c'était le défaut : trente-deux vignettes à
plat, dans une colonne étroite, mettent mille pixels entre « Vagues » et
« Poissons ». Le coût n'est pas le défilement, c'est qu'on ne peut pas comparer
deux motifs éloignés. Les groupes sont donc devenus des **onglets**, ce
qui ramène chaque liste à ce qu'un écran montre et met le passage de l'une à
l'autre à un appui.

Rien n'est caché pour autant, et c'est la contrainte qui décide du dessin : les
cinq onglets sont visibles ensemble, chacun porte **le nombre de familles qu'il
contient**, et l'aplat inversé de la puce de choix sert ici aussi, pour que
« ouvert » se lise au remplissage et non à la teinte. Le compte n'est pas
décoratif : il dit ce qu'on trouvera derrière avant d'ouvrir, et c'est lui qui
remplace la vue d'ensemble perdue.

Ils sont **empilés quand la colonne est étroite**, sur une rangée dès qu'elle
peut porter trois mots. La bascule se règle sur la largeur du panneau et non sur
celle de la fenêtre, par une requête de conteneur, parce que les deux n'ont rien
à voir : sur un téléphone de 390 px, le panneau tient dans une colonne de
207 px, où cinq onglets côte à côte réduiraient « Abstraits » à « A… ». La pile
est la valeur par défaut et la rangée l'exception, si bien qu'un navigateur qui
ne connaîtrait pas les requêtes de conteneur garde la forme lisible.

L'onglet s'ouvre sur **le groupe de la famille de l'adresse**, puis ne change
plus que sous le doigt. Il a suivi la famille en cours un temps, et c'était un
défaut : les groupes n'ont pas la même hauteur, et l'onglet qui basculait sous
« Surprends-moi » ou une vignette d'historique faisait sauter tout le panneau
au milieu du geste. La famille tirée reste sous les yeux dans l'aperçu, et son
onglet la montre dès qu'on l'ouvre. Un rechargement comme un lien partagé
rouvrent le bon onglet sans rien écrire sur l'appareil : la famille est dans
l'adresse. Les flèches parcourent les onglets sans les ouvrir, sans quoi le
clavier traverserait un rendu complet de grille par onglet pour atteindre le
dernier.

Les cinq groupes se suivent d'un seul tenant dans le moteur, dans cet ordre. Un
test le tient fermé (`src/lib/moteur.test.ts`) : le panneau construit ses
grilles en filtrant sur le groupe, et une famille rangée hors de son bloc
sauterait de place à l'écran sans que rien ne le signale.

### Les palettes qu'on écrit soi-même

Onze palettes suffisent à faire un fond d'écran, elles ne suffisent pas à faire
*le sien*. On en compose donc, de trois à six couleurs, fond compris, douze au
plus.

Ce sont des palettes, pas un autre réglage : même carte, même titre, même puce,
sous un sous-titre. Ce qui les distingue tient en deux boutons sous la grille,
qui ne portent que sur celle qui est choisie. Les mettre dans chaque puce ferait
trois cibles par palette, à vingt pixels de côté, et un groupe de boutons radio
n'a pas à contenir autre chose que des boutons radio.

L'éditeur est dans le panneau, à sa place, et non dans une fenêtre modale : le
produit n'en a aucune, et surtout la valeur de l'outil est de voir le rendu
pendant qu'on règle. Un carré de couleur ne dit rien de ce que la palette
donnera sur un motif ; la vignette, à côté du nom, le montre, et elle se
redessine à chaque teinte recevable. Deux champs par couleur, et c'est voulu :
le nuancier du système sert quand on cherche, les six chiffres quand on sait,
et « ma palette de marque » commence par un code, pas par un dégradé à faire
glisser.

Supprimer est la seule action irréversible du panneau. Elle porte le trait
d'alerte, jamais un aplat rouge : une couleur d'aplat sur un bouton secondaire
le ferait passer pour l'appel primaire.

### La page d'accueil

Elle est sur `/`, l'application sur `/app`, le mécanisme sur `/moteur`. Ce n'est
pas une deuxième section ajoutée à l'écran unique : c'est un autre document,
avec sa mise en page, sa feuille de style et son propre point d'entrée.
L'application n'en sait rien.

Le vocabulaire est celui de l'application, à une échelle près : les mêmes
arches, les mêmes seuils épais, la même display condensée contre la même
grotesque neutre, les mêmes jetons. Ce qui change, c'est la place. L'écran
unique compte ses pixels ; l'accueil se déroule, et peut donc donner au nom du
produit toute la largeur, ce qui est le seul geste de marque qu'il y ait.

Trois règles la tiennent, et ce sont celles du produit :

- **Un seul appel primaire.** Il est répété au bas de la page, parce que
  quelqu'un qui a lu jusqu'au bout ne doit pas remonter chercher la porte. Le
  libellé y est mot pour mot celui du héros : ce n'est pas une autre offre. Le
  bouton secondaire, lui, ne va nulle part, il descend d'une section.
- **Aucune animation qui ne dise rien.** Pas de carrousel, pas de motif qui
  tourne tout seul, pas d'apparition au défilement. Ce qui bouge ne bouge que
  sur demande.
- **Aucune capture d'écran.** Chaque image de la page sort du moteur, au
  chargement, dans le navigateur qui la lit : la maquette de téléphone, les
  douze motifs, la maquette de bureau, et la comparaison du voile. La maquette
  vient du même fichier que celle de l'application, et les couleurs de ses
  libellés de la même sonde de lisibilité. Rien ici ne peut donc promettre un
  rendu que l'application ne donnerait pas.

**Chaque écran est un bouton.** Le toucher tire un autre motif, et une ligne
sous les appels le dit plutôt que de le laisser deviner. C'est la démonstration
la plus courte du produit, puisque c'est exactement ce que fait
« Surprends-moi » dans l'outil. Les deux maquettes tirent une famille, une
palette et une graine ; la galerie et la démonstration du voile ne tirent qu'une
graine, l'une pour que ses douze couples restent ceux de la composition, l'autre
pour que la comparaison reste faite là où le voile travaille le plus. Le bouton
est une couche posée sur l'appareil et non son enveloppe : l'envelopper
changerait sa géométrie, dont dépendent le module de la maquette et le rapport
d'aspect du canevas.

Le motif de départ, lui, ne se joue pas aux dés : la page se peint deux fois de
suite à l'identique. La variation est offerte, jamais imposée.

**Quinze rendus sur une page, ça se paie.** On ne peint que ce qui approche du
champ de vision, on peint quand le fil principal est libre, et on descend à un
pixel par point dès que l'appareil demande à économiser (`Save-Data`, ou le
mouvement réduit, qui vient souvent des mêmes réglages). Sans la deuxième
précaution, les toiles d'une même section deviennent visibles ensemble et se
peignent l'une derrière l'autre dans la même image, ce qui refait exactement le
pic que la première cherchait à éviter.

Les quatre chiffres du bandeau sont lus dans le moteur, jamais recopiés : une
famille ajoutée les corrige d'elle-même.

### La page du mécanisme

Elle est sur `/moteur`, et c'est le troisième document. Elle emprunte le
gabarit de l'accueil plutôt que de le recopier : sa racine porte
`.accueil moteur`, donc la gouttière, l'enseigne, la frise, les têtes de
section, l'appel et le pied viennent d'`accueil.css`. Sa propre feuille ne
déclare que les étapes, leurs commandes et les quatre blocs qui leur sont
propres, et elle part avec le morceau différé de la page.

Les trois règles de l'accueil valent ici sans changement : un seul appel
primaire, aucune animation qui ne dise rien, aucune capture d'écran. Il s'en
ajoute une quatrième, qui est la raison d'être de la page.

**Un seul motif traverse les six étapes.** C'est ce qui la distingue d'une
documentation illustrée : ce qu'on choisit à la première se retrouve à la
dernière, et la page se termine en offrant le lien qui l'ouvre dans
l'application. La règle de mise en page qui en découle : ce qui décrit le motif
monte à la racine du document, ce qui décrit la façon de le regarder reste dans
l'étape qui le regarde.

**Les six étapes sont dans le document, les unes sous les autres.** Pas de
défilé à une étape visible à la fois : ce serait un carrousel sous un autre nom,
et ça cacherait à la lecture ce que la page est censée expliquer. Le rang d'une
étape est `aria-hidden` et le titre le double toujours, comme partout ailleurs
où un signe repère sans porter d'information seule.

**Les treize fiches de gestes ne sont pas des écrans du produit.** L'accueil pose
que chaque écran est un bouton qui tire un autre motif ; ici, l'objet manipulé
est le motif en cours de construction, et une fiche n'en tire pas un autre :
elle fait adopter sa mécanique. Son exemple, lui, ne bouge jamais, sans quoi les
treize fiches cesseraient d'être comparables entre elles.

**La treizième tuile de la galerie n'est pas une quatorzième image.** Elle est
la porte vers ce document, elle ne porte pas de canevas, et elle ne ressemble
pas aux douze autres : une vignette identique aux autres mais qui navigue au
lieu de relancer une graine serait un bouton dont l'aspect ment sur ce qu'il
fait.

### La bascule

Langue et thème, dans l'enseigne épinglée de l'accueil. Ce sont des boutons,
pas des puces de choix : deux états, dont l'un est toujours celui qu'on quitte.

Chacun montre donc **ce qu'un appui donnera**, jamais l'état où l'on est. Un
bouton marqué « Sombre » sur fond clair ne dit pas s'il annonce le thème actuel
ou celui qui vient ; « Passer au thème sombre », qui est son nom accessible
entier, le dit. Le disque garde la forme des puces du pied de page de
l'application, plein pour le clair et vide pour le sombre, et il se lit en
niveaux de gris. Le mot ne l'accompagne qu'au-dessus de 560 px ; en dessous, le
nom accessible le porte seul.

Le libellé de langue est écrit dans la langue d'arrivée, avec son attribut
`lang` : une synthèse vocale française qui lirait « English » à la française
donnerait un mot que personne ne reconnaît. Son nom accessible commence par le
code visible, pour qu'une commande vocale « clique sur EN » atteigne le bouton
qui porte ce mot.

Le thème n'y a que deux positions. « Système » reste dans le pied de page de
l'application, là où trois choix ont la place de tenir : une bascule à trois
positions n'est plus une bascule.

---

## 7. Les composants

### Une bascule ne se dérobe pas

Une bascule montre ce qu'un appui donnera, jamais l'état où l'on est : son
libellé change donc à chaque appui, et sa largeur avec lui. Le bouton se
dérobait alors sous le doigt qui venait de l'atteindre, ce qui est le contraire
de ce qu'on attend d'un interrupteur.

Trois règles, et elles valent pour toutes les bascules du produit.

**Les deux mots occupent la même cellule.** Le bouton fait la largeur du plus
long, dans n'importe quelle langue ; celui qui ne sert pas garde sa place sans
se montrer, et `visibility` le retire aussi de l'arbre d'accessibilité.

**Le trait ne s'épaissit pas.** Les puces de choix, elles, le peuvent : leur
rembourrage compense au pixel près. Un trait d'un pixel et demi ne s'y prête
pas, les navigateurs l'arrondissant différemment selon la densité de l'écran.
L'aplat inversé dit l'état à lui seul, en couleur comme en niveaux de gris.

**Le bord tenu est celui qui ne bouge pas.** Le texte voisin prend toute la
place qui reste, et la bascule est le dernier élément de sa rangée : un libellé
qui raccourcit à côté d'elle, ou un bouton qui apparaît, la poussent alors sans
la déplacer. Une rangée qui passe sous son titre dans une colonne étroite garde
ce bord par une marge automatique, faute de quoi il redeviendrait celui de
gauche.

Une vérification le tient fermé pour les deux bascules concernées, l'interrupteur
du voile et l'épingle : leur boîte est relevée avant et après l'appui, au dixième
de pixel.

### La puce de choix

Les cinq groupes de réglage sont à choix unique et exclusif : ce sont des
**boutons radio**, pas des bascules. `role="radio"`, `aria-checked`, un seul
arrêt de tabulation par groupe, les flèches déplacent le choix.

La sélection est un **aplat inversé** (encre pleine, texte papier) et non une
nuance : un aplat se lit de loin, en niveaux de gris, sans comparer deux teintes
voisines. Le petit carré lime confirme, il ne décide pas ; il porte un filet à la
couleur du texte, sans quoi il disparaîtrait sur la puce crème du thème sombre.

L'historique des motifs suit la même économie de clavier, avec une nuance :
c'est une **barre d'outils**, pas un groupe radio. Un seul arrêt de tabulation
pour les dix vignettes, les flèches déplacent le focus, mais elles ne
restaurent rien : ce sont dix actions distinctes, pas dix options d'un même
réglage. Le motif en cours s'y reconnaît au trait épaissi et à l'aplat, comme
une puce choisie.

**L'épingle** y porte sur le motif en cours, depuis un seul bouton en tête de
carte, et non sur chaque vignette. Deux raisons, et la première suffit : une
épingle par vignette ferait vingt cibles dans une carte qui en compte dix, à
vingt pixels de côté, là où le produit n'en accepte aucune sous quarante-quatre.
La seconde est que restaurer un motif est déjà un appui : épingler le troisième
de la liste en coûte deux, et on l'a vu en grand entre les deux. Une entrée
épinglée porte une coche sur son coin, et le mot « Épinglé » dans son nom
accessible : jamais la forme seule.

### Les onglets

`role="tablist"`, un seul arrêt de tabulation, les flèches déplacent le focus
**sans ouvrir**. C'est la différence avec les puces de choix, et elle est
mesurable : ouvrir au passage remplacerait toute une grille de vignettes à
chaque touche, et le clavier traverserait un rendu complet par onglet pour
atteindre le dernier.

L'onglet ouvert porte l'aplat inversé des puces, et son compte de familles passe
à la couleur du papier avec lui.

### Les champs

Trait `--filet-franc` à 1,5 px, fond `--champ`, chiffres en `tabular-nums`.
En erreur : trait `--alerte` à 2,5 px **et** un triangle devant le message. La
teinte seule ne suffit jamais.

### Les boutons

- **Primaire** : aplat `--accent`, texte `--accent-encre`, trait
  `--accent-encre` (et non `--encre`, qui est la crème en thème sombre et
  disparaîtrait sur le lime). 56 px de haut.
- **Secondaire** : transparent, trait `--encre` à 2 px. 56 px, mais
  `flex: 0 100 auto` : il cède toute sa place au primaire. Sous 600 px les deux
  secondaires de la barre rendent leur mot et gardent leur pictogramme. Le mot
  n'est pas retiré du document mais rendu invisible : il reste le nom accessible
  du bouton, ce qu'un `aria-label` posé par-dessus un libellé visible aurait
  cassé aux largeurs supérieures.
- **Le dépli** du primaire : même hauteur, même rayon, mais pas d'aplat. Il
  n'appelle à rien, il ouvre. Enfoncé, il prend l'aplat inversé et son chevron
  se retourne.
- **La feuille des formats** s'ouvre **au-dessus** de la rangée : la barre est
  collée en bas de l'écran, et une liste qui pousserait vers le bas sortirait de
  la fenêtre. Chaque sortie y porte son nom et une ligne qui dit à quoi elle
  sert ; une sortie indisponible garde sa ligne et y met la raison, plutôt que
  de disparaître sans explication.

### Les notes

Trois formes, jamais trois couleurs :

| Note | Signe | Fond |
|---|---|---|
| succès | pointe vers le bas et son seuil | `--accent` |
| erreur | triangle | `--surface`, trait `--alerte` |
| mise à jour | arche | `--surface`, trait `--filet-franc` |

---

## 8. Les états

Chaque écran a cinq états, tous dessinés.

| État | Ce qu'on voit |
|---|---|
| **Vide** | hachure diagonale à la place de la maquette, « Indique une résolution », bouton désactivé |
| **Chargement** | trois points au centre, bouton en « Rendu en cours » et `aria-busy` |
| **Erreur** | carte à trait d'alerte et triangle, **la cause exacte**, bouton Réessayer |
| **Succès** | carte lime : dimensions, format, poids réel, le geste pour finir, un bouton Fermer ; elle se retire seule après douze secondes, ou d'un glissement vers le bas |
| **Données trop longues** | libellés de carte sur deux lignes, jamais élidés ; ellipse sur les icônes de la maquette ; `overflow-wrap` sur les valeurs ; rangées retirées de la maquette |

Le verdict de lisibilité est affiché **en permanence**, pas seulement en cas de
problème. Et il n'affiche rien tant qu'il n'a rien mesuré : une application qui
promet de mesurer la lisibilité n'affiche pas un chiffre de repli.

Trois bandes, et rien entre les deux : **bonne** au-dessus de 4,5:1, le seuil AA
du petit texte qu'est un libellé d'icône ; **juste** entre 3:1 et 4,5:1 ;
**insuffisante** en dessous.

Une **version claire ou sombre** du fichier se choisit dans le panneau, après
la densité : deux puces, dont la pastille dessine ce qu'elle fait, et une note
sous le groupe dit que la version sombre est assombrie dans le fichier même.
Ce n'est pas le thème de l'application : le thème habille l'interface, la
version décide de l'image. La version sombre est le même motif avec un aplat
noir brûlé dedans, amené à une obscurité cible plutôt que voilé d'une opacité
fixe, si bien que toutes les palettes en sortent également sombres ; le choix
s'écrit dans l'adresse (`n=1`) et dans le nom du fichier, comme tout réglage.

L'aperçu la montre telle qu'elle partira, et le verdict la mesure : une seule
sonde, un seul chiffre, celui de l'image affichée, qui est celle qu'on
télécharge. Il en a porté deux un temps, celui du fichier et celui d'un fond
qu'un thème sombre aurait assombri ; ce second chiffre était l'aveu qu'on
jugeait une image qu'on ne livrait pas, et il n'y a plus rien à simuler à
côté. Le mot affiché est le nom de la bande, pris tel quel dans le
dictionnaire : un titre ne peut plus rassurer là où le corps nuance. Chaque
bande a sa forme, et le conseil qui l'accompagne nomme la borne qui la
définit.

Elle a d'abord été un **rideau clair/sombre** qu'on tirait sur l'aperçu, pour
comparer les deux conditions d'un même regard. L'idée était bonne et le
résultat mauvais : le rideau ne montrait qu'une simulation, qu'aucun
téléchargement ne rendait, si bien que l'aperçu et le fichier disaient deux
choses différentes, et l'aperçu avait toujours tort. Une image qu'on ne peut
pas télécharger n'avait rien à faire dans le cadre.

Il laisse une règle, qui vaut partout : **rien ne doit pouvoir occuper
l'aperçu en entier sans être le fichier**. Une aide à la lecture qui remplit
le cadre cesse d'être une aide et devient un mensonge. La version sombre la
respecte par construction : ce qu'elle met plein cadre est exactement ce que
le téléchargement rend, et une vérification le compare pour de bon.

**Le voile de lisibilité est dans le fichier lui aussi**, et une ligne sous le
bouton le dit. Elle
est là parce que rien d'autre ne pouvait le dire : le voile est déjà peint dans
l'aperçu, et personne ne compare une image à une image qu'il n'a pas vue.
L'interrupteur de cette ligne le retire, du fichier comme de l'aperçu, l'écrit
dans l'adresse et dans le nom du fichier, et le verdict se recalcule pour
l'image nue en la nommant autrement qu'un voile nul mesuré : l'un est ce que la
sonde a trouvé, l'autre est une décision.

---

## 9. Accessibilité : non négociable

- **Contrastes** : 4,5:1 pour le texte courant, 3:1 pour le texte large, les
  bordures d'éléments d'interface et les formes porteuses de sens.
- **Jamais la couleur seule.** En niveaux de gris, tout reste lisible : la
  sélection est un aplat inversé, la densité un nombre de points allumés, la
  lisibilité trois formes distinctes (disque plein, demi-disque, triangle), le
  thème un disque plein, vide ou à moitié, l'erreur un triangle.
- **Cibles tactiles 44 px**, sans exception, y compris le lien vers la source
  dans le pied de page.
- **Actions fréquentes dans la zone du pouce** : la barre d'action est en bas.
- **Focus visible partout**, et jamais masqué par les trois couches collantes.
  `scroll-padding` n'étant appliqué ni par le défilement déclenché par le focus
  ni par `scrollIntoView`, la correction se fait sur `focusin`
  (WCAG 2.2, 2.4.11).
- **Régions live** sur le verdict de lisibilité, le résultat de l'export et la
  confirmation de copie, sans rien y réécrire quand rien ne change.
- **La maquette d'écran est `aria-hidden`** : un lecteur d'écran n'a pas à lire
  de faux noms d'application. L'aperçu, lui, porte une description de ce qu'il
  montre.

---

## 10. Mouvement

Une animation ne sert que si elle dit **une origine, un état ou une
continuité**. Il y en a deux :

- le fondu de l'aperçu dit « c'est une autre image » quand le motif change, et
  il se tait quand seule la fenêtre a bougé ;
- les trois points disent « c'est en cours » pendant le calcul.

À quoi s'ajoute une réponse au toucher, jamais spontanée : l'arche de la frise
qu'on pince plonge et rebondit, et l'onde s'amortit sur ses voisines. Elle ne
dit rien et ne mène nulle part, c'est son droit de décor : elle ne part que
d'un doigt, aucun réglage ne bouge, et qui ne la trouve pas n'a rien manqué.

`prefers-reduced-motion: reduce` les coupe toutes les trois.

---

## 11. Écriture et ponctuation

Trois signes que le projet n'emploie nulle part : **le tiret cadratin, le tiret
demi-cadratin et le point médian**. Ni dans l'interface, ni dans les
commentaires, ni dans la documentation. Ils se glissent partout dès qu'on écrit
vite, et ils donnent au texte une allure qui n'est pas celle du projet.

Une phrase qui en réclame un se réécrit. La convention des séparateurs :

| Ce qu'on veut marquer | Le signe |
|---|---|
| annoncer une explication ou un exemple | deux points, jamais deux fois dans des phrases voisines |
| séparer des éléments de même rang | la virgule |
| une précision secondaire, un qualificatif | les parenthèses |
| une rupture forte, ou quand la virgule est prise par la décimale française | le point-virgule |
| deux propositions qui tiennent seules | le point |

Pas de barre verticale dans la prose : elle n'appartient pas à la typographie
française et se lit comme de la syntaxe de tableau.

`npm run typographie` fait échouer la porte de sortie sur la moindre occurrence
des trois signes, dans toutes les sources.

Espaces insécables dans les chaînes françaises devant `%`, `:`, `;` et à
l'intérieur des guillemets. Dans le code, elles s'écrivent `\u00a0` : un
caractère invisible dans une chaîne est un caractère que personne ne relit.

---

## 12. Deux langues

FR et EN, à parité stricte : la clé qui manque d'un côté ne compile pas. Les
gabarits laissent **30 % de marge** (vérifié en allongeant chaque libellé
d'autant, sur huit largeurs et quatre résolutions cibles).

Selon l'endroit, un libellé long revient à la ligne (puces), replie sa rangée
(langue, thème), s'étire avec sa colonne (cartes) ou s'élide (icônes de la
maquette, bouton secondaire). Le libellé du bouton primaire, lui, ne s'élide ni
ne se coupe jamais.

---

## 13. Ce que le design refuse

- Dark patterns, fausse urgence, frictions asymétriques.
- Gamification : ni badge, ni série, ni barre de progression culpabilisante.
- Un historique sans fin. Dix entrées, un bouton pour tout effacer, et pas de
  « voir plus » : on revient sur ses pas, on ne remonte pas une archive.
  L'épingle ne l'allonge pas et ne peut pas le remplir : six au plus, et les
  quatre places qui restent suffisent à voir passer les motifs. Une liste qu'on
  épingle en entier cesserait d'être un historique.
- Une caisse. Le lien de soutien est une porte : il vit dans le pied de page, à
  côté de la licence et de la source, et rien dans le produit ne le rappelle. Ni
  bandeau, ni relance après un téléchargement, ni compteur. Aplat est gratuit,
  sans compte et sans pub, et le restera.
- Un format offert qui échoue au clic. Une sortie que le navigateur ou le motif
  ne permet pas garde sa ligne dans la feuille et y met la raison, avant qu'on
  appuie.
- Onboarding en modales, tour guidé, pop-up de bienvenue.
- Plus d'un appel primaire par écran.
- Emoji.
- Bibliothèque de composants ou de style.
- Une deuxième section dans l'application. La présentation et le mécanisme sont
  d'autres documents, sur d'autres adresses ; l'écran unique reste unique. La
  ligne vise les sections, pas les documents : trois adresses ne font pas trois
  onglets, elles font trois pages qu'un lien sépare.
- Tiret cadratin, tiret demi-cadratin, point médian (section 11).
