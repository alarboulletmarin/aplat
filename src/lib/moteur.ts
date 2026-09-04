// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le moteur génératif, tout ce qui fabrique l'image.
 *
 * Rien n'en sort : aucune requête, aucune donnée. Le rendu est déterministe,
 * le quadruplet (famille, palette, densité, graine) donne toujours la même
 * image, à n'importe quelle résolution. C'est ce qui rend l'aperçu honnête :
 * ce qu'on voit derrière les icônes est exactement le fichier téléchargé.
 */

import { estCarreau, peindreCarreau, type IdCarreau } from './carreaux'
import { estChimie, peindreChimie, type IdChimie } from './chimie'
import { estCoulee, peindreCoulee, type IdCoulee } from './coulees'
import { estFracture, peindreFracture, type IdFracture } from './fractures'
import { estGrammaire, peindreGrammaire, type IdGrammaire } from './grammaires'
import { estLieu, peindreLieu, type IdLieu } from './lieux'
import { estMesure, peindreMesure, type IdMesure } from './mesures'
import { estNiveau, peindreNiveau, type IdNiveau } from './niveaux'
import { estPavage, peindrePavage, type IdPavage } from './pavages'
import { estRelief, peindreRelief, type IdRelief } from './reliefs'
import { estReseau, peindreReseau, type IdReseau } from './reseaux'
import { estReserve, peindreReserve, type IdReserve } from './reserves'
import { estTrame, peindreTrame, type IdTrame } from './trames'

export type IdFamille =
  /* abstraits */
  | 'vagues'
  | 'blobs'
  | 'arches'
  | 'decoupes'
  | 'obliques'
  | 'ondes'
  | 'pointille'
  | 'trame'
  | 'colonnes'
  | 'ecailles'
  | 'terrazzo'
  | 'confettis'
  | 'arcade'
  | 'truchet'
  | 'azulejos'
  | 'vitrail'
  | 'persiennes'
  | 'mosaique'
  | 'tresse'
  | 'mirage'
  | 'terrasses'
  | 'bassin'
  | 'strates'
  /* abstraits venus des nouveaux gestes : la fracture, la réserve, le
     pavage savant, le carreau, la coulée, le relief, la mesure */
  | IdFracture
  | IdReserve
  | IdPavage
  | IdCarreau
  | IdCoulee
  | IdRelief
  | IdMesure
  /* matières : la ligne de niveau y met les cernes, la chimie, la grille
     déformée et l'interférence y mettent tout le reste */
  | IdChimie
  | IdTrame
  /* paysages */
  | 'sommets'
  | 'horizon'
  | 'nuages'
  | 'dunes'
  | 'falaises'
  | 'archipel'
  /* la ligne de niveau : reliefs, cernes, estran, empreinte (lib/niveaux.ts) */
  | IdNiveau
  /* lieux : les gravures tramées de lib/lieux.ts */
  | IdLieu
  /* figures */
  | 'fleurs'
  | 'tournesol'
  | 'corolle'
  | 'etoiles'
  | 'rayons'
  | 'lunes'
  | 'feuilles'
  | 'agrumes'
  | 'palmes'
  | 'vases'
  | 'poissons'
  /* figures venues des nouveaux gestes : le réseau, la grammaire */
  | IdReseau
  | IdGrammaire

export type IdPalette =
  | 'lime'
  | 'soleil'
  | 'argile'
  | 'corail'
  | 'menthe'
  | 'ciel'
  | 'ardoise'
  | 'prune'
  | 'nuit'
  | 'orage'
  | 'encre'

/**
 * L'identifiant d'une palette composée : le préfixe, puis l'empreinte des
 * teintes (voir `empreintePalette`).
 */
export type IdPalettePerso = `${typeof PREFIXE_PERSO}${string}`

/**
 * Une palette quelconque, livrée ou composée. C'est lui que l'adresse, les
 * réglages et l'historique portent : `IdPalette` ne nomme que les onze
 * livrées, et le dire dans le type évite de le rattraper par des assertions.
 */
export type IdPaletteQuelconque = IdPalette | IdPalettePerso

/** 0 calme, 1 moyen, 2 dense. */
export type Densite = 0 | 1 | 2

export type Langue = 'fr' | 'en'

export interface Palette {
  fr: string
  en: string
  fond: string
  /**
   * Deux à cinq teintes posées sur le fond. Les onze palettes livrées en
   * comptent quatre ; une palette personnalisée en compte ce que la personne a
   * choisi, et `formes()` les prend par un modulo, ce qui n'a jamais demandé
   * un nombre fixe.
   */
  couleurs: readonly string[]
}

/**
 * Les huit groupes de la liste, et le mot qui dit ce qu'ils rassemblent.
 *
 * Un groupe n'existe que si son critère tient en une phrase. C'est la règle du
 * système de design, et elle sert à quelque chose : « abstraits » n'en avait
 * pas, et il est devenu le bac de tout ce qui n'était rangé nulle part, jusqu'à
 * porter quarante et une familles sur soixante-seize. Les onglets avaient été
 * inventés contre exactement ça.
 *
 * `abs` des formes libres sur un aplat, `pav` une maille qui revient, `vol` du
 * volume en aplats, `ins` des instruments gradués, `mat` ce que la main
 * reconnaît, `pay` ce qui a un haut et un bas, `lieu` des gravures tramées,
 * `fig` des objets reconnaissables un par un.
 *
 * Ils sont devenus des onglets dans le panneau, et le type est donc nommé :
 * l'interface en tient un dans son état, et une chaîne libre y aurait laissé
 * passer un groupe qui n'existe pas.
 */
export type Groupe = 'abs' | 'pav' | 'vol' | 'ins' | 'mat' | 'pay' | 'lieu' | 'fig'

export interface Famille {
  id: IdFamille
  groupe: Groupe
  fr: string
  en: string
}

/**
 * Ce que la sonde de lisibilité a mesuré.
 * `libelles` nomme la couleur de libellé qui passe sur ce fond, `voile` la
 * force du voile appliqué, `contraste` le rapport obtenu après ce voile.
 */
export interface Mesure {
  libelles: 'clair' | 'sombre'
  voile: number
  contraste: number
  /**
   * La luminance moyenne relevée sous la grille d'icônes, avant voile. Elle est
   * gardée parce que le voile est devenu facultatif : sans elle, on ne saurait
   * pas dire ce que vaut le contraste d'un fichier exporté sans voile, et le
   * verdict annoncerait un chiffre qui n'est pas celui de l'image.
   */
  luminance: number
  /**
   * L'opacité de l'aplat noir de la version sombre, nulle en version claire.
   *
   * Elle est à côté du voile parce que c'est le même genre de chose : une
   * couche que la sonde dose et que le rendu peint. Elle est ici plutôt que
   * dans un réglage parce qu'elle dépend du motif : ramener toutes les palettes
   * à la même obscurité demande d'assombrir chacune différemment.
   */
  ombre: number
}

/* ---------- données ------------------------------------------------------- */

export const PALETTES: Readonly<Record<IdPalette, Palette>> = {
  lime: { fr: 'Lime & crème', en: 'Lime & cream', fond: '#F7F3E6', couleurs: ['#DFF478', '#92BAD5', '#17243F', '#FF6648'] },
  soleil: { fr: 'Soleil', en: 'Sun', fond: '#F6E6B4', couleurs: ['#EFA22B', '#17243F', '#788CE3', '#F7F3E6'] },
  argile: { fr: 'Argile', en: 'Clay', fond: '#F0E2D2', couleurs: ['#C9552F', '#17243F', '#E9B44C', '#788CE3'] },
  corail: { fr: 'Corail', en: 'Coral', fond: '#F7F3E6', couleurs: ['#FF6648', '#17243F', '#DFF478', '#788CE3'] },
  menthe: { fr: 'Menthe', en: 'Mint', fond: '#E2EFE4', couleurs: ['#4E9B7C', '#17243F', '#DFF478', '#92BAD5'] },
  ciel: { fr: 'Ciel', en: 'Sky', fond: '#92BAD5', couleurs: ['#F7F3E6', '#788CE3', '#17243F', '#DFF478'] },
  ardoise: { fr: 'Ardoise', en: 'Slate', fond: '#DFE2E6', couleurs: ['#4A5773', '#92BAD5', '#DFF478', '#17243F'] },
  prune: { fr: 'Prune', en: 'Plum', fond: '#EEE0EA', couleurs: ['#6E3B63', '#788CE3', '#DFF478', '#F7F3E6'] },
  nuit: { fr: 'Nuit', en: 'Night', fond: '#17243F', couleurs: ['#788CE3', '#DFF478', '#92BAD5', '#F7F3E6'] },
  orage: { fr: 'Orage', en: 'Storm', fond: '#1D2140', couleurs: ['#788CE3', '#FF6648', '#92BAD5', '#F7F3E6'] },
  encre: { fr: 'Encre', en: 'Ink', fond: '#101A2E', couleurs: ['#F7F3E6', '#92BAD5', '#DFF478', '#FF6648'] },
}

/** L'ordre d'affichage, du plus clair au plus sombre. */
export const ORDRE_PALETTES: readonly IdPalette[] = [
  'lime', 'soleil', 'argile', 'corail', 'menthe', 'ciel', 'ardoise', 'prune', 'nuit', 'orage', 'encre',
]

/**
 * Les soixante-seize familles, dans l'ordre de la liste : les quatre groupes
 * géométriques d'abord, abstraits, pavages, volumes, instruments ; puis les
 * matières, qui sont entre les deux mondes ; puis les trois figuratifs,
 * paysages, lieux, figures. L'ordre compte : on descend du plus géométrique au
 * plus figuratif, et le premier de chaque groupe en donne le ton.
 */
export const FAMILLES: readonly Famille[] = [
  /* abstraits : des formes libres sur un aplat, rien n'y revient à intervalle régulier */
  { id: 'vagues', groupe: 'abs', fr: 'Vagues', en: 'Waves' },
  { id: 'blobs', groupe: 'abs', fr: 'Blobs', en: 'Blobs' },
  { id: 'decoupes', groupe: 'abs', fr: 'Découpes', en: 'Cut-outs' },
  { id: 'obliques', groupe: 'abs', fr: 'Obliques', en: 'Diagonals' },
  { id: 'ondes', groupe: 'abs', fr: 'Ondes', en: 'Ripples' },
  { id: 'colonnes', groupe: 'abs', fr: 'Colonnes', en: 'Columns' },
  { id: 'terrazzo', groupe: 'abs', fr: 'Terrazzo', en: 'Terrazzo' },
  { id: 'confettis', groupe: 'abs', fr: 'Confettis', en: 'Confetti' },
  { id: 'vitrail', groupe: 'abs', fr: 'Vitrail', en: 'Stained glass' },
  { id: 'persiennes', groupe: 'abs', fr: 'Persiennes', en: 'Shutters' },
  { id: 'mirage', groupe: 'abs', fr: 'Mirage', en: 'Mirage' },
  { id: 'terrasses', groupe: 'abs', fr: 'Terrasses', en: 'Terraces' },
  { id: 'bassin', groupe: 'abs', fr: 'Bassin', en: 'Pool' },
  { id: 'strates', groupe: 'abs', fr: 'Strates', en: 'Strata' },
  { id: 'kintsugi', groupe: 'abs', fr: 'Kintsugi', en: 'Kintsugi' },
  { id: 'banquise', groupe: 'abs', fr: 'Banquise', en: 'Ice floes' },
  { id: 'meandres', groupe: 'abs', fr: 'Méandres', en: 'Meanders' },
  { id: 'lagon', groupe: 'abs', fr: 'Lagon', en: 'Lagoon' },
  /* pavages : une maille revient, et l'oeil la suit du doigt */
  { id: 'arches', groupe: 'pav', fr: 'Arches', en: 'Arches' },
  { id: 'pointille', groupe: 'pav', fr: 'Fondu pointillé', en: 'Dotted fade' },
  { id: 'trame', groupe: 'pav', fr: 'Trame', en: 'Dither' },
  { id: 'ecailles', groupe: 'pav', fr: 'Écailles', en: 'Scales' },
  { id: 'arcade', groupe: 'pav', fr: 'Arcade', en: 'Arcade' },
  { id: 'truchet', groupe: 'pav', fr: 'Truchet', en: 'Truchet' },
  { id: 'azulejos', groupe: 'pav', fr: 'Azulejos', en: 'Azulejos' },
  { id: 'mosaique', groupe: 'pav', fr: 'Mosaïque', en: 'Mosaic' },
  { id: 'tresse', groupe: 'pav', fr: 'Tresse', en: 'Weave' },
  { id: 'claustra', groupe: 'pav', fr: 'Claustra', en: 'Breeze block' },
  { id: 'papel', groupe: 'pav', fr: 'Papel picado', en: 'Papel picado' },
  { id: 'penrose', groupe: 'pav', fr: 'Penrose', en: 'Penrose' },
  { id: 'bauhaus', groupe: 'pav', fr: 'Bauhaus', en: 'Bauhaus' },
  { id: 'carreaux', groupe: 'pav', fr: 'Carreaux', en: 'Tiles' },
  { id: 'demilunes', groupe: 'pav', fr: 'Demi-lunes', en: 'Half-moons' },
  { id: 'jetons', groupe: 'pav', fr: 'Jetons', en: 'Tokens' },
  /* volumes : c'est plat, et on y voit pourtant un volume */
  { id: 'cubes', groupe: 'vol', fr: 'Cubes', en: 'Blocks' },
  { id: 'plis', groupe: 'vol', fr: 'Plis', en: 'Folds' },
  { id: 'bossage', groupe: 'vol', fr: 'Bossage', en: 'Bosses' },
  { id: 'tuyaux', groupe: 'vol', fr: 'Tuyaux', en: 'Pipes' },
  /* instruments : le motif est gradué, il mesure */
  { id: 'tapis', groupe: 'ins', fr: 'Tapis de coupe', en: 'Cutting mat' },
  { id: 'millimetre', groupe: 'ins', fr: 'Millimétré', en: 'Graph paper' },
  { id: 'rapporteur', groupe: 'ins', fr: 'Rapporteur', en: 'Protractor' },
  { id: 'mire', groupe: 'ins', fr: 'Mire', en: 'Test chart' },
  /* matières : la main les reconnaît avant l'oeil */
  { id: 'cernes', groupe: 'mat', fr: 'Cernes', en: 'Growth rings' },
  { id: 'pelage', groupe: 'mat', fr: 'Pelage', en: 'Spots' },
  { id: 'madrepore', groupe: 'mat', fr: 'Madrépore', en: 'Brain coral' },
  { id: 'drape', groupe: 'mat', fr: 'Drapé', en: 'Drape' },
  { id: 'sashiko', groupe: 'mat', fr: 'Boro', en: 'Boro' },
  { id: 'moire', groupe: 'mat', fr: 'Moiré', en: 'Moiré' },
  /* paysages : ils ont un haut et un bas */
  { id: 'sommets', groupe: 'pay', fr: 'Sommets', en: 'Peaks' },
  { id: 'horizon', groupe: 'pay', fr: 'Horizon', en: 'Horizon' },
  { id: 'nuages', groupe: 'pay', fr: 'Nuages', en: 'Clouds' },
  { id: 'dunes', groupe: 'pay', fr: 'Dunes', en: 'Dunes' },
  { id: 'falaises', groupe: 'pay', fr: 'Falaises', en: 'Cliffs' },
  { id: 'archipel', groupe: 'pay', fr: 'Archipel', en: 'Archipelago' },
  { id: 'relief', groupe: 'pay', fr: 'Relief', en: 'Contours' },
  { id: 'maree', groupe: 'pay', fr: 'Marée', en: 'Tideline' },
  /* lieux : des gravures tramées, deux tons seulement */
  { id: 'acropole', groupe: 'lieu', fr: 'Acropole', en: 'Acropolis' },
  { id: 'phare', groupe: 'lieu', fr: 'Phare', en: 'Lighthouse' },
  { id: 'pyramides', groupe: 'lieu', fr: 'Pyramides', en: 'Pyramids' },
  { id: 'torii', groupe: 'lieu', fr: 'Torii', en: 'Torii' },
  { id: 'aqueduc', groupe: 'lieu', fr: 'Aqueduc', en: 'Aqueduct' },
  { id: 'moulins', groupe: 'lieu', fr: 'Moulins', en: 'Windmills' },
  /* figures : des objets posés sur un fond, reconnaissables un par un */
  { id: 'fleurs', groupe: 'fig', fr: 'Marguerites', en: 'Daisies' },
  { id: 'tournesol', groupe: 'fig', fr: 'Tournesol', en: 'Sunflower' },
  { id: 'corolle', groupe: 'fig', fr: 'Corolle', en: 'Corolla' },
  { id: 'floraison', groupe: 'fig', fr: 'Floraison', en: 'Bloom' },
  { id: 'etoiles', groupe: 'fig', fr: 'Étoiles', en: 'Stars' },
  { id: 'rayons', groupe: 'fig', fr: 'Rayons', en: 'Sunbeams' },
  { id: 'lunes', groupe: 'fig', fr: 'Lunes', en: 'Moons' },
  { id: 'feuilles', groupe: 'fig', fr: 'Feuilles', en: 'Leaves' },
  { id: 'agrumes', groupe: 'fig', fr: 'Agrumes', en: 'Citrus' },
  { id: 'palmes', groupe: 'fig', fr: 'Palmes', en: 'Palms' },
  { id: 'vases', groupe: 'fig', fr: 'Vases', en: 'Vases' },
  { id: 'poissons', groupe: 'fig', fr: 'Poissons', en: 'Fish' },
  { id: 'empreinte', groupe: 'fig', fr: 'Empreinte', en: 'Fingerprint' },
  { id: 'herbier', groupe: 'fig', fr: 'Herbier', en: 'Herbarium' },
  { id: 'metro', groupe: 'fig', fr: 'Métro', en: 'Transit map' },
  { id: 'constellations', groupe: 'fig', fr: 'Constellations', en: 'Constellations' },
]

/** Les arrondis des fausses icônes de la maquette : jamais deux fois le même. */
export const RAYONS: readonly string[] = [
  '50%', '3px', '50% 50% 50% 0', '3px 11px 3px 11px', '50% 0 50% 0', '2px',
]

/* ---------- palettes personnalisées ---------------------------------------- */

/**
 * Le registre des palettes que la personne a composées.
 *
 * Le moteur ne lit ni n'écrit rien : `lib/palettes.ts` tient le stockage et
 * l'adresse, et vient poser ici ce qui doit pouvoir être dessiné. Sans ce
 * registre, `palette()` retomberait sur Lime & crème et l'aperçu montrerait
 * autre chose que ce qui est choisi.
 *
 * Les identifiants personnalisés sont dérivés des couleurs elles-mêmes (voir
 * `empreintePalette`). Deux conséquences, et ce sont les deux raisons du
 * choix : modifier une palette lui donne un autre identifiant, donc la mémoire
 * de `mesurer()` ne peut pas rendre une mesure périmée ; et un lien qui porte
 * l'identifiant et les couleurs se vérifie tout seul, l'un devant redonner
 * l'autre.
 */
const PERSOS = new Map<string, Palette>()

/** Le préfixe qui distingue une palette composée d'une palette livrée. */
export const PREFIXE_PERSO = 'x'

/** L'empreinte d'un jeu de couleurs, telle qu'elle nomme la palette. */
export function empreintePalette(fond: string, couleurs: readonly string[]): IdPalettePerso {
  return `${PREFIXE_PERSO}${empreinte36([fond, ...couleurs].join('-').toUpperCase())}`
}

/** FNV-1a complet, en base 36 : court à lire, assez large pour ne pas cogner. */
function empreinte36(texte: string): string {
  let h = 2166136261
  for (let i = 0; i < texte.length; i += 1) {
    h = Math.imul(h ^ texte.charCodeAt(i), 16777619) >>> 0
  }
  return h.toString(36)
}

/**
 * Remplace le registre par la liste donnée. Remplace, et n'ajoute pas : une
 * palette supprimée doit cesser d'être dessinable au même instant, sans quoi
 * elle survivrait dans l'aperçu après avoir disparu de la liste.
 */
export function enregistrerPalettes(liste: readonly (Palette & { id: string })[]): void {
  PERSOS.clear()
  for (const entree of liste) {
    if (!entree.id.startsWith(PREFIXE_PERSO)) continue
    PERSOS.set(entree.id, {
      fr: entree.fr,
      en: entree.en,
      fond: entree.fond,
      couleurs: [...entree.couleurs],
    })
  }
}

export function estIdPalettePerso(valeur: unknown): valeur is IdPalettePerso {
  return typeof valeur === 'string' && PERSOS.has(valeur)
}

/* ---------- listes blanches ------------------------------------------------ */

/**
 * Un identifiant venu de l'URL n'est jamais utilisé comme index :
 * `PALETTES['constructor']` est « vrai » et suffisait à faire lever le rendu
 * tout entier, aperçu et vignettes compris.
 */
export function estFamille(valeur: unknown): valeur is IdFamille {
  return FAMILLES.some((famille) => famille.id === valeur)
}

/** Vrai pour les onze palettes livrées, et pour elles seules. */
export function estPaletteLivree(valeur: unknown): valeur is IdPalette {
  return ORDRE_PALETTES.includes(valeur as IdPalette)
}

/**
 * Vrai pour les onze palettes livrées et pour celles qui sont enregistrées.
 *
 * Le registre fait donc partie de la liste blanche : une adresse qui nomme une
 * palette composée que cet appareil ne connaît pas retombe sur la valeur par
 * défaut, exactement comme une adresse qui nomme n'importe quoi d'autre.
 */
export function estPalette(valeur: unknown): valeur is IdPaletteQuelconque {
  return estPaletteLivree(valeur) || estIdPalettePerso(valeur)
}

export function estDensite(valeur: unknown): valeur is Densite {
  return valeur === 0 || valeur === 1 || valeur === 2
}

export function palette(id: IdPaletteQuelconque): Palette {
  const perso = PERSOS.get(id)
  if (perso) return perso
  return estPaletteLivree(id) ? PALETTES[id] : PALETTES.lime
}

export function famille(id: IdFamille): Famille | undefined {
  return FAMILLES.find((entree) => entree.id === id)
}

/* ---------- aléatoire déterministe ---------------------------------------- */

export type Alea = () => number

/** mulberry32 : court, sans état global, et le même à chaque exécution. */
export function alea(graine: number): Alea {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a, ramené sous 9973 : sert à écarter les familles les unes des autres. */
export function empreinte(texte: string): number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i += 1) {
    h = Math.imul(h ^ texte.charCodeAt(i), 16777619) >>> 0
  }
  return h % 9973
}

/**
 * La graine de dessin ne dépend jamais de la résolution : la même image sort
 * à l'identique en aperçu, en vignette et à l'export.
 */
export function graineDeDessin(id: IdFamille, densite: Densite, graine: number): number {
  return (graine * 7919 + densite * 131 + empreinte(id) * 23) >>> 0
}

/* ---------- luminance ------------------------------------------------------ */

/** Luminance relative WCAG d'un pixel sRGB. */
export function luminance(r: number, v: number, b: number): number {
  const canal = (c: number) => {
    const x = c / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b)
}

/* ---------- primitives de tracé -------------------------------------------- */

type Ctx = CanvasRenderingContext2D

/**
 * Le sous-ensemble du contexte 2D que le tracé emprunte.
 *
 * Il est nommé parce qu'il est devenu un contrat : `lib/svg.ts` en écrit une
 * seconde implémentation, qui note les formes au lieu de les peindre, et c'est
 * ce qui permet d'exporter le même motif en vectoriel sans jamais recopier une
 * famille. Une famille ajoutée est donc exportable en SVG le jour même, et une
 * primitive ajoutée ici casse la compilation là-bas plutôt qu'à l'exécution.
 *
 * Ce qui n'y est pas est exactement ce qu'un SVG ne sait pas rendre : le grain,
 * qui passe par un motif d'image, et la sonde, qui relit des pixels.
 */
export interface Pinceau {
  fillStyle: string | CanvasGradient | CanvasPattern
  globalAlpha: number
  globalCompositeOperation: GlobalCompositeOperation
  save(): void
  restore(): void
  translate(x: number, y: number): void
  rotate(angle: number): void
  scale(x: number, y: number): void
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void
  beginPath(): void
  closePath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  arc(
    x: number, y: number, rayon: number,
    depart: number, fin: number, antihoraire?: boolean,
  ): void
  arcTo(x1: number, y1: number, x2: number, y2: number, rayon: number): void
  ellipse(
    x: number, y: number, rx: number, ry: number, rotation: number,
    depart: number, fin: number, antihoraire?: boolean,
  ): void
  roundRect?(x: number, y: number, largeur: number, hauteur: number, rayon: number): void
  fill(regle?: CanvasFillRule): void
  fillRect(x: number, y: number, largeur: number, hauteur: number): void
}

function blob(ctx: Pinceau, cx: number, cy: number, r: number, n: number, rnd: Alea, secousse = 0.6) {
  const points: [number, number][] = []
  for (let i = 0; i < n; i += 1) {
    const angle = (i / n) * Math.PI * 2
    const rayon = r * (1 - secousse / 2 + secousse * rnd())
    points.push([cx + Math.cos(angle) * rayon, cy + Math.sin(angle) * rayon])
  }
  const milieu = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ]
  const depart = milieu(points[n - 1], points[0])
  ctx.beginPath()
  ctx.moveTo(depart[0], depart[1])
  for (let i = 0; i < n; i += 1) {
    const courant = points[i]
    const suivant = points[(i + 1) % n]
    const m = milieu(courant, suivant)
    ctx.quadraticCurveTo(courant[0], courant[1], m[0], m[1])
  }
  ctx.closePath()
  ctx.fill()
}

function arche(ctx: Pinceau, cx: number, base: number, largeur: number, hauteur: number) {
  const r = largeur / 2
  const h = Math.max(hauteur, r * 1.02)
  ctx.beginPath()
  ctx.moveTo(cx - r, base)
  ctx.lineTo(cx - r, base - h + r)
  ctx.arc(cx, base - h + r, r, Math.PI, 0)
  ctx.lineTo(cx + r, base)
  ctx.closePath()
  ctx.fill()
}

function marguerite(
  ctx: Pinceau, cx: number, cy: number, R: number, n: number, rotation: number,
  petale: string, coeur: string,
) {
  ctx.fillStyle = petale
  for (let i = 0; i < n; i += 1) {
    const a = rotation + (i / n) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(cx + Math.cos(a) * R * 0.56, cy + Math.sin(a) * R * 0.56, R * 0.46, R * 0.26, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = coeur
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2)
  ctx.fill()
}

function gelule(ctx: Pinceau, x: number, y: number, largeur: number, hauteur: number) {
  const r = Math.min(largeur, hauteur) / 2
  ctx.beginPath()
  if (ctx.roundRect) {
    ctx.roundRect(x, y, largeur, hauteur, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + largeur - r, y)
    ctx.arcTo(x + largeur, y, x + largeur, y + r, r)
    ctx.lineTo(x + largeur, y + hauteur - r)
    ctx.arcTo(x + largeur, y + hauteur, x + largeur - r, y + hauteur, r)
    ctx.lineTo(x + r, y + hauteur)
    ctx.arcTo(x, y + hauteur, x, y + hauteur - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  }
  ctx.closePath()
  ctx.fill()
}

function etoile(ctx: Pinceau, cx: number, cy: number, R: number, pointes: number, creux: number, rotation: number) {
  ctx.beginPath()
  for (let i = 0; i < pointes * 2; i += 1) {
    const a = rotation + (i * Math.PI) / pointes
    const r = i % 2 ? R * creux : R
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function feuille(ctx: Pinceau, x: number, y: number, longueur: number, largeur: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(longueur * 0.42, -largeur, longueur, 0)
  ctx.quadraticCurveTo(longueur * 0.42, largeur, 0, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function croissant(ctx: Pinceau, cx: number, cy: number, R: number, angle: number, entaille: number) {
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.moveTo(cx + Math.cos(angle) * R * entaille + R * 0.9, cy + Math.sin(angle) * R * entaille)
  ctx.arc(cx + Math.cos(angle) * R * entaille, cy + Math.sin(angle) * R * entaille, R * 0.9, 0, Math.PI * 2)
  ctx.fill('evenodd')
}

function tournesol(
  ctx: Pinceau, cx: number, cy: number, R: number, rnd: Alea,
  petale: string, petale2: string, coeur: string, graines: string, unite: number,
) {
  const n = 13 + Math.floor(rnd() * 6)
  const rotation = rnd() * Math.PI * 2
  ctx.fillStyle = petale2
  for (let i = 0; i < n; i += 1) {
    const a = rotation + ((i + 0.5) / n) * Math.PI * 2
    feuille(ctx, cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3, R * 0.62, R * 0.19, a)
  }
  ctx.fillStyle = petale
  for (let i = 0; i < n; i += 1) {
    const a = rotation + (i / n) * Math.PI * 2
    feuille(ctx, cx + Math.cos(a) * R * 0.26, cy + Math.sin(a) * R * 0.26, R * 0.76, R * 0.25, a)
  }
  ctx.fillStyle = coeur
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = graines
  /* Plancher relatif : en pixels absolus il mordait dans les vignettes, dont
     le cœur paraissait plus dense que l'image réellement exportée. */
  const or = 2.39996
  const k = (R * 0.29) / Math.sqrt(72)
  const point = Math.max((unite || R * 12) * 0.0008, R * 0.021)
  for (let i = 1; i <= 72; i += 1) {
    const rayon = k * Math.sqrt(i)
    const a = i * or
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * rayon, cy + Math.sin(a) * rayon, point, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Une ondulation lisse et déterministe : trois sinusoïdes dont les fréquences
 * et les phases sont tirées à la construction, sommées puis ramenées vers
 * [-1, 1]. Un sinus nu se reconnaît au premier regard ; la somme, plus courte
 * qu'un bruit de gradient et sans grille sous-jacente, ne se reconnaît plus.
 * `t` se compte en périodes : la valeur fait à peu près un aller-retour
 * chaque fois que `t` avance de un.
 */
function houle(rnd: Alea): (t: number) => number {
  const termes = [1, 2, 3].map((rang) => ({
    poids: 1 / rang,
    frequence: rang * (0.6 + 0.8 * rnd()),
    phase: rnd() * Math.PI * 2,
  }))
  const total = termes.reduce((somme, terme) => somme + terme.poids, 0)
  return (t) => termes.reduce(
    (somme, { poids, frequence, phase }) =>
      somme + poids * Math.sin(t * frequence * Math.PI * 2 + phase),
    0,
  ) / total
}

/**
 * Le mélange de deux teintes hexadécimales, canal par canal en sRGB.
 *
 * Il sert aux rampes : une palette compte quatre teintes, une famille en
 * terrasses en pose jusqu'à douze, et les paliers intermédiaires sont pris
 * entre deux teintes voisines de la liste. Le sRGB suffit ici : les bornes
 * d'un palier sont proches, et un espace perceptuel ne changerait rien qu'on
 * voie.
 *
 * Une teinte qui ne se lit pas rend `a` tel quel plutôt qu'un attribut
 * illisible : une palette composée passe par ici, et le SVG n'accepte que six
 * chiffres hexadécimaux.
 */
export function melange(a: string, b: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const part = Math.max(0, Math.min(1, t))
  const canal = (i: number) => {
    const de = Number.parseInt(a.slice(1 + i * 2, 3 + i * 2), 16)
    const vers = Number.parseInt(b.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round(de + (vers - de) * part).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(1)}${canal(2)}`.toUpperCase()
}

/** La teinte à la position `t` d'une rampe qui traverse la palette entière. */
function palier(C: readonly string[], t: number): string {
  if (C.length < 2) return C[0]
  const position = Math.max(0, Math.min(1, t)) * (C.length - 1)
  const cran = Math.min(C.length - 2, Math.floor(position))
  return melange(C[cran], C[cran + 1], position - cran)
}

/* ---------- familles -------------------------------------------------------- */

/**
 * Les formes, et rien d'autre : ni fond, ni voile, ni grain. `unite` est le
 * petit côté ; toutes les tailles s'y rapportent, c'est ce qui rend le motif
 * indépendant de la résolution.
 */
export function formes(
  ctx: Pinceau, W: number, H: number, id: IdFamille,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  const col = (i: number) => C[((i % C.length) + C.length) % C.length]

  /* Les lieux ont leur propre geste, la gravure tramée, et leur propre
     module : six scènes décrites par un champ, une trame qui les grave.
     Ils passent par le même pinceau, la même graine et la même palette que
     tout le monde ; seul le dessin change de nature. */
  if (estLieu(id)) {
    peindreLieu(ctx, W, H, id, C, densite, rnd, unite)
    return
  }

  /* Les gestes suivants ont chacun leur module, sur le modèle des lieux :
     même pinceau, même graine, même palette, un dessin d'une autre nature.
     La ligne de niveau révèle des paliers, la fracture brise la surface, la
     réserve perce un aplat, la chimie cultive une réaction, le réseau trace
     une carte, le pavage subdivise sans période, la trame déforme ou fait
     interférer des grilles, la grammaire fait pousser des plantes, le carreau
     remplit une grille d'un alphabet de signes, la coulée fait serpenter des
     rubans larges, le relief fait dire l'orientation à la teinte, et la
     mesure dessine des instruments gradués. */
  if (estNiveau(id)) {
    peindreNiveau(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estFracture(id)) {
    peindreFracture(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estReserve(id)) {
    peindreReserve(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estChimie(id)) {
    peindreChimie(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estReseau(id)) {
    peindreReseau(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estPavage(id)) {
    peindrePavage(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estTrame(id)) {
    peindreTrame(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estGrammaire(id)) {
    peindreGrammaire(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estCarreau(id)) {
    peindreCarreau(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estCoulee(id)) {
    peindreCoulee(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estRelief(id)) {
    peindreRelief(ctx, W, H, id, C, densite, rnd, unite)
    return
  }
  if (estMesure(id)) {
    peindreMesure(ctx, W, H, id, C, densite, rnd, unite)
    return
  }

  if (id === 'blobs') {
    const n = [3, 6, 10][densite]
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i)
      blob(ctx, W * (0.08 + 0.84 * rnd()), H * (0.07 + 0.86 * rnd()),
        unite * (0.15 + 0.22 * rnd()), 7 + Math.floor(rnd() * 3), rnd)
    }
    return
  }

  if (id === 'arches') {
    const n = [2, 3, 5][densite]
    const largeurColonne = W / n
    for (let j = 0; j < n; j += 1) {
      const cx = largeurColonne * (j + 0.5)
      const versLeHaut = rnd() > 0.32
      const base = versLeHaut ? H * (0.62 + 0.38 * rnd()) : H * (0.02 + 0.1 * rnd())
      const hauteur = H * (0.3 + 0.34 * rnd())
      for (let k = 0; k < 3; k += 1) {
        ctx.fillStyle = col(j + k)
        const largeur = largeurColonne * (0.94 - k * 0.26)
        if (versLeHaut) {
          arche(ctx, cx, base, largeur, hauteur - k * hauteur * 0.2)
        } else {
          ctx.save()
          ctx.translate(cx, base)
          ctx.scale(1, -1)
          ctx.translate(-cx, 0)
          arche(ctx, cx, 0, largeur, hauteur - k * hauteur * 0.2)
          ctx.restore()
        }
      }
    }
    return
  }

  if (id === 'fleurs') {
    const n = [2, 3, 5][densite]
    const largeurCase = W / n
    const rangees = Math.max(2, Math.round(H / largeurCase))
    const hauteurCase = H / rangees
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < n; c += 1) {
        const i = r * n + c
        const R = Math.min(largeurCase, hauteurCase) * 0.42 * (0.78 + 0.34 * rnd())
        marguerite(ctx,
          largeurCase * (c + 0.5) + (rnd() - 0.5) * largeurCase * 0.18,
          hauteurCase * (r + 0.5) + (rnd() - 0.5) * hauteurCase * 0.18,
          R, 6 + Math.floor(rnd() * 3), rnd() * Math.PI, col(i), col(i + 2))
      }
    }
    return
  }

  if (id === 'tournesol') {
    const n = [1, 3, 7][densite]
    /* Borné par n : sinon, en densité calme (n = 1) et sur un format large, la
       grille passait à deux colonnes et la fleur unique se retrouvait centrée
       sur le quart gauche, la moitié droite restant nue. */
    const colonnes = Math.min(n, Math.max(1, Math.round(Math.sqrt((n * W) / H))))
    const rangees = Math.max(1, Math.ceil(n / colonnes))
    const largeurCase = W / colonnes
    const hauteurCase = H / rangees
    for (let i = 0; i < n; i += 1) {
      const c = i % colonnes
      const r = Math.floor(i / colonnes)
      const R = Math.min(largeurCase, hauteurCase) * (n === 1 ? 0.46 : 0.36) * (0.88 + 0.26 * rnd())
      tournesol(ctx,
        largeurCase * (c + 0.5) + (rnd() - 0.5) * largeurCase * 0.18,
        hauteurCase * (r + 0.5) + (rnd() - 0.5) * hauteurCase * 0.18,
        R, rnd, col(i), col(i + 3), col(i + 1), col(i + 2), unite)
    }
    return
  }

  if (id === 'etoiles') {
    const n = [5, 11, 22][densite]
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i)
      etoile(ctx, W * (0.05 + 0.9 * rnd()), H * (0.04 + 0.92 * rnd()),
        unite * (0.06 + 0.17 * rnd()), 4 + Math.floor(rnd() * 5),
        0.36 + 0.16 * rnd(), rnd() * Math.PI * 2)
    }
    return
  }

  if (id === 'rayons') {
    const n = [8, 14, 24][densite]
    const ax = W * (rnd() < 0.5 ? 0.1 : 0.9)
    const ay = H * (rnd() < 0.5 ? 0.08 : 0.92)
    const rotation = rnd() * Math.PI * 2
    const rayon = Math.hypot(W, H) * 1.4
    const pas = (Math.PI * 2) / n
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i)
      const a0 = rotation + i * pas
      const a1 = a0 + pas * 0.97
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax + Math.cos(a0) * rayon, ay + Math.sin(a0) * rayon)
      ctx.lineTo(ax + Math.cos(a1) * rayon, ay + Math.sin(a1) * rayon)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = col(n + 1)
    ctx.beginPath()
    ctx.arc(ax, ay, unite * 0.12, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (id === 'ecailles') {
    const colonnes = [3, 5, 8][densite]
    const r = W / colonnes / 2
    const pas = r * 0.72
    const rangees = Math.ceil(H / pas) + 2
    for (let rangee = 0; rangee < rangees; rangee += 1) {
      const y = -r * 0.5 + rangee * pas
      const decalage = rangee % 2 ? r : 0
      ctx.fillStyle = col(rangee)
      for (let c = -1; c <= colonnes + 1; c += 1) {
        ctx.beginPath()
        ctx.arc(decalage + c * r * 2 + r, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (id === 'lunes') {
    const n = [3, 6, 11][densite]
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i)
      croissant(ctx, W * (0.1 + 0.8 * rnd()), H * (0.06 + 0.88 * rnd()),
        unite * (0.1 + 0.17 * rnd()), rnd() * Math.PI * 2, 0.26 + 0.32 * rnd())
    }
    return
  }

  if (id === 'feuilles') {
    const n = [4, 9, 18][densite]
    for (let i = 0; i < n; i += 1) {
      const x = W * (0.06 + 0.88 * rnd())
      const y = H * (0.05 + 0.9 * rnd())
      const longueur = unite * (0.16 + 0.2 * rnd())
      const angle = rnd() * Math.PI * 2
      ctx.fillStyle = col(i)
      feuille(ctx, x, y, longueur, longueur * 0.34, angle)
      ctx.fillStyle = col(i + 2)
      feuille(ctx, x, y, longueur * 0.46, longueur * 0.14, angle)
    }
    return
  }

  if (id === 'colonnes') {
    const n = [3, 5, 9][densite]
    const ecart = W * 0.014
    let x = ecart
    let i = 0
    while (x < W - ecart && i < 48) {
      const largeur = Math.max(unite * 0.05, (W / n) * (0.5 + 0.8 * rnd()) - ecart)
      const hauteur = H * (0.34 + 0.62 * rnd())
      ctx.fillStyle = col(i)
      gelule(ctx, x, rnd() < 0.5 ? -H * 0.07 : H - hauteur + H * 0.07, largeur, hauteur)
      x += largeur + ecart
      i += 1
    }
    return
  }

  if (id === 'confettis') {
    const n = [24, 55, 120][densite]
    for (let i = 0; i < n; i += 1) {
      const s = unite * (0.016 + 0.03 * rnd())
      ctx.fillStyle = col(i)
      ctx.save()
      ctx.translate(W * rnd(), H * rnd())
      ctx.rotate(rnd() * Math.PI)
      const forme = Math.floor(rnd() * 4)
      if (forme === 0) {
        ctx.beginPath()
        ctx.arc(0, 0, s, 0, Math.PI * 2)
        ctx.fill()
      } else if (forme === 1) {
        gelule(ctx, -s * 2.2, -s * 0.5, s * 4.4, s)
      } else if (forme === 2) {
        etoile(ctx, 0, 0, s * 1.6, 4, 0.4, 0)
      } else {
        ctx.beginPath()
        ctx.moveTo(0, -s * 1.4)
        ctx.lineTo(s * 1.3, s)
        ctx.lineTo(-s * 1.3, s)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }
    return
  }

  if (id === 'decoupes') {
    const n = [2, 3, 5][densite]
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i)
      blob(ctx, W * (0.08 + 0.84 * rnd()), H * (0.08 + 0.84 * rnd()),
        unite * (0.46 + 0.46 * rnd()), 6 + Math.floor(rnd() * 4), rnd, 0.85)
    }
    return
  }

  if (id === 'obliques') {
    const n = [3, 6, 11][densite]
    const diagonale = Math.hypot(W, H)
    const angle = (rnd() < 0.5 ? 1 : -1) * (Math.PI / 4 + (rnd() - 0.5) * 0.5)
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(angle)
    ctx.translate(-diagonale / 2, -diagonale / 2)
    let y = 0
    let i = 0
    while (y < diagonale && i < 64) {
      const hauteur = (diagonale / n) * (0.45 + 0.95 * rnd())
      ctx.fillStyle = col(i)
      ctx.fillRect(-diagonale * 0.2, y, diagonale * 1.4, hauteur)
      y += hauteur + diagonale * 0.007
      i += 1
    }
    ctx.restore()
    return
  }

  if (id === 'ondes') {
    const n = [5, 9, 16][densite]
    const cx = W * (0.14 + 0.72 * rnd())
    const cy = H * (0.12 + 0.76 * rnd())
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.02
    for (let i = n; i >= 1; i -= 1) {
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.arc(cx, cy, (R * i) / n, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  if (id === 'pointille') {
    const colonnes = [9, 15, 24][densite]
    const s = W / colonnes
    const rangees = Math.ceil(H / s) + 1
    const inverse = rnd() < 0.5
    const diagonal = rnd() < 0.5
    const miroir = rnd() < 0.5
    const principale = col(0)
    const accent = col(1)
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const x = s * (c + 0.5)
        const y = s * (r + 0.5)
        let t = diagonal
          ? ((miroir ? W - x : x) / W) * 0.5 + (y / (rangees * s)) * 0.5
          : y / (rangees * s)
        if (inverse) t = 1 - t
        const rayon = s * 0.78 * Math.max(0, Math.min(1, t * 1.22 - 0.1))
        if (rayon < s * 0.04) continue
        ctx.fillStyle = (r * 3 + c) % 9 === 0 ? accent : principale
        ctx.beginPath()
        ctx.arc(x, y, rayon, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (id === 'trame') {
    const colonnes = [12, 20, 32][densite]
    const s = W / colonnes
    const rangees = Math.ceil(H / s) + 1
    const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    const cx = W * (0.2 + 0.6 * rnd())
    const cy = H * (0.14 + 0.72 * rnd())
    const R = Math.hypot(W, H) * (0.5 + 0.32 * rnd())
    const coeur = col(0)
    const frange = col(1)
    /* Les cellules sont calées sur des bornes entières : pas de couture ni de
       bord adouci quand on zoome dans l'export. */
    for (let r = 0; r < rangees; r += 1) {
      const y0 = Math.round(r * s)
      const y1 = Math.round((r + 1) * s)
      for (let c = 0; c < colonnes; c += 1) {
        const x0 = Math.round(c * s)
        const x1 = Math.round((c + 1) * s)
        const t = Math.max(0, Math.min(1, 1 - Math.hypot(c * s + s / 2 - cx, r * s + s / 2 - cy) / R))
        const seuil = (bayer[r % 4][c % 4] + 0.5) / 16
        if (t > seuil) {
          ctx.fillStyle = t > seuil + 0.3 ? coeur : frange
          ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0))
        }
      }
    }
    return
  }

  if (id === 'terrazzo') {
    const n = [30, 70, 150][densite]
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i + (i % 3))
      blob(ctx, W * rnd(), H * rnd(), unite * (0.014 + 0.032 * rnd()),
        5 + Math.floor(rnd() * 3), rnd, 0.95)
    }
    return
  }

  /* --- abstraits, seconde série ---------------------------------------------
     Sept familles réglées, là où les douze premières sont libres : une grille
     porte le motif, et c'est la grille qui donne le rythme. Elles se
     reconnaissent à ça, une répétition qu'on peut suivre du doigt, quand les
     blobs et le terrazzo n'en ont aucune. */

  if (id === 'arcade') {
    /* La marque, répétée jusqu'à remplir la page. Le nombre de rangées se
       déduit du nombre de colonnes et non de la densité : une arche large et
       basse n'est plus une arche, elle garde donc son élancement quel que soit
       le format du fichier. */
    const colonnes = [2, 4, 7][densite]
    const largeur = W / colonnes
    const rangees = Math.max(1, Math.round(H / (largeur * 1.3)))
    const hauteur = H / rangees
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const cx = largeur * (c + 0.5)
        const base = hauteur * (r + 1)
        const rang = r * colonnes + c + r
        ctx.fillStyle = col(rang)
        arche(ctx, cx, base, largeur * 0.9, hauteur * 0.9)
        ctx.fillStyle = col(rang + 2)
        arche(ctx, cx, base, largeur * 0.34, hauteur * 0.4)
      }
    }
    return
  }

  if (id === 'truchet') {
    /* Deux quarts de disque opposés par tuile, dans l'un ou l'autre sens : les
       arcs se raccordent d'une tuile à l'autre et dessinent des chemins que
       personne n'a tracés. C'est tout le motif, et il tient à ce que les deux
       quarts partent de coins diagonalement opposés. */
    const colonnes = [4, 7, 12][densite]
    const cote = W / colonnes
    const rangees = Math.ceil(H / cote) + 1
    ctx.fillStyle = col(0)
    ctx.fillRect(0, 0, W, H)
    const quart = (cx: number, cy: number, depart: number) => {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, cote / 2, depart, depart + Math.PI / 2)
      ctx.closePath()
      ctx.fill()
    }
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const x = c * cote
        const y = r * cote
        ctx.fillStyle = col(1 + ((r + c) % 2))
        if (rnd() < 0.5) {
          quart(x, y, 0)
          quart(x + cote, y + cote, Math.PI)
        } else {
          quart(x + cote, y, Math.PI / 2)
          quart(x, y + cote, -Math.PI / 2)
        }
      }
    }
    return
  }

  if (id === 'azulejos') {
    const colonnes = [2, 3, 5][densite]
    const cote = W / colonnes
    const rangees = Math.ceil(H / cote) + 1
    ctx.fillStyle = col(3)
    ctx.fillRect(0, 0, W, H)
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const x = c * cote + cote / 2
        const y = r * cote + cote / 2
        /* Les quatre disques sont posés sur les coins du carreau, à un rayon
           de la diagonale : chacun est donc coupé en quatre par les bords et
           se recompose avec ses voisins. C'est ce qui fait que le carrelage se
           lit comme une surface et non comme une suite de vignettes. */
        ctx.fillStyle = col(0)
        for (let k = 0; k < 4; k += 1) {
          const a = (k * Math.PI) / 2 + Math.PI / 4
          ctx.beginPath()
          ctx.arc(x + Math.cos(a) * cote * 0.707, y + Math.sin(a) * cote * 0.707,
            cote * 0.29, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = col(1)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-cote * 0.25, -cote * 0.25, cote * 0.5, cote * 0.5)
        ctx.restore()
        ctx.fillStyle = col(2)
        for (let k = 0; k < 4; k += 1) {
          const a = (k * Math.PI) / 2
          feuille(ctx, x + Math.cos(a) * cote * 0.14, y + Math.sin(a) * cote * 0.14,
            cote * 0.3, cote * 0.1, a)
        }
        ctx.fillStyle = col(0)
        ctx.beginPath()
        ctx.arc(x, y, cote * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (id === 'vitrail') {
    const colonnes = [3, 5, 8][densite]
    const cote = W / colonnes
    const rangees = Math.ceil(H / cote) + 1
    ctx.fillStyle = col(2)
    ctx.fillRect(0, 0, W, H)
    /* Les sommets sont tirés une fois pour toutes, et deux carreaux voisins
       partagent les leurs. Tirés carreau par carreau, les bords ne
       coïncideraient plus : on verrait des losanges posés côte à côte, avec du
       fond entre eux, au lieu d'un vitrail. Les sommets du pourtour ne bougent
       pas, sinon le verre décollerait du cadre. */
    const noeuds: [number, number][][] = []
    for (let r = 0; r <= rangees; r += 1) {
      noeuds[r] = []
      for (let c = 0; c <= colonnes; c += 1) {
        const bord = c === 0 || c === colonnes || r === 0 || r === rangees
        noeuds[r][c] = [
          c * cote + (bord ? 0 : (rnd() - 0.5) * cote * 0.5),
          r * cote + (bord ? 0 : (rnd() - 0.5) * cote * 0.5),
        ]
      }
    }
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const quadrilatere = [
          noeuds[r][c], noeuds[r][c + 1], noeuds[r + 1][c + 1], noeuds[r + 1][c],
        ]
        const cx = quadrilatere.reduce((somme, p) => somme + p[0], 0) / 4
        const cy = quadrilatere.reduce((somme, p) => somme + p[1], 0) / 4
        ctx.fillStyle = col(r + c + (rnd() < 0.3 ? 1 : 0))
        ctx.beginPath()
        /* Chaque verre se retire de 7 % vers son centre : le plomb n'est pas
           tracé, c'est le fond qui reste entre les carreaux. Un trait aurait
           demandé une épaisseur, donc une valeur en pixels, donc un plomb plus
           épais en vignette qu'en pleine résolution. */
        quadrilatere.forEach((p, k) => {
          const x = p[0] + (cx - p[0]) * 0.07
          const y = p[1] + (cy - p[1]) * 0.07
          if (k) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        })
        ctx.closePath()
        ctx.fill()
      }
    }
    return
  }

  if (id === 'persiennes') {
    const n = [5, 9, 16][densite]
    const diagonale = Math.hypot(W, H)
    ctx.fillStyle = col(2)
    ctx.fillRect(0, 0, W, H)
    /* Les lames sont peintes sur la diagonale de l'image, dans un repère
       tourné : c'est ce qui permet de les faire déborder de tous les côtés
       sans jamais laisser un coin nu, quelle que soit l'inclinaison tirée. */
    const inclinaison = (rnd() < 0.5 ? 1 : -1) * (0.08 + rnd() * 0.2)
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate(inclinaison)
    ctx.translate(-diagonale / 2, -diagonale / 2)
    const pas = diagonale / n
    for (let i = 0; i < n; i += 1) {
      const y = i * pas
      const epaisseur = pas * (0.42 + 0.3 * rnd())
      ctx.fillStyle = col(0)
      ctx.fillRect(-diagonale * 0.2, y, diagonale * 1.4, epaisseur)
      ctx.fillStyle = col(1)
      ctx.fillRect(-diagonale * 0.2, y + epaisseur * 0.24, diagonale * 1.4, epaisseur * 0.34)
    }
    ctx.restore()
    return
  }

  if (id === 'mosaique') {
    const colonnes = [13, 22, 36][densite]
    const cote = W / colonnes
    const rangees = Math.ceil(H / cote) + 1
    /* Les tesselles ne sont pas colorées au hasard : elles suivent la distance
       à un foyer, en trois zones. C'est ce qui donne la forme au fond, et le
       sixième de tesselles tirées à côté est ce qui l'empêche d'être un
       dégradé propre. */
    const cx = W * (0.2 + 0.6 * rnd())
    const cy = H * (0.2 + 0.6 * rnd())
    const rayon = Math.hypot(W, H) * (0.26 + 0.3 * rnd())
    /* Plancher relatif, pas absolu : un joint d'un pixel se voit dans une
       vignette de cent pixels et pas dans un fichier 4K, et la vignette
       montrerait alors un motif plus ajouré que celui qu'on télécharge. */
    const joint = Math.max(unite * 0.0008, cote * 0.14)
    ctx.fillStyle = col(3)
    ctx.fillRect(0, 0, W, H)
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const x = c * cote + (r % 2 ? cote * 0.5 : 0)
        const y = r * cote
        const distance = Math.hypot(x + cote / 2 - cx, y + cote / 2 - cy) / rayon
        const zone = distance < 0.5 ? 0 : distance < 0.95 ? 1 : 2
        ctx.fillStyle = col(zone + (rnd() < 0.16 ? 1 : 0))
        ctx.fillRect(x + joint / 2, y + joint / 2, cote - joint, cote - joint)
      }
    }
    return
  }

  if (id === 'tresse') {
    const n = [3, 5, 8][densite]
    const cote = W / n
    const ruban = cote * 0.6
    const jour = (cote - ruban) / 2
    const rangees = Math.ceil(H / cote) + 1
    ctx.fillStyle = col(3)
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = col(0)
    for (let c = 0; c < n; c += 1) ctx.fillRect(c * cote + jour, 0, ruban, H)
    for (let r = 0; r < rangees; r += 1) {
      const y = r * cote + jour
      for (let c = 0; c < n; c += 1) {
        ctx.fillStyle = col(1)
        /* Tout l'entrelacs tient à cette parité : une case sur deux, le ruban
           horizontal passe entier par-dessus le vertical ; sur l'autre, il est
           interrompu et passe dessous. Sans elle, ce sont deux grilles
           superposées, et l'oeil le voit tout de suite. */
        if ((r + c) % 2 === 0) {
          ctx.fillRect(c * cote, y, cote, ruban)
        } else {
          ctx.fillRect(c * cote, y, jour, ruban)
          ctx.fillRect(c * cote + jour + ruban, y, jour, ruban)
        }
      }
    }
    return
  }

  /* --- abstraits, troisième série ---------------------------------------------
     Quatre familles où une même forme est déformée par un champ lisse plutôt
     que posée sur une grille ou semée. Elles tiennent toutes dans le pinceau
     existant, des aplats fermés : il ne leur manquait qu'une houle
     déterministe et une rampe de teintes. */

  if (id === 'mirage') {
    /* Des rayures verticales pliées par un remous. Chaque rayure garde sa
       largeur et ne fait que se déplacer : c'est ce que fait une nappe d'eau
       sur ce qu'on voit au travers, et c'est aussi ce qui garantit qu'une
       rayure ne se croise jamais elle-même. Le remous est une houle portée
       par une enveloppe : fort près de son foyer, nul ailleurs, si bien que
       les rayures du bord restent droites et disent la règle que celles du
       centre enfreignent. L'enveloppe est un couloir vertical qui serpente,
       et non un foyer ponctuel : un foyer pliait chaque rayure d'une phase
       différente et l'oeil y lisait une marche en travers de l'image, là où
       le couloir plie toutes les rayures du même geste. Le disque est peint
       dessous : il n'apparaît qu'entre les rayures, comme derrière des
       barreaux. */
    const colonnes = [9, 14, 22][densite]
    const pas = Math.max(0.75, H / 2400)
    const largeur = W / colonnes
    const demi = largeur * 0.27
    const remous = houle(rnd)
    const serpente = houle(rnd)
    const fx = W * (0.3 + 0.4 * rnd())
    const portee = W * (0.16 + 0.1 * rnd())
    const ampleur = largeur * (2.5 + 1.5 * rnd())
    ctx.fillStyle = col(1)
    ctx.beginPath()
    ctx.arc(W * (0.25 + 0.5 * rnd()), H * (0.25 + 0.5 * rnd()),
      unite * (0.22 + 0.14 * rnd()), 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col(0)
    for (let i = 0; i < colonnes; i += 1) {
      const centre = largeur * (i + 0.5)
      const decalage = (y: number) => {
        const couloir = fx + serpente((y / H) * 1.6) * W * 0.14
        const distance = (centre - couloir) / portee
        return ampleur * Math.exp(-distance * distance) * remous(y / unite)
      }
      ctx.beginPath()
      ctx.moveTo(centre + decalage(0) - demi, 0)
      for (let y = pas; y < H; y += pas) ctx.lineTo(centre + decalage(y) - demi, y)
      ctx.lineTo(centre + decalage(H) - demi, H)
      ctx.lineTo(centre + decalage(H) + demi, H)
      for (let y = H - pas; y > 0; y -= pas) ctx.lineTo(centre + decalage(y) + demi, y)
      ctx.lineTo(centre + decalage(0) + demi, 0)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  if (id === 'terrasses') {
    /* Des courbes de niveau emboîtées, comme une carte d'un relief qui
       n'existe pas. Le contour est tiré une fois puis seulement réduit :
       c'est ce qui fait que les paliers se suivent, quand des blobs retirés
       à chaque palier auraient donné des flaques sans parenté. Le foyer
       dérive d'un palier à l'autre, et c'est cette dérive qui ouvre les
       terrasses d'un côté plutôt que d'en faire une cible. Les teintes
       suivent la rampe de la palette, du premier ton au dernier ; le relief
       satellite la descend en sens inverse, pour que les deux ne se fondent
       pas là où ils se touchent. */
    const paliers = [5, 8, 12][densite]
    const pointes = 9
    const massif = {
      cx: W * (0.28 + 0.44 * rnd()),
      cy: H * (0.3 + 0.4 * rnd()),
    }
    const loin = Math.max(
      Math.hypot(massif.cx, massif.cy),
      Math.hypot(W - massif.cx, massif.cy),
      Math.hypot(massif.cx, H - massif.cy),
      Math.hypot(W - massif.cx, H - massif.cy),
    )
    const relief = (
      cx: number, cy: number, base: number, n: number, inverse: boolean,
    ) => {
      const rayons = Array.from({ length: pointes }, () => base * (0.82 + 0.5 * rnd()))
      const dx = (rnd() - 0.5) * unite * 0.09
      const dy = (rnd() - 0.5) * unite * 0.09
      for (let i = 0; i < n; i += 1) {
        const reduction = (1 - i / (n + 0.6)) ** 0.92
        const fx = cx + dx * i
        const fy = cy + dy * i
        ctx.fillStyle = palier(C, inverse ? 1 - i / (n - 1) : i / (n - 1))
        const points: [number, number][] = rayons.map((rayon, k) => {
          const angle = (k / pointes) * Math.PI * 2
          return [fx + Math.cos(angle) * rayon * reduction, fy + Math.sin(angle) * rayon * reduction]
        })
        ctx.beginPath()
        ctx.moveTo((points[pointes - 1][0] + points[0][0]) / 2, (points[pointes - 1][1] + points[0][1]) / 2)
        for (let k = 0; k < pointes; k += 1) {
          const suivant = points[(k + 1) % pointes]
          ctx.quadraticCurveTo(points[k][0], points[k][1],
            (points[k][0] + suivant[0]) / 2, (points[k][1] + suivant[1]) / 2)
        }
        ctx.closePath()
        ctx.fill()
      }
    }
    /* Le premier palier doit couvrir la page entière : son rayon le plus
       court part du coin le plus lointain, jamais d'une taille absolue, et
       la marge tient compte du lissage, qui fait passer la courbe par les
       milieux des cordes, en deçà des pointes. */
    relief(massif.cx, massif.cy, loin * 1.45, paliers, false)
    relief(
      W * (0.2 + 0.6 * rnd()), H * (0.55 + 0.35 * rnd()),
      unite * (0.3 + 0.22 * rnd()), Math.max(3, Math.round(paliers * 0.6)), true,
    )
    return
  }

  if (id === 'bassin') {
    /* L'eau d'une piscine vue d'au-dessus : des galets arrondis, et le fond
       qui circule entre eux en un seul réseau. Les sommets sont partagés
       entre carreaux voisins, comme au vitrail, et c'est ce partage qui fait
       le réseau : des galets tirés chacun pour soi laisseraient des flaques
       de fond au lieu de chenaux. Le lissage passe par les milieux des
       côtés, si bien que deux galets voisins longent le même chenal. */
    const colonnes = [4, 6, 9][densite]
    const cote = W / colonnes
    const rangees = Math.ceil(H / cote) + 1
    const noeuds: [number, number][][] = []
    for (let r = 0; r <= rangees; r += 1) {
      noeuds[r] = []
      for (let c = 0; c <= colonnes; c += 1) {
        const bord = c === 0 || c === colonnes || r === 0 || r === rangees
        noeuds[r][c] = [
          c * cote + (bord ? 0 : (rnd() - 0.5) * cote * 0.55),
          r * cote + (bord ? 0 : (rnd() - 0.5) * cote * 0.55),
        ]
      }
    }
    for (let r = 0; r < rangees; r += 1) {
      for (let c = 0; c < colonnes; c += 1) {
        const quadrilatere = [
          noeuds[r][c], noeuds[r][c + 1], noeuds[r + 1][c + 1], noeuds[r + 1][c],
        ]
        const gx = quadrilatere.reduce((somme, p) => somme + p[0], 0) / 4
        const gy = quadrilatere.reduce((somme, p) => somme + p[1], 0) / 4
        /* Le retrait est une distance, pas une part : le chenal garde à peu
           près la même largeur le long d'une grande arête comme d'une
           petite. Les coins reculent deux fois plus que les milieux
           d'arêtes : c'est ce qui arrondit l'angle sans creuser le flanc,
           et donc ce qui fait des galets emboîtés plutôt que des oeufs. */
        const retrait = cote * (0.055 + 0.03 * rnd())
        const recule = (p: readonly [number, number], part: number): [number, number] => {
          const dx = gx - p[0]
          const dy = gy - p[1]
          const d = Math.hypot(dx, dy) || 1
          return [p[0] + (dx / d) * retrait * part, p[1] + (dy / d) * retrait * part]
        }
        const galet: [number, number][] = []
        for (let k = 0; k < 4; k += 1) {
          const suivant = quadrilatere[(k + 1) % 4]
          galet.push(recule(quadrilatere[k], 1.9))
          galet.push(recule([
            (quadrilatere[k][0] + suivant[0]) / 2, (quadrilatere[k][1] + suivant[1]) / 2,
          ], 1))
        }
        ctx.fillStyle = col(rnd() < 0.22 ? 3 : 0)
        ctx.beginPath()
        ctx.moveTo((galet[7][0] + galet[0][0]) / 2, (galet[7][1] + galet[0][1]) / 2)
        for (let k = 0; k < 8; k += 1) {
          const suivant = galet[(k + 1) % 8]
          ctx.quadraticCurveTo(galet[k][0], galet[k][1],
            (galet[k][0] + suivant[0]) / 2, (galet[k][1] + suivant[1]) / 2)
        }
        ctx.closePath()
        ctx.fill()
        /* Le reflet plus sombre reste sous le réseau : son rayon et son
           écart sont bornés pour qu'il ne morde jamais dans un chenal. */
        ctx.fillStyle = col(1)
        blob(ctx, gx + (rnd() - 0.5) * cote * 0.12, gy + (rnd() - 0.5) * cote * 0.12,
          cote * (0.15 + 0.09 * rnd()), 7, rnd, 0.55)
      }
    }
    /* Quelques gouttes posées dans les chenaux, aux carrefours du réseau. */
    ctx.fillStyle = col(2)
    for (let r = 1; r < rangees; r += 1) {
      for (let c = 1; c < colonnes; c += 1) {
        if (rnd() >= 0.16) continue
        ctx.beginPath()
        ctx.arc(noeuds[r][c][0], noeuds[r][c][1], cote * (0.03 + 0.02 * rnd()), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (id === 'strates') {
    /* Des couches verticales qui se recouvrent de gauche à droite, chacune
       bordée par sa propre houle : les frontières se croisent parfois, et
       une couche passe alors devant sa voisine, ce qui est exactement ce qui
       sépare des strates d'un dégradé. Les teintes suivent la rampe de la
       palette, dans un sens ou dans l'autre ; la première couche laisse par
       endroits un filet de fond sur sa rive, au gré de sa houle. */
    const n = [4, 7, 10][densite]
    const pas = Math.max(0.75, H / 2400)
    const inverse = rnd() < 0.5
    for (let i = 0; i < n; i += 1) {
      const bord = houle(rnd)
      const base = W * (0.05 + (0.92 * i) / n)
      const amplitude = W * (0.05 + 0.1 * rnd())
      const cycles = 1.2 + 1.3 * rnd()
      const frontiere = (y: number) => base + amplitude * bord((y / H) * cycles)
      ctx.fillStyle = palier(C, (inverse ? n - 1 - i : i) / (n - 1))
      ctx.beginPath()
      ctx.moveTo(W, 0)
      ctx.lineTo(W, H)
      ctx.lineTo(frontiere(H), H)
      for (let y = H - pas; y > 0; y -= pas) ctx.lineTo(frontiere(y), y)
      ctx.lineTo(frontiere(0), 0)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  /* --- paysages ---------------------------------------------------------------
     Trois familles qui ont un haut et un bas. C'est ce qui les sépare des
     abstraits, et c'est aussi ce qui les rend commodes en fond d'écran : la
     zone des icônes tombe dans leur partie basse, la plus chargée, et la sonde
     de lisibilité y trouve un aplat plutôt qu'un motif. */

  if (id === 'sommets') {
    const n = [3, 5, 8][densite]
    for (let i = 0; i < n; i += 1) {
      const base = H * (0.32 + (0.74 * i) / n)
      const pointes = 2 + Math.floor(rnd() * 4)
      const segment = W / pointes
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.moveTo(0, H)
      ctx.lineTo(0, base - H * 0.05 * rnd())
      for (let p = 0; p < pointes; p += 1) {
        ctx.lineTo(segment * (p + 0.5), base - H * (0.07 + 0.17 * rnd()))
        ctx.lineTo(segment * (p + 1), base - H * 0.03 * rnd())
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  if (id === 'horizon') {
    const n = [3, 6, 10][densite]
    const hauteurAstre = H * (0.26 + 0.24 * rnd())
    const rayonAstre = unite * (0.17 + 0.13 * rnd())
    ctx.fillStyle = col(0)
    ctx.beginPath()
    ctx.arc(W * (0.28 + 0.44 * rnd()), hauteurAstre, rayonAstre, 0, Math.PI * 2)
    ctx.fill()
    /* La ligne d'horizon coupe l'astre au-dessus de son centre : c'est ce qui
       le fait se coucher plutôt que flotter. Les bandes en partent, et leur
       hauteur est tirée pour que l'eau ne soit pas un dégradé régulier. */
    const ligne = hauteurAstre + rayonAstre * 0.42
    const bande = (H - ligne) / n
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = col(i + 1)
      ctx.fillRect(0, ligne + bande * i, W, bande * (0.55 + 0.7 * rnd()))
    }
    /* Le filet de l'horizon garde un plancher d'un pixel. C'est le seul de
       cette famille : en dessous il disparaît de la vignette, et une vignette
       d'Horizon sans horizon ne nomme plus rien. En pleine résolution le terme
       proportionnel l'emporte de loin. */
    ctx.fillStyle = col(2)
    ctx.fillRect(0, ligne, W, Math.max(1, H * 0.007))
    return
  }

  if (id === 'nuages') {
    const n = [3, 6, 11][densite]
    for (let i = 0; i < n; i += 1) {
      const R = unite * (0.075 + 0.075 * rnd())
      const lobes = 3 + Math.floor(rnd() * 2)
      const largeur = R * (lobes * 0.74 + 0.9)
      const cx = W * (0.07 + 0.86 * rnd())
      const cy = H * (0.1 + 0.8 * rnd())
      ctx.fillStyle = col(i)
      /* Un socle en gélule, puis des lobes posés dessus, les plus gros au
         milieu : c'est la silhouette de nuage la plus courte qui se lise
         comme telle. Le socle a la base plate qu'aurait une suite de disques
         seule, mais sans les creux entre eux. */
      gelule(ctx, cx - largeur / 2, cy, largeur, R * 0.84)
      for (let k = 0; k < lobes; k += 1) {
        const t = lobes === 1 ? 0.5 : k / (lobes - 1)
        const lx = cx - largeur / 2 + R * 0.62 + t * (largeur - R * 1.24)
        const lr = R * (0.5 + 0.46 * (1 - Math.abs(t - 0.5) * 1.3))
        ctx.beginPath()
        ctx.arc(lx, cy + R * 0.22 - lr * 0.52, lr, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (id === 'dunes') {
    /* Des crêtes de sable superposées, du haut du ciel au bas de la page.
       Chaque dune est bordée par une houle redressée : la valeur absolue
       d'une houle fait des V là où elle s'annule, et la retourner donne des
       crêtes vives entre des flancs lents. C'est exactement le profil d'une
       dune, une arête nette entre deux pentes douces, et il sort des aides
       existantes sans rien leur ajouter. Les teintes suivent la rampe de la
       palette, dans un sens ou dans l'autre : le sable descend vers l'ombre,
       ou en sort. */
    const n = [4, 6, 9][densite]
    const pas = Math.max(0.75, W / 2400)
    const inverse = rnd() < 0.5
    for (let i = 0; i < n; i += 1) {
      const bord = houle(rnd)
      const sommet = H * (0.16 + (0.8 * i) / n)
      const creux = H * (0.09 + 0.07 * rnd())
      const cycles = 0.6 + 0.9 * rnd()
      const derive = rnd() * 2
      const crete = (x: number) => sommet + creux * Math.abs(bord(derive + (x / W) * cycles))
      ctx.fillStyle = palier(C, (inverse ? n - 1 - i : i) / (n - 1))
      ctx.beginPath()
      ctx.moveTo(0, crete(0))
      for (let x = pas; x < W; x += pas) ctx.lineTo(x, crete(x))
      ctx.lineTo(W, crete(W))
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  if (id === 'falaises') {
    /* Des parois qui tombent dans une mer plate. La mer est peinte d'abord,
       d'un seul aplat : c'est elle qui fait le calme de la famille, et c'est
       sur elle que la zone des icônes retombe. Les parois s'avancent depuis
       un bord, les plus lointaines d'abord : chacune est plus étroite et
       plus haute que la précédente, si bien que chaque couche recouvre la
       précédente sauf son épaule, et l'oeil lit une côte qui recule. Le
       flanc descend en redans francs plutôt qu'en courbe : une falaise est
       une cassure, pas une colline, et c'est le trait droit qui le dit. */
    const n = [3, 4, 6][densite]
    const sens = rnd() < 0.5 ? 1 : -1
    const bord = sens > 0 ? 0 : W
    const merT = H * (0.5 + 0.16 * rnd())
    ctx.fillStyle = col(0)
    ctx.fillRect(0, merT, W, H - merT)
    for (let i = 0; i < n; i += 1) {
      const portee = W * (0.3 + (0.62 * (n - i)) / n) * (0.82 + 0.24 * rnd())
      const sommet = merT - (merT - H * 0.05) * ((i + 1) / n) * (0.72 + 0.3 * rnd())
      const pied = bord + sens * portee
      const epauleX = bord + sens * portee * (0.42 + 0.2 * rnd())
      const epauleY = sommet + (rnd() - 0.5) * H * 0.05
      /* Les bases s'étagent d'un cran sous la ligne d'eau : la paroi proche
         mouille plus bas que la lointaine, et le rivage se lit sans trait. */
      const base = merT + H * 0.012 * (i + 1)
      const marches = 2 + Math.floor(rnd() * 3)
      /* Les redans sont tirés en poids puis normalisés : le nombre de
         tirages ne dépend que du nombre de marches, et le pied retombe
         exactement où la mer l'attend. */
      const poids = Array.from(
        { length: marches },
        () => [0.35 + rnd(), 0.35 + rnd()] as const,
      )
      const totalX = poids.reduce((somme, p) => somme + p[0], 0)
      const totalY = poids.reduce((somme, p) => somme + p[1], 0)
      ctx.fillStyle = col(i + 1)
      ctx.beginPath()
      ctx.moveTo(bord, base)
      ctx.lineTo(bord, sommet)
      ctx.lineTo(epauleX, epauleY)
      let xM = epauleX
      let yM = epauleY
      for (const [px, py] of poids) {
        xM += ((pied - epauleX) * px) / totalX
        ctx.lineTo(xM, yM)
        yM += ((base - epauleY) * py) / totalY
        ctx.lineTo(xM, yM)
      }
      ctx.closePath()
      ctx.fill()
    }
    /* Quelques rides posées sur l'eau : assez pour dire que la mer est une
       mer, pas assez pour lui retirer son aplat. */
    const rides = [2, 4, 6][densite]
    ctx.fillStyle = col(1)
    for (let k = 0; k < rides; k += 1) {
      const longueur = W * (0.07 + 0.11 * rnd())
      gelule(ctx, W * 0.05 + (W * 0.9 - longueur) * rnd(),
        merT + (H - merT) * (0.2 + 0.68 * rnd()), longueur, unite * 0.007)
    }
    return
  }

  if (id === 'archipel') {
    /* Des îles posées sur l'eau, et un ciel laissé haut : c'est le vide qui
       fait le large, et deux filaments de nuage suffisent à l'habiter. Les
       îles sont des demi-ellipses à fond plat, une bosse posée dessus pour
       casser la symétrie ; elles grandissent en descendant vers le bas de la
       page, et c'est toute la perspective, la proche est grande et basse, la
       lointaine petite et contre l'horizon. Chaque île traîne son reflet,
       une gélule mêlée à la teinte de l'eau : ni l'île ni la mer, donc
       lisible sur les deux. */
    const n = [3, 5, 8][densite]
    const merT = H * (0.4 + 0.14 * rnd())
    ctx.fillStyle = col(0)
    ctx.fillRect(0, merT, W, H - merT)
    const filaments = 2 + Math.floor(rnd() * 2)
    ctx.fillStyle = col(1)
    for (let k = 0; k < filaments; k += 1) {
      const longueur = W * (0.12 + 0.16 * rnd())
      gelule(ctx, W * 0.06 + (W * 0.88 - longueur) * rnd(),
        H * (0.06 + 0.2 * rnd()), longueur, unite * (0.009 + 0.006 * rnd()))
    }
    for (let i = 0; i < n; i += 1) {
      /* La part avance avec l'indice : les lointaines sont peintes d'abord,
         et une proche qui les croise passe devant, comme la dernière couche
         de papier. */
      const part = (i + 0.15 + 0.7 * rnd()) / n
      const ligne = merT + (H - merT) * (0.06 + 0.86 * part)
      const R = unite * (0.05 + 0.17 * part) * (0.8 + 0.4 * rnd())
      const cx = W * (0.08 + 0.84 * rnd())
      const teinte = col(i + 1)
      ctx.fillStyle = teinte
      ctx.beginPath()
      ctx.ellipse(cx, ligne, R, R * (0.32 + 0.2 * rnd()), 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      const bosse = R * (0.4 + 0.25 * rnd())
      ctx.beginPath()
      ctx.ellipse(cx + (rnd() - 0.5) * R * 0.9, ligne, bosse,
        bosse * (0.9 + 0.4 * rnd()), 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = melange(col(0), teinte, 0.5)
      gelule(ctx, cx - R * 0.7, ligne + R * 0.06, R * 1.4, R * 0.09)
    }
    return
  }

  /* --- figures, seconde série ------------------------------------------------- */

  if (id === 'agrumes') {
    const n = [3, 6, 12][densite]
    for (let i = 0; i < n; i += 1) {
      const cx = W * (0.08 + 0.84 * rnd())
      const cy = H * (0.07 + 0.86 * rnd())
      const R = unite * (0.07 + 0.09 * rnd())
      /* Trois disques concentriques : l'écorce, le ziste, puis les quartiers
         par-dessus. Les quartiers sont des secteurs écartés de neuf
         centièmes de radian, ce qui laisse voir le ziste entre eux sans avoir
         à tracer de trait. */
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = col(i + 2)
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = col(i + 1)
      const quartiers = 6 + Math.floor(rnd() * 3)
      const rotation = rnd() * Math.PI * 2
      for (let k = 0; k < quartiers; k += 1) {
        const a0 = rotation + (k / quartiers) * Math.PI * 2 + 0.09
        const a1 = rotation + ((k + 1) / quartiers) * Math.PI * 2 - 0.09
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, R * 0.72, a0, a1)
        ctx.closePath()
        ctx.fill()
      }
    }
    return
  }

  if (id === 'palmes') {
    const n = [3, 6, 11][densite]
    for (let i = 0; i < n; i += 1) {
      const x = W * (0.06 + 0.88 * rnd())
      const y = H * (0.06 + 0.88 * rnd())
      const L = unite * (0.15 + 0.16 * rnd())
      const axe = rnd() * Math.PI * 2
      const folioles = 7 + Math.floor(rnd() * 5)
      ctx.fillStyle = col(i)
      for (let k = 0; k < folioles; k += 1) {
        const t = (k + 1) / folioles
        /* Les folioles alternent de part et d'autre de la nervure et se
           redressent vers la pointe : sans ce resserrement, la palme finit en
           plumeau au lieu de finir en pointe. */
        const ecart = (k % 2 ? 1 : -1) * (0.92 - 0.42 * t)
        feuille(ctx, x + Math.cos(axe) * L * t * 0.9, y + Math.sin(axe) * L * t * 0.9,
          L * (0.24 + 0.4 * Math.sin(t * Math.PI)), L * 0.085, axe + ecart)
      }
      ctx.fillStyle = col(i + 2)
      feuille(ctx, x, y, L, L * 0.04, axe)
    }
    return
  }

  if (id === 'vases') {
    const n = [2, 4, 7][densite]
    /* Les vases sont posés sur une étagère et non semés : ce sont des objets,
       ils ont un dessus et un dessous, et deux qui se chevaucheraient ne se
       liraient plus. Le nombre de colonnes suit le rapport d'aspect, pour que
       les cases restent à peu près carrées d'un format à l'autre. */
    const colonnes = Math.max(1, Math.round(Math.sqrt((n * W) / H)))
    const rangees = Math.max(1, Math.ceil(n / colonnes))
    const largeurCase = W / colonnes
    const hauteurCase = H / rangees
    for (let i = 0; i < n; i += 1) {
      const cx = largeurCase * ((i % colonnes) + 0.5)
      const base = hauteurCase * (Math.floor(i / colonnes) + 0.9)
      const hauteur = hauteurCase * (0.52 + 0.24 * rnd())
      const ventre = largeurCase * (0.34 + 0.22 * rnd())
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.ellipse(cx, base - hauteur * 0.4, ventre / 2, hauteur * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(cx - ventre * 0.15, base - hauteur, ventre * 0.3, hauteur * 0.52)
      ctx.fillStyle = col(i + 1)
      gelule(ctx, cx - ventre * 0.27, base - hauteur - hauteur * 0.05, ventre * 0.54, hauteur * 0.11)
      gelule(ctx, cx - ventre * 0.21, base - hauteur * 0.06, ventre * 0.42, hauteur * 0.09)
    }
    return
  }

  if (id === 'poissons') {
    const n = [4, 9, 18][densite]
    for (let i = 0; i < n; i += 1) {
      const x = W * (0.08 + 0.84 * rnd())
      const y = H * (0.07 + 0.86 * rnd())
      const L = unite * (0.1 + 0.11 * rnd())
      /* Le sens est tiré, et il passe par une symétrie du repère : un poisson
         dessiné puis retourné garde exactement les mêmes proportions, ce
         qu'un second jeu de coordonnées n'aurait pas garanti. */
      const sens = rnd() < 0.5 ? 1 : -1
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(sens, 1)
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.ellipse(0, 0, L * 0.5, L * 0.27, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-L * 0.42, 0)
      ctx.lineTo(-L * 0.82, -L * 0.26)
      ctx.lineTo(-L * 0.82, L * 0.26)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = col(i + 2)
      ctx.beginPath()
      ctx.arc(L * 0.27, -L * 0.06, L * 0.055, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    return
  }

  if (id === 'corolle') {
    /* Une seule grande fleur, à la manière des papiers découpés : les
       pétales sont les panneaux du fond, et ce qu'on lit comme des nervures
       est le fond qui affleure entre eux. Les frontières sont tirées une
       fois pour toutes, avec leur courbure : les deux panneaux qui bordent
       un même chenal doivent le courber du même geste, sans quoi le chenal
       s'étrangle ou bâille. C'est le partage des sommets du vitrail, en
       polaire. */
    const n = [7, 10, 14][densite]
    const cx = W * (0.3 + 0.4 * rnd())
    const cy = H * (0.22 + 0.2 * rnd())
    const R = Math.hypot(W, H) * 1.35
    const coeur = unite * (0.13 + 0.05 * rnd())
    const chenal = unite * (0.015 + 0.007 * rnd())
    const naissance = coeur + chenal * 2.4
    const depart = rnd() * Math.PI * 2
    const courbure = unite * 0.62
    const frontieres = Array.from({ length: n }, (_, j) => ({
      angle: depart + ((j + (rnd() - 0.5) * 0.44) / n) * Math.PI * 2,
      flexion: (rnd() - 0.5) * unite * 0.3,
    }))
    for (let j = 0; j < n; j += 1) {
      const ici = frontieres[j]
      const la = frontieres[(j + 1) % n]
      const u0: [number, number] = [Math.cos(ici.angle), Math.sin(ici.angle)]
      const u1: [number, number] = [Math.cos(la.angle), Math.sin(la.angle)]
      const n0: [number, number] = [-u0[1], u0[0]]
      const n1: [number, number] = [-u1[1], u1[0]]
      ctx.fillStyle = col(1)
      ctx.beginPath()
      ctx.moveTo(cx + u0[0] * naissance + n0[0] * chenal, cy + u0[1] * naissance + n0[1] * chenal)
      ctx.quadraticCurveTo(
        cx + u0[0] * courbure + n0[0] * (chenal + ici.flexion),
        cy + u0[1] * courbure + n0[1] * (chenal + ici.flexion),
        cx + u0[0] * R + n0[0] * chenal, cy + u0[1] * R + n0[1] * chenal,
      )
      ctx.lineTo(cx + u1[0] * R - n1[0] * chenal, cy + u1[1] * R - n1[1] * chenal)
      ctx.quadraticCurveTo(
        cx + u1[0] * courbure - n1[0] * (chenal - la.flexion),
        cy + u1[1] * courbure - n1[1] * (chenal - la.flexion),
        cx + u1[0] * naissance - n1[0] * chenal, cy + u1[1] * naissance - n1[1] * chenal,
      )
      ctx.closePath()
      ctx.fill()
      /* L'ombre du pétale : posée sur la bissectrice, bornée par la largeur
         du panneau à cette distance pour ne pas mordre dans un chenal. */
      const milieu = (ici.angle + la.angle
        + (la.angle < ici.angle ? Math.PI * 2 : 0)) / 2
      const ouverture = (la.angle + (la.angle < ici.angle ? Math.PI * 2 : 0) - ici.angle) / 2
      const distance = naissance + unite * (0.2 + 0.42 * rnd())
      const place = distance * Math.sin(ouverture) - chenal * 2
      const taille = Math.min(place * 0.66, unite * (0.09 + 0.07 * rnd()))
      if (taille > unite * 0.035) {
        ctx.fillStyle = col(2)
        blob(ctx, cx + Math.cos(milieu) * distance, cy + Math.sin(milieu) * distance,
          taille, 7, rnd, 0.5)
      }
    }
    /* La tige, puis le cœur par-dessus : elle en sort, elle n'y entre pas. */
    const demiTige = unite * 0.024
    const flexionTige = (rnd() - 0.5) * unite * 0.34
    const derive = (rnd() - 0.5) * unite * 0.22
    ctx.fillStyle = col(0)
    ctx.beginPath()
    ctx.moveTo(cx - demiTige, cy)
    ctx.quadraticCurveTo(cx + flexionTige - demiTige, (cy + H) / 2, cx + derive - demiTige, H)
    ctx.lineTo(cx + derive + demiTige, H)
    ctx.quadraticCurveTo(cx + flexionTige + demiTige, (cy + H) / 2, cx + demiTige, cy)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = col(3)
    ctx.beginPath()
    ctx.arc(cx, cy, coeur, 0, Math.PI * 2)
    ctx.fill()
    const penchant = rnd() * Math.PI * 2
    ctx.fillStyle = col(2)
    ctx.beginPath()
    ctx.arc(cx + Math.cos(penchant) * coeur * 0.32, cy + Math.sin(penchant) * coeur * 0.32,
      coeur * 0.42, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (id === 'vagues') {
    /* Le pas d'échantillonnage suit la largeur : la courbe reste lisse même
       quand on zoome à 100 % dans un fond d'écran 4K. */
    const n = [4, 7, 11][densite]
    const pas = Math.max(0.75, W / 2400)
    for (let i = 0; i < n; i += 1) {
      const y = H * (0.14 + (0.88 * i) / n)
      const amplitude = H * (0.012 + 0.032 * rnd())
      const periode = W / (0.5 + 1.7 * rnd())
      const phase = rnd() * Math.PI * 2
      ctx.fillStyle = col(i)
      ctx.beginPath()
      ctx.moveTo(0, y + Math.sin(phase) * amplitude)
      for (let x = 0; x <= W; x += pas) {
        ctx.lineTo(x, y + Math.sin(phase + (x / periode) * Math.PI * 2) * amplitude)
      }
      ctx.lineTo(W, y + Math.sin(phase + (Math.PI * 2 * W) / periode) * amplitude)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  /* Toute famille ajoutée à `IdFamille` doit avoir sa branche ci-dessus : sans
     elle, `id` ne se réduit pas à `never` et la compilation s'arrête ici, au
     lieu de retomber en silence sur les vagues. */
  id satisfies never
}

/* ---------- grain ----------------------------------------------------------- */

/*
 * Grain papier. Il fait deux choses : il donne la texture de la direction
 * artistique, et il trame le voile. Sans grain, une marche d'un cran sur 255
 * s'étale parfois sur plusieurs centaines de lignes et se lit comme une bande,
 * surtout sur les palettes très sombres.
 *
 * Trois choix, tous mesurés :
 * - mouchetis blanc / noir / transparent en source-over, et non un bruit gris
 *   en overlay : l'overlay ne bouge quasiment pas sur un fond sombre, donc il
 *   ne tramait rien là où c'était le plus nécessaire, tout en pesant trois
 *   fois plus lourd ;
 * - amplitude de trois niveaux crête à crête, la même sur toute la gamme :
 *   assez pour casser la marche, 1,2 % sur un ton moyen, invisible à l'œil ;
 * - petite tuile de 8 px, un pixel d'appareil par grain : la tuile se répète
 *   dans la ligne, donc le PNG la retrouve au lieu de la recoder, et le grain
 *   ne fait jamais de blocs quand on zoome.
 */

const TUILE_GRAIN = 8
const ALPHA_GRAIN = 3 /* sur 255 */
let tuile: HTMLCanvasElement | null = null

function tuileDeGrain(): HTMLCanvasElement {
  if (tuile) return tuile
  const n = document.createElement('canvas')
  n.width = TUILE_GRAIN
  n.height = TUILE_GRAIN
  const ctx = n.getContext('2d')
  if (ctx) {
    const image = ctx.createImageData(TUILE_GRAIN, TUILE_GRAIN)
    const d = image.data
    const rnd = alea(0x41504c41)
    for (let i = 0; i < d.length; i += 4) {
      const k = Math.floor(rnd() * 3)
      if (k === 0) {
        d[i] = 255
        d[i + 1] = 255
        d[i + 2] = 255
        d[i + 3] = ALPHA_GRAIN
      } else if (k === 1) {
        d[i + 3] = ALPHA_GRAIN
      } else {
        d[i + 3] = 0
      }
    }
    ctx.putImageData(image, 0, 0)
  }
  tuile = n
  return tuile
}

export function peindreGrain(ctx: Ctx, W: number, H: number): void {
  const motif = ctx.createPattern(tuileDeGrain(), 'repeat')
  if (!motif) return
  ctx.save()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = motif
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

/* ---------- la version sombre ------------------------------------------------ */

/**
 * Où la version sombre amène le motif : une luminance, pas une opacité.
 *
 * C'est le point qu'une première version avait manqué, et il tient à ceci : le
 * voile de lisibilité vise déjà 0,17, et il y arrive. Poser par-dessus un aplat
 * noir d'opacité fixe ne donnait donc rien de plus sombre, le voile de l'autre
 * version ayant fait le même chemin par un autre moyen. Mesuré : sur huit
 * palettes du catalogue, la version dite sombre ressortait de la même clarté
 * que la claire, à un centième près, et sur deux elle ressortait plus claire.
 *
 * Une cible, elle, ne peut pas être rattrapée par le voile : 0,05 est
 * nettement sous le seuil que le voile vise, et l'écart se voit. Elle rend
 * aussi toutes les palettes également sombres, ce qui est exactement ce qu'on
 * attend d'une version sombre : la même obscurité, quel que soit le motif.
 *
 * Et elle porte son propre verdict. À 0,05, le rapport des libellés clairs est
 * de 10,5:1, très au-dessus du seuil AA : la version sombre est lisible par
 * construction, pour toutes les familles et toutes les palettes.
 */
export const CIBLE_SOMBRE = 0.05

/** Au-delà, il ne resterait plus de motif à regarder. */
export const OMBRE_MAX = 0.85

/**
 * L'opacité de l'aplat noir qui amène `L` sur la cible.
 *
 * L'inverse de `luminanceAssombrie`, borné des deux côtés. En bas parce qu'un
 * motif déjà plus sombre que la cible n'a rien à gagner à être éclairci, ce
 * qu'un aplat noir ne saurait de toute façon pas faire ; en haut parce qu'au
 * delà il ne resterait qu'un rectangle noir.
 */
export function forceSombre(L: number, cible = CIBLE_SOMBRE): number {
  if (!(L > cible)) return 0
  return Math.min(OMBRE_MAX, 1 - (cible / L) ** (1 / 2.4))
}

/**
 * La luminance relative d'une image assombrie par un aplat noir.
 *
 * Un aplat noir à l'opacité `a` multiplie chaque canal sRGB par `1 - a`. La
 * luminance relative, elle, passe par la puissance 2,4 de la linéarisation :
 * elle est donc multipliée par `(1 - a)` élevé à cette puissance.
 *
 * C'est ce qui permet à la sonde d'assombrir sans repeindre : la moyenne des
 * pixels assombris est la moyenne assombrie, et le résultat est au pixel près
 * celui qu'on obtiendrait en mesurant l'image peinte.
 */
export function luminanceAssombrie(L: number, force: number): number {
  return Math.max(0, L) * (1 - force) ** 2.4
}

/* ---------- sonde de lisibilité --------------------------------------------- */

/*
 * On mesure la luminance de la zone des icônes sur une petite sonde, jamais sur
 * l'image finale : mêmes chiffres pour l'aperçu et pour l'export, et aucun
 * getImageData de 100 Mo sur un fond d'écran 4K.
 */

let sonde: HTMLCanvasElement | null = null
const memoire = new Map<string, Mesure>()

/**
 * On borne la surface de la sonde, pas son grand côté : borner le grand côté
 * écrasait le rapport d'aspect au-delà de 3,44:1, si bien qu'un format
 * panoramique était mesuré sur une autre composition que celle exportée ; le
 * voile brûlé dans le PNG et le contraste annoncé portaient alors sur une image
 * qui n'existait pas.
 */
const SURFACE_SONDE = 200000
const COTE_SONDE_MAX = 4000
const MEMOIRE_MAX = 400

function canevasDeSonde(w: number, h: number): HTMLCanvasElement {
  if (!sonde) sonde = document.createElement('canvas')
  if (sonde.width !== w || sonde.height !== h) {
    sonde.width = w
    sonde.height = h
  }
  return sonde
}

export function mesurer(
  id: IdFamille, idPalette: IdPaletteQuelconque, densite: Densite, graine: number,
  largeur: number, hauteur: number, sombre = false,
): Mesure {
  const P = palette(idPalette)
  const rapport = largeur > 0 && hauteur > 0 ? largeur / hauteur : 0.5
  const cle =
    `${id}|${idPalette}|${densite}|${graine}|${Math.round(rapport * 1000)}|${sombre ? 's' : 'c'}`
  const connue = memoire.get(cle)
  if (connue) return connue

  const PH = Math.max(24, Math.min(COTE_SONDE_MAX, Math.round(Math.sqrt(SURFACE_SONDE / rapport))))
  const PW = Math.max(24, Math.min(COTE_SONDE_MAX, Math.round(PH * rapport)))

  const canevas = canevasDeSonde(PW, PH)
  const ctx = canevas.getContext('2d', { willReadFrequently: true })
  let L = 0.4
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = P.fond
    ctx.fillRect(0, 0, PW, PH)
    formes(ctx, PW, PH, id, P.couleurs, densite, alea(graineDeDessin(id, densite, graine)), Math.min(PW, PH))

    try {
      const y0 = Math.round(PH * 0.24)
      const y1 = Math.round(PH * 0.92)
      const d = ctx.getImageData(0, y0, PW, Math.max(1, y1 - y0)).data
      const pixels = d.length / 4
      const pas = Math.max(1, Math.floor(pixels / 2600)) * 4
      let somme = 0
      let n = 0
      for (let i = 0; i < d.length; i += pas) {
        somme += luminance(d[i], d[i + 1], d[i + 2])
        n += 1
      }
      if (n) L = somme / n
    } catch {
      /* Canevas verrouillé : on garde la valeur neutre. */
    }
  }

  /* L'ombre est dosée ici, avant tout le reste, et c'est ce qui rend le verdict
     vrai : la couleur des libellés, la force du voile et le rapport de
     contraste sont ceux du fichier assombri, pas ceux d'un autre fichier
     corrigé après coup. Assombrir la luminance revient exactement à assombrir
     l'image, parce que la sonde en fait la moyenne et qu'un aplat noir
     multiplie chaque pixel par le même facteur.

     Le voile qui suit trouvera presque toujours qu'il n'a plus rien à faire :
     la cible sombre est sous la sienne. C'est voulu, et c'est ce qui évite deux
     couches qui se disputent la même luminance. */
  const ombre = sombre ? forceSombre(L) : 0
  if (ombre > 0) L = luminanceAssombrie(L, ombre)

  const libelles = L > 0.5 ? 'sombre' : 'clair'
  let voile = 0
  if (libelles === 'clair') {
    const cible = 0.17
    if (L > cible) voile = Math.min(0.5, (L - cible) / Math.max(0.05, L - 0.02))
  } else {
    const cible = 0.68
    if (L < cible) voile = Math.min(0.44, (cible - L) / Math.max(0.05, 0.96 - L))
  }

  const apres = libelles === 'clair'
    ? L * (1 - voile) + 0.018 * voile
    : L * (1 - voile) + 0.95 * voile
  const contraste = libelles === 'clair' ? 1.05 / (apres + 0.05) : (apres + 0.05) / 0.068

  const mesure: Mesure = { libelles, voile, contraste, luminance: L, ombre }
  memoire.set(cle, mesure)
  /* Plafond simple : on évince la plus ancienne entrée, pas la moins
     utilisée. À quatre cents mesures, raffiner ne changerait rien. */
  if (memoire.size > MEMOIRE_MAX) {
    const premiere = memoire.keys().next()
    if (!premiere.done) memoire.delete(premiere.value)
  }
  return mesure
}

/* ---------- voile de lisibilité ---------------------------------------------- */

/*
 * Le voile pousse le fond vers la couleur de libellé la plus sûre, juste ce
 * qu'il faut pour tenir sous les icônes.
 *
 * Il est peint en bandes à opacité constante, jamais avec un
 * createLinearGradient : le navigateur tramait le dégradé pixel par pixel, ce
 * qui empêchait toute compression et triplait le poids du PNG. Avec 320 bandes,
 * aucune marche ne dépasse un cran sur 255, et le grain se charge de la casser.
 */

const PALIERS: readonly (readonly [number, number])[] = [
  [0, 0.9], [0.2, 0.78], [0.78, 0.96], [1, 1.14],
]
const BANDES = 320

/** L'opacité du voile à la hauteur `u`, de 0 en haut à 1 en bas. */
export function alphaDuVoile(u: number, force: number): number {
  let i = 1
  while (i < PALIERS.length - 1 && u > PALIERS[i][0]) i += 1
  const p = PALIERS[i - 1]
  const q = PALIERS[i]
  const k = q[0] === p[0] ? 0 : (u - p[0]) / (q[0] - p[0])
  const facteur = p[1] + (q[1] - p[1]) * Math.max(0, Math.min(1, k))
  return Math.min(0.62, force * facteur)
}

/**
 * L'aplat noir de la version sombre : un seul rectangle, à l'opacité dosée.
 *
 * Uniforme, là où le voile est dégradé. Le voile ne couvre que la zone des
 * icônes parce qu'il n'a rien à faire ailleurs ; l'ombre, elle, est la version
 * du fond d'écran, et un fond d'écran sombre l'est d'un bord à l'autre.
 */
export function peindreOmbre(ctx: Pinceau, W: number, H: number, mesure: Mesure): void {
  if (!(mesure.ombre > 0.004)) return
  ctx.fillStyle = `rgba(0,0,0,${mesure.ombre.toFixed(4)})`
  ctx.fillRect(0, 0, W, H)
}

export function peindreVoile(ctx: Pinceau, W: number, H: number, mesure: Mesure): void {
  const force = mesure.voile
  if (!(force > 0.004)) return
  const rgb = mesure.libelles === 'clair' ? '11,18,33' : '250,247,236'
  const bandes = Math.max(2, Math.min(H, BANDES))
  let precedent = 0
  for (let i = 0; i < bandes; i += 1) {
    const y0 = precedent
    const y1 = i === bandes - 1 ? H : Math.round(((i + 1) * H) / bandes)
    if (y1 <= y0) continue
    precedent = y1
    ctx.fillStyle = `rgba(${rgb},${alphaDuVoile((y0 + y1) / 2 / H, force).toFixed(4)})`
    ctx.fillRect(0, y0, W, y1 - y0)
  }
}

/* ---------- rendu complet ----------------------------------------------------- */

export interface Motif {
  famille: IdFamille
  palette: IdPaletteQuelconque
  densite: Densite
  graine: number
}

/**
 * Les couches de l'image, dans l'ordre où `rendre()` les pose.
 *
 * La liste est publiée parce que la page « /moteur » montre l'image se
 * construire, couche par couche, et qu'une liste recopiée là-bas se serait
 * tue le jour où une couche s'ajoute ici. Elle est lue, jamais écrite deux
 * fois.
 */
export const COUCHES = ['fond', 'formes', 'ombre', 'voile', 'grain'] as const

export type Couche = (typeof COUCHES)[number]

/**
 * Ce qui distingue deux fichiers d'un même motif.
 *
 * Ni l'un ni l'autre ne touche à la famille, à la palette, à la densité ou à
 * la graine : ce sont les quatre réglages qui font l'image, et ils sont
 * ailleurs. Ces deux-là décident de ce qui est brûlé par-dessus.
 */
export interface OptionsRendu {
  /** Le voile de lisibilité est-il peint. Oui par défaut, comme depuis toujours. */
  voile?: boolean
  /** La version sombre : le motif assombri, dans le fichier lui-même. */
  sombre?: boolean
  /**
   * Les dimensions à utiliser pour la lisibilité quand elles diffèrent de
   * celles du canevas. L'aperçu est dessiné dans une boîte de quelques pixels
   * plus petite que la géométrie visée (la bordure de l'appareil) et doit
   * malgré tout mesurer le format réellement exporté, sans quoi le voile brûlé
   * dans l'aperçu n'est pas celui du fichier.
   */
  mesureW?: number
  mesureH?: number
  /**
   * La dernière couche peinte. Toutes par défaut, comme depuis toujours.
   *
   * Elle n'existe que pour la démonstration de « /moteur », qui montre
   * l'image se construire et ne peut le faire qu'en s'arrêtant en chemin.
   * Le faire ici plutôt que chez elle est ce qui garde l'ordre des couches
   * écrit une seule fois : une couche ajoutée au moteur entre d'elle-même
   * dans la démonstration, et à son rang.
   */
  arret?: Couche
}

/**
 * Dessine l'image entière et renvoie ce que la sonde a mesuré.
 *
 * Un seul point d'entrée pour tous les rendus du produit : l'aperçu, les
 * vignettes, la page d'accueil, l'export. Il y en a eu deux un temps, l'un avec
 * voile et l'autre sans, et la seconde option a suffi à montrer pourquoi c'est
 * une mauvaise idée : chaque nouveau choix aurait doublé la liste. Les choix
 * sont donc dans un sac nommé, et l'ordre des couches n'est écrit qu'une fois.
 */
export function dessiner(
  ctx: Ctx, W: number, H: number, motif: Motif, options: OptionsRendu = {},
): Mesure {
  const { voile = true, sombre = false, mesureW = 0, mesureH = 0, arret = 'grain' } = options
  const mesure = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    mesureW > 0 ? mesureW : W, mesureH > 0 ? mesureH : H, sombre,
  )
  rendre(ctx, W, H, motif, mesure, voile, arret)
  /* La mesure est celle de l'image entière, même quand le rendu s'arrête en
     chemin : elle ne dépend pas des couches peintes, et un arrêt qui la
     changerait ferait mentir le verdict affiché à côté de la démonstration. */
  return mesure
}

/* L'ordre des couches, écrit une fois : le fond, les formes, l'ombre de la
   version sombre, le voile, le grain.

   L'ombre et le voile viennent tous deux de la mesure, et dans cet ordre. Le
   voile est dosé pour la luminance de l'image qu'il couvre ; assombrir après
   lui donnerait un voile dosé pour une image qui n'existe plus, donc des
   libellés mesurés sur autre chose que le fichier. La sonde les dose dans le
   même ordre, et c'est ce qui fait qu'ils ne se disputent pas.

   Le grain passe en dernier parce qu'il doit aussi casser les bandes du voile,
   et non seulement celles des aplats.

   `arret` s'arrête à une couche au lieu de les poser toutes. C'est la seule
   chose que la démonstration de « /moteur » demandait au moteur, et c'est ici
   qu'elle est écrite, à l'endroit où l'ordre est déjà : une couche ajoutée
   plus tard prend sa place dans la démonstration sans que personne y pense. */
function rendre(
  ctx: Ctx, W: number, H: number, motif: Motif, mesure: Mesure, voile: boolean,
  arret: Couche,
): void {
  const P = palette(motif.palette)
  /* Le rang de la dernière couche demandée. Les quatre conditions ci-dessous
     le comparent au leur, ce qui laisse l'ordre lisible d'un seul coup d'oeil
     plutôt qu'en quatre sorties anticipées. */
  const rang = COUCHES.indexOf(arret)

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = P.fond
  ctx.fillRect(0, 0, W, H)

  if (rang >= 1) {
    formes(ctx, W, H, motif.famille, P.couleurs, motif.densite,
      alea(graineDeDessin(motif.famille, motif.densite, motif.graine)), Math.min(W, H))
  }

  if (rang >= 2) peindreOmbre(ctx, W, H, mesure)
  if (rang >= 3 && voile) peindreVoile(ctx, W, H, mesure)
  if (rang >= 4) peindreGrain(ctx, W, H)
  ctx.restore()
}

/**
 * Le niveau de lisibilité, tel que l'interface le nomme.
 *
 * Les bornes sont celles de WCAG, et les mots doivent le dire. « Correcte »
 * pour 3,5:1 laissait entendre qu'un seuil était tenu, alors qu'un libellé
 * d'icône est du petit texte et réclame 4,5:1 : la bande du milieu s'appelle
 * donc « juste », et celle du bas « insuffisante ». Le mot affiché est ce nom,
 * pris tel quel dans le dictionnaire : il ne peut plus s'en écarter.
 */
export type Niveau = 'bonne' | 'juste' | 'insuffisante'

/** Le seuil AA du texte courant, et celui des éléments d'interface. */
export const SEUIL_AA = 4.5
export const SEUIL_UI = 3

export function niveau(mesure: Mesure): Niveau {
  if (mesure.contraste >= SEUIL_AA) return 'bonne'
  if (mesure.contraste >= SEUIL_UI) return 'juste'
  return 'insuffisante'
}

/**
 * La même mesure, telle qu'elle se lirait si le voile n'était pas peint.
 *
 * Le voile est devenu facultatif : quelqu'un qui le retire reçoit une image
 * plus claire que celle que la sonde a jugée, et le verdict doit alors porter
 * sur ce fichier-là. Le calcul repart de la luminance relevée avant voile,
 * qui est justement ce que `mesurer()` garde pour ça.
 */
export function sansVoile(mesure: Mesure): Mesure {
  if (!(mesure.voile > 0)) return mesure
  const L = mesure.luminance
  return {
    ...mesure,
    voile: 0,
    contraste: mesure.libelles === 'clair' ? 1.05 / (L + 0.05) : (L + 0.05) / 0.068,
  }
}

