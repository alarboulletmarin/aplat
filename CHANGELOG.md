# Journal des versions

Écrit à la main, dans la voix du projet : ce que chaque version change pour la
personne qui utilise l'application, pas quels fichiers ont bougé. Les dates sont
celles de la publication.

## Non publié

Première version. Aplat répond à une question : **à quoi ressemblera ce fond
d'écran derrière mes icônes ?**

### Ajouté : quatre familles en relief, sans un seul dégradé

- **Le volume entre au catalogue.** Cubes empile des solides en axonométrie,
  trois faces par cube et la hauteur lue dans un champ continu. Plis froisse
  une nappe dont chaque facette prend la valeur de sa pente. Bossage grave des
  panneaux dans la page, saillants ou creux selon le seul chanfrein. Tuyaux
  tresse des cylindres qui s'ombrent les uns les autres. Le catalogue passe à
  soixante-douze familles.
- **Pas de point de fuite, et c'est un choix.** Les quatre gardent les
  parallèles parallèles. Une perspective vraie a été écrite puis retirée :
  elle choisit un endroit d'où regarder, et une grille d'icônes n'est pas cet
  endroit. Un fond d'écran se regarde de trop près et de trop longtemps pour
  supporter qu'on lui dise où se tenir.
- **Pas un dégradé, pas une ombre portée floue.** Un volume ne se voit pas
  parce que la lumière y glisse, il se voit parce que ses faces ne sont pas de
  la même valeur : trois aplats bien choisis font un cube. Les fichiers
  restent donc ce qu'ils étaient, nets, légers, et exportables en vectoriel
  comme le reste du catalogue.
- **La lumière ne bouge jamais.** Elle vient d'en haut à gauche, et de devant,
  pour les quatre familles. C'est ce qui leur permet de se ressembler sans se
  répéter, et c'est ce qui fait qu'un panneau creux se lit comme creux du
  premier coup d'oeil.
- **Le relief garde les couleurs de la palette.** Éclairer vers la teinte la
  plus claire de la palette avait été essayé, et donnait de la boue : sur Lime
  & crème, une face de bleu marine poussée vers un jaune vert ressort kaki. Le
  jour et l'ombre sont donc presque le blanc et presque le noir, teintés d'un
  quart par les deux bouts de la palette : la valeur monte et descend, la
  couleur reste.
- **Le poids n'a pas bougé.** Médiane à 0,49 Mo et neuvième décile à 0,89 Mo
  sur les 2 376 combinaisons, contre 0,48 et 0,87 avant. Seul le maximum prend
  deux centièmes, avec Plis en densité dense : une nappe froissée est faite de
  milliers de facettes dont aucune n'a la teinte de sa voisine.

### Ajouté : cinq familles géométriques, le carreau et la coulée

- **Cinq familles pour les affiches géométriques.** Bauhaus compose des cases
  franches sur la page, des quarts de disque, des triangles, des sautoirs, une
  case sur cinq regroupée par quatre pour porter un signe deux fois plus grand.
  Carreaux remplit toute la grille en camaïeu, chaque signe posé sur la teinte
  voisine de son aplat. Demi-lunes n'emploie que les rondeurs et en tire des
  colonnades. Jetons revient à deux tons et sème des pièces frappées sur un
  damier lâche. Méandres fait serpenter des rubans larges d'un bord à l'autre
  de l'image. Le catalogue passe à soixante-huit familles.
- **Deux gestes de plus dans le moteur.** Le carreau découpe le plan en cases
  et donne à chacune un signe pris dans un jeu fini ; la coulée traverse ces
  mêmes cases avec des bandes qui se raccordent. Ce sont les deux moitiés de
  la même question, remplir une grille ou la parcourir.
- **Un ruban de Méandres garde sa couleur sur toute sa longueur.** Une tuile ne
  sait rien de ce qui la traverse : les milieux de côtés sont réunis en classes
  avant le moindre tracé, et la teinte se tire de la classe. Sans cela, un
  damier bariolé ; avec, un ruban qu'on suit du doigt sur toute la hauteur de
  l'écran.
- **Les signes creux montrent ce qu'il y a derrière.** Un anneau n'est plus un
  disque couvert d'un disque plus petit de la couleur du fond, c'est un contour
  et son trou dans le même chemin. Il tombe donc aussi bien sur un aplat que
  sur la page, sans que le moteur ait à deviner ce qui est dessous.
- **Le même contrat que tout le reste.** Déterministe au quadruplet près, la
  même image à toute résolution, exportable en PNG comme en vectoriel, mesuré
  par la sonde de lisibilité, et tenu par les mêmes vérifications que les
  soixante-trois autres.
### Ajouté : une page qui explique comment ça marche

- **Une troisième adresse, `/moteur`.** `/` présente, `/app` fait tourner,
  `/moteur` explique comment il tourne. Six étapes numérotées, dans l'ordre où
  le produit travaille : les quatre réglages, la graine, les treize gestes de
  dessin, les couches, la sonde de lisibilité, la résolution.
- **Un seul motif traverse les six étapes.** Ce qu'on choisit à la première se
  retrouve à la dernière, et la page se termine en offrant le lien qui l'ouvre
  dans l'application, avec l'adresse écrite en clair au-dessus du bouton. La
  démonstration finit là où le produit commence.
- **Tout s'y manipule, et rien n'y est une capture d'écran.** Les palettes, les
  graines voisines, l'escalier des couches, l'interrupteur du voile et les
  formats sont de vrais réglages, et chaque image sort du moteur, au
  chargement, dans le navigateur qui la lit.
- **Treize fiches disent d'où viennent les soixante-douze familles** : les
  aplats, la ligne de niveau, la fracture, la réserve, la réaction, le pavage
  apériodique, la gravure tramée, la trame déformée, le réseau, la grammaire,
  le carreau, la coulée, le relief. Toucher une fiche fait adopter sa mécanique
  par le motif de la page. Aucune n'écrit sa liste de familles : chacune prend
  celle que son module publie, ce qu'un test vérifie des deux côtés.
- **Trois portes y mènent, aucune n'est un appel** : le pied de la
  présentation, le pied de l'application, et une treizième tuile au bout de la
  galerie, qui prend au vol la question qui vient après douze images.

### Ajouté : dix-sept familles, et un cinquième groupe, les Matières

- **Les Matières entrent au catalogue.** Un cinquième onglet, entre les
  abstraits et les paysages : ce que la main reconnaît avant l'œil. Le
  catalogue passe à soixante-trois familles.
- **Le moteur gagne des gestes nouveaux**, à côté de l'aplat fermé et de la
  gravure tramée : la ligne de niveau, la fracture, la réserve, la chimie, le
  réseau, le pavage savant, la grille qui se déforme et interfère, la
  grammaire de formes.
- **Deux familles se cultivent au lieu de se dessiner.** Pelage et Madrépore
  poussent par réaction-diffusion, la même chimie que les robes d'animaux et
  les coraux ; la culture est mémoïsée et tient sous les cent millisecondes.
- **Le kintsugi met l'or où ça s'est cassé** : l'accent de la palette vit
  dans les jointures. Et Penrose pave sans jamais se répéter, ce qu'aucun
  motif du catalogue ne savait faire.
- **Le même contrat que tout le reste.** Déterministe au quadruplet près, la
  même image à toute résolution, exportable, mesuré par la sonde de
  lisibilité, et tenu par les mêmes vérifications que les cinquante-six
  autres.

### Ajouté : trois touches, et une icône qui tire au sort

- **V, S, T au clavier.** Variante, Surprends-moi, Télécharger, depuis
  n'importe où dans la page : le cadeau de l'ordinateur. Jamais pendant une
  saisie, jamais avec un modificateur ; les infobulles des boutons disent
  leur touche.
- **L'appui long sur l'icône installée propose « Surprends-moi ».**
  L'application s'ouvre sur un tirage déjà fait, et l'adresse redevient
  concrète aussitôt : le lien qu'on partagerait porte le motif tiré, jamais
  le hasard.

### Ajouté : la pellicule à un appui

- **« Enregistrer dans les photos », dans la carte de succès.** La tâche
  finit dans la pellicule, et le téléchargement seul s'arrêtait un geste
  avant sur téléphone. Quand la feuille de partage native sait prendre le
  fichier, la carte remplace son astuce en prose par un bouton qui l'ouvre :
  « Enregistrer l'image » est à un appui. Rien ne sort de l'appareil de plus
  qu'avant : c'est le même fichier, déjà téléchargé, tendu à la feuille du
  système.
- **L'astuce restante dit le chemin réel.** Là où la feuille de partage ne
  prend pas le fichier, la phrase décrit ce qui se passe vraiment : ouvrir le
  fichier téléchargé, puis « Enregistrer l'image ».
- **Le dépli s'appelle « Autres sorties ».** Il contenait la copie et les
  trois appareils, qui ne sont pas des formats ; le menu porte maintenant le
  mot du README, ce qu'on peut emporter.

### Ajouté : cinq familles encore, des dunes aux moulins

- **Trois paysages.** Dunes, des crêtes de sable superposées aux flancs
  lents ; Falaises, des parois en redans qui tombent dans une mer plate ;
  Archipel, des îles posées sur l'eau sous un grand ciel, chacune avec son
  reflet. Le catalogue passe à quarante-six familles.
- **Deux lieux gravés.** Aqueduc, deux rangs d'arches dont les baies laissent
  voir le ciel et les collines : la forme de la marque, lue en creux par la
  trame. Moulins, un plat pays sous un ciel chargé, la croix des ailes devant
  l'astre et un canal en réserve. Même contrat que les quatre premiers lieux :
  deux tons pris dans la palette, la densité règle la finesse de la trame, et
  chaque tirage replace la scène.

- **L'en-tête de l'application porte la frise de la présentation.** Le filet à
  six barres s'efface : la même frise d'arches souligne le titre ici et sépare
  les sections là-bas, et la marque ne change plus de silhouette en passant
  d'un document à l'autre. En fenêtre couchée, la frise se baisse comme le
  filet le faisait.
- **Elle répond au doigt.** Toucher une arche la fait plonger puis rebondir,
  et l'onde s'amortit sur ses voisines. Rien d'utile ne s'y cache : aucun
  réglage ne bouge, et `prefers-reduced-motion` la tient immobile.

### Corrigé : trois promesses, trois fois le même trait

- Les trois cartes numérotées de la page d'accueil partageaient leur nom de
  classe avec la carte du panneau de réglages : la deuxième et la troisième
  héritaient d'un filet fin à la place de leur seuil d'encre. Chacune a
  retrouvé son trait de trois pixels, le même pour les trois.

### Corrigé : la barre d'action dit vrai jusque dans l'échec

- **« Réessayer » se tait quand rejouer produirait le même échec.** Quand la
  résolution dépasse le plafond de 40 Mpx, la carte d'erreur ne propose plus
  de réessayer : la phrase dit le nombre et ce qu'il faut baisser, et le
  bouton ne promet plus un essai qui échouerait pareil.
- **« Copier le lien » copie le lien affiché.** Là où le navigateur refuse de
  réécrire l'adresse, le presse-papiers pouvait recevoir une adresse en
  retard d'un réglage ; le lien copié est désormais celui qui est calculé, le
  même que celui du champ de repli.
- **Une palette noire n'est plus une panne.** Le garde-fou qui détecte les
  canevas refusés par les navigateurs mobiles prenait un fond noir pur (celui
  qu'on compose justement pour un écran OLED) pour une image vide ; il
  départage maintenant en écrivant un pixel et en le relisant.
- L'adresse `/app/`, avec sa barre finale, mène aussi à l'application.

### Ajouté : le pied de page dit le droit en entier

- **Deux liens de plus à côté de la version.** « AGPL-3.0 » mène au texte de la licence, au commit exact du build, et « Licences tierces » ouvre le fichier `THIRD-PARTY.txt` que chaque build régénère. Le fichier était servi depuis le début ; rien dans la page ne le désignait, et une licence qu'il faut deviner n'est pas mise à disposition.
- **Deux phrases de mentions légales** ferment le pied : ce que l'application ne collecte pas (aucun compte, aucune mesure d'audience), puis l'hébergeur et son adresse, la seule chose que la loi française demande à un éditeur non professionnel. Le pied de la page d'accueil porte les mêmes liens et la même ligne d'hébergeur.

### Ajouté : les lieux, un second geste du moteur

- **Quatre familles et un quatrième groupe.** Acropole, Phare, Pyramides,
  Torii : des endroits, pas des motifs, rangés dans leur onglet « Lieux »
  entre les paysages et les figures. Chacun varie avec sa graine, comme tout
  le catalogue : le rocher, l'astre, la porte et les dunes se replacent à
  chaque tirage.
- **La gravure tramée.** Les lieux ne sont pas des aplats : chaque scène est
  un champ de densité d'encre, et une trame de demi-teintes à hachures
  croisées le transforme en points, comme une gravure ou un billet. Deux tons
  seulement, pris dans la palette : le plus clair fait le papier, le plus
  sombre fait l'encre. Sur les palettes sombres, la gravure s'inverse
  d'elle-même, claire sur fond nuit, sans cas particulier.
- **La densité règle la finesse de la trame**, pas le peuplement : le même
  lieu, gravé plus gros ou plus fin.
- **Le même contrat que tout le reste.** Déterministe au quadruplet près, la
  même image à toute résolution, la sonde de lisibilité mesure la gravure
  réelle, et le SVG passe sur la plupart des tirages, les points d'une rangée
  fusionnés en rectangles. Les gravures les plus denses dépassent le plafond
  du vectoriel, et le panneau des formats le dit alors, motif par motif,
  exactement comme le garde-fou le prévoyait.

### Changé : la carte « Image enregistrée » sait partir

- **Elle se retire d'elle-même après douze secondes**, le double du temps de
  lire ses trois lignes. Elle restait sinon à l'écran jusqu'au prochain
  réglage, et une carte qui ne part jamais finit en décor : on cesse de la
  lire, y compris la fois où elle dit autre chose.
- **Un bouton Fermer et un glissement vers le bas** la retirent avant l'heure.
  Le glissement est un raccourci, jamais le seul chemin : le bouton et la
  minuterie font le même travail sans geste. La carte d'erreur, elle, ne part
  toujours pas seule : une erreur non lue est une erreur perdue.

### Ajouté : cinq familles, une houle et des rampes

- **Trente-sept familles au lieu de trente-deux.** Quatre abstraites où un
  champ lisse plie une forme répétée, quand les réglées la posaient sur une
  grille : Mirage, des rayures verticales pliées par un remous qui serpente ;
  Terrasses, des courbes de niveau emboîtées qui descendent la palette ;
  Bassin, des galets arrondis et le fond qui circule entre eux en un seul
  réseau ; Strates, des couches verticales bordées chacune de sa propre
  houle. Et une figure : Corolle, une seule grande fleur à la manière des
  papiers découpés, dont les nervures sont le fond qui affleure entre les
  pétales.
- **Le moteur gagne deux gestes, pas un second moteur.** Une houle
  déterministe, trois sinusoïdes tirées à la graine, et un mélange de teintes
  qui tend des rampes à travers la palette. Tout le reste passe par le
  pinceau existant : les cinq familles sont des aplats fermés, exportables en
  SVG le jour même, et les cinq varient avec leur graine, la liste des quatre
  pavages sourds ne bouge pas.
- **Les fichiers restent légers** : médiane inchangée à 0,43 Mo sur les 1 221
  combinaisons, maximum monté de 1,04 à 1,35 Mo, tenu par Mirage en densité
  dense, dont chaque rayure pliée traverse la page de haut en bas.

### Ajouté : le voile se voit, se dit, et se retire

- **Une ligne sous le bouton Télécharger dit ce que le fichier contient.** Le
  voile de lisibilité y était brûlé sans que rien de l'écran ne le dise : il est
  déjà peint dans l'aperçu, et personne ne compare une image à une image qu'il
  n'a pas vue. Quelqu'un qui téléchargeait sans avoir lu la présentation
  recevait donc une image plus sombre que celle qu'il croyait avoir choisie.
- **Un interrupteur l'enlève**, du fichier comme de l'aperçu. Le retrait part
  dans l'adresse (`v=0`) et dans le nom du fichier, parce qu'il change l'image ;
  le verdict de lisibilité se recalcule pour le motif nu, et le nomme autrement
  qu'un voile nul mesuré : l'un est ce que la sonde a trouvé, l'autre est une
  décision.
- La barre gagne cinquante-quatre pixels sur téléphone, et tout ce qui pouvait
  être repris ailleurs l'a été : rembourrage et interligne de la barre, ceux de
  la scène sous 360 px, et la vignette repliée passée de 22 à 18 % de la
  fenêtre. Deux planchers de `tools/repli.mjs` baissent d'un et de trois points,
  et la raison est écrite à côté des chiffres.

### Ajouté : un rideau pour voir la même graine en clair et en sombre

- **Un trait qu'on fait glisser sur l'aperçu**, et la moitié qu'il découvre se
  voit comme un thème sombre l'assombrirait. Il remplace la bascule
  « Assombri », qui montrait l'un *puis* l'autre : une limite qui passe sous les
  mêmes libellés se juge d'un regard, deux états successifs demandent de se
  souvenir du premier.
- **Il s'ouvre au milieu.** Tout à droite, l'aperçu montrait le fichier entier
  et rien d'autre : il fallait avoir l'idée de tirer le trait pour découvrir
  qu'il y avait deux états, et toute autre position montrait du sombre sans
  montrer de clair à côté. Un comparateur qui s'ouvre fermé ne compare rien.
- **Il ne se ferme jamais.** Poussé à fond, il remplissait l'aperçu de sombre :
  il n'y avait plus rien d'autre à l'écran que cette image, on téléchargeait le
  fichier clair qu'on n'avait pas sous les yeux, et l'aperçu cessait d'être le
  fichier. Une bande du fichier reste maintenant toujours visible, un cinquième
  de la largeur. Le rideau ne peut plus être pris pour un aperçu ; il ne peut
  que comparer.
- **Le verdict annonce les deux rapports à la fois**, celui du fichier et celui
  du fond assombri, au lieu d'en basculer un au passage du trait. Le niveau
  annoncé reste celui du fichier, qui est ce qu'on télécharge. Le rideau ne
  touche plus à l'état du tout : glisser ne coûte aucun rendu.
- C'est un `input[type=range]`, pas un geste maison : les flèches, Origine et
  Fin y marchent sans une ligne de script. Le curseur fait deux pixels de large,
  sans quoi la valeur d'un `range`, qui se calcule sur la course du curseur,
  décalerait le trait de sa moitié au bord. La bande saisissable ne fait que
  quarante-quatre pixels de haut : plein cadre, elle prendrait le geste de
  défilement sur téléphone.
- Le fichier ne change toujours pas d'un octet, et la vérification le compare
  pour de bon.
- **Il est fluide, et ça n'allait pas de soi.** Une limite qui saute ne se juge
  pas. Trois corrections, mesurées au processeur bridé six fois : les maquettes
  d'écran sont mémoïsées, parce que `useAjustement` force un recalcul de mise en
  page sur ses cent vingt nœuds à chaque rendu ; les boîtes se déplacent par
  `transform` et non par `left` ni `clip-path` ; et les deux jetons de position
  sont posés sur les deux seules boîtes qui les lisent, jamais sur l'appareil,
  qui les aurait transmis à toute la maquette. Cinq millisecondes de recalcul de
  style par image et une image sur quatre perdue avant, moins de deux
  millisecondes et aucune tâche longue après. L'état React, lui, suit le geste
  sept fois par seconde et non soixante : l'image est en direct, le chiffre du
  verdict aussi, sans rendu intercalé entre deux images.

### Ajouté : les palettes qu'on écrit soi-même

- **De trois à six couleurs, un nom, douze palettes au plus**, gardées sur
  l'appareil et supprimables une à une. Onze palettes suffisent à faire un fond
  d'écran, elles ne suffisent pas à faire *le sien* : une marque a ses deux
  teintes, un écran OLED demande un noir vrai.
- **Le lien les emporte.** Une palette composée n'existe que sur l'appareil qui
  l'a composée ; sans ses teintes, le lien ouvrirait un autre motif chez la
  personne qui le reçoit. Son nom interne est l'empreinte de ses couleurs, si
  bien que les deux se vérifient l'un l'autre : une adresse dont l'empreinte ne
  correspond pas aux couleurs est refusée. Une palette reçue est utilisable tout
  de suite et n'est écrite nulle part tant qu'on ne l'a pas enregistrée.
- **L'éditeur montre le motif, pas trois carrés de couleur.** Il est dans le
  panneau, à sa place, et la vignette se redessine à chaque teinte recevable.
  Deux champs par couleur : le nuancier du système quand on cherche, les six
  chiffres quand on sait.
- Le moteur n'en connaît qu'un registre : `formes()` prend ses couleurs par un
  modulo et n'a jamais demandé un nombre fixe. Le rendu ne fait donc aucune
  différence entre une palette livrée et une palette écrite.

### Ajouté : quatre sorties de plus, et les trois appareils en une fois

- **PNG 2x, WebP, SVG, presse-papiers, et les trois appareils**, derrière un
  dépli attaché au bouton Télécharger. Elles ne servent pas la même chose, et
  chacune le dit en une ligne : le PNG doublé pour un écran qu'on ne connaît pas
  encore, le WebP pour envoyer, le SVG pour reprendre le motif ailleurs, le
  presse-papiers pour une conversation.
- **Le SVG ne recopie pas une ligne du moteur.** `formes()` ne connaît qu'un
  pinceau, et `src/lib/svg.ts` en fournit un second, qui note les tracés au lieu
  de les peindre : une famille ajoutée est exportable en vectoriel le jour même,
  et une primitive ajoutée sans être notée là-bas casse la compilation plutôt
  que de sortir un fichier faux. Le grain n'y passe pas, c'est une trame
  d'image, et la description du fichier le dit.
- **Les trois appareils partent en trois téléchargements**, pas en archive : un
  fichier compressé demanderait une bibliothèque embarquée pour un gain nul sur
  un téléphone où l'on ne sait pas l'ouvrir. Ils sont encodés en série, parce
  que trois canevas de plusieurs mégapixels alloués ensemble sont justement ce
  qu'un appareil modeste refuse.

### Changé : « Surprends-moi » rejoint la barre, les familles passent en onglets

- **Les deux tirages au sort sont côte à côte**, dans la barre, avec
  « Télécharger ». Ils répondent à la même question et on ne sait pas lequel on
  veut avant de voir ; les séparer, l'un dans la barre et l'autre à mille pixels
  plus bas, revenait à cacher la moitié du geste. Le primaire ne cède rien :
  sous 600 px les deux secondaires gardent leur pictogramme et rendent leur mot,
  qui reste dans leur nom accessible, et sous 360 px c'est le pictogramme du
  primaire qui cède, jamais son libellé.
- **Trente-deux familles en trois onglets.** À plat, dans une colonne étroite,
  « Vagues » et « Poissons » étaient à mille pixels l'un de l'autre : le coût
  n'était pas le défilement, c'était qu'on ne pouvait pas comparer deux motifs
  éloignés. Rien n'est caché pour autant : les trois onglets sont visibles
  ensemble et chacun porte le nombre de familles qu'il contient.
- **L'onglet ouvert est celui de la famille en cours.** C'est là qu'est la
  mémoire du dernier onglet, et elle vaut mieux qu'un réglage enregistré : elle
  est dans l'adresse, donc elle survit à un rechargement comme à un lien partagé
  sans rien écrire sur l'appareil.

### Ajouté : l'épingle dans « Derniers motifs »

- **Six épingles au plus, sur dix entrées.** Elles gardent celui qu'on a aimé
  pendant qu'on en regarde dix autres, tiennent la tête de la liste et ne
  tombent jamais. Les quatre places qui restent suffisent à voir passer les
  motifs : une liste qu'on épingle en entier cesserait d'être un historique.
- L'épingle porte sur le motif en cours, depuis un bouton en tête de carte : une
  épingle par vignette ferait vingt cibles à vingt pixels de côté, là où le
  produit n'en accepte aucune sous quarante-quatre. Elle n'attend pas les deux
  secondes et demie du passage, parce que c'est un geste et non un passage.

### Changé : la page d'accueil se manipule

- **Chaque écran de la présentation est un bouton.** Le toucher tire un autre
  motif, et une ligne sous les appels le dit plutôt que de le laisser deviner.
  C'est la démonstration la plus courte du produit, puisque c'est exactement ce
  que fait « Surprends-moi » dans l'outil.
- **Quinze rendus sur une page, ça se paie.** Aux toiles qui n'étaient peintes
  qu'à l'approche du champ de vision s'ajoutent deux précautions : on peint
  quand le fil principal est libre, et on descend à un pixel par point dès que
  l'appareil demande à économiser (`Save-Data`, ou le mouvement réduit). Sans la
  première, les toiles d'une même section devenaient visibles ensemble et se
  peignaient l'une derrière l'autre dans la même image, ce qui refaisait
  exactement le pic que le rendu différé cherchait à éviter.

### Corrigé : une bascule ne se dérobe plus sous le doigt

- **L'interrupteur du voile et l'épingle changeaient de place quand on les
  appuyait.** Trois causes réunies : le libellé change à chaque appui et sa
  largeur avec lui, la phrase voisine raccourcit, et « Effacer » apparaît à côté
  de l'épingle dès que la liste cesse d'être vide.
- Les deux mots occupent maintenant la même cellule, le bouton fait la largeur
  du plus long dans les deux langues, le texte voisin prend toute la place qui
  reste, et la bascule est le dernier élément de sa rangée. Le trait ne
  s'épaissit plus non plus à l'état enfoncé : la compensation par le rembourrage
  ne tient pas sur un trait d'un pixel et demi, que les navigateurs arrondissent
  selon la densité de l'écran. L'aplat inversé suffit, et les onglets de
  familles suivent la même règle.
- Une vérification relève la boîte des deux bascules avant et après l'appui, au
  dixième de pixel.

### Corrigé : la maquette d'écran retrouve sa hauteur toute seule

- La mémoïsation des maquettes a mis au jour un défaut plus ancien :
  `useAjustement` gardait sa signature dans une référence, si bien que la remise
  à plein ne provoquait aucun rendu quand le compte était déjà plein. La passe
  de mesure qui suit n'arrivait jamais d'elle-même, et la boucle ne devait sa
  convergence qu'aux rendus que le parent lui donnait par ailleurs. La grille
  dépassait de trois pixels sur un téléphone de 360 px. La signature est
  maintenant dans l'état, et la boucle se suffit à elle-même.

### Ajouté : un lien de soutien, dans le pied

- **Une tasse dessinée, pas une image de CDN.** Le bouton officiel de Ko-fi est
  servi par leur serveur ; la page ne fait aucune requête vers un tiers, et
  `tools/shot.mjs` le vérifie. Le pictogramme est donc dessiné en aplats, comme
  tous les autres.
- Il vit dans le pied des deux pages, à côté de la licence et de la source, et
  rien dans le produit ne le rappelle : ni bandeau, ni relance après un
  téléchargement, ni compteur. Aplat est gratuit, sans compte et sans pub, et le
  restera.

### Ajouté : la marque ramène chez soi, et le 4K se choisit d'un geste

- **La marque, en haut, est un lien vers « / ».** Depuis l'application, c'est
  sa seule sortie, et elle est là où tout le monde cherche une sortie. Depuis
  la présentation, elle ramène en haut de page au lieu d'ouvrir l'outil : la
  porte nommée le fait déjà, à droite, et une marque qui mène ailleurs que chez
  soi surprend pour rien. La langue et le thème
  traversent le lien dans ce sens comme dans l'autre : revenir ne coûte pas le
  choix qu'on vient de faire. La bande garde sa hauteur au pixel près, marges
  négatives à l'appui, et la cible reste à quarante-quatre pixels.
- **Le logo ne change plus de taille d'une page à l'autre.** Il vivait en deux
  exemplaires, trente-huit pixels de marque et trente-trois de mot dans
  l'application, trente et vingt-cinq dans l'enseigne de la présentation : on
  le voyait grossir en passant de « / » à « /app ». C'est la taille de
  l'enseigne qui l'emporte, parce que l'inverse ne tient pas à 320 px, où il ne
  reste que douze pixels entre le logo et les bascules. L'application y gagne
  huit pixels de bande, rendus aux réglages. Et il n'y a plus deux exemplaires :
  une seule règle pour la marque, une seule pour le mot.
- **Un préréglage 4K, 3 840 × 2 160.** Les quatre autres nomment un appareil,
  celui-ci nomme une taille, parce que c'est sous ce nom qu'on la demande.
  Le format était déjà atteignable, la saisie manuelle montant à 8 000 px, mais
  il n'était pas proposé, donc il ne se voyait pas. Rien n'y est agrandi : le
  motif est recalculé à ces pixels-là, comme la vignette et comme le fichier de
  l'appareil, et un 4K pèse entre 0,4 et 1,7 Mo.

### Ajouté : quatorze familles de plus, et un troisième groupe

- **Trente-deux familles au lieu de dix-huit.** Sept abstraites où une grille
  porte le motif, là où les douze premières sèment des formes sur un aplat :
  Arcade, la marque en colonnade ; Truchet, dont les quarts de disque
  se raccordent en chemins que personne n'a tracés ; Azulejos ; Vitrail ;
  Persiennes ; Mosaïque ; Tresse. Quatre figures : Agrumes, Palmes, Vases,
  Poissons.
- **Un troisième groupe, Paysages** : Sommets, Horizon, Nuages. Elles ont un
  haut et un bas, ce qui les sépare des abstraits, et ce qui les rend commodes
  en fond d'écran : la grille d'icônes tombe dans leur partie basse, et la
  sonde de lisibilité y trouve un aplat plutôt qu'un motif. Le groupe a sa
  marque, une ligne de crête, comme les deux autres ont l'arche et la goutte.
- **Rien n'y est en pixels.** Toutes se rapportent au petit côté, donc la
  vignette et le fichier 4K sont le même dessin. Les deux planchers qui
  subsistent, sur le joint de Mosaïque et le filet d'Horizon, sont relatifs et
  commentés là où ils se lisent.
- **Les fichiers restent légers** : médiane inchangée à 0,43 Mo, maximum monté
  de 0,98 à 1,04 Mo, tenu par Azulejos en densité dense, dont le carrelage
  remplit la page de courbes.
- **Quatre familles ignorent leur graine**, et le disent maintenant : Écailles,
  Arcade, Azulejos et Tresse sont des pavages entièrement réguliers, sans un
  seul tirage. « Variante » ne change rien dessus, il faut passer par la
  palette, la densité ou une autre famille. Un contrôle fige la liste, pour
  qu'une cinquième ne s'y ajoute pas sans qu'on le sache.

### Ajouté : une page d'accueil, sur « / »

- **Le projet a une porte d'entrée.** `/` présente Aplat, `/app` le fait
  tourner. La présentation n'est pas une deuxième section de l'application :
  c'est un autre document, et l'écran unique reste unique.
- **Aucune capture d'écran.** Chaque image de la page sort du moteur, au
  chargement, dans le navigateur qui la lit : la maquette de téléphone du haut,
  les douze motifs de la galerie, choisis comme la maquette les choisit, la maquette de bureau et la comparaison du
  voile de lisibilité. La maquette vient du même fichier que celle de
  l'application, et les couleurs de ses libellés de la même sonde. Rien n'y
  promet donc un rendu que l'application ne donnerait pas, et il n'y a aucune
  image à tenir à jour.
- **La résolution de ton écran est annoncée sur la page**, avant même d'ouvrir
  l'outil : c'est une mesure vraie, faite sur l'appareil qui lit, et elle dit
  mieux qu'une phrase que rien n'est à saisir.
- **Deux boutons dans l'enseigne : la langue et le thème.** Ils sont en haut et
  restent épinglés, parce que quelqu'un qui arrive sur une page dans une langue
  qu'il ne lit pas doit trouver la bascule avant le premier paragraphe. Chacun
  montre ce qu'un appui donnera, jamais l'état où l'on est. Le lien vers
  l'application les emporte : personne ne choisit sa langue deux fois.
- **Touche un motif de la galerie pour relancer sa graine.** C'est la seule
  chose qui bouge sur la page, et elle ne bouge que sur demande.
- **Les liens partagés du temps où l'application vivait à la racine continuent
  d'ouvrir leur motif** : `/?m=vagues&…` est reconduit vers `/app` avec sa
  requête intacte. Une porte d'entrée ne devait rien coûter à ce qui avait déjà
  été envoyé à quelqu'un.
- **L'application installée s'ouvre sur l'outil**, pas sur sa présentation : le
  manifeste démarre sur `/app`, dans une portée qui reste la racine. Son
  identifiant n'a pas bougé, les installations existantes ont donc suivi au
  lieu de se dédoubler.

### Ajouté : un seul écran, et l'aperçu ne le quitte jamais

- **Un seul écran, et l'aperçu ne le quitte jamais.** Le motif s'affiche dans
  une maquette de téléphone, avec l'heure, un widget et une grille d'icônes
  factices : on juge la lisibilité réelle avant de télécharger, pas après.
  L'aperçu est épinglé dans sa colonne et les réglages défilent à côté de lui,
  sur téléphone comme sur ordinateur. Sur une fenêtre couchée et basse,
  l'en-tête se resserre et la barre d'action passe en variante compacte, pour
  que l'aperçu entier, dock compris, tienne au-dessus d'elle.
- **Deux colonnes dès 360 px.** L'aperçu à gauche, les réglages à droite, les
  deux visibles en même temps, y compris sur un téléphone. Il n'est plus devant
  ce qu'on choisit mais à côté : les grilles disposent de plus des trois quarts
  de la hauteur de l'écran, au lieu d'un tiers. Dans la colonne étroite, les
  rembourrages se resserrent et les libellés prennent la césure de la langue ;
  les cibles restent à 44 px.
- **L'en-tête reste à l'écran.** La marque, le mot et la résolution visée
  tiennent sur une ligne épinglée en haut, sous six barres de la palette qui
  font office de filet : on sait toujours quelle image on est en train de
  fabriquer, et pour quel écran.
- **Sous 360 px, où deux colonnes ne tiennent plus, l'aperçu se replie en
  vignette dès qu'on défile**, et le verdict de lisibilité passe sur une ligne,
  dépliable au doigt. L'aperçu se déplie en remontant. Le verdict se condense
  aussi partout où sa colonne est trop étroite pour son détail.
- **Le panneau ne contient que ce qui agit sur l'image.** Langue et thème sont
  dans le pied de page, à côté de la version et du lien vers la source : ils ne
  changent que l'affichage, pas le fichier téléchargé.
- **Trois réglages, pas un de plus** : famille de motif (trente-deux, réparties
  en abstraits, paysages et figures), palette (onze) et densité (trois). Chaque famille
  montre sa propre vignette, calculée avec la palette et la densité courantes.
  Leur nom revient à la ligne plutôt que de s'élider : « Marguerites » tronqué
  en « Margueri… » ne nomme plus rien.
- **Deux raccourcis de hasard, aux effets distincts.** « Variante », dans la
  barre, redessine le même motif avec une autre graine. « Surprends-moi », dans
  la carte Famille, tire aussi une famille et une palette, jamais celles qui
  sont déjà à l'écran. La densité ne bouge dans aucun des deux : c'est un goût,
  pas un motif.
- **Les dix derniers motifs reviennent d'un appui.** Une carte de vignettes,
  sous la densité, garde ce qu'on a regardé et le rend d'un geste. Les
  vignettes ne sont pas enregistrées, elles sont recalculées : le rendu est
  déterministe, quatre réglages y suffisent.
- **La résolution est détectée**, pas demandée. Elle reste modifiable, avec
  trois préréglages et une saisie libre entre 16 et 8000 px. La maquette prend
  la forme de l'appareil visé : téléphone, tablette ou ordinateur, déduits du
  rapport d'aspect.
- **Le verdict de lisibilité est affiché en permanence** : le rapport de
  contraste mesuré, la couleur de libellé retenue, la force du voile appliqué,
  et une phrase qui dit quoi faire s'il est juste. Il n'affiche rien tant qu'il
  n'a rien mesuré, parce qu'une application qui promet de mesurer n'affiche pas
  un chiffre de repli. Le qualificatif tient à trois bandes nommées, avec leur
  forme : bonne au-dessus de 4,5:1, le seuil AA du petit texte qu'est un
  libellé d'icône ; juste entre 3:1 et 4,5:1 ; insuffisante en dessous.
- **Un aperçu assombri, sur demande.** Une bascule simule le fond d'écran tel
  qu'un thème sombre l'assombrit, et le verdict se recalcule pour cette
  condition : un libellé clair y gagne, un libellé sombre y perd. Le fichier
  téléchargé ne change pas, et le détail le dit.
- **Un seul appel primaire** : Télécharger. Le bouton dit ensuite les dimensions
  produites, le format, le poids réel du fichier, et le geste qui fait passer de
  « téléchargé » à « dans la pellicule ».

### Ajouté : un rendu déterministe, et des fichiers légers

- **Le rendu est déterministe.** Le quadruplet (famille, palette, densité,
  graine) donne toujours la même image, à n'importe quelle résolution. L'aperçu
  et le fichier sont le même dessin à deux échelles : le canevas d'aperçu porte
  le rapport d'aspect exact du fichier visé, et la lisibilité est mesurée sur
  les dimensions d'export.
- **Un voile de lisibilité, seulement s'il sert.** Le moteur mesure la luminance
  de la zone des icônes, choisit la couleur de libellé la plus sûre, puis pousse
  le fond vers elle juste ce qu'il faut pour tenir.
- **Des fichiers légers et nets au zoom.** Médiane de 0,43 Mo et maximum de
  1,04 Mo sur les 1 056 combinaisons en 1179 × 2556, contre 0,94 et 2,33 avant
  réglage. Le voile est peint en bandes plutôt qu'en dégradé, le grain est un
  mouchetis d'un pixel d'appareil, les vagues sont échantillonnées assez fin
  pour un écran 4K et les cellules de la trame calées sur des bornes entières.

### Ajouté : rien ne sort de l'appareil, et ce qui y reste est nommé

- **Une seule chose est enregistrée** : les dix derniers motifs regardés,
  quatre réglages chacun, dans le stockage local du navigateur. Ni image, ni
  horodatage, ni identifiant, ni URL, ni compteur de visites. Deux cents octets
  pour cinq entrées, un bouton pour tout effacer, et un motif n'y entre
  qu'après être resté deux secondes et demie à l'écran. Ni compte, ni cookie,
  ni base indexée par ailleurs ; les réglages du motif affiché, eux, tiennent
  dans l'URL.
- **Rien n'est envoyé.** La politique de sécurité du document coupe `fetch`,
  XHR, WebSocket, EventSource et `sendBeacon` ; les polices sont auto-hébergées,
  parce qu'un appel à un CDN transmet une adresse IP.
- **Un lien porte le motif, rien d'autre.** La résolution détectée n'y figure
  pas : c'est une mesure de l'appareil, pas un réglage, et son absence sert
  mieux le destinataire. Quand le presse-papiers refuse, le lien est proposé à
  copier à la main plutôt qu'annoncé copié.

### Ajouté : installable, et utilisable hors ligne

- **L'application s'installe** et fonctionne sans réseau : motif, vignettes,
  polices et téléchargement compris. Le cache ne contient que les fichiers de
  l'application ; aucun réglage, aucune image produite.
- **Une mise à jour se propose, elle ne s'impose pas.** L'application prévient
  qu'une version est prête et attend une décision : recharger sous les doigts
  ferait perdre le motif en cours. Le refus est offert aussi franchement que
  l'acceptation.

### Ajouté : l'accessibilité comme plancher, pas comme option

- Contrastes tenus dans les deux thèmes et les deux langues : 4,5:1 pour le
  texte, 3:1 pour les éléments d'interface et les formes porteuses de sens.
- **L'information ne passe jamais par la seule couleur.** En niveaux de gris,
  tout reste lisible : la sélection est un aplat inversé, la densité un nombre
  de points, la lisibilité trois formes distinctes, l'erreur un triangle.
- Cibles tactiles de 44 px, actions fréquentes dans la zone du pouce, focus
  visible et jamais masqué par les trois couches collantes.
- Les cinq groupes de réglages sont de vrais groupes radio, et l'historique une
  barre d'outils : seize arrêts de tabulation en tout, historique plein
  compris, là où les puces seules en feraient une soixantaine.
- `prefers-reduced-motion` respecté.

### Ajouté : une marque, et une forme qui la répète

- **L'arche est la marque** : un aplat lime sur navy, mordu à sa base par une
  seconde arche. Elle sert d'icône d'application, de favicon, de repère devant
  chaque titre de section, et elle dit la place vide de l'image tant qu'il n'y
  a pas de résolution.
- **Aucun coin n'a le même rayon en haut et en bas.** Cartes, boutons, champs,
  notes et le bloc de réglages entier sont dessinés comme des arches : large en
  haut, presque droit en bas, dans un rapport constant. C'est ce qui donne à la
  page sa silhouette, plus sûrement qu'un rayon uniforme.

### Ajouté : deux langues, à parité stricte

Français et anglais, à parité stricte. Les gabarits laissent 30 % de marge,
vérifié en allongeant chaque libellé d'autant sur huit largeurs.
