// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les lieux : un second geste du moteur, la gravure tramée.
 *
 * Les familles dessinées jusqu'ici posent des aplats fermés. Celles-ci font
 * autre chose : chaque lieu est décrit par un champ, une fonction qui donne en
 * tout point une densité d'encre entre 0 (le papier) et 1 (l'encre pleine), et
 * une trame de demi-teintes transforme ce champ en points. C'est le procédé des
 * gravures et des billets : deux tons, et toute la lumière vient de la densité
 * de la hachure.
 *
 * Deux tons, donc, pris dans la palette : le plus clair fait le papier, le plus
 * sombre fait l'encre. La palette entière n'y passe pas, et c'est le parti :
 * une gravure à quatre encres redevient une illustration, et le lieu perd ce
 * qui le distingue des paysages déjà en catalogue.
 *
 * La trame est ordonnée, jamais diffusée : une diffusion d'erreur dépend de
 * l'ordre de parcours, donc de la résolution, et l'aperçu cesserait d'être le
 * fichier. Ici la cellule se juge seule, sur sa position dans une grille
 * rapportée au petit côté : même image à toute résolution, comme partout.
 *
 * Le déterminisme demande une discipline de plus : `rnd` n'est tiré qu'à la
 * construction de la scène, un nombre fixe de fois, jamais dans la boucle des
 * cellules. Le nombre de cellules dépend du format ; si un tirage s'y
 * glissait, la sonde de lisibilité, qui mesure sur un canevas au format
 * approché, regarderait une autre scène que celle exportée. Tout ce qui varie
 * point par point passe par un bruit de valeur, fonction pure des coordonnées.
 *
 * Le vectoriel joue avec son plafond : la trame fusionne les cellules pleines
 * d'une même rangée en un seul rectangle, ce qui ramène la gravure de cent
 * mille cellules à quelques milliers de chemins. La plupart des tirages
 * passent donc sous `ELEMENTS_MAX` et s'exportent en SVG comme le reste ; les
 * plus denses le dépassent, et le panneau des formats le dit motif par motif,
 * comme le garde-fou l'a toujours prévu.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { bruiteur, hacher, lisse, luminanceHex } from './trace'

export const IDS_LIEUX = ['acropole', 'phare', 'pyramides', 'torii', 'aqueduc', 'moulins'] as const

export type IdLieu = (typeof IDS_LIEUX)[number]

export function estLieu(valeur: unknown): valeur is IdLieu {
  return IDS_LIEUX.includes(valeur as IdLieu)
}

/**
 * La finesse de la trame, en cellules par petit côté. C'est ce que la densité
 * règle ici : le même lieu, gravé plus gros ou plus fin. Les autres familles
 * peuplent davantage ; une gravure, elle, ne gagne rien à être plus meublée,
 * et tout à être plus serrée.
 */
const FINESSE: readonly [number, number, number] = [110, 160, 225]

/** La période des hachures, en cellules : quatre points d'une ligne à l'autre. */
const PERIODE = 4

/* ---------- champ ------------------------------------------------------------ */

/**
 * La densité d'encre au point (u, t), u et t de 0 à 1 en travers et du haut en
 * bas de l'image. Les scènes convertissent u en abscisse physique `u * rapport`
 * pour que rien ne s'étire d'un format à l'autre.
 */
type Champ = (u: number, t: number) => number

/** Une scène : ses tirages sont faits, il ne reste qu'à évaluer. */
type Scene = (rnd: Alea, rapport: number) => Champ

/* Le bruit de valeur et la luminance viennent de `trace.ts` : ce sont les
   outils que tous les gestes se partagent, et ils y sont commentés. Ce module
   les avait d'abord recopiés pour ne pas faire de cycle avec le moteur ;
   `trace.ts` n'importe que des types du moteur, le cycle n'existe plus. */

const borner = (v: number) => Math.max(0, Math.min(1, v))

/* ---------- les deux tons ---------------------------------------------------- */

/**
 * Le papier et l'encre : la teinte la plus claire et la plus sombre de la
 * palette. Le fond de la palette n'entre pas en jeu, parce que `formes()` ne le
 * connaît pas et qu'une gravure repeint de toute façon sa feuille entière ; et
 * l'écart de luminance est le seul critère, parce que c'est lui qui fait
 * qu'une trame se lit. Sur Nuit, le papier est crème et l'encre pervenche :
 * la gravure s'inverse d'elle-même, claire sur sombre, sans cas particulier.
 */
export function tonsDeGravure(C: readonly string[]): { papier: string; encre: string } {
  let papier = C[0]
  let encre = C[0]
  let haut = -1
  let bas = 2
  for (const teinte of C) {
    const L = luminanceHex(teinte)
    if (L > haut) {
      haut = L
      papier = teinte
    }
    if (L < bas) {
      bas = L
      encre = teinte
    }
  }
  return { papier, encre }
}

/* ---------- les scènes ------------------------------------------------------- */

/*
 * Chaque scène est écrite de haut en bas, et le champ s'évalue dans le même
 * ordre : le ciel d'abord, puis ce qui le bouche. La dernière écriture gagne,
 * exactement comme la dernière couche peinte. Les largeurs sont comptées en
 * unités de hauteur, converties par le rapport d'aspect : un temple garde ses
 * proportions qu'on soit sur un téléphone ou sur un écran large.
 */

/**
 * L'astre en réserve : le disque reste papier, quelle que soit la couche qui
 * passe dessous. C'est le geste commun des lieux, et celui des gravures :
 * le soleil n'est jamais encré, il est épargné.
 */
function reserve(x: number, t: number, ax: number, at: number, r: number): number {
  const d = Math.hypot(x - ax, t - at)
  if (d < r) return 0.02
  return -1
}

/** L'Acropole : un temple en réserve sur son rocher, des cyprès en repoussoir. */
const acropole: Scene = (rnd, rapport) => {
  const roche = bruiteur(Math.floor(rnd() * 0xffffffff))
  const ciel = bruiteur(Math.floor(rnd() * 0xffffffff))
  const sol = bruiteur(Math.floor(rnd() * 0xffffffff))
  const massifX = (0.3 + 0.4 * rnd()) * rapport
  const plateauT = 0.36 + 0.1 * rnd()
  const plateauDemi = 0.09 + 0.04 * rnd()
  const pente = 1.1 + 0.7 * rnd()
  const sens = rnd() < 0.5 ? -1 : 1
  const astreX = rapport * (0.16 + 0.68 * rnd())
  const astreT = 0.07 + 0.09 * rnd()
  const astreR = 0.045 + 0.03 * rnd()
  const lointainT = plateauT + 0.08 + 0.07 * rnd()
  const solT = 0.85 + 0.05 * rnd()
  const colonnes = 5 + Math.floor(rnd() * 3)
  const templeDemi = plateauDemi * (0.72 + 0.1 * rnd())
  const templeH = templeDemi * (1.05 + 0.15 * rnd())
  /* Cinq cyprès tirés d'avance, trois à cinq plantés : le nombre de tirages ne
     dépend de rien, seule la coupe en dépend. */
  const cypres = Array.from({ length: 5 }, () => ({
    x: rnd() * rapport,
    h: 0.09 + 0.09 * rnd(),
    l: 0.012 + 0.008 * rnd(),
  })).slice(0, 3 + Math.floor(rnd() * 3))

  return (u, t) => {
    const x = u * rapport
    let c = 0.24 + 0.2 * t + (ciel(x * 3, t * 3) - 0.5) * 0.12

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre
    else if (Math.hypot(x - astreX, t - astreT) < astreR * 1.7) c *= 0.6

    /* Les reliefs du fond, posés avant le rocher : ils donnent la profondeur
       et disparaissent derrière lui. */
    const lointain = lointainT + (roche(x * 2.2 + 40, 2) - 0.5) * 0.1
    if (t > lointain) c = 0.4 + (roche(x * 12, t * 12) - 0.5) * 0.16

    const ecart = Math.abs(x - massifX)
    const profil =
      plateauT +
      (ecart < plateauDemi ? 0 : (ecart - plateauDemi) * pente) +
      (roche(x * 5, 7) - 0.5) * 0.02
    if (t > profil) {
      c = 0.6 + (roche(x * 16, t * 16) - 0.5) * 0.3 + (t - profil) * 0.12
      /* Le flanc tourné vers l'astre reste plus clair : c'est ce qui donne un
         volume au rocher sans une seule ligne de contour. */
      const flanc = Math.max(-1, Math.min(1, (x - massifX) / (plateauDemi * 3)))
      c += sens * flanc * 0.15
      c = Math.min(c, 0.9)
      /* La lisière soulignée : c'est elle qui détache le rocher du ciel. */
      if (t - profil < 0.012) c = 0.92
    }

    /* Le temple, en réserve sur le plateau : la lumière du lieu, c'est lui. */
    const tx = x - massifX
    const tt = t - (plateauT - templeH)
    if (Math.abs(tx) < templeDemi && tt >= 0 && tt < templeH) {
      const part = tt / templeH
      if (part < 0.3) {
        /* Le fronton : un triangle de papier, le ciel autour. */
        if (Math.abs(tx) < templeDemi * (part / 0.3)) c = 0.05
      } else if (part < 0.42) {
        c = part < 0.34 ? 0.78 : 0.07
      } else if (part < 0.9) {
        /* La colonnade : le papier fait les fûts, l'encre fait les entre-
           colonnements, et il n'y a rien d'autre à dessiner. */
        const baie = ((tx + templeDemi) / (templeDemi * 2)) * colonnes
        const phase = baie - Math.floor(baie)
        c = phase > 0.18 && phase < 0.82 ? 0.06 : 0.85
      } else {
        /* Le stylobate : deux marches de papier soulignées d'encre. */
        c = (part - 0.9) % 0.05 < 0.016 ? 0.72 : 0.09
      }
    }

    const champT = solT + (sol(x * 2.5, 3) - 0.5) * 0.06
    if (t > champT) {
      c = 0.6 + (sol(x * 14, t * 18) - 0.5) * 0.34 + (t - champT) * 0.5
    }
    for (const arbre of cypres) {
      const base = champT + 0.02
      const haut = base - arbre.h
      if (t > haut && t < base) {
        const largeur = arbre.l * lisse((t - haut) / arbre.h)
        if (Math.abs(x - arbre.x) < largeur) c = 0.97
      }
    }
    return borner(c)
  }
}

/** Le phare : une tour en réserve sur son cap, le faisceau ouvert sur la mer. */
const phare: Scene = (rnd, rapport) => {
  const nuages = bruiteur(Math.floor(rnd() * 0xffffffff))
  const houleMer = bruiteur(Math.floor(rnd() * 0xffffffff))
  const roc = bruiteur(Math.floor(rnd() * 0xffffffff))
  const horizonT = 0.56 + 0.14 * rnd()
  const sens = rnd() < 0.5 ? 1 : -1
  const bord = sens > 0 ? 0 : rapport
  const capL = (0.24 + 0.14 * rnd()) * rapport
  const capT = horizonT - 0.13 - 0.06 * rnd()
  /* La tour est posée sur le profil du cap, au même endroit de la même
     formule : c'est ce qui la fait toucher le roc au lieu de flotter devant. */
  const versTour = 0.3 + 0.16 * rnd()
  const forme = (v: number) => v * v
  const tourX = bord + sens * capL * versTour
  const baseT = capT + forme(versTour) * (1 - capT - 0.02)
  const tourH = 0.2 + 0.06 * rnd()
  const astreX = bord + sens * (rapport * (0.62 + 0.25 * rnd()))
  const astreT = 0.1 + 0.08 * rnd()
  const astreR = 0.04 + 0.025 * rnd()
  const faisceauPente = 0.1 + 0.08 * rnd()

  const sommetT = baseT - tourH
  return (u, t) => {
    const x = u * rapport
    let c = 0.16 + 0.24 * (t / horizonT)
    c += (nuages(x * 2.2, t * 7) - 0.5) * 0.34 * lisse(borner(t / horizonT))

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre

    if (t > horizonT) {
      c = 0.46 + 0.34 * ((t - horizonT) / (1 - horizonT))
      c += (houleMer(x * 5, t * 46) - 0.5) * 0.4
      /* Le reflet de l'astre : une colonne de mer épargnée, hachée par la
         houle, comme la lumière se pose vraiment sur l'eau. */
      const largeurReflet = astreR * (0.6 + (t - horizonT) * 1.4)
      if (Math.abs(x - astreX) < largeurReflet && houleMer(x * 30, t * 60) > 0.42) {
        c *= 0.3
      }
    }
    if (Math.abs(t - horizonT) < 0.0035) c = Math.max(c, 0.8)

    /* Le cap : un profil qui tombe du bord vers la mer, du roc haché dessous.
       Jamais plein : un cap bouché serait un pan noir, pas un rocher. */
    const versLarge = borner((sens > 0 ? x : rapport - x) / capL)
    const profilCap = capT + forme(versLarge) * (1 - capT - 0.02) + (roc(x * 6, 5) - 0.5) * 0.04
    if (versLarge < 1 && t > profilCap) {
      c = 0.66 + (roc(x * 14, t * 14) - 0.5) * 0.34 + (t - profilCap) * 0.15
      c = Math.min(c, 0.9)
      if (t - profilCap < 0.01) c = 0.92
    }

    /* Le faisceau éclaircit tout ce qu'il traverse, ciel comme mer : il est
       peint en moins, pas en plus, parce que la lumière d'une gravure est une
       absence d'encre. Il part vers le large, du côté opposé au cap. */
    const versLanterne = (x - tourX) * sens
    if (versLanterne > 0.02) {
      const demi = 0.012 + versLanterne * faisceauPente
      if (Math.abs(t - sommetT) < demi) c *= 0.25
    }

    /* La tour : un trapèze de papier cerclé d'encre, la lanterne encrée. */
    const dansTour = t > sommetT && t < baseT + 0.02
    if (dansTour) {
      const hauteurRel = (t - sommetT) / tourH
      const demiLargeur = 0.016 + 0.012 * hauteurRel
      if (Math.abs(x - tourX) < demiLargeur) {
        c = hauteurRel < 0.16 ? 0.9 : (hauteurRel * 5) % 1 < 0.22 ? 0.85 : 0.07
      }
    }
    /* Le dôme au-dessus de la lanterne. */
    if (Math.hypot(x - tourX, (t - sommetT) * 1.4) < 0.018 && t < sommetT) c = 0.92

    return borner(c)
  }
}

/** Les pyramides : une face en lumière, une face en ombre, les dunes en bandes. */
const pyramides: Scene = (rnd, rapport) => {
  const cielB = bruiteur(Math.floor(rnd() * 0xffffffff))
  const sable = bruiteur(Math.floor(rnd() * 0xffffffff))
  const sens = rnd() < 0.5 ? -1 : 1
  const astreX = rapport * (0.5 - sens * (0.18 + 0.16 * rnd()))
  const astreT = 0.1 + 0.09 * rnd()
  const astreR = 0.05 + 0.03 * rnd()
  /* Trois pyramides tirées d'avance, deux ou trois debout, la plus proche en
     dernier : la dernière écrite passe devant, comme la dernière peinte. */
  const debout = 2 + (rnd() < 0.65 ? 1 : 0)
  const tas = Array.from({ length: 3 }, (_, i) => {
    const demiBase = (0.1 + 0.09 * i) * (0.9 + 0.3 * rnd())
    return {
      x: rapport * (0.2 + 0.6 * rnd()),
      demiBase,
      apexT: 0.6 - demiBase * 1.18 - 0.05 * rnd(),
      baseT: 0.6 + 0.016 * i,
    }
  }).slice(3 - debout)

  return (u, t) => {
    const x = u * rapport
    let c = 0.2 + 0.18 * t + (cielB(x * 2.6, t * 3.4) - 0.5) * 0.1

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre
    else if (Math.hypot(x - astreX, t - astreT) < astreR * 1.8) c *= 0.55

    const dunesT = 0.6
    if (t > dunesT) {
      /* Les dunes : le bruit ne texture pas le sable, il le dessine. Ses
         lignes de niveau font les crêtes, et la profondeur assombrit. */
      const relief = sable(x * 2.4, t * 7 - x * 1.1)
      c = 0.26 + 0.28 * relief + 0.2 * ((t - dunesT) / 0.4)
      if ((relief * 4.2) % 1 < 0.11) c += 0.18
    }

    for (const p of tas) {
      if (t < p.apexT || t > p.baseT) continue
      const largeur = p.demiBase * ((t - p.apexT) / (p.baseT - p.apexT))
      const ecart = x - p.x
      if (Math.abs(ecart) > largeur) continue
      /* L'arête sépare la face éclairée de la face à l'ombre ; les assises
         rayent la face claire, le bruit charge la sombre. */
      if (ecart * sens < 0) {
        c = 0.06 + (((t - p.apexT) * 46) % 1 < 0.14 ? 0.16 : 0)
      } else {
        c = 0.76 + (sable(x * 12, t * 12) - 0.5) * 0.14
      }
      /* L'arête elle-même, et le bord contre le ciel : sans eux, la face
         éclairée se fondrait dans la page. */
      if (Math.abs(ecart) < 0.005) c = 0.92
      else if (largeur - Math.abs(ecart) < 0.005) c = Math.max(c, 0.62)
    }
    return borner(c)
  }
}

/** Le torii : la porte encrée à plein, le volcan enneigé, la brume en réserve. */
const torii: Scene = (rnd, rapport) => {
  const cielB = bruiteur(Math.floor(rnd() * 0xffffffff))
  const flanc = bruiteur(Math.floor(rnd() * 0xffffffff))
  const eau = bruiteur(Math.floor(rnd() * 0xffffffff))
  const montX = rapport * (0.3 + 0.4 * rnd())
  const sommetT = 0.18 + 0.08 * rnd()
  const demiMont = 0.34 + 0.14 * rnd()
  const eauT = 0.6 + 0.1 * rnd()
  const neigeT = sommetT + 0.045 + 0.03 * rnd()
  const brumeT = eauT - 0.1 - 0.05 * rnd()
  const brumeE = 0.025 + 0.02 * rnd()
  const astreX = rapport * (0.5 + (rnd() < 0.5 ? -1 : 1) * (0.24 + 0.14 * rnd()))
  const astreT = 0.09 + 0.08 * rnd()
  const astreR = 0.045 + 0.03 * rnd()
  const gX = rapport * (0.3 + 0.4 * rnd())
  const gH = 0.2 + 0.08 * rnd()
  const gT = eauT - gH * (0.62 + 0.12 * rnd())

  /* La silhouette de la porte : vraie en tout point ou fausse, sans dégradé.
     Elle sert deux fois, pour la porte et pour son reflet. */
  const porte = (x: number, t: number): boolean => {
    const dx = Math.abs(x - gX)
    const tt = t - gT
    /* Le kasagi remonte aux extrémités : la borne haute lui laisse ce débord. */
    if (tt < -gH * 0.08 || tt > gH || dx > gH * 0.62) return false
    /* Le kasagi, relevé aux extrémités : c'est la courbe qui dit torii. */
    const courbe = (dx / (gH * 0.62)) ** 2 * gH * 0.06
    if (tt > -courbe && tt < gH * 0.1 - courbe && dx < gH * 0.62) return true
    if (tt > gH * 0.12 && tt < gH * 0.18 && dx < gH * 0.54) return true
    if (tt > gH * 0.4 && tt < gH * 0.47 && dx < gH * 0.46) return true
    /* Les fûts penchent l'un vers l'autre : le hashira droit tombe droit,
       celui du torii rentre en montant. */
    const fut = gH * (0.42 - 0.05 * (1 - tt / gH))
    return Math.abs(dx - fut) < gH * 0.035
  }

  return (u, t) => {
    const x = u * rapport
    let c = 0.2 + 0.16 * t + (cielB(x * 2.8, t * 3) - 0.5) * 0.1

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre

    const ecart = Math.abs(x - montX) / demiMont
    const profil = sommetT + ecart ** 1.35 * (eauT - sommetT + 0.08) + (flanc(x * 5, 3) - 0.5) * 0.02
    if (t > profil && t < eauT) {
      c = 0.56 + (flanc(x * 10, t * 10) - 0.5) * 0.22
      /* Les ravines descendent du sommet ; la neige les efface au-dessus de sa
         ligne, déchiquetée par le même bruit pour ne pas être un trait. */
      if (flanc(x * 22, t * 4) > 0.78) c += 0.14
      if (t < neigeT + (flanc(x * 16, 9) - 0.5) * 0.06) {
        c = 0.05
      } else {
        c = Math.min(c, 0.88)
        /* La lisière soulignée détache le volcan du ciel. */
        if (t - profil < 0.012) c = 0.85
      }
    }

    if (Math.abs(t - brumeT) < brumeE || Math.abs(t - (brumeT + brumeE * 3)) < brumeE * 0.6) {
      c *= 0.14
    }

    if (t > eauT) {
      c = 0.38 + 0.3 * ((t - eauT) / (1 - eauT))
      c += (eau(x * 4, t * 42) - 0.5) * 0.36
      /* Le reflet de la porte : la même silhouette, repliée sous sa base et
         brisée par l'eau, rangée par rangée. Il précède la porte, qui garde
         le dernier mot. */
      const tReflet = 2 * (gT + gH) - t - gH * 0.04
      if (
        porte(x + (eau(x * 8, t * 30) - 0.5) * 0.03, tReflet) &&
        eau(x * 6, t * 52) > 0.42
      ) {
        c = Math.max(c, 0.6)
      }
    }
    if (Math.abs(t - eauT) < 0.003) c = Math.max(c, 0.78)

    if (porte(x, t)) c = 0.98

    return borner(c)
  }
}

/** L'aqueduc : deux rangs d'arches en travers de la vallée, la rivière dessous. */
const aqueduc: Scene = (rnd, rapport) => {
  const ciel = bruiteur(Math.floor(rnd() * 0xffffffff))
  const pierre = bruiteur(Math.floor(rnd() * 0xffffffff))
  const vallee = bruiteur(Math.floor(rnd() * 0xffffffff))
  const astreX = rapport * (0.16 + 0.68 * rnd())
  const astreT = 0.07 + 0.08 * rnd()
  const astreR = 0.045 + 0.03 * rnd()
  const hautT = 0.3 + 0.07 * rnd()
  const solT = 0.7 + 0.06 * rnd()
  const bandeau = 0.025
  /* L'étage des grandes arches occupe environ deux tiers de l'ouvrage,
     comme sur les ponts romains : c'est cette inégalité qui fait la
     silhouette, deux rangs égaux donneraient une grille. */
  const etageT = hautT + bandeau + (solT - hautT - bandeau) * (0.32 + 0.08 * rnd())
  const pGrand = 0.15 + 0.05 * rnd()
  const decal = pGrand * rnd()
  const demiG = pGrand * (0.3 + 0.05 * rnd())
  const cintreG = etageT + 0.03 + demiG
  /* Deux petites travées par grande : la période est la moitié, et le
     décalage est le même, si bien que les piles des deux rangs tombent
     l'une sur l'autre, comme le voudrait la maçonnerie. */
  const pPetit = pGrand / 2
  const demiP = pPetit * (0.3 + 0.06 * rnd())
  const cintreP = hautT + bandeau + 0.02 + demiP
  const lointainT = hautT + 0.12 + 0.05 * rnd()
  const rivX = rapport * (0.25 + 0.5 * rnd())
  const rivCourbe = (rnd() - 0.5) * 0.8

  return (u, t) => {
    const x = u * rapport
    let c = 0.22 + 0.18 * t + (ciel(x * 2.6, t * 3.2) - 0.5) * 0.12

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre
    else if (Math.hypot(x - astreX, t - astreT) < astreR * 1.7) c *= 0.6

    /* Les collines du fond : on ne les voit qu'à travers les arches, et
       c'est ce qui donne à l'ouvrage sa profondeur, chaque baie encadre un
       morceau de paysage différent. */
    const colline = lointainT + (vallee(x * 2.2 + 50, 3) - 0.5) * 0.09
    if (t > colline) c = 0.42 + (vallee(x * 9, t * 9) - 0.5) * 0.18

    if (t > hautT && t < solT) {
      /* La position repliée sur la travée : la même formule dessine toutes
         les arches d'un rang, et l'ouvrage traverse la page sans fin. */
      const dxG = ((((x + decal) % pGrand) + pGrand) % pGrand) - pGrand / 2
      const dxP = ((((x + decal) % pPetit) + pPetit) % pPetit) - pPetit / 2
      let ouverte = false
      let anneau = false
      if (t > etageT) {
        const d = t > cintreG ? Math.abs(dxG) : Math.hypot(dxG, t - cintreG)
        ouverte = d < demiG
        anneau = !ouverte && d < demiG + 0.014
      } else if (t > hautT + bandeau) {
        const d = t > cintreP ? Math.abs(dxP) : Math.hypot(dxP, t - cintreP)
        ouverte = d < demiP
        anneau = !ouverte && d < demiP + 0.011
      }
      /* Une baie ouverte ne repeint rien : le ciel et les collines restent,
         et l'arche se lit en creux, ce qui est toute la marque du lieu. */
      if (!ouverte) {
        c = 0.3 + (pierre(x * 18, t * 18) - 0.5) * 0.2
        if ((t * 40) % 1 < 0.12) c += 0.14
        if (anneau) c = 0.88
        if (t < hautT + bandeau) {
          c = t - hautT < 0.008 ? 0.9 : 0.16
        }
      }
    }

    /* La vallée du premier plan, et la rivière en réserve : elle sort de
       sous l'ouvrage et s'élargit en descendant, hachée par son courant. */
    if (t > solT) {
      c = 0.52 + (vallee(x * 12, t * 16) - 0.5) * 0.3 + (t - solT) * 0.3
      const centre = rivX + rivCourbe * (t - solT) + (vallee(t * 4, 11) - 0.5) * 0.2
      const demiRiv = 0.045 + (t - solT) * 0.35
      const ecart = Math.abs(x - centre)
      if (ecart < demiRiv) {
        c = vallee(x * 26, t * 40) > 0.62 ? 0.3 : 0.1
        if (demiRiv - ecart < 0.008) c = 0.75
      }
    }
    return borner(c)
  }
}

/** Les moulins : la croix des ailes sur un grand ciel, les champs en sillons. */
const moulins: Scene = (rnd, rapport) => {
  const ciel = bruiteur(Math.floor(rnd() * 0xffffffff))
  const terre = bruiteur(Math.floor(rnd() * 0xffffffff))
  /* Les parcelles tirent leur ton et leurs sillons d'un hachage par bande :
     c'est le remplaçant des tirages que la boucle des cellules s'interdit,
     et il donne à chaque champ son caractère sans en tirer un seul. */
  const graineChamps = Math.floor(rnd() * 0xffffffff)
  const astreX = rapport * (0.16 + 0.68 * rnd())
  const astreT = 0.08 + 0.08 * rnd()
  const astreR = 0.04 + 0.03 * rnd()
  const terreT = 0.56 + 0.08 * rnd()
  const canalT = terreT + (1 - terreT) * (0.3 + 0.25 * rnd())
  const canalE = 0.025 + 0.015 * rnd()
  const hBande = 0.05 + 0.02 * rnd()
  const mX = rapport * (0.3 + 0.4 * rnd())
  const tourH = 0.17 + 0.05 * rnd()
  const moyeuT = terreT - tourH
  const aile = tourH * (0.75 + 0.15 * rnd())
  const heure = rnd() * Math.PI * 0.5
  const pX = mX + (mX < rapport / 2 ? 1 : -1) * rapport * (0.24 + 0.14 * rnd())
  const pH = tourH * (0.38 + 0.12 * rnd())
  const pHeure = rnd() * Math.PI * 0.5

  /* La croix des ailes : 0 dehors, 2 sur le bord d'attaque, 1 sur le
     treillis. Le bord est encré à plein et le treillis à moitié : c'est ce
     partage qui fait tourner la croix au lieu d'en faire un X plein. */
  const croix = (dx: number, dt: number, longueur: number, a: number): number => {
    if (Math.hypot(dx, dt) > longueur) return 0
    const demi = longueur * 0.085
    for (let k = 0; k < 4; k += 1) {
      const angle = a + (k * Math.PI) / 2
      const rx = dx * Math.cos(angle) + dt * Math.sin(angle)
      const ry = -dx * Math.sin(angle) + dt * Math.cos(angle)
      if (rx > longueur * 0.12 && rx < longueur && Math.abs(ry) < demi) {
        return ry < 0 ? 2 : 1
      }
    }
    return 0
  }

  return (u, t) => {
    const x = u * rapport
    let c = 0.16 + 0.2 * (t / terreT)
    c += (ciel(x * 2.1, t * 5.5) - 0.5) * 0.36 * lisse(borner(t / terreT))

    const astre = reserve(x, t, astreX, astreT, astreR)
    if (astre >= 0) c = astre

    /* Les champs : des bandes horizontales, chacune avec son ton, sa période
       et la pente de ses sillons. Le pays est plat, et c'est cette platitude
       qui laisse toute la place au ciel et à la croix. */
    const terreLigne = terreT + (terre(x * 3, 5) - 0.5) * 0.012
    if (t > terreLigne) {
      const bande = Math.floor((t - terreT) / hBande)
      c = 0.18 + 0.34 * hacher(bande, 1, graineChamps)
        + (terre(x * 8, t * 8) - 0.5) * 0.1
      const pente = (hacher(bande, 2, graineChamps) - 0.5) * 2.2
      const periode = 0.025 + 0.035 * hacher(bande, 3, graineChamps)
      const sillon = (x + (t - terreT) * pente) / periode
      if (((sillon % 1) + 1) % 1 < 0.42) c += 0.24
      /* La lisière entre deux parcelles, et du même trait la ligne qui
         détache la terre du ciel. */
      if ((t - terreT) % hBande < 0.006) c = 0.7
    }

    /* Le canal : une bande d'eau épargnée en travers des champs, brisée par
       ses rides. C'est la lumière du bas de page. */
    if (t > canalT && t < canalT + canalE) {
      c = terre(x * 24, t * 44) > 0.6 ? 0.3 : 0.08
      if (t - canalT < 0.004 || canalT + canalE - t < 0.004) c = 0.65
    }

    /* Le moulin du lointain : la même silhouette, plus petite et grise,
       jamais noire, c'est la distance qui se lit dans ce gris. */
    const pMoyeuT = terreT - pH
    if (t < terreT + 0.01) {
      const dxp = x - pX
      const dtp = t - pMoyeuT
      if (t > pMoyeuT && Math.abs(dxp) < pH * (0.16 + 0.14 * dtp / pH)) c = 0.6
      if (t <= pMoyeuT && Math.hypot(dxp, dtp * 1.3) < pH * 0.2) c = 0.6
      if (croix(dxp, dtp, pH * 0.85, pHeure) > 0) c = 0.6
    }

    /* Le grand moulin, en dernier : la tour, sa calotte, puis la croix, qui
       a le droit de passer devant l'astre comme devant les champs. */
    const dx = x - mX
    const dt = t - moyeuT
    if (t > moyeuT && t < terreT + 0.02
      && Math.abs(dx) < tourH * (0.16 + 0.14 * dt / tourH)) {
      c = 0.97
    }
    if (t <= moyeuT && Math.hypot(dx, dt * 1.3) < tourH * 0.2) c = 0.97
    const v = croix(dx, dt, aile, heure)
    if (v === 2) c = 0.97
    else if (v === 1) c = 0.55
    if (Math.hypot(dx, dt) < aile * 0.09) c = 0.97

    return borner(c)
  }
}

const SCENES: Readonly<Record<IdLieu, Scene>> = {
  acropole, phare, pyramides, torii, aqueduc, moulins,
}

/* ---------- la trame --------------------------------------------------------- */

/**
 * Le champ devient des points. La trame est une hachure à 45 degrés : les
 * cellules d'une même diagonale font une ligne, la densité d'encre en fait
 * l'épaisseur, et au-delà des deux tiers la hachure croisée s'ajoute, comme au
 * burin. Sur une grille carrée, une diagonale de période quatre n'a que trois
 * épaisseurs possibles ; la matrice de Bayer tranche les valeurs entre deux
 * épaisseurs, et c'est elle qui donne à la ligne son bord rongé de gravure.
 *
 * Les cellules pleines sont fusionnées par rangée avant d'être peintes : sur
 * un aplat d'encre, une rangée entière devient un seul rectangle, et le canevas
 * comme le SVG y gagnent dix fois moins d'appels.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

/** L'épaisseur locale d'une diagonale : 0 sur la ligne, 1 puis 2 en s'écartant. */
function cran(diagonale: number): number {
  const reste = ((diagonale % PERIODE) + PERIODE) % PERIODE
  return reste === 0 ? 0 : reste === 2 ? 2 : 1
}

export function peindreLieu(
  ctx: Pinceau, W: number, H: number, id: IdLieu,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  const { papier, encre } = tonsDeGravure(C)
  ctx.fillStyle = papier
  ctx.fillRect(0, 0, W, H)

  const champ = SCENES[id](rnd, W / H)
  const cote = unite / FINESSE[densite]
  const colonnes = Math.ceil(W / cote)
  const rangees = Math.ceil(H / cote)

  ctx.fillStyle = encre
  for (let r = 0; r < rangees; r += 1) {
    const y0 = Math.round(r * cote)
    const y1 = Math.round((r + 1) * cote)
    const t = ((r + 0.5) * cote) / H
    let debut = -1
    for (let c = 0; c < colonnes; c += 1) {
      const u = ((c + 0.5) * cote) / W
      const couverture = champ(u, t)
      let noire: boolean
      if (couverture >= 0.96) noire = true
      else if (couverture < 0.02) noire = false
      else {
        const sous = (BAYER[r & 3][c & 3] + 0.5) / 16
        const s1 = (cran(c + r) + sous) / 3
        noire = couverture > s1
        if (!noire && couverture > 0.66) {
          /* La hachure croisée : elle ne porte que le surplus d'encre, pour
             que les deux directions se lisent au lieu de se boucher. */
          const s2 = (cran(c - r) + (BAYER[c & 3][r & 3] + 0.5) / 16) / 3
          noire = (couverture - 0.66) * 2.4 > s2
        }
      }
      if (noire && debut < 0) debut = c
      if (!noire && debut >= 0) {
        const x0 = Math.round(debut * cote)
        const x1 = Math.round(c * cote)
        ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0))
        debut = -1
      }
    }
    if (debut >= 0) {
      const x0 = Math.round(debut * cote)
      ctx.fillRect(x0, y0, Math.max(1, W - x0), Math.max(1, y1 - y0))
    }
  }
}
