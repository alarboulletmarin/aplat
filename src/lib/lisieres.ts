// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les cartouches : la forme, propre à chaque geste, qui porte l'heure.
 *
 * Sur un écran de verrouillage, les chiffres sont énormes et haut placés, et il
 * leur faut un aplat lisible. Trois façons de le leur donner, et les deux
 * premières ont été essayées et jetées.
 *
 * Recouvrir le tiers supérieur d'un aplat de fond : c'est un effacement, on lit
 * une image coupée et un blanc rapporté par-dessus. Arrêter le motif sur une
 * lisière, fût-elle propre à chaque geste : c'est mieux dessiné, et c'est
 * toujours un vide. Le fond d'écran commence sous l'heure au lieu de la porter,
 * et le tiers de l'image ne montre rien.
 *
 * La troisième est celle-ci. Le motif couvre le cadre entier, comme sur
 * n'importe quel autre écran, et **une de ses formes vient se placer là où
 * tombent les chiffres**. Une seule, grande, d'un seul aplat, dessinée dans le
 * vocabulaire du geste : une plaque pour la fracture, un bloc de cases
 * entières pour le carreau, une capsule pour la coulée, un palier pour la ligne
 * de niveau, une dalle isométrique pour le relief, un cartouche de station pour
 * le réseau, une plaque graduée pour la mesure. Le motif continue au dessus, en
 * dessous et sur les côtés ; l'heure est posée sur une forme de l'image, pas
 * dans un trou qu'on lui a creusé.
 *
 * C'est le coeur de la fleur des images de référence : un aplat franc au milieu
 * de la composition, qui n'interrompt rien parce qu'il en fait partie.
 *
 * **Le contrat.** Un cartouche est un contour fermé qui couvre entièrement la
 * bande où la sonde mesure, `HAUTE` à `BASSE`, et qui ne touche jamais les
 * bords gauche et droit du cadre : c'est ce retrait latéral qui le fait lire
 * comme une forme posée plutôt que comme une bande qui coupe l'image. Entre ces
 * bornes, chaque geste dessine ce qu'il veut.
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
 * La bande que le cartouche doit couvrir, en parts de la hauteur, et le retrait
 * qu'il garde sur les côtés.
 *
 * `HAUT` et `BAS` encadrent les chiffres : la sonde mesure entre eux, et un
 * cartouche qui ne les couvrirait pas laisserait du motif sous l'heure. Le
 * dessin de chaque geste a donc le droit d'aller au delà, jamais en deçà.
 *
 * Les trois chiffres viennent de ce que les deux systèmes font réellement, et
 * non d'un coup d'oeil sur une maquette, qui les avait mis trop bas et trop
 * rentrés.
 *
 * En haut, il faut remonter plus qu'on ne croit. iOS pose une ligne de date au
 * dessus de l'heure, et ses versions récentes savent replier l'heure en petit
 * dans la rangée du haut ; Android, lui, n'a pas d'horloge fixe du tout :
 * grande et centrée au repos, elle se réduit et file en haut à gauche dès
 * qu'une notification arrive. Le cartouche part donc juste sous la barre
 * d'état.
 *
 * En bas, iOS range une rangée de widgets immédiatement sous l'heure depuis la
 * seizième version. S'arrêter au bas des chiffres la laissait sur le motif nu.
 *
 * Sur les côtés, `RETRAIT` est ce qui fait la différence entre une forme et une
 * bande : à zéro, le cartouche touche les deux bords et redevient une coupure.
 * Il ne peut pas être large pour autant, l'horloge d'Android venant se ranger
 * contre la marge gauche, et il vaut donc le vingtième de la largeur, ce qui
 * laisse voir le motif passer derrière sans découvrir les chiffres.
 *
 * Ce qui reste dehors est assumé : l'heure compacte des dernières versions
 * d'iOS et l'horloge repliée d'Android tombent au dessus du cartouche, dans la
 * barre d'état. Les couvrir aurait demandé un bandeau plein cadre, c'est-à-dire
 * précisément ce qu'on a passé trois essais à ne plus faire, et les deux
 * systèmes posent de toute façon leur propre voile derrière ces deux
 * affichages.
 */
export const HAUT = 0.075
export const BAS = 0.315
export const RETRAIT = 0.05

/** Le rectangle que tout cartouche doit couvrir, avec son retrait latéral. */
function boite(W: number, H: number) {
  const marge = W * RETRAIT
  return { x0: marge, x1: W - marge, y0: H * HAUT, y1: H * BAS }
}

/**
 * Le contour fermé d'un cartouche, à partir de ses deux bords et de ses deux
 * bouts.
 *
 * `haut` et `bas` donnent l'ordonnée des deux bords en fonction de l'abscisse
 * réduite ; ils sont bridés pour que la bande des chiffres soit couverte quoi
 * qu'ils racontent, un geste ayant le droit de déborder mais jamais de rogner.
 * `bout` donne le débord latéral en fonction de la position sur le bout, de
 * zéro à un : c'est lui qui fait la différence entre un bout carré, un bout
 * rond et une pointe.
 */
function fermer(
  W: number, H: number,
  haut: (t: number) => number,
  bas: (t: number) => number,
  bout: (s: number) => number = () => 0,
  pas = 96,
): Point[] {
  const b = boite(W, H)
  const large = b.x1 - b.x0
  /* Le débord latéral est borné ici, et non laissé à la conscience de chaque
     geste. Un bout bien rond demandait plus que le retrait ne pouvait donner, et
     le cartouche sortait du cadre par la gauche : il touchait le bord, donc il
     redevenait une bande, et c'est précisément la panne qu'on ne veut plus. La
     borne garde toujours un quart du retrait en motif visible de chaque côté,
     quoi qu'un bout demande. */
  const brider = (x: number) => Math.max(W * RETRAIT * 0.25, Math.min(W * (1 - RETRAIT * 0.25), x))
  const points: Point[] = []
  for (let i = 0; i <= pas; i += 1) {
    const t = i / pas
    points.push([b.x0 + t * large, Math.min(b.y0, haut(t))])
  }
  const bouts = 12
  for (let i = 1; i < bouts; i += 1) {
    const s = i / bouts
    points.push([brider(b.x1 + bout(s) * large), b.y0 + s * (b.y1 - b.y0)])
  }
  for (let i = pas; i >= 0; i -= 1) {
    const t = i / pas
    points.push([b.x0 + t * large, Math.max(b.y1, bas(t))])
  }
  for (let i = 1; i < bouts; i += 1) {
    const s = 1 - i / bouts
    points.push([brider(b.x0 - bout(s) * large), b.y0 + s * (b.y1 - b.y0)])
  }
  return points
}

/** Les trois bouts du répertoire : carré, rond, en pointe. */
const CARRE = () => 0
const ROND = (s: number) => Math.sin(s * Math.PI) * 0.075
const POINTE = (s: number) => (1 - Math.abs(s * 2 - 1)) * 0.06

/* ---------- les quinze formes qui portent l'heure ---------------------------- */

/**
 * Les aplats : un blob, la forme même du geste d'origine.
 *
 * Celui qui sème des formes libres sur un fond n'a pas d'autre vocabulaire que
 * la tache aux bords mous, et son cartouche en est une : deux harmoniques sur
 * chaque bord, des bouts bombés, et rien qui rappelle un rectangle.
 */
function blob(W: number, H: number, rnd: Alea): Point[] {
  const a = rnd() * Math.PI * 2
  const b = rnd() * Math.PI * 2
  const creux = H * 0.035
  return fermer(W, H,
    (t) => H * HAUT - creux * (0.6 + 0.4 * Math.sin(a + t * Math.PI * 2)),
    (t) => H * BAS + creux * (0.6 + 0.4 * Math.sin(b + t * Math.PI * 2.6)),
    ROND)
}

/**
 * La fracture : une plaque.
 *
 * Une plaque ne se termine pas en courbe, elle se termine en cassures. Les deux
 * bords sont donc des files de segments droits joignant quelques sommets tirés,
 * et les bouts sont francs : c'est exactement ce que la banquise dessine entre
 * deux plaques.
 */
function plaque(W: number, H: number, rnd: Alea): Point[] {
  const sommets = 4 + Math.floor(rnd() * 3)
  const hauts = Array.from({ length: sommets + 1 }, () => rnd())
  const bas = Array.from({ length: sommets + 1 }, () => rnd())
  const brise = (parts: number[]) => (t: number) => {
    const u = Math.min(sommets - 1e-9, t * sommets)
    const i = Math.floor(u)
    return parts[i] + (parts[i + 1] - parts[i]) * (u - i)
  }
  const dessus = brise(hauts)
  const dessous = brise(bas)
  return fermer(W, H,
    (t) => H * HAUT - H * 0.05 * dessus(t),
    (t) => H * BAS + H * 0.05 * dessous(t),
    CARRE)
}

/**
 * Le carreau : un bloc de cases entières.
 *
 * Une grille ne connaît pas le milieu d'une case, et son cartouche non plus :
 * ses deux bords montent et descendent par crans d'une case, et les sauts sont
 * verticaux. C'est la seule des quinze formes dont le contour ait des angles
 * droits partout.
 */
function blocDeCases(W: number, H: number, rnd: Alea): Point[] {
  const colonnes = 4 + Math.floor(rnd() * 3)
  const crans = 2
  const cran = (t: number, decalage: number) => {
    const c = Math.min(colonnes - 1, Math.floor(t * colonnes))
    return Math.floor(hacher(c, decalage, 1) * (crans + 1)) / crans
  }
  return fermer(W, H,
    (t) => H * HAUT - H * 0.055 * cran(t, 0),
    (t) => H * BAS + H * 0.055 * cran(t, 1),
    CARRE, 160)
}

/**
 * La coulée : une capsule.
 *
 * Le geste ne trace que des rubans à bouts ronds, et son cartouche est un
 * ruban : deux bords droits et deux demi-disques. C'est la plus simple des
 * quinze, et c'est juste, un ruban n'ayant rien d'autre à dire.
 */
function capsule(W: number, H: number, rnd: Alea): Point[] {
  void rnd
  return fermer(W, H, () => H * HAUT, () => H * BAS, (s) => Math.sin(s * Math.PI) * 0.14)
}

/**
 * La ligne de niveau : un palier.
 *
 * Le geste découpe un relief en paliers ; son cartouche en est un, ses deux
 * bords tirés du même bruit lisse. C'est le seul des quinze qui soit
 * littéralement une forme du motif : si le relief avait un palier de plus, il
 * aurait cette allure.
 */
function palier(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  const echelle = 2.4 + rnd()
  return fermer(W, H,
    (t) => H * HAUT - bruit(t * echelle, 0.2) * H * 0.06,
    (t) => H * BAS + bruit(t * echelle, 3.7) * H * 0.06,
    ROND)
}

/**
 * La réserve : un panneau ajouré.
 *
 * Le geste est celui du claustra, un panneau dans lequel on perce. Son
 * cartouche est donc un panneau franc, mordu de percements ronds à intervalle
 * régulier sur ses deux bords.
 */
function panneauAjoure(W: number, H: number, rnd: Alea): Point[] {
  const trous = 4 + Math.floor(rnd() * 3)
  const dent = (t: number) => {
    const u = t * trous
    const dedans = (u - Math.floor(u)) * 2 - 1
    return Math.sqrt(Math.max(0, 1 - dedans * dedans))
  }
  return fermer(W, H,
    (t) => H * HAUT + H * 0.035 * dent(t),
    (t) => H * BAS - H * 0.035 * dent(t + 0.5),
    CARRE)
}

/**
 * La réaction : une colonie.
 *
 * Deux substances qui se consomment ne laissent pas un bord régulier : molle à
 * grande échelle, frisée à petite. Deux bruits d'échelles différentes suffisent
 * à le dire, et les bouts sont bombés comme le reste.
 */
function colonie(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const large = bruiteur(cle)
  const fin = bruiteur(cle + 1)
  const bord = (t: number, decalage: number) =>
    large(t * 2.4, decalage) * H * 0.045 + fin(t * 11, decalage + 0.5) * H * 0.02
  return fermer(W, H,
    (t) => H * HAUT - bord(t, 0.3),
    (t) => H * BAS + bord(t, 5.1),
    ROND)
}

/**
 * Le pavage apériodique : une bande de triangles.
 *
 * Des segments droits d'un pas irrégulier, et des bouts en pointe : c'est le
 * bord d'un pavage de Penrose, où tout est triangle d'or et où rien n'est
 * arrondi.
 */
function bandeDeTriangles(W: number, H: number, rnd: Alea): Point[] {
  const dents = 5 + Math.floor(rnd() * 4)
  const dent = (t: number, phase: number) => {
    const u = t * dents + phase
    return Math.abs((u - Math.floor(u)) * 2 - 1)
  }
  return fermer(W, H,
    (t) => H * HAUT - H * 0.05 * dent(t, 0),
    (t) => H * BAS + H * 0.05 * dent(t, 0.5),
    POINTE, 160)
}

/**
 * La gravure tramée : une plaque qui s'effrite.
 *
 * Le geste ne connaît que des points de trame ; son bord n'est pas une ligne
 * mais une densité qui tombe. Faute de pouvoir rendre une densité par un
 * contour, les deux bords prennent des paliers courts et irréguliers, à la
 * hauteur d'un point : de loin, c'est un bord qui s'effrite.
 */
function plaqueEffritee(W: number, H: number, rnd: Alea): Point[] {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const paliers = 26
  const marche = (t: number, decalage: number) =>
    hacher(Math.min(paliers - 1, Math.floor(t * paliers)), decalage, cle)
  return fermer(W, H,
    (t) => H * HAUT - H * 0.04 * marche(t, 0),
    (t) => H * BAS + H * 0.04 * marche(t, 1),
    CARRE, 160)
}

/**
 * La trame déformée : une bande ondée.
 *
 * Le geste est celui de l'interférence, et l'interférence est une somme de
 * sinus. Ses deux bords en sont un seul, de même période et en phase, si bien
 * que la bande garde une épaisseur constante et ondule tout entière.
 */
function bandeOndee(W: number, H: number, rnd: Alea): Point[] {
  const periode = 2 + Math.floor(rnd() * 3)
  const phase = rnd() * Math.PI * 2
  const onde = (t: number) => Math.sin(phase + t * Math.PI * 2 * periode) * H * 0.04
  return fermer(W, H, (t) => H * HAUT + onde(t), (t) => H * BAS + onde(t), ROND)
}

/**
 * Le réseau : un cartouche de station.
 *
 * Un plan de métro ne tourne qu'à angle droit, et ses libellés sont posés dans
 * des rectangles à coins vifs. Celui-ci en est un, ses bords absolument droits :
 * c'est le seul des quinze qui n'ondule pas du tout, et c'est ce qui le rend
 * reconnaissable au milieu des quatorze autres.
 */
function cartoucheDeStation(W: number, H: number, rnd: Alea): Point[] {
  void rnd
  return fermer(W, H, () => H * HAUT, () => H * BAS, CARRE, 8)
}

/**
 * La grammaire : une feuille.
 *
 * Une règle appliquée à son propre résultat donne des folioles le long d'un
 * axe. Les deux bords en posent une file, et les bouts sont en pointe : c'est
 * une fronde vue de dessus.
 */
function feuille(W: number, H: number, rnd: Alea): Point[] {
  const folioles = 6 + Math.floor(rnd() * 4)
  const decoupe = (t: number) => {
    const u = t * folioles
    return Math.sin((u - Math.floor(u)) * Math.PI)
  }
  return fermer(W, H,
    (t) => H * HAUT - H * 0.045 * decoupe(t),
    (t) => H * BAS + H * 0.045 * decoupe(t + 0.5),
    POINTE)
}

/**
 * Le relief : une dalle isométrique.
 *
 * Le geste montre du volume en aplats ; son cartouche est une dalle vue de
 * trois quarts, ses deux bords en escalier de même pente, et ses bouts coupés
 * en biseau du même angle. Toutes les obliques du motif ont cet angle.
 */
function dalleIsometrique(W: number, H: number, rnd: Alea): Point[] {
  const paliers = 3 + Math.floor(rnd() * 2)
  const escalier = (t: number) => {
    const u = t * paliers
    const i = Math.floor(u)
    const dedans = u - i
    return (i % 2 === 0 ? dedans : 1 - dedans)
  }
  return fermer(W, H,
    (t) => H * HAUT - H * 0.05 * escalier(t),
    (t) => H * BAS + H * 0.05 * escalier(t),
    POINTE, 120)
}

/**
 * La mesure : une plaque graduée.
 *
 * Un instrument ne s'arrête pas n'importe où, il s'arrête sur un trait. Le bord
 * inférieur porte donc une graduation, un trait sur cinq plus long, et le bord
 * supérieur reste droit comme le dos d'une règle.
 */
function plaqueGraduee(W: number, H: number, rnd: Alea): Point[] {
  const traits = 20 + Math.floor(rnd() * 6)
  const graduation = (t: number) => {
    const u = t * traits
    const i = Math.floor(u)
    const dedans = u - i
    if (dedans > 0.36) return 0
    return i % 5 === 0 ? 1 : 0.45
  }
  return fermer(W, H,
    () => H * HAUT,
    (t) => H * BAS + H * 0.045 * graduation(t),
    CARRE, 240)
}

/**
 * La surimpression : un bandeau d'affiche.
 *
 * L'affiche est faite d'un bloc de titrage et d'une grande boucle qui lui passe
 * dessus. Son cartouche est un bandeau franc à bouts très ronds, celui qu'un
 * imprimeur réserve en bas d'une feuille pour y mettre le titre et la date.
 */
function bandeauDAffiche(W: number, H: number, rnd: Alea): Point[] {
  void rnd
  return fermer(W, H, () => H * HAUT, () => H * BAS, (s) => Math.sin(s * Math.PI) * 0.1, 16)
}

/* ---------- aiguillage -------------------------------------------------------- */

/**
 * Le cartouche d'une famille : la forme de son geste qui porte l'heure.
 *
 * L'aiguillage suit celui de `formes()`, dans le même ordre et avec les mêmes
 * gardes : une famille rangée dans un module y trouve la forme de son geste, et
 * ce qui reste, les aplats, prend le blob. Un geste ajouté au moteur sans
 * cartouche retombe donc sur lui, ce qui n'est pas faux, seulement moins juste,
 * et se rattrape en ajoutant deux lignes ici.
 */
export function cartoucheDuGeste(id: IdFamille, W: number, H: number, rnd: Alea): Point[] {
  if (estNiveau(id)) return palier(W, H, rnd)
  if (estFracture(id)) return plaque(W, H, rnd)
  if (estReserve(id)) return panneauAjoure(W, H, rnd)
  if (estChimie(id)) return colonie(W, H, rnd)
  if (estPavage(id)) return bandeDeTriangles(W, H, rnd)
  if (estLieu(id)) return plaqueEffritee(W, H, rnd)
  if (estTrame(id)) return bandeOndee(W, H, rnd)
  if (estReseau(id)) return cartoucheDeStation(W, H, rnd)
  if (estGrammaire(id)) return feuille(W, H, rnd)
  if (estCarreau(id)) return blocDeCases(W, H, rnd)
  if (estCoulee(id)) return capsule(W, H, rnd)
  if (estRelief(id)) return dalleIsometrique(W, H, rnd)
  if (estMesure(id)) return plaqueGraduee(W, H, rnd)
  if (estSurimpression(id)) return bandeauDAffiche(W, H, rnd)
  return blob(W, H, rnd)
}
