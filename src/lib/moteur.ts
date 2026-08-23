// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le moteur génératif, tout ce qui fabrique l'image.
 *
 * Rien n'en sort : aucune requête, aucune donnée. Le rendu est déterministe,
 * le quadruplet (famille, palette, densité, graine) donne toujours la même
 * image, à n'importe quelle résolution. C'est ce qui rend l'aperçu honnête :
 * ce qu'on voit derrière les icônes est exactement le fichier téléchargé.
 */

export type IdFamille =
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
  | 'fleurs'
  | 'tournesol'
  | 'etoiles'
  | 'rayons'
  | 'lunes'
  | 'feuilles'

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

/** 0 calme, 1 moyen, 2 dense. */
export type Densite = 0 | 1 | 2

export type Langue = 'fr' | 'en'

export interface Palette {
  fr: string
  en: string
  fond: string
  couleurs: readonly [string, string, string, string]
}

export interface Famille {
  id: IdFamille
  /** `abs` abstraits, `fig` figures : les deux groupes de la liste. */
  groupe: 'abs' | 'fig'
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

export const FAMILLES: readonly Famille[] = [
  { id: 'vagues', groupe: 'abs', fr: 'Vagues', en: 'Waves' },
  { id: 'blobs', groupe: 'abs', fr: 'Blobs', en: 'Blobs' },
  { id: 'arches', groupe: 'abs', fr: 'Arches', en: 'Arches' },
  { id: 'decoupes', groupe: 'abs', fr: 'Découpes', en: 'Cut-outs' },
  { id: 'obliques', groupe: 'abs', fr: 'Obliques', en: 'Diagonals' },
  { id: 'ondes', groupe: 'abs', fr: 'Ondes', en: 'Ripples' },
  { id: 'pointille', groupe: 'abs', fr: 'Fondu pointillé', en: 'Dotted fade' },
  { id: 'trame', groupe: 'abs', fr: 'Trame', en: 'Dither' },
  { id: 'colonnes', groupe: 'abs', fr: 'Colonnes', en: 'Columns' },
  { id: 'ecailles', groupe: 'abs', fr: 'Écailles', en: 'Scales' },
  { id: 'terrazzo', groupe: 'abs', fr: 'Terrazzo', en: 'Terrazzo' },
  { id: 'confettis', groupe: 'abs', fr: 'Confettis', en: 'Confetti' },
  { id: 'fleurs', groupe: 'fig', fr: 'Marguerites', en: 'Daisies' },
  { id: 'tournesol', groupe: 'fig', fr: 'Tournesol', en: 'Sunflower' },
  { id: 'etoiles', groupe: 'fig', fr: 'Étoiles', en: 'Stars' },
  { id: 'rayons', groupe: 'fig', fr: 'Rayons', en: 'Sunbeams' },
  { id: 'lunes', groupe: 'fig', fr: 'Lunes', en: 'Moons' },
  { id: 'feuilles', groupe: 'fig', fr: 'Feuilles', en: 'Leaves' },
]

/** Les arrondis des fausses icônes de la maquette : jamais deux fois le même. */
export const RAYONS: readonly string[] = [
  '50%', '3px', '50% 50% 50% 0', '3px 11px 3px 11px', '50% 0 50% 0', '2px',
]

/* ---------- listes blanches ------------------------------------------------ */

/**
 * Un identifiant venu de l'URL n'est jamais utilisé comme index :
 * `PALETTES['constructor']` est « vrai » et suffisait à faire lever le rendu
 * tout entier, aperçu et vignettes compris.
 */
export function estFamille(valeur: unknown): valeur is IdFamille {
  return FAMILLES.some((famille) => famille.id === valeur)
}

export function estPalette(valeur: unknown): valeur is IdPalette {
  return ORDRE_PALETTES.includes(valeur as IdPalette)
}

export function estDensite(valeur: unknown): valeur is Densite {
  return valeur === 0 || valeur === 1 || valeur === 2
}

export function palette(id: IdPalette): Palette {
  return estPalette(id) ? PALETTES[id] : PALETTES.lime
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

function blob(ctx: Ctx, cx: number, cy: number, r: number, n: number, rnd: Alea, secousse = 0.6) {
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

function arche(ctx: Ctx, cx: number, base: number, largeur: number, hauteur: number) {
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
  ctx: Ctx, cx: number, cy: number, R: number, n: number, rotation: number,
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

function gelule(ctx: Ctx, x: number, y: number, largeur: number, hauteur: number) {
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

function etoile(ctx: Ctx, cx: number, cy: number, R: number, pointes: number, creux: number, rotation: number) {
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

function feuille(ctx: Ctx, x: number, y: number, longueur: number, largeur: number, angle: number) {
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

function croissant(ctx: Ctx, cx: number, cy: number, R: number, angle: number, entaille: number) {
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.moveTo(cx + Math.cos(angle) * R * entaille + R * 0.9, cy + Math.sin(angle) * R * entaille)
  ctx.arc(cx + Math.cos(angle) * R * entaille, cy + Math.sin(angle) * R * entaille, R * 0.9, 0, Math.PI * 2)
  ctx.fill('evenodd')
}

function tournesol(
  ctx: Ctx, cx: number, cy: number, R: number, rnd: Alea,
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

/* ---------- familles -------------------------------------------------------- */

/**
 * Les formes, et rien d'autre : ni fond, ni voile, ni grain. `unite` est le
 * petit côté ; toutes les tailles s'y rapportent, c'est ce qui rend le motif
 * indépendant de la résolution.
 */
export function formes(
  ctx: Ctx, W: number, H: number, id: IdFamille,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  const col = (i: number) => C[((i % C.length) + C.length) % C.length]

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

  /* vagues : famille par défaut.
     Le pas d'échantillonnage suit la largeur : la courbe reste lisse même
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
  id: IdFamille, idPalette: IdPalette, densite: Densite, graine: number,
  largeur: number, hauteur: number,
): Mesure {
  const P = palette(idPalette)
  const rapport = largeur > 0 && hauteur > 0 ? largeur / hauteur : 0.5
  const cle = `${id}|${idPalette}|${densite}|${graine}|${Math.round(rapport * 1000)}`
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

  const mesure: Mesure = { libelles, voile, contraste }
  memoire.set(cle, mesure)
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

export function peindreVoile(ctx: Ctx, W: number, H: number, mesure: Mesure): void {
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
  palette: IdPalette
  densite: Densite
  graine: number
}

/**
 * Dessine l'image entière et renvoie ce que la sonde a mesuré.
 *
 * `mesureW` et `mesureH` : les dimensions à utiliser pour la lisibilité quand
 * elles diffèrent de celles du canevas. L'aperçu est dessiné dans une boîte de
 * quelques pixels plus petite que la géométrie visée (la bordure de l'appareil)
 * et doit malgré tout mesurer le format réellement exporté, sans quoi le voile
 * brûlé dans l'aperçu n'est pas celui du fichier.
 */
export function dessiner(
  ctx: Ctx, W: number, H: number, motif: Motif,
  mesureW = 0, mesureH = 0,
): Mesure {
  const P = palette(motif.palette)
  const mesure = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    mesureW > 0 ? mesureW : W, mesureH > 0 ? mesureH : H,
  )

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = P.fond
  ctx.fillRect(0, 0, W, H)

  formes(ctx, W, H, motif.famille, P.couleurs, motif.densite,
    alea(graineDeDessin(motif.famille, motif.densite, motif.graine)), Math.min(W, H))

  peindreVoile(ctx, W, H, mesure)
  peindreGrain(ctx, W, H)
  ctx.restore()
  return mesure
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
