// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les palettes composées à la main, gardées sur l'appareil.
 *
 * Onze palettes livrées suffisent à faire un fond d'écran, elles ne suffisent
 * pas à faire *le sien* : une marque a ses deux teintes, un écran OLED demande
 * un noir vrai, un bureau demande le calme. C'est la seule chose du produit
 * qu'on ne peut pas choisir dans une liste, donc la seule qu'on doit pouvoir
 * écrire.
 *
 * Ce qui est gardé : un nom, un fond, deux à cinq teintes, douze palettes au
 * plus. C'est la deuxième et dernière chose qu'Aplat écrit sur l'appareil,
 * après les dix derniers motifs, et elle s'efface de la même façon, palette par
 * palette. Ni image, ni horodatage, ni identifiant d'appareil.
 *
 * L'identifiant n'est pas tiré au sort : c'est l'empreinte des couleurs
 * elles-mêmes. Trois choses en découlent, et ce sont les trois raisons du
 * choix.
 *
 * 1. Modifier une palette lui donne un autre identifiant. La mémoire de la
 *    sonde de lisibilité, qui est indexée par cet identifiant, ne peut donc pas
 *    rendre un voile calculé pour des couleurs qui ne sont plus là.
 * 2. Deux appareils qui composent la même palette lui donnent le même nom
 *    interne, et un lien partagé retombe sur la palette déjà enregistrée plutôt
 *    que d'en créer un doublon.
 * 3. Le lien porte l'identifiant *et* les couleurs, si bien qu'il se vérifie
 *    tout seul : l'un doit redonner l'autre, sans quoi le lien est refusé. Une
 *    adresse forgée ne peut pas faire dire à un identifiant connu des couleurs
 *    qui ne sont pas les siennes.
 *
 * Tout accès au stockage passe par un `try` : la navigation privée le refuse,
 * un quota plein aussi, et une application qui promet de fonctionner hors ligne
 * n'a pas le droit de tomber pour ça.
 */
import { empreintePalette, PREFIXE_PERSO, type IdPalettePerso, type Palette } from './moteur'

/** Le nom est préfixé, comme celui de l'historique : une origine, deux clés. */
export const CLE = 'aplat:palettes'

/** Douze palettes composées, pas une de plus : une liste, pas une archive. */
export const MAX_PALETTES = 12

/**
 * Trois teintes au moins, six au plus, fond compris.
 *
 * Deux ne feraient pas une palette mais un duo, et le moteur y perdrait tout
 * ce qui distingue une famille d'une autre : la plupart posent trois aplats
 * différents sur le fond. Au-delà de six, l'oeil ne suit plus, et le rendu
 * cesse d'être un aplat pour devenir un nuancier.
 */
export const MIN_TEINTES = 3
export const MAX_TEINTES = 6

/** Le nom tient sur une ligne de puce, comme celui des palettes livrées. */
export const NOM_MAX = 24

export interface PalettePerso {
  /** L'empreinte des couleurs, préfixée. Jamais saisi, toujours calculé. */
  id: IdPalettePerso
  /** Vide pour une palette reçue par un lien et pas encore enregistrée. */
  nom: string
  fond: string
  couleurs: string[]
}

/** Le nom d'une palette reçue et pas encore nommée, dans les deux langues. */
const RECUE = { fr: 'Palette reçue', en: 'Received palette' }

/* ---------- couleurs -------------------------------------------------------- */

const HEXA = /^#[0-9A-F]{6}$/i

export function estCouleur(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && HEXA.test(valeur)
}

/**
 * La forme canonique d'une teinte : dièse, six chiffres, majuscules.
 *
 * Elle compte parce que l'identifiant en dérive : `#ff6648` et `#FF6648` sont
 * la même couleur et doivent donner la même palette, sans quoi la même
 * composition saisie deux fois ferait deux entrées.
 */
export function normaliserCouleur(valeur: string): string {
  const propre = valeur.trim()
  const avecDiese = propre.startsWith('#') ? propre : `#${propre}`
  /* La notation à trois chiffres est acceptée en saisie, parce qu'un sélecteur
     de couleur du système peut la rendre, et parce qu'on l'écrit à la main. */
  const court = /^#[0-9A-F]{3}$/i.exec(avecDiese)
  const etendu = court
    ? `#${court[0][1]}${court[0][1]}${court[0][2]}${court[0][2]}${court[0][3]}${court[0][3]}`
    : avecDiese
  return HEXA.test(etendu) ? etendu.toUpperCase() : ''
}

/** Le fond d'abord, puis les teintes : l'ordre du formulaire et celui du lien. */
export function teintes(palette: { fond: string; couleurs: readonly string[] }): string[] {
  return [palette.fond, ...palette.couleurs]
}

/* ---------- composition ----------------------------------------------------- */

/** Un nom lisible : rogné, sans blancs multiples ni caractères de contrôle. */
export function nettoyerNom(nom: string): string {
  return nom
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOM_MAX)
}

/**
 * Compose une palette à partir d'un nom et d'une suite de teintes, la première
 * étant le fond. Rend `null` si la composition n'est pas recevable : c'est le
 * seul chemin d'entrée, et il refuse plutôt que de rattraper.
 */
export function composer(nom: string, suite: readonly string[]): PalettePerso | null {
  const propres = suite.map(normaliserCouleur)
  if (propres.some((teinte) => !teinte)) return null
  if (propres.length < MIN_TEINTES || propres.length > MAX_TEINTES) return null
  const [fond, ...couleurs] = propres
  return { id: empreintePalette(fond, couleurs), nom: nettoyerNom(nom), fond, couleurs }
}

export function estPalettePerso(valeur: unknown): valeur is PalettePerso {
  if (typeof valeur !== 'object' || valeur === null) return false
  const p = valeur as Record<string, unknown>
  if (typeof p.nom !== 'string' || p.nom.length > NOM_MAX) return false
  if (!estCouleur(p.fond) || !Array.isArray(p.couleurs)) return false
  if (!p.couleurs.every(estCouleur)) return false
  const total = p.couleurs.length + 1
  if (total < MIN_TEINTES || total > MAX_TEINTES) return false
  /* L'identifiant doit être celui des couleurs. Un stockage se modifie à la
     main comme une barre d'adresse : ce qui en sort n'est pas plus digne de
     confiance, et un identifiant recopié d'une palette sur une autre ferait
     mesurer la lisibilité de la première sur les couleurs de la seconde. */
  return p.id === empreintePalette(p.fond as string, p.couleurs as string[])
}

/** La forme que le moteur enregistre : un nom par langue, comme les livrées. */
export function versPalette(palette: PalettePerso): Palette & { id: string } {
  return {
    id: palette.id,
    fr: palette.nom || RECUE.fr,
    en: palette.nom || RECUE.en,
    fond: palette.fond,
    couleurs: palette.couleurs,
  }
}

/* ---------- liste ----------------------------------------------------------- */

/**
 * L'entrée passe en tête, sans doublon d'identifiant, et la queue tombe au-delà
 * de douze. Une palette recomposée à l'identique remonte donc au lieu de
 * s'ajouter : c'est la même, son identifiant le dit.
 */
export function ajouter(
  liste: readonly PalettePerso[], palette: PalettePerso,
): PalettePerso[] {
  return [palette, ...liste.filter((autre) => autre.id !== palette.id)].slice(0, MAX_PALETTES)
}

export function retirer(liste: readonly PalettePerso[], id: string): PalettePerso[] {
  return liste.filter((palette) => palette.id !== id)
}

/**
 * Relit une liste depuis son texte. Fonction pure, pour qu'elle se teste sans
 * navigateur : c'est elle qui décide ce qui est recevable.
 */
export function analyser(brut: string | null): PalettePerso[] {
  if (!brut) return []
  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return []
  }
  if (!Array.isArray(valeur)) return []
  const propres: PalettePerso[] = []
  for (const entree of valeur) {
    if (!estPalettePerso(entree)) continue
    if (propres.some((autre) => autre.id === entree.id)) continue
    propres.push({
      id: entree.id,
      nom: entree.nom,
      fond: entree.fond,
      couleurs: [...entree.couleurs],
    })
    if (propres.length === MAX_PALETTES) break
  }
  return propres
}

export function lire(): PalettePerso[] {
  try {
    return analyser(window.localStorage.getItem(CLE))
  } catch {
    /* stockage refusé : aucune palette composée, et rien d'autre ne change */
    return []
  }
}

export function ecrire(liste: readonly PalettePerso[]): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(liste))
  } catch {
    /* quota plein ou stockage refusé : les palettes ne survivront pas à la
       fermeture de l'onglet, et c'est tout ce qu'on y perd */
  }
}

/* ---------- adresse --------------------------------------------------------- */

/**
 * Les teintes, telles qu'elles s'écrivent dans un lien : `F7F3E6-DFF478-...`,
 * le fond d'abord. Sans dièse, qui coupe une adresse en deux.
 */
export function encoderTeintes(palette: { fond: string; couleurs: readonly string[] }): string {
  return teintes(palette).map((teinte) => teinte.slice(1)).join('-')
}

export function decoderTeintes(brut: string | null): string[] | null {
  if (!brut) return null
  const morceaux = brut.split('-')
  if (morceaux.length < MIN_TEINTES || morceaux.length > MAX_TEINTES) return null
  const propres = morceaux.map((morceau) => normaliserCouleur(morceau))
  return propres.some((teinte) => !teinte) ? null : propres
}

/**
 * La palette portée par une adresse, ou null.
 *
 * Le lien nomme la palette (`p`) et donne ses couleurs (`k`). Les deux doivent
 * se répondre : l'empreinte des couleurs reçues doit être exactement le nom
 * annoncé, sinon le lien est refusé. C'est ce qui permet d'accepter une palette
 * qu'on n'a jamais vue sans jamais accepter qu'une adresse forgée réécrive une
 * palette déjà enregistrée sous le même nom.
 */
export function paletteDeRequete(recherche: string): PalettePerso | null {
  let q: URLSearchParams
  try {
    q = new URLSearchParams(recherche)
  } catch {
    return null
  }
  const id = q.get('p')
  if (!id || !id.startsWith(PREFIXE_PERSO)) return null
  const suite = decoderTeintes(q.get('k'))
  if (!suite) return null
  const [fond, ...couleurs] = suite
  /* L'empreinte recalculée sert aussi d'identifiant rendu : c'est la même
     chaîne que `id`, la comparaison vient d'en répondre, et elle porte le type
     que `id`, sorti d'une adresse, n'a pas. */
  const empreinte = empreintePalette(fond, couleurs)
  if (empreinte !== id) return null
  return { id: empreinte, nom: '', fond, couleurs }
}
