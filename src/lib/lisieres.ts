// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les lisières : la façon dont chaque geste s'arrête pour laisser la place de
 * l'heure.
 *
 * Sur un écran de verrouillage, le motif ne monte pas jusqu'en haut du cadre :
 * il laisse le tiers supérieur au fond, et les chiffres s'y posent. Reste à
 * savoir **où il s'arrête**, et c'est toute la question.
 *
 * Une horizontale est un effacement. On y lit une image coupée et un blanc
 * rapporté par-dessus, quel que soit le mécanisme qui l'a produite. Une courbe
 * unique appliquée aux soixante-dix-neuf familles n'est guère mieux : elle
 * devient une signature qui n'appartient à aucune d'elles, la même vague molle
 * posée aussi bien sur un damier que sur une houle, et elle se lit comme un
 * gabarit. C'était le premier essai, et c'était le défaut.
 *
 * La lisière appartient donc au geste. Une fracture s'arrête sur une arête de
 * plaque, parce que c'est ce qu'une plaque fait. Un carreau s'arrête sur des
 * cases entières, en marches, parce qu'une grille ne connaît pas le milieu
 * d'une case. Une coulée s'arrête sur ses propres arcs épais, une ligne de
 * niveau sur une courbe de niveau, un relief sur une marche isométrique, un
 * réseau sur des angles droits. Quinze gestes, quinze façons de finir, et
 * chacune tirée de la graine : deux motifs d'un même geste n'ont pas la même
 * lisière.
 *
 * **Le contrat.** Une lisière est une polyligne qui traverse l'image de gauche
 * à droite, et son ordonnée reste entre `HAUTE` et `BASSE`. La borne haute est
 * ce qui garantit la place des chiffres : la sonde mesure au dessus d'elle, et
 * rien ne doit y monter. La borne basse évite qu'un geste bavard ne mange la
 * moitié du fond d'écran. Entre les deux, chaque geste fait ce qu'il veut, y
 * compris des sauts verticaux : c'est une polyligne, pas une fonction.
 */
import { estCarreau } from './carreaux'
import { estChimie } from './chimie'
import { estCoulee } from './coulees'
import { estFracture } from './fractures'
import { estGrammaire } from './grammaires'
import { estLieu } from './lieux'
import { estMesure } from './mesures'
import type { Alea, IdFamille } from './moteur'
import { estNiveau } from './niveaux'
import { estPavage } from './pavages'
import { estReseau } from './reseaux'
import { estRelief } from './reliefs'
import { estReserve } from './reserves'
import { estSurimpression } from './surimpression'
import { estTrame } from './trames'
import { bruiteur, hacher, type Point } from './trace'

/**
 * Les deux bornes, en parts de la hauteur.
 *
 * `HAUTE` est la seule des deux qui soit un engagement : le cadre du motif
 * commence là, la sonde mesure au dessus, et une lisière qui la franchirait
 * poserait le motif sous les chiffres. `BASSE` n'est qu'une convenance.
 */
export const HAUTE = 0.29
export const BASSE = 0.47

/** L'ordonnée ramenée entre les deux bornes. */
function borner(y: number, H: number): number {
  return Math.max(H * HAUTE, Math.min(H * BASSE, y))
}

/**
 * Une lisière donnée par une fonction de l'abscisse, échantillonnée assez
 * finement pour rester lisse à 4K.
 *
 * Les gestes qui montent par marches ne passent pas par ici : une marche est
 * un saut vertical, qu'aucune fonction de l'abscisse ne sait rendre.
 */
function echantillonner(W: number, H: number, y: (t: number) => number, pas = 240): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= pas; i += 1) {
    const t = i / pas
    points.push([t * W, borner(y(t), H)])
  }
  return points
}

/* ---------- les quinze façons de finir --------------------------------------- */

/**
 * Les aplats : une crête molle, celle des formes semées.
 *
 * C'est le geste d'origine, celui qui pose des formes libres sur un fond, et sa
 * lisière est la seule qui n'imite rien : deux harmoniques et rien d'autre. Elle
 * fait le ciel des vagues, des dunes et de l'horizon, où elle ne rogne rien
 * parce que ces familles ont déjà un haut vide, et le bord supérieur des
 * autres.
 */
function creteMolle(W: number, H: number, rnd: Alea): Point[] {
  const phase = rnd() * Math.PI * 2
  const periode = 1 + Math.floor(rnd() * 2)
  const creux = H * 0.075
  return echantillonner(W, H, (t) =>
    H * 0.37
    + Math.sin(phase + t * Math.PI * 2 * periode) * creux * 0.72
    + Math.sin(phase * 1.7 + t * Math.PI * 2 * periode * 2) * creux * 0.28)
}

/**
 * La fracture : une arête de plaque, faite de segments droits.
 *
 * Une plaque ne se termine pas en courbe, elle se termine en cassures : on tire
 * donc quelques sommets et on les joint à la règle. C'est exactement ce que la
 * banquise dessine entre deux plaques, et le kintsugi le long d'une fissure.
 */
function areteBrisee(W: number, H: number, rnd: Alea): Point[] {
  const sommets = 4 + Math.floor(rnd() * 3)
  const points: Point[] = []
  for (let i = 0; i <= sommets; i += 1) {
    points.push([(i / sommets) * W, borner(H * (0.31 + 0.13 * rnd()), H)])
  }
  return points
}

/**
 * Le carreau : des cases entières, en marches.
 *
 * Une grille ne connaît pas le milieu d'une case, et sa lisière non plus. La
 * hauteur choisie pour une colonne vaut donc un nombre entier de cases, et le
 * passage d'une colonne à l'autre est un saut vertical franc. C'est la seule
 * lisière qui ne soit pas continue, et c'est ce qui la rend reconnaissable.
 */
function marchesDeCases(W: number, H: number, rnd: Alea): Point[] {
  const colonnes = 5 + Math.floor(rnd() * 3)
  const cote = W / colonnes
  const crans = 3
  const points: Point[] = []
  for (let c = 0; c < colonnes; c += 1) {
    const cran = Math.floor(rnd() * (crans + 1))
    const y = borner(H * (0.31 + (cran / crans) * 0.13), H)
    points.push([c * cote, y], [(c + 1) * cote, y])
  }
  return points
}

/**
 * La coulée : une file d'arcs épais, comme ceux du ruban.
 *
 * Le geste ne connaît que le demi-cercle, et sa lisière est une suite de
 * demi-cercles alternés : un feston. Deux tuiles voisines s'y raccordent comme
 * elles se raccordent dans le motif.
 */
function festonDArcs(W: number, H: number, rnd: Alea): Point[] {
  const arcs = 3 + Math.floor(rnd() * 3)
  const sens = rnd() < 0.5 ? 1 : -1
  const rayon = H * 0.055
  return echantillonner(W, H, (t) => {
    const u = t * arcs
    const rang = Math.floor(u)
    const dedans = (u - rang) * 2 - 1
    const bombe = Math.sqrt(Math.max(0, 1 - dedans * dedans))
    return H * 0.37 + bombe * rayon * (rang % 2 === 0 ? sens : -sens)
  })
}

/**
 * La ligne de niveau : une courbe de niveau, et il n'y avait rien d'autre à
 * chercher.
 *
 * Le geste découpe un relief en paliers ; sa lisière est un de ces paliers,
 * tiré du même bruit lisse. C'est la seule des quinze qui soit littéralement le
 * motif : si on prolongeait le fond d'écran vers le haut, cette courbe serait
 * l'une de ses lignes.
 */
function courbeDeNiveau(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  const echelle = 2.2 + rnd()
  return echantillonner(W, H, (t) =>
    H * 0.31 + bruit(t * echelle, 0.5 + rnd() * 0) * H * 0.14)
}

/**
 * La réserve : un bord percé.
 *
 * Le geste est celui du claustra et du papel picado, un panneau dans lequel on
 * découpe. Sa lisière est donc droite, et mordue de percements ronds à
 * intervalle régulier : le bas d'un panneau ajouré.
 */
function bordPerce(W: number, H: number, rnd: Alea): Point[] {
  const trous = 5 + Math.floor(rnd() * 4)
  const rayon = H * 0.045
  const fond = H * 0.34
  return echantillonner(W, H, (t) => {
    const u = t * trous
    const dedans = (u - Math.floor(u)) * 2 - 1
    const part = Math.max(0, 1 - Math.abs(dedans) * 1.6)
    return fond + Math.sqrt(Math.max(0, 1 - (1 - part) ** 2)) * rayon
  })
}

/**
 * La réaction : un front de culture.
 *
 * Deux substances qui se consomment ne laissent pas un bord régulier, elles
 * laissent une frontière digitée, molle à grande échelle et frisée à petite.
 * Deux bruits d'échelles différentes suffisent à la dire.
 */
function frontDeCulture(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const large = bruiteur(cle)
  const fin = bruiteur(cle + 1)
  return echantillonner(W, H, (t) =>
    H * 0.33 + large(t * 2.4, 0.3) * H * 0.09 + fin(t * 11, 0.7) * H * 0.035)
}

/**
 * Le pavage apériodique : un zigzag d'arêtes de triangles.
 *
 * Des segments droits, mais d'un pas irrégulier et d'angles pris dans un jeu
 * fini : ce n'est ni une brisure au hasard comme la fracture, ni une marche
 * comme le carreau, c'est la ligne que suit le bord d'un pavage de Penrose.
 */
function zigzagDOr(W: number, H: number, rnd: Alea): Point[] {
  const dents = 6 + Math.floor(rnd() * 4)
  const haut = H * 0.31
  const bas = H * 0.42
  const points: Point[] = []
  for (let i = 0; i <= dents; i += 1) {
    points.push([(i / dents) * W, borner(i % 2 === 0 ? haut : bas, H)])
  }
  return points
}

/**
 * La gravure tramée : un bord en demi-teintes.
 *
 * Le geste ne connaît que des points de trame ; son bord n'est donc pas une
 * ligne mais une densité qui tombe. Faute de pouvoir rendre une densité avec
 * une polyligne, la lisière prend des paliers courts et irréguliers, à la
 * hauteur d'un point de trame : de loin, c'est un bord qui s'effrite.
 */
function bordEffrite(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const paliers = 22 + Math.floor(rnd() * 10)
  const points: Point[] = []
  for (let i = 0; i < paliers; i += 1) {
    const y = borner(H * (0.32 + hacher(i, 0, cle) * 0.1), H)
    points.push([(i / paliers) * W, y], [((i + 1) / paliers) * W, y])
  }
  return points
}

/**
 * La trame déformée : une sinusoïde franche.
 *
 * Le geste est celui de l'interférence, et l'interférence est une somme de
 * sinus. Sa lisière en est un seul, d'une période courte et d'une amplitude
 * nette : la seule des quinze qui assume d'être une onde régulière.
 */
function ondeReguliere(W: number, H: number, rnd: Alea): Point[] {
  const periode = 2 + Math.floor(rnd() * 3)
  const phase = rnd() * Math.PI * 2
  return echantillonner(W, H, (t) =>
    H * 0.37 + Math.sin(phase + t * Math.PI * 2 * periode) * H * 0.07)
}

/**
 * Le réseau : des angles droits et des quarante-cinq degrés.
 *
 * Un plan de métro ne tourne qu'à angle fixe, et sa lisière non plus. Elle
 * avance à l'horizontale, monte ou descend en diagonale, repart à
 * l'horizontale : c'est le tracé d'une ligne sur un plan.
 */
function traceDeLigne(W: number, H: number, rnd: Alea): Point[] {
  const segments = 5 + Math.floor(rnd() * 3)
  const pas = W / segments
  const points: Point[] = []
  let y = H * (0.33 + 0.06 * rnd())
  let x = 0
  points.push([x, borner(y, H)])
  for (let i = 0; i < segments; i += 1) {
    const plat = pas * (0.45 + 0.3 * rnd())
    x += plat
    points.push([x, borner(y, H)])
    const monte = (rnd() < 0.5 ? -1 : 1) * H * 0.045
    const diagonale = Math.min(pas - plat, Math.abs(monte))
    y += Math.sign(monte) * diagonale
    x += diagonale
    points.push([Math.min(W, x), borner(y, H)])
  }
  points.push([W, borner(y, H)])
  return points
}

/**
 * La grammaire : un bord folié.
 *
 * Une règle appliquée à son propre résultat donne des folioles le long d'un
 * axe ; la lisière en pose une file, chacune un peu plus courte que sa voisine
 * puis la série repart. C'est le bord d'une fronde.
 */
function bordFolie(W: number, H: number, rnd: Alea): Point[] {
  const folioles = 7 + Math.floor(rnd() * 5)
  const decalage = rnd()
  return echantillonner(W, H, (t) => {
    const u = t * folioles + decalage
    const rang = Math.floor(u)
    const dedans = u - rang
    const taille = 0.55 + 0.45 * ((rang % 3) / 2)
    return H * 0.33 + Math.sin(dedans * Math.PI) * H * 0.085 * taille
  })
}

/**
 * Le relief : une marche isométrique.
 *
 * Le geste montre du volume en aplats, et son bord est celui d'un empilement de
 * cubes vu de trois quarts : des paliers horizontaux joints par des obliques
 * toutes de la même pente. C'est la seule lisière dont l'angle est fixe.
 */
function marcheIsometrique(W: number, H: number, rnd: Alea): Point[] {
  const paliers = 4 + Math.floor(rnd() * 3)
  const pas = W / paliers
  const pente = H * 0.055
  const points: Point[] = []
  let y = H * (0.32 + 0.05 * rnd())
  let x = 0
  points.push([0, borner(y, H)])
  for (let i = 0; i < paliers; i += 1) {
    x += pas * 0.62
    points.push([x, borner(y, H)])
    y += (i % 2 === 0 ? 1 : -1) * pente
    x += pas * 0.38
    points.push([Math.min(W, x), borner(y, H)])
  }
  points.push([W, borner(y, H)])
  return points
}

/**
 * La mesure : une graduation.
 *
 * Un instrument ne s'arrête pas n'importe où, il s'arrête sur un trait. La
 * lisière est donc une règle : un palier long, et de courtes dents à intervalle
 * régulier, une sur cinq plus longue que les autres comme sur toute graduation.
 */
function graduation(W: number, H: number, rnd: Alea): Point[] {
  const traits = 18 + Math.floor(rnd() * 8)
  const fond = H * (0.33 + 0.04 * rnd())
  const points: Point[] = []
  for (let i = 0; i < traits; i += 1) {
    const longue = i % 5 === 0
    const y = borner(fond + (longue ? H * 0.07 : H * 0.03), H)
    const x0 = (i / traits) * W
    const x1 = ((i + 0.42) / traits) * W
    const x2 = ((i + 1) / traits) * W
    points.push([x0, borner(fond, H)], [x0, y], [x1, y], [x1, borner(fond, H)], [x2, borner(fond, H)])
  }
  return points
}

/**
 * La surimpression : un arc de boucle.
 *
 * L'affiche est faite d'un bloc de titrage et d'une grande boucle qui lui passe
 * dessus ; sa lisière est un morceau de cette boucle. Elle tranche donc la
 * première ligne de lettres, et c'est le geste même des affiches dont la
 * famille est tirée, où une forme passe au travers du mot.
 */
function arcDeBoucle(W: number, H: number, rnd: Alea): Point[] {
  const centre = 0.2 + 0.6 * rnd()
  const largeur = 0.5 + 0.5 * rnd()
  return echantillonner(W, H, (t) => {
    const u = (t - centre) / largeur
    return H * 0.44 - Math.max(0, 1 - u * u) * H * 0.13
  })
}

/* ---------- aiguillage -------------------------------------------------------- */

/**
 * La lisière d'une famille : la façon dont son geste s'arrête.
 *
 * L'aiguillage suit celui de `formes()`, dans le même ordre et avec les mêmes
 * gardes : une famille rangée dans un module y trouve la lisière de son geste,
 * et ce qui reste, les aplats, prend la crête molle. Un geste ajouté au moteur
 * sans lisière retombe donc sur elle, ce qui n'est pas faux, seulement moins
 * juste, et se rattrape en ajoutant deux lignes ici.
 */
export function lisiereDuGeste(id: IdFamille, W: number, H: number, rnd: Alea): Point[] {
  if (estNiveau(id)) return courbeDeNiveau(W, H, rnd)
  if (estFracture(id)) return areteBrisee(W, H, rnd)
  if (estReserve(id)) return bordPerce(W, H, rnd)
  if (estChimie(id)) return frontDeCulture(W, H, rnd)
  if (estPavage(id)) return zigzagDOr(W, H, rnd)
  if (estLieu(id)) return bordEffrite(W, H, rnd)
  if (estTrame(id)) return ondeReguliere(W, H, rnd)
  if (estReseau(id)) return traceDeLigne(W, H, rnd)
  if (estGrammaire(id)) return bordFolie(W, H, rnd)
  if (estCarreau(id)) return marchesDeCases(W, H, rnd)
  if (estCoulee(id)) return festonDArcs(W, H, rnd)
  if (estRelief(id)) return marcheIsometrique(W, H, rnd)
  if (estMesure(id)) return graduation(W, H, rnd)
  if (estSurimpression(id)) return arcDeBoucle(W, H, rnd)
  return creteMolle(W, H, rnd)
}
