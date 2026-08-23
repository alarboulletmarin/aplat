# Journal des versions

Écrit à la main, dans la voix du projet : ce que chaque version change pour la
personne qui utilise l'application, pas quels fichiers ont bougé. Les dates sont
celles de la publication.

## Non publié

Première version. Aplat répond à une question : **à quoi ressemblera ce fond
d'écran derrière mes icônes ?**

### Ajouté : un seul écran, et l'aperçu ne le quitte jamais

- **Un seul écran, et l'aperçu ne le quitte jamais.** Le motif s'affiche dans
  une maquette de téléphone, avec l'heure, un widget et une grille d'icônes
  factices : on juge la lisibilité réelle avant de télécharger, pas après. Sur
  téléphone l'aperçu est épinglé en haut et les réglages défilent dessous ; sur
  ordinateur les deux sont côte à côte. Sur une fenêtre couchée et basse,
  l'en-tête se replie et la barre d'action passe en variante compacte, pour que
  l'aperçu entier, dock compris, tienne au-dessus d'elle.
- **L'aperçu se replie en vignette dès qu'on défile**, et le verdict de
  lisibilité passe sur une ligne, dépliable au doigt. Sur un iPhone en
  portrait, les grilles de motifs disposent alors de 58 % de la hauteur au lieu
  de 37 %. L'aperçu se déplie en remontant.
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

### Ajouté : rien ne sort de l'appareil, rien n'y est enregistré

- **Rien n'est enregistré** : ni compte, ni cookie, ni stockage local, ni base
  indexée. Les réglages tiennent dans l'URL, et rien d'autre ne survit à la
  fermeture de l'onglet.
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
  visible et jamais masqué par les deux barres collantes.
- Les cinq groupes de réglages sont de vrais groupes radio : le parcours clavier
  passe de 42 arrêts à 11.
- `prefers-reduced-motion` respecté.

### Ajouté : deux langues, à parité stricte

Français et anglais, à parité stricte. Les gabarits laissent 30 % de marge,
vérifié en allongeant chaque libellé d'autant sur huit largeurs.
