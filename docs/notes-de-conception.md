# Notes de conception

La mémoire longue du projet : ce que chaque choix d'interface, de moteur et
d'outillage doit à une contrainte, et ce qui a été essayé puis retiré. Le
[README](../README.fr.md) présente le produit ; ce document justifie sa forme.
Le parti visuel et les règles d'interface, eux, sont dans
[`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

---

Des fonds d'écran génératifs, exportés à la résolution exacte de l'appareil.
Tout est calculé dans le navigateur.

Gratuit, sans compte, sans pub, sans traceur, sans serveur. Aucune donnée ne
sort de l'appareil : ce qui est partageable tient dans l'URL, et les seules
choses écrites sur l'appareil sont la liste des dix derniers motifs regardés et
les palettes qu'on a composées, effaçables d'un bouton et une à une, puis la
langue et le thème, qui ne s'écrivent que le jour où on les choisit.
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
  les quatre réglages (famille, palette, densité, version claire ou sombre) et
  la résolution, déjà détectée, repliée tant qu'on n'y touche pas.
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
famille, palette, densité, version, résolution. La langue et le thème sont dans le pied
de page, à côté de la version et du lien vers la source, parce qu'ils ne
changent que l'affichage.

Le parti visuel et les règles d'interface sont dans
[`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

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

Une **version claire ou sombre** se choisit dans le panneau, après la densité :
deux puces, dont la pastille dessine ce qu'elle fait. La version sombre n'est
pas un habillage : c'est le même motif avec un aplat noir brûlé dans le
fichier, amené à une obscurité cible plutôt que voilé d'une opacité fixe, si
bien que toutes les palettes en sortent également sombres. L'aperçu la montre,
le verdict la mesure comme n'importe quelle image, et le téléchargement rend
exactement ce qu'on regarde, ce qu'une vérification compare pour de bon ; le
choix s'écrit dans l'adresse (`n=1`) et dans le nom du fichier.
Elle a d'abord été un rideau qu'on tirait sur l'aperçu, pour comparer les deux
d'un même regard. L'idée était bonne et le résultat mauvais : le rideau ne
montrait qu'une simulation, qu'aucun téléchargement ne rendait, si bien que
l'aperçu et le fichier disaient deux choses différentes, et l'aperçu avait
toujours tort. Une image qu'on ne peut pas télécharger n'avait rien à faire
dans le cadre.

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
src/main.tsx                  point d'entrée, et la table des trois adresses
src/pages.ts                  les trois documents en morceaux, et leur préchargement
src/App.tsx                   l'état, l'URL, l'export
src/lib/moteur.ts             le moteur génératif : palettes, familles, rendu
src/lib/lieux.ts              les lieux : scènes en champ d’encre, trame de gravure
src/lib/trace.ts              les outils des gestes : rubans, bruit, teintes
src/lib/{niveaux,fractures,reserves,chimie,reseaux,pavages,trames,grammaires}.ts
src/lib/{carreaux,coulees,reliefs,mesures}.ts
                              les gestes ajoutés : un module par mécanique de dessin
src/lib/palettes.ts           les palettes composées à la main, et leur adresse
src/lib/svg.ts                le même motif en vectoriel, par un pinceau qui note
src/lib/route.ts              « / », « /app » ou « /moteur », et les liens d'avant
src/lib/{affichage,historique,resolution,url,export,geometrie,format,tirage,build}.ts
src/components/               l'interface, un fichier par pièce
src/components/{Lien,Arrivee,Repli}.tsx
                              le passage d'un document à l'autre, sans rechargement
src/components/accueil/       la page d'accueil, un fichier par section
src/components/moteur/        la page du mécanisme, un fichier par étape
src/hooks/                    horloge, tailles, focus, ajustement, économie
src/i18n/{fr,en,index}.ts     les libellés, à parité stricte
src/styles/                   tokens, reset, base, composants, écrans, accueil, moteur
public/polices/*.woff2        Anton et Archivo, auto-hébergées
scripts/                      icônes de la PWA, notices de licence
design/Aplat.dc.html          la maquette de référence de l'application
design/Aplat-accueil.dc.html  celle de la page d'accueil
tools/*.mjs                   vérifications headless (hors livraison)
.github/workflows/ci.yml      la CI : `verify` et `check`, en parallèle
```

## Trois adresses

`/` présente le projet. `/app` le fait tourner. `/moteur` explique comment il
tourne.

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

**Seize rendus du moteur sur une page, ça se paie.** Trois précautions, et
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
d'écrit sur l'appareil tant qu'on ne choisit rien. Ses deux seuls choix sont la
langue et le thème, qui sont aussi ses deux boutons, dans l'enseigne épinglée :
quelqu'un qui arrive sur une page dans une langue qu'il ne lit pas doit trouver
la bascule avant le premier paragraphe. Le choix fait là est retenu sur
l'appareil, et le stockage étant commun aux deux pages, le lien vers
l'application n'a rien à emporter : personne ne choisit sa langue deux fois.

La marque, en haut, fait le chemin dans l'autre sens. Elle est un lien vers
`/` depuis les deux documents : depuis l'application, c'est sa seule sortie, et
elle est là où tout le monde cherche une sortie ; depuis la présentation, elle
ramène en haut de page plutôt que d'ouvrir l'outil, ce que la porte nommée fait
déjà, à droite. La langue et le thème n'ont pas plus besoin de traverser ce
lien que l'autre : retenus sur l'appareil, ils attendent au retour, et revenir
ne coûte pas le choix qu'on vient de faire. Aucun paramètre de
motif n'y entre, sinon la reconduction ci-dessous renverrait le retour vers
`/app` avant qu'il n'ait lieu.

Aplat a vécu à la racine. Les liens partagés de cette époque, `/?m=vagues&…`,
sont reconduits vers `/app` avec leur requête intacte, avant le moindre rendu :
la promesse « copier le lien suffit à retrouver exactement la même image » ne
s'annule pas parce que le produit s'est doté d'une porte d'entrée. Une adresse
nue, ou qui ne porte que la langue et le thème, reste sur l'accueil.

**Le passage de l'un à l'autre ne recharge pas la page.** Il l'a fait
longtemps, et cela se voyait : chaque porte était une ancre nue, donc un
chargement de document, donc React qui redémarre à zéro avant d'aller chercher
le morceau de la page visée. Deux attentes en file, et entre les deux un écran
qui n'avait plus rien à montrer. React Router remplace maintenant la page dans
le document déjà chargé : la feuille de style est en place, les deux polices
sont posées, il ne reste que le morceau, et les liens le demandent d'avance
dès qu'on les survole ou qu'on les atteint au clavier. Dès la deuxième visite,
le service worker le sert sans réseau.

C'est la seule chose qui change. Une seule page reste montée à la fois, et
l'application reste l'écran unique décrit plus haut : la navigation est entre
les documents, jamais à l'intérieur de l'outil. Ce que le chargement de
document faisait gratuitement, en revanche, est désormais à faire soi-même, et
c'est tout `components/Arrivee.tsx` : la page arrivée s'ouvre en haut, le
focus quitte le lien cliqué pour entrer dans le `<main>`, et le titre du
document est annoncé, faute de quoi un lecteur d'écran ne saurait pas qu'on a
changé de page. Le retour arrière fait exception au défilement, parce que le
navigateur rend lui-même la position qu'on avait quittée.

L'adresse de l'application, elle, ne passe pas par le routeur. Elle est
réécrite à chaque réglage pour que le lien qu'on copie soit celui de l'image
affichée, et la faire traverser React Router rendrait toute la page à chaque
tirage. Elle passe donc directement par l'historique (`remplacerAdresse()`),
en lui repassant son état intact, sans quoi le routeur perdrait le fil du
retour arrière.

### La page du mécanisme

`/moteur` répond à la question que l'accueil laisse ouverte : « comment c'est
fait ». Elle déroule le mécanisme en six étapes numérotées, dans l'ordre où le
produit travaille : les quatre réglages, la graine, les quinze gestes de dessin,
les couches, la sonde de lisibilité, la résolution.

Elle suit les mêmes règles que l'accueil, et pour les mêmes raisons : aucune
capture d'écran, chaque image sort du moteur au chargement ; aucune animation
qui ne dise ni une origine, ni un état, ni une continuité ; un seul appel
primaire, tout en bas.

**Ce qui la distingue d'une documentation illustrée, c'est qu'un seul motif
traverse les six étapes.** Ce qu'on choisit à la première se retrouve à la
dernière, et la page se termine en offrant le lien qui l'ouvre dans
l'application, avec l'adresse écrite en clair au-dessus du bouton. La
démonstration finit donc là où le produit commence.

D'où la règle de répartition de l'état, qui tient en une phrase : ce qui décrit
le motif monte à la racine de la page, ce qui décrit la façon de le regarder (la
couche montrée, l'interrupteur du voile, le cadre visé) reste dans l'étape qui
le regarde. Sans elle, toucher le voile repeindrait les cinq autres étapes.

Les quinze fiches de gestes font exception au fil, et c'est voulu : chacune garde
son exemple, famille et palette figées, sinon elles démontreraient la palette du
moment au lieu de démontrer une mécanique. Le fil tient dans l'autre sens,
toucher une fiche fait adopter sa mécanique par le motif de la page.

Aucune liste de familles n'y est recopiée : chaque fiche prend celle que son
module publie déjà (`IDS_NIVEAUX`, `IDS_FRACTURES`, etc.), et la première, celle
des gestes d'origine, est ce qui reste une fois les neuf autres retirées de
`FAMILLES`. Une famille ajoutée au moteur se range d'elle-même dans la bonne
fiche.

La page ne lit pas les paramètres de motif de son adresse, et `/moteur?m=vagues`
ne rebondit donc pas vers l'application : un lien qui porte un motif désigne
l'outil, celui-ci désigne l'explication. Elle part toujours du même motif
choisi, ce qui la rend reproductible.

Trois portes y mènent, aucune n'est un appel : le pied de la présentation, le
pied de l'application, et une treizième tuile au bout de la galerie. Celle-ci ne
porte pas de canevas et ne ressemble pas aux douze autres, à dessein : une
vignette identique aux autres mais qui navigue au lieu de relancer une graine
serait un bouton dont l'aspect ment sur ce qu'il fait.

Le manifeste installe l'application sur `/app`, dans une portée qui reste la
racine : une application installée s'ouvre sur l'outil, pas sur sa
présentation. Son `id` n'a pas bougé, ce qui est précisément la raison pour
laquelle il était posé en dur : les installations existantes ont suivi au lieu
de se dédoubler.

## L'URL porte l'état

`?m=vagues&p=lime&d=1&s=7314&r=1179x2556`

`m` famille, `p` palette, `d` densité (de 0 à 2), `s` graine,
`r` résolution (seulement si elle a été saisie à la main),
`v=0` (seulement si le voile de lisibilité a été retiré du fichier),
`n=1` (seulement si c'est la version sombre du motif qui est exportée),
`k` les teintes d'une palette composée à la main (seulement si le motif en
porte une).

`v` et `n` ont une valeur par défaut qui ne s'écrit pas, et c'est ce que le
produit a toujours livré, le voile dans le fichier et l'image claire : les
liens partagés avant qu'ils n'existent continuent d'ouvrir exactement la même
image.

`k` mérite une phrase. Une palette composée à la main n'existe que sur
l'appareil qui l'a composée ; sans ses teintes, le lien ouvrirait un autre motif
chez la personne qui le reçoit. Le nom qui est dans `p` est l'empreinte de ces
teintes, si bien que les deux se vérifient l'un l'autre : une adresse dont
l'empreinte ne correspond pas aux couleurs est refusée, et une palette reçue ne
peut donc pas se faire passer pour une palette déjà enregistrée.

`l` et `t` ne sont plus des paramètres : l'adresse ne porte que l'image. La
langue et le thème habillent l'interface sans rien changer au fichier, et un
lien qui les emportait imposait au destinataire l'affichage de l'expéditeur ;
ils vivent désormais sur l'appareil. Les liens déjà partagés tiennent parole :
`?l=` et `?t=` sont encore lus, gagnent pour ce chargement-là, puis l'adresse
est nettoyée, sans écraser le choix retenu sur l'appareil.

Rien d'autre n'est transmis. Copier le lien suffit à retrouver exactement la
même image, sur n'importe quel appareil. Une URL forgée ne peut produire qu'un
motif valide : tout ce qui n'est pas reconnu retombe sur la valeur par défaut,
et jamais par un accès indexé, car `PALETTES['constructor']` est « vrai » et
suffisait à faire lever le rendu tout entier.

## Ce qui est enregistré, et ce qui ne l'est pas

Aucun compte, aucun réseau à l'exécution, aucune mesure d'audience. Ni cookie,
ni `sessionStorage`, ni base indexée. Les réglages du motif affiché vivent dans
la barre d'adresse.

**Quatre clés de `localStorage`**, et pas une de plus.

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

`aplat:langue` et `aplat:theme` : la langue et le thème choisis, un mot chacun.
Ils habillent l'interface sans rien changer au fichier, et un lien qui les
emportait imposait au destinataire l'affichage de l'expéditeur : ils vivent
donc ici plutôt que dans l'adresse. Rien ne s'écrit tant qu'on ne choisit
rien, les défauts restant la langue du navigateur et le thème du système, et
revenir à « Système » efface la clé plutôt que d'y écrire l'absence de choix.
Le choix vaut pour les deux pages, et c'est lui qui permet aux liens de rester
nus.

Ce que ces quatre clés contiennent exactement est vérifié à chaque
`npm run check`, champ par champ, et une cinquième clé y ferait échouer le
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

**Quatre-vingt-cinq familles, neuf groupes.**

Un groupe n'existe que si son critère tient en une phrase. « Abstraits » n'en
avait pas : il était le bac de ce qui n'était rangé nulle part, et il a fini par
porter quarante et une familles sur soixante-seize, c'est-à-dire le défaut
d'avant les onglets, revenu à l'intérieur d'un onglet. Il a donc été coupé en
quatre, avec quatre phrases.

- **Abstraits** (dix-sept) : des formes libres sur un aplat, rien n'y revient à
  intervalle régulier. Les douze qui sèment des formes, les quatre déformées où
  un champ lisse plie une forme répétée, et Kintsugi et Banquise, qui brisent la
  surface en pièces par découpe de demi-plans, les jointures affleurant.
- **Pavages** (seize) : une maille revient, et l'oeil la suit du doigt. Les
  réglées d'origine, Claustra et Papel picado qui percent un aplat en réserve,
  Penrose qui pave sans période par déflation, et les quatre du carreau, dont
  chaque case reçoit un signe pris dans un jeu fini.
- **Volumes** (quatre) : c'est plat, et on y voit pourtant un volume. Les
  quatre du relief, où la teinte d'une face dit son orientation, sans un seul
  dégradé.
- **Instruments** (quatre) : le motif est gradué, il mesure. Les quatre de la
  mesure, tapis de coupe, papier millimétré, rapporteur, mire de réglage.
- La coulée reste chez les abstraits : ses rubans serpentent, et rien n'y
  revient.
- **Matières** (six) : bois, peau, tissu, interférence, ce que la main
  reconnaît avant l'oeil. Cernes pose des anneaux de croissance ; Pelage et
  Madrépore se cultivent, une réaction-diffusion de Gray-Scott gelée à un
  instant choisi ; Drapé déforme des bandes par un champ ; Boro coud des
  pièces d'indigo au point sashiko ; Moiré peint la figure d'interférence de
  deux trames, calculée point par point, jamais par transparence.
- **Paysages** (huit) : Sommets, Horizon, Nuages, Dunes, Falaises, Archipel,
  et deux venues de la ligne de niveau : Relief, des massifs vus du ciel en
  paliers, et Marée, l'estran que l'eau découvre en se retirant.
  Elles ont un haut et un bas, et c'est ce qui les sépare des abstraits. C'est
  aussi ce qui les rend commodes en fond d'écran : la grille d'icônes tombe
  dans leur partie basse, et la sonde de lisibilité y trouve un aplat plutôt
  qu'un motif.
- **Lieux** (six) : Acropole, Phare, Pyramides, Torii, Aqueduc, Moulins. Des
  gravures tramées
  plutôt que des aplats : chaque scène est un champ de densité d'encre, une
  trame de demi-teintes à hachures croisées le transforme en points, et deux
  tons seulement sortent de la palette, le plus clair en papier, le plus
  sombre en encre. La densité y règle la finesse de la trame, pas le
  peuplement.
- **Figures** (quinze) : des objets posés sur un fond, reconnaissables un par
  un. S'y ajoutent une Empreinte digitale géante en rubans interrompus, un
  Herbier poussé par récursion, un plan de Métro fictif et des
  Constellations reliées à la règle.

**Deux gestes récents, cinq familles.** Ils répondent à la même demande, celle
des affiches géométriques, et ils s'y prennent par les deux bouts.

*Le carreau* (`src/lib/carreaux.ts`) découpe le plan en cases carrées et donne
à chacune un signe pris dans un jeu fini : quart de disque, demi-disque,
triangle, amande, sautoir, bandes, anneau. Rien n'est dessiné qui ne tienne
dans une case, et le rythme vient de ce serrage : deux quarts de disque voisins
font un demi, quatre font un rond, et l'oeil lit une composition là où la règle
n'a fait que remplir des cases. Quatre familles s'y partagent l'alphabet, et ce
qui les sépare est la façon d'occuper la grille. **Bauhaus** laisse respirer,
des cases vides, des aplats francs, une case sur cinq regroupée par quatre pour
porter un signe deux fois plus grand. **Carreaux** ne laisse rien passer, chaque
case a son aplat, et le motif se lit en camaïeu parce que le signe est toujours
la teinte voisine de son aplat dans l'ordre des luminances. **Demi-lunes**
n'emploie que les rondeurs et en tire des colonnades : les demi-disques
s'appuient sur les bords, et deux voisines font un sablier, une amande ou un
cercle que personne n'a dessiné. **Jetons** revient à deux tons et sème sur un
damier lâche des pièces frappées, anneaux, rouages, hexagones, étoiles.

Les signes évidés ne peignent pas leur creux : le contour et le trou entrent
dans le même chemin, rempli en règle paire et impaire. C'est ce qui permet à un
anneau de tomber indifféremment sur un aplat de case ou sur la page nue, sans
que le geste ait à connaître le fond de la palette, qu'il ne reçoit pas.

*La coulée* (`src/lib/coulees.ts`) fait l'inverse : au lieu de remplir des
cases, elle les traverse. **Méandres** pose sur chaque tuile deux arcs épais qui
entrent et sortent par le milieu de deux de ses côtés ; comme les milieux de
côtés appartiennent à deux tuiles, les bandes se prolongent et serpentent d'un
bord à l'autre du cadre, avec des épingles à cheveux que personne n'a placées.
Ce qui fait la famille n'est pourtant pas le tracé, c'est la couleur : un ruban
n'est une chose que si toute sa longueur porte la même teinte, et une tuile ne
sait rien de la longueur qui la traverse. Les milieux de côtés sont donc réunis
en classes par une union-trouve avant le moindre tracé, et la teinte se tire de
la classe. Un ruban sur quatre environ n'est pas peint : le fond de la palette
reste alors visible sur toute sa longueur, si bien que le vide se lit comme une
bande de la même largeur que les autres.

**Le relief, sans un dégradé.** Le catalogue est en aplats fermés, et c'est un
parti pris : un dégradé se trame, pèse trois fois plus en PNG et ne survit pas
au vectoriel. Le geste du relief (`src/lib/reliefs.ts`) montre qu'on n'en a pas
besoin. Un volume ne se voit pas parce que la lumière y glisse, il se voit
parce que ses faces ne sont pas de la même valeur : trois aplats bien choisis
font un cube plus sûrement qu'un dégradé.

La lumière ne bouge jamais, elle vient d'en haut à gauche, et de devant. Une
face qui la regarde prend sa teinte poussée vers le jour, une face qui s'en
détourne la même poussée vers l'ombre. Le jour et l'ombre sont presque le blanc
et presque le noir, teintés d'un quart par les deux bouts de la palette. Les
deux réglages ont été essayés. Éclairer vers la teinte la plus claire de la
palette semblait plus élégant et donnait de la boue : sur Lime & crème, une
face de bleu marine poussée vers un jaune vert ressort kaki, et le cube perd la
couleur pour laquelle on l'a choisi. Le blanc et le noir, eux, ne déplacent pas
la teinte, ils montent et descendent sa valeur, ce qu'une lumière fait.

Les quatre gardent les parallèles parallèles, et c'est l'axonométrie : elle
donne du volume sans rien promettre de la distance. Une perspective vraie, avec
son point de fuite et son damier qui se resserre, a été écrite puis retirée :
elle choisit un endroit d'où regarder, et une grille d'icônes n'est pas cet
endroit. Un fond d'écran se regarde de trop près et de trop longtemps pour
supporter qu'on lui dise où se tenir.

Quatre familles, donc, et quatre façons de fabriquer le volume. **Cubes**
empile des solides, trois faces par cube, la hauteur lue dans un bruit continu
et la teinte prise par palier d'altitude, comme une carte hypsométrique.
**Plis** froisse une nappe : les sommets restent sur un quadrillage à peine
bousculé, les triangles pavent le plan sans un interstice, et la seule chose
qui vienne de la troisième dimension est une hauteur qui n'orientera que les
facettes. Le froissé est entièrement dans la valeur. **Bossage** ne creuse rien
du tout : ses panneaux sont plats, et seul le chanfrein dit lesquels sortent et
lesquels rentrent, les mêmes deux trapèzes échangés suffisant à retourner le
volume. **Tuyaux** courbe la valeur en travers d'une barre droite, et une barre
devient un cylindre ; les barres se tressent, et celle qui passe dessous reçoit
l'ombre portée de celle qui passe dessus.

Que le dessus d'un cube soit plus clair que son flanc gauche, et celui-ci plus
clair que le flanc droit, tient à un test : inverser deux des trois laisse le
dessin juste au pixel près, ne lève aucune erreur, et retourne le volume comme
un masque creux.

**Un motif qui mesure.** Les autres gestes dessinent des choses ; la mesure
(`src/lib/mesures.ts`) dessine ce avec quoi on dessine. **Tapis de coupe**
pose une trame au centimètre, ses axes tous les cinq, une réglette graduée le
long des deux bords, et dans un coin la rose de l'atelier, un faisceau
d'obliques aux angles usuels et des arcs pour reporter une distance. Les
obliques y sont en pointillé et les axes en plein, comme sur un vrai tapis :
ce qui se lit en plein est ce qu'on coupe, ce qui se lit en pointillé est ce
qui aide à viser. **Millimétré** n'est que trois trames emboîtées, et tout est
dans le dosage des trois épaisseurs : le millimètre à la limite du visible, le
demi-centimètre qui se devine, le centimètre qui se lit. **Rapporteur** pose
des demi-cadrans sur les bords, gradués au degré, et prolonge chaque dizaine
jusqu'au bord de l'image. **Mire** est une planche de cibles de réglage,
étoiles de Siemens, croix de centrage, peignes et échelles de valeurs.

Trois choses manquaient au moteur pour les faire. Le trait, d'abord : le
pinceau ne connaît que le remplissage, alors une graduation est un rectangle
quand elle est droite, un ruban quand elle est oblique, un arc épais quand
elle tourne. C'est plus de travail qu'un `lineWidth`, et c'est ce qui fait
qu'un tapis de coupe s'exporte en vectoriel comme le reste. Le pointillé
ensuite, pour les lignes de construction.

Et les chiffres. Un instrument sans nombres n'est qu'un quadrillage, et le
moteur n'avait jamais su écrire : `Pinceau` n'a pas de `fillText`, et lui en
donner un aurait demandé au vectoriel d'embarquer une police. La fonte est donc
dessinée, trois cases sur cinq, en rectangles pleins, et elle ne sait que les
dix chiffres et un degré, ce qui est exactement ce qu'un instrument écrit.
C'est le seul endroit du moteur où une donnée saisie caractère par caractère
devient un dessin : une case oubliée dans un glyphe ne lève rien et fait
afficher `20` là où il faudrait `26`. La table est donc publiée, et un test la
relit case par case.

Chaque famille du geste peint son propre fond, et c'est le seul du catalogue à
le faire pour toutes les siennes. Un tapis de coupe est sombre, du papier
millimétré est clair : ce n'est pas une préférence, c'est ce que sont ces
objets. La palette ne choisit donc pas la clarté du fond, elle le teinte, et
un test le tient sur les onze.

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

**Les couches, écrites une fois.** Le fond, les formes, l'ombre de la version
sombre, le voile, le grain, dans cet ordre et à un seul endroit. `dessiner()`
prend un `arret` qui s'arrête à une couche au lieu de les poser toutes : c'est
tout ce que la page du mécanisme demandait au moteur pour montrer l'image se
construire. Le faire là plutôt que chez elle est ce qui garde l'ordre écrit une
fois, et ce qui fait qu'une couche ajoutée entre d'elle-même dans la
démonstration, à son rang.

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

Mesuré sur les **2 508 combinaisons** (76 familles × 11 palettes × 3 densités)
en 1179 × 2556, soit 3,0 Mpx. Le catalogue en compte quatre-vingt-cinq depuis,
et ces chiffres n'ont pas été remesurés :

| | avant | après |
|---|---|---|
| médiane | 0,94 Mo | **0,52 Mo** |
| 9ᵉ décile | 2,33 Mo | **0,94 Mo** |
| maximum | 2,33 Mo | **1,84 Mo** |

Les chiffres « après » ont été remesurés à l'arrivée des quatorze familles de
la seconde série, à celle des cinq familles déformées, à celle des trois
paysages et deux lieux, puis à celle des dix-sept familles qui ont ouvert les
Matières. Le maximum est passé de 0,98 à 1,04 Mo avec Azulejos en densité
dense, dont le carrelage remplit la page de courbes ; à 1,35 Mo avec Mirage
en dense, dont chaque rayure pliée traverse la page de haut en bas ; puis à
1,61 Mo avec Penrose en dense : un pavage qui ne se répète jamais est aussi
celui qui se compresse le moins, et il a déjà rendu une génération de
losanges, autant pour rester lisible en aplats francs que pour son poids.
C'est le prix honnête d'un motif qui couvre tout plutôt que de semer des
formes sur un aplat. La mesure a repris la tête, et c'était couru :
un cadran de rapporteur pose cent quatre-vingt-une graduations d'un cheveu
d'épaisseur, et rien ne se compresse plus mal qu'un cheveu. C'est aussi
pourquoi le geste s'est arrêté à quatre cadrans par image : à cinq, le fichier
passait deux mégaoctets, ce qui n'était plus le prix d'un instrument mais celui
d'une négligence. Les cinq familles du carreau et de la coulée n'ont pas
bougé ces trois chiffres : un alphabet de signes posés sur une grille se
compresse par bandes, et des rubans en aplats francs plus encore. Le relief
a repris la tête d'un cheveu, 1,63 Mo avec Plis en dense, et c'était
prévisible : une nappe froissée est faite de milliers de facettes dont
aucune n'a la teinte de sa voisine, ce qui est exactement ce qu'un
compresseur d'images ne sait pas faire. La médiane, elle, n'a pris qu'un
centième.

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

Le produit n'a plus de geste continu : le rideau clair/sombre, qui l'était,
est parti avec sa raison d'être, et la version sombre qui le remplace repasse
par le chemin de tous les réglages, un rendu du canevas par changement. Les
maquettes d'écran, elles, restent mémoïsées : `useAjustement` mesure sa boîte
après chaque rendu, dans un effet sans liste de dépendances, et ce recalcul de
mise en page sur une centaine de nœuds ne doit se payer qu'aux rendus qui
changent vraiment la scène.

Après 400 changements de réglage enchaînés (`tools/soak.mjs`) : même nombre de
nœuds, même nombre de canevas, même nombre d'écouteurs.

## Accessibilité

Vérifié par `tools/a11y.mjs`, qui recompose les couleurs semi-transparentes sur
leur pile de fonds réelle avant d'appliquer la formule WCAG, dans les deux
thèmes et les deux langues :

- texte courant ≥ 4,5:1, texte large, bordures d'éléments d'interface et formes
  porteuses de sens ≥ 3:1 (101 textes et 61 bordures examinés dans chacune des
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
- les groupes de réglages sont de vrais groupes radio, les cinq groupes de
  familles une vraie barre d'onglets, et l'historique une barre d'outils : un
  arrêt de tabulation par groupe, flèches et Début/Fin. Les flèches des onglets
  déplacent le focus **sans ouvrir**, sans quoi le clavier traverserait cinq
  rendus complets de quarante et une vignettes pour atteindre le quatrième ;
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
| `tools/accueil.mjs` | la page d'accueil : les trois adresses, les liens partagés d'avant, les deux bascules, les toiles qui se peignent toutes, les cibles et la hiérarchie des titres |
| `tools/moteur.mjs` | la page du mécanisme : la troisième adresse et son lien qui ne rebondit pas, les dix-neuf toiles, le fil du motif d'une étape à l'autre, l'escalier des couches comparé au rendu entier, les cibles et les libellés allongés de 30 % |
| `tools/e2e.mjs` | environ deux cents contrôles : URL et sa robustesse, déterminisme, les quatre pavages réguliers qui ignorent leur graine et eux seuls, quatre états, téléchargement réel de cinq sorties, course à l'export, échec de copie, politique réseau, contenu du cache, langue et thème retenus sur l'appareil, clavier, focus non masqué, mouvement réduit, onglets de familles, version sombre téléchargée telle qu'affichée, voile retiré, palette composée et son lien, épingle |
| `tools/pwa.mjs` | 19 contrôles : manifeste, icônes à la taille annoncée, Service Worker activé, puis réseau coupé (page, motif, vignettes, polices, téléchargement réel et la page du mécanisme) |
| `tools/a11y.mjs` | contrastes réels sur le DOM, deux thèmes, deux langues |
| `tools/reach.mjs` | atteignabilité et taille des cibles, de 320 à 1920 px |
| `tools/repli.mjs` | le repli au défilement, et la part de la fenêtre laissée aux grilles |
| `tools/overflow.mjs` | débordements sur 128 combinaisons de largeur, langue et résolution cible, avec et sans libellés allongés de 30 % |
| `tools/fuzz-url.mjs` | 383 URL hostiles : aucune erreur, aucune injection, la page rend toujours |
| `tools/band-test.mjs` | hauteur des marches du voile |
| `tools/dither-check.mjs` | amplitude du grain sur toute la gamme tonale |
| `tools/shot.mjs` | captures et absence de requête sortante |
| `tools/soak.mjs` | endurance : 400 actions, dérive mémoire, nœuds, canevas et écouteurs |
| `tools/export-audit.mjs` | poids et durée des PNG sur les 2 805 combinaisons |
| `tools/perf.mjs` | coût de chaque action, processeur bridé six fois |
| `tools/greyscale.mjs`, `tools/states.mjs`, `tools/planche.mjs` | captures en niveaux de gris, des cinq états, et de toutes les familles |
| `tools/cadrages.mjs`, `tools/wide.mjs` | ce qui tient au-dessus de la ligne de flottaison, et qui déborde à 320 px |
| `tools/fidelity.mjs`, `tools/geo-diff.mjs`, `tools/pixel-diff.mjs` | maquette d'origine et portage, comparés de trois façons |

Le moteur n'est pas exposé sur `window` : une application qui l'ouvre pour ses
propres tests l'ouvre à tout le monde. L'outillage en construit sa propre copie
(`tools/banc.mjs`) et l'injecte dans la page quand il en a besoin.

## Licences

Le code est publié sous licence **AGPL-3.0-only** ([`LICENSE`](../LICENSE)). Le
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
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | ce que le projet refuse, et comment il s'écrit. La partie qui ne se devine pas |
| [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) | la référence de l'interface, jetons compris. Le code y renvoie section par section |
| [`CHANGELOG.md`](../CHANGELOG.md) | ce que chaque version change pour la personne qui l'utilise |
| [`SECURITY.md`](../SECURITY.md) | comment signaler une faille, et ce qui n'en est pas une |
| [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) | ce qu'on attend dans les échanges |
| [`tools/README.md`](../tools/README.md) | ce que chaque vérification vérifie, et comment la rejouer |
