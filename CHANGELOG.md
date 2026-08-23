# Journal des versions

Écrit à la main, dans la voix du projet : ce que chaque version change pour la
personne qui utilise l'application, pas quels fichiers ont bougé. Les dates sont
celles de la publication.

## Non publié

Première version. Aplat répond à une question : **à quoi ressemblera ce fond
d'écran derrière mes icônes ?**

### Ajouté : une page d'accueil, sur « / »

- **Le projet a une porte d'entrée.** `/` présente Aplat, `/app` le fait
  tourner. La présentation n'est pas une deuxième section de l'application :
  c'est un autre document, et l'écran unique reste unique.
- **Aucune capture d'écran.** Chaque image de la page sort du moteur, au
  chargement, dans le navigateur qui la lit : la maquette de téléphone du haut,
  les douze motifs de la galerie, la maquette de bureau et la comparaison du
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
- **Trois réglages, pas un de plus** : famille de motif (dix-huit, réparties
  en abstraits et figures), palette (onze) et densité (trois). Chaque famille
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
- **Des fichiers légers et nets au zoom.** Médiane de 0,42 Mo et maximum de
  0,98 Mo sur les 594 combinaisons en 1179 × 2556, contre 0,94 et 2,33 avant
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
