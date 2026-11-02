# Courants, rubans et sillage

Trois variantes dans l'onglet Abstraits : Courants dessine des lignes fines,
Rubans des bandes épaisses et Sillage des lignes interrompues. Le catalogue
compte désormais 83 motifs en huit groupes, chacun avec vingt familles au plus.
Méandres rejoint les pavages avec Truchet : ses rubans se raccordent sur une
maille répétée. Les abstraits restent ainsi sous le plafond sans ajouter de
rangée à la navigation sur téléphone.

Le geste suit l'essai [Flow Fields de Tyler Hobbs](https://www.tylerxhobbs.com/words/flow-fields).
Le champ propre à Aplat combine une déformation sinusoïdale orientée et quatre
lentilles locales, toutes déterminées par la graine. Les angles sont interpolés
sur une grille ; une intégration au point milieu suit leur direction dans les
deux sens depuis chaque départ.

Les départs sont dispersés sur une grille bousculée puis visités dans un ordre
déterministe. Une grille de voisinage arrête un trait avant ses voisins et
avant ses propres retours. Les traits trop courts libèrent leur place. Chaque
courbe porte une seule couleur de la palette, y compris dans ses pointillés.
Le corridor des pointillés reste réservé sur les portions non peintes.

L'espacement, l'épaisseur et le pas se mesurent au petit côté. Aucune décision
ne dépend du nombre de pixels : le dessin reste le même entre aperçu et
export de même rapport. La distance testée inclut un pas supplémentaire pour
protéger aussi l'intérieur des segments, puis l'épaisseur laisse une bande de
fond visible entre les surfaces. Les trois densités resserrent le réseau.
Les formats extrêmes élargissent la maille pour borner le nombre de départs.

Le rendu reprend `ruban()` de `trace.ts`, sans ajouter de primitive au pinceau.
PNG, WebP, SVG, voile, version sombre et tirages empruntent le circuit existant.
La page `/moteur` présente aussi ce geste dans les deux langues.

## Vérification visuelle et mesures

`npm run build` puis `node tools/courants.mjs` produisent une planche des 33
aperçus derrière les vraies icônes, leurs PNG et trois détails natifs. Les
sorties restent dans `.exports/courants/`, hors livraison.

Sur Chromium, graine 7314, densité moyenne, 1179 × 2556, les onze palettes donnent :

| Variante | Poids PNG | Temps de dessin observé |
|---|---|---|
| Courants | 0,69 à 0,93 Mo | 104 à 116 ms |
| Rubans | 0,55 à 0,80 Mo | 74 à 108 ms |
| Sillage | 0,56 à 0,81 Mo | 119 à 206 ms |

Les Mo sont calculés sur 1 048 576 octets. Les temps incluent la sonde et les
finitions ; ils ont été relevés pendant la suite navigateur et ne constituent
pas un budget de performance mobile. Les détails de 400 × 400 sont des
prélèvements sans redimensionnement : les courbes restent lisses et les bouts
ronds sans couture visible à cette échelle.

La palette Ciel reste au niveau « juste » : 3,46 à 3,63:1 selon la variante.
L'interface affiche la mesure réelle, comme pour les autres motifs. Les dix
autres palettes dépassent 4,5:1 dans cet échantillon.

Les tests unitaires couvrent le déterminisme, les listes blanches, le groupe,
la densité, la conservation des coordonnées relatives, les onze palettes en
SVG et la distance exacte entre segments aux trois densités, en fin et épais.
