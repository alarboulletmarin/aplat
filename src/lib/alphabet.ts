// SPDX-License-Identifier: AGPL-3.0-only

/**
 * L'écriture du moteur : Anton, en contours, posée comme n'importe quel aplat.
 *
 * Le moteur ne savait pas écrire, et c'était un choix documenté dans
 * `mesures.ts` : `Pinceau` n'a pas de `fillText`, parce qu'un `fillText`
 * obligerait le vectoriel à embarquer une police ou à en nommer une que le
 * destinataire n'a peut-être pas, et parce qu'un fichier qui dépend d'une
 * police installée n'est plus le fichier qu'on a vu. La mesure s'en tirait avec
 * dix chiffres tramés dans une grille de trois cases sur cinq, ce qui suffit à
 * un instrument et à rien d'autre.
 *
 * L'affiche demandait de vraies lettres, à la carrure d'un titrage. Elles ne
 * sont ni dessinées à la main ni tracées par le navigateur : ce sont les
 * contours d'Anton, sortis du fichier de la fonte **avant la livraison** par
 * `scripts/generate-alphabet.mjs` et rangés dans `anton.ts` comme un tableau de
 * nombres. Le moteur les remplit avec le même `fill` que tout le reste, si bien
 * que le PNG et le SVG portent les mêmes chemins et qu'aucun des deux ne
 * réclame de police à qui les ouvre.
 *
 * Anton plutôt qu'une autre : c'est une grotesque étroite et grasse, la
 * silhouette même de l'affiche sérigraphiée, elle est sous SIL Open Font
 * License 1.1, et surtout le dépôt l'embarquait déjà. Le titrage de
 * l'application est composé avec elle depuis toujours ; l'affiche écrit
 * maintenant dans le caractère du produit.
 *
 * **Les compteurs sont des trous, et c'est ce qui change tout depuis le premier
 * jet.** Un premier alphabet avait été dessiné en morceaux convexes, pour que
 * la surimpression puisse découper ses croisements avec la seule coupe de
 * Sutherland et Hodgman ; le compteur d'un O y était le blanc laissé entre
 * quatre bouts d'anneau. Ce n'était pas nécessaire. Un glyphe est une famille de
 * contours fermés qu'on remplit à la règle paire et impaire, et l'intersection
 * d'un tel glyphe avec un convexe s'obtient en coupant chaque contour par ce
 * convexe puis en remplissant les morceaux de la même façon : `(dehors ∩ K)`
 * moins `(dedans ∩ K)`, ce qui est exactement le glyphe coupé, les compteurs
 * compris. La contrainte tombe, et les lettres sont les vraies.
 *
 * **Le repère.** Une lettre tient dans une boîte de `chasse` de large et de 1 de
 * haut, l'origine en haut à gauche, l'axe des `y` vers le bas comme partout
 * ailleurs. La hauteur 1 est la hauteur de capitale : l'alphabet livré n'a que
 * des capitales, une affiche de titrage n'emploie pas de bas de casse, et chaque
 * glyphe retenu pèse dans le paquet.
 */
import { ANTON } from './anton'
import type { Point } from './trace'

/** Une lettre : son avance, et les contours fermés qui la dessinent. */
export interface Glyphe {
  chasse: number
  contours: readonly (readonly Point[])[]
}

const CACHE = new Map<string, Glyphe>()

/**
 * La lettre demandée, ou rien.
 *
 * Les contours sont dépliés à la première demande et gardés : le fichier généré
 * les range à plat, ce qui le rend deux fois plus léger, et un motif redessiné
 * à chaque pixel de résolution ne doit pas les déplier deux fois.
 *
 * Ce qui n'est pas dans la fonte ne se dessine pas et ne réserve pas de place :
 * une saisie assainie n'en apporte pas, et un caractère inconnu qui laisserait
 * un blanc trouerait le mot sans qu'on sache pourquoi.
 */
export function glyphe(caractere: string): Glyphe | undefined {
  const cle = caractere.toUpperCase()
  const connu = CACHE.get(cle)
  if (connu) return connu
  const brut = ANTON[cle]
  if (!brut) return undefined
  const deplie: Glyphe = {
    chasse: brut.chasse,
    contours: brut.contours.map((plat) => {
      const points: Point[] = []
      for (let i = 0; i + 1 < plat.length; i += 2) points.push([plat[i], plat[i + 1]])
      return points
    }),
  }
  CACHE.set(cle, deplie)
  return deplie
}

/** Ce que le moteur sait écrire : de quoi assainir une saisie. */
export const CARACTERES: readonly string[] = Object.keys(ANTON)

/** La chasse d'un mot entier, approche comprise, en hauteurs de capitale. */
export function chasseDuMot(mot: string, approche: number): number {
  let total = 0
  let compte = 0
  for (const caractere of mot) {
    const g = glyphe(caractere)
    if (!g) continue
    total += g.chasse + approche
    compte += 1
  }
  return compte > 0 ? total - approche : 0
}

/**
 * Les contours d'un mot, posés à l'échelle et à la place demandées.
 *
 * `taille` est la hauteur de capitale en pixels, et tout le reste en découle.
 * Les contours sortent lettre par lettre, chacun avec le rang de sa lettre : un
 * appelant qui remplit à la règle paire et impaire doit rassembler ceux d'une
 * même lettre en un seul chemin, sans quoi le compteur d'un O percerait la
 * lettre d'à côté au lieu de percer la sienne.
 */
export function contoursDuMot(
  mot: string, x: number, y: number, taille: number, approche: number,
): { rang: number; points: Point[] }[] {
  const sortie: { rang: number; points: Point[] }[] = []
  let curseur = x
  let rang = 0
  for (const caractere of mot) {
    const g = glyphe(caractere)
    if (!g) continue
    for (const contour of g.contours) {
      sortie.push({
        rang,
        points: contour.map(([px, py]): Point => [curseur + px * taille, y + py * taille]),
      })
    }
    curseur += (g.chasse + approche) * taille
    rang += 1
  }
  return sortie
}
