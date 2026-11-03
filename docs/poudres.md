# Poudre, lames et lin

Trois matières venues de fonds d'affiches typographiques : une masse d'encre
pulvérisée, des traînées de grain, un dégradé sous une toile. Elles vivent dans
`src/lib/poudres.ts` et se rangent chez les matières.

## Le semis

Poudre et Lames partagent un geste. Une grille de grains carrés, de côté
`unite / finesse`, couvre le cadre. Un champ lisse dit, en chaque grain, quelle
part du papier l'encre couvre, et le grain est tiré contre lui par un hachage
de sa position (`hacher(c, r, cle)`).

- **Bruit blanc, pas de Bayer.** Aurore et Trame utilisent un seuil ordonné,
  qui dessine une grille. Ici le tirage est indépendant d'un grain à l'autre :
  c'est ce qui donne l'aspect de l'aérographe et du toner.
- **Que l'encre et le papier.** Aucun grain n'est mélangé ni transparent : le
  fichier, SVG compris, ne contient que des couleurs de la palette. Un test le
  vérifie sur toutes les palettes.
- **Par position.** Rien n'est tiré dans une boucle dont le compte dépend du
  format : un cadre plus haut ajoute des rangées sans changer les autres.
- **Finesse.** 230, 300 ou 380 grains au petit côté pour Poudre, 190, 260 ou
  340 pour Lames. À 1179 px de large, un grain de densité moyenne fait 4 px.
- **Poids.** Les grains voisins d'une même couleur sur une rangée fusionnent
  en un rectangle, et les rectangles sont posés par paquets de deux mille par
  chemin. Un seul chemin de cent mille rectangles coûtait 1,9 s au canevas ;
  les paquets le ramènent à 0,3 à 0,65 s, sonde comprise. Les bords sont calés
  sur des pixels entiers, faute de quoi le lissage laisserait un liseré entre
  deux rangées pleines.

### Poudre

La masse vient d'un bord, le bas plus d'une fois sur deux, légèrement de
biais. Son bord est une crête : deux octaves de bruit le long de l'axe. La
couverture monte de rien à 93 % sur une large frange, modulée par des nappes
plus ou moins chargées ; même au coeur, quelques grains de papier restent.

### Lames

Trois à six lames empilées partent du même bord du cadre, horizontales trois
fois sur quatre. Chacune a une ligne pleine d'un grain à son bord net, et sa
couverture décroît en s'éloignant de lui ; sa hauteur décroît jusqu'à la
pointe. Les longueurs croissent ou décroissent d'une lame à l'autre.

## Lin

Le lin ne sème pas. Il pose un dégradé entre les deux couleurs les plus
proches de la palette (entre deux teintes opposées, le milieu d'une rampe
tourne au gris), en 96 bandes de transparence croissante le long d'un axe
proche de la verticale, puis un halo rond très léger de la couleur la plus
claire.

Par-dessus, la toile : des fils horizontaux et verticaux à intervalle régulier
(120, 160 ou 200 au petit côté), découpés en tronçons de longueur tirée.
Chaque tronçon prend l'un de cinq états, rien, clair, très clair, sombre ou
très sombre, avec la plus claire et la plus sombre couleur de la palette à 3,5
à 14 % d'opacité. La toile prend ainsi la couleur de ce qu'elle recouvre, et
masque les marches du dégradé.

## Mesures

Sur Chromium, 1179 × 2556, densité moyenne, sonde comprise :

| Famille | Temps de dessin observé | SVG, densités 0 à 2 |
|---|---|---|
| Poudre | 0,3 à 0,65 s | 0,5 à 1,5 Mo |
| Lames | 0,1 à 0,2 s | 0,05 à 0,4 Mo |
| Lin | 0,55 à 0,6 s | 1 à 1,9 Mo |

Ces temps ont été relevés sur une machine de bureau ; ils ne constituent pas
un budget mobile. Le grain très fin déclenche souvent le voile de lisibilité,
puisqu'un semis dense est un fond chargé derrière des libellés.
