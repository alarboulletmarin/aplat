// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La mesure : le motif est un instrument.
 *
 * Les autres gestes dessinent des choses. Celui-ci dessine ce avec quoi on
 * dessine : un tapis de coupe, du papier millimétré, un rapporteur, une mire
 * de réglage. Ce sont des objets d'atelier, et ils ont en commun d'être faits
 * de graduations plutôt que de formes : leur beauté vient de ce qu'ils sont
 * exacts, et le motif la reprend telle quelle.
 *
 * Trois choses manquaient au moteur pour les faire, et elles sont ici.
 *
 * *Le trait.* Le pinceau ne connaît que le remplissage. Une graduation est
 * donc un rectangle quand elle est droite, un ruban quand elle est oblique, un
 * arc épais quand elle tourne. C'est plus de travail qu'un `lineWidth`, et
 * c'est aussi ce qui fait qu'un tapis de coupe s'exporte en vectoriel comme le
 * reste du catalogue.
 *
 * *Le pointillé*, pour les lignes de construction, qui ne sont pas des traits
 * pleins et ne doivent pas l'être : sur un vrai tapis, ce qui se lit en plein
 * est ce qu'on coupe, ce qui se lit en pointillé est ce qui aide à viser.
 *
 * *Les chiffres.* Un instrument sans nombres n'est qu'un quadrillage, et le
 * moteur n'a jamais su écrire : `Pinceau` n'a pas de `fillText`, et lui en
 * donner un aurait demandé au vectoriel d'embarquer une police. La fonte est
 * donc dessinée, trois cases sur cinq, en rectangles pleins. Elle ne sait que
 * des chiffres et un degré, ce qui est exactement ce qu'un instrument écrit.
 *
 * Chaque famille peint son propre fond, et c'est le seul geste du catalogue à
 * le faire pour toutes les siennes. Un tapis de coupe est sombre, du papier
 * millimétré est clair : ce n'est pas une préférence, c'est ce que sont ces
 * objets. La palette ne choisit donc pas la clarté du fond, elle le teinte, et
 * onze palettes donnent onze tapis qui restent des tapis.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  arcEpais, duClairAuSombre, hacher, melangeHex, pointille, ruban, type Point,
} from './trace'

export const IDS_MESURES = ['tapis', 'millimetre', 'rapporteur', 'mire'] as const

export type IdMesure = (typeof IDS_MESURES)[number]

export function estMesure(valeur: unknown): valeur is IdMesure {
  return IDS_MESURES.includes(valeur as IdMesure)
}

/* ---------- les traits ------------------------------------------------------- */

/** Le trait droit, d'un point à l'autre, épaisseur constante. */
function ligne(ctx: Pinceau, de: Point, vers: Point, epaisseur: number): void {
  ruban(ctx, [de, vers], epaisseur)
  ctx.fill()
}

/** L'arc de cercle, tracé et rempli. */
function arc(
  ctx: Pinceau, cx: number, cy: number, rayon: number,
  depart: number, fin: number, epaisseur: number,
): void {
  if (!(rayon > epaisseur)) return
  arcEpais(ctx, cx, cy, rayon, depart, fin, epaisseur)
  ctx.fill()
}

/* ---------- les chiffres ----------------------------------------------------- */

/**
 * La fonte : trois cases de large, cinq de haut, et rien de plus.
 *
 * C'est la plus petite grille où dix chiffres restent distincts les uns des
 * autres, et c'est ce qui compte : sur un fond d'écran, un nombre de
 * graduation fait quelques dizaines de pixels et doit rester lisible sans
 * jamais attirer l'oeil. Un `1` sans son empattement se confondrait avec un
 * trait de graduation ; il en a donc un.
 *
 * Elle vit ici et non dans `trace.ts` parce qu'elle n'est partagée par rien :
 * seul un instrument écrit des nombres. Elle est publiée pour une seule
 * raison : c'est une table écrite à la main, le seul endroit du moteur où une
 * donnée saisie caractère par caractère devient un dessin. Une case oubliée
 * ne lève rien et fait afficher `20` à la place de `26` ; un test la relit.
 */
export const GLYPHES: Readonly<Record<string, readonly string[]>> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '°': ['111', '101', '111', '000', '000'],
}

/** La largeur d'un texte, en cases : trois par glyphe, une de chasse. */
function largeurTexte(texte: string): number {
  return texte.length * 4 - 1
}

/**
 * Le nombre, posé en rectangles pleins.
 *
 * Les cases allumées d'une même rangée sont fusionnées en un seul rectangle :
 * un `8` passe de onze rectangles à sept, et une graduation qui en écrirait
 * quarante en économise des centaines sur le fichier vectoriel.
 *
 * `ancrage` place le texte par son coin haut gauche, son centre, ou son coin
 * haut droit, parce qu'une graduation s'écrit à gauche d'un axe vertical, au
 * centre d'un axe horizontal, et rarement au même endroit deux fois.
 */
function ecrire(
  ctx: Pinceau, texte: string, x: number, y: number, module: number,
  ancrage: 'gauche' | 'centre' | 'droite' = 'gauche',
): void {
  const largeur = largeurTexte(texte) * module
  const depart = ancrage === 'centre' ? x - largeur / 2 : ancrage === 'droite' ? x - largeur : x
  for (const [rang, caractere] of [...texte].entries()) {
    const glyphe = GLYPHES[caractere]
    if (!glyphe) continue
    const gx = depart + rang * 4 * module
    for (const [r, rangee] of glyphe.entries()) {
      let debut = -1
      for (let c = 0; c <= 3; c += 1) {
        const plein = c < 3 && rangee[c] === '1'
        if (plein && debut < 0) debut = c
        if (!plein && debut >= 0) {
          ctx.fillRect(gx + debut * module, y + r * module, (c - debut) * module, module)
          debut = -1
        }
      }
    }
  }
}

/* ---------- les teintes ------------------------------------------------------ */

/**
 * Le fond d'un instrument, et ses deux encres.
 *
 * Le fond ne se prend pas dans la palette, il s'y teinte : un tapis de coupe
 * part du noir, du papier millimétré part du blanc, et la palette ne fait que
 * les colorer. C'est ce qui permet aux onze palettes de donner onze tapis
 * plutôt que sept tapis et quatre feuilles de papier.
 *
 * L'encre principale est la teinte de la palette la plus éloignée du fond,
 * l'encre secondaire la suivante : sur un tapis, la première trace la trame
 * fine et la seconde les axes, ce qui donne les deux niveaux de lecture que
 * tout instrument gradué possède.
 */
function instrument(
  C: readonly string[], sombre: boolean, rnd: Alea,
): { fond: string; encre: string; appui: string } {
  const teintes = duClairAuSombre(C)
  const teinte = C[Math.floor(rnd() * C.length)]
  const fond = sombre
    ? melangeHex(melangeHex(teintes[teintes.length - 1], '#000000', 0.62), teinte, 0.17)
    : melangeHex(melangeHex(teintes[0], '#FFFFFF', 0.62), teinte, 0.14)
  const ordre = sombre ? teintes : [...teintes].reverse()
  return { fond, encre: ordre[0], appui: ordre[Math.min(1, ordre.length - 1)] }
}

/* ---------- le tapis de coupe ------------------------------------------------ */

/**
 * Le tapis de coupe, et tout ce qui est imprimé dessus.
 *
 * Un tapis n'est pas un quadrillage : c'est un quadrillage plus ce qui sert à
 * viser. La trame au centimètre porte des axes tous les cinq, une réglette de
 * graduations court le long des deux bords avec ses nombres, et un coin porte
 * la rose de l'atelier, un faisceau d'obliques aux angles usuels et des arcs
 * concentriques pour reporter une distance. Ce sont ces trois couches
 * ensemble qui font qu'on reconnaît l'objet, et aucune ne suffit seule.
 *
 * Les obliques sont en pointillé et les axes en plein, comme sur un vrai
 * tapis : ce qui se lit en plein est ce qu'on coupe, ce qui se lit en
 * pointillé est ce qui aide à viser. Le faisceau se pose dans un coin tiré de
 * la graine, jamais au centre, où il couperait l'image en deux.
 */
function tapis(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, true, rnd)
  const cases = [22, 34, 52][densite]
  const pas = unite / cases
  const fin = Math.max(pas * 0.035, unite * 0.0009)
  const fort = fin * 2.1
  const marge = pas * 1.6

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  /* La trame, et les axes tous les cinq pas. Les deux séries sont peintes
     d'affilée dans leur teinte plutôt que case par case : le pinceau ne
     change ainsi de couleur que deux fois par direction. */
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)
  for (const [teinte, majeur] of [[appui, false], [encre, true]] as const) {
    ctx.fillStyle = teinte
    for (let c = 0; c <= colonnes; c += 1) {
      if ((c % 5 === 0) !== majeur) continue
      ctx.fillRect(c * pas - (majeur ? fort : fin) / 2, 0, majeur ? fort : fin, H)
    }
    for (let r = 0; r <= rangees; r += 1) {
      if ((r % 5 === 0) !== majeur) continue
      ctx.fillRect(0, r * pas - (majeur ? fort : fin) / 2, W, majeur ? fort : fin)
    }
  }

  /* La réglette des deux bords : une graduation par pas, plus haute tous les
     cinq, et le nombre écrit dessous. */
  const module = pas * 0.26
  ctx.fillStyle = encre
  for (let c = 1; c <= colonnes; c += 1) {
    const cinq = c % 5 === 0
    ctx.fillRect(c * pas - fin / 2, 0, fin, marge * (cinq ? 0.62 : 0.34))
    if (cinq) ecrire(ctx, String(c), c * pas, marge * 0.72, module, 'centre')
  }
  for (let r = 1; r <= rangees; r += 1) {
    const cinq = r % 5 === 0
    ctx.fillRect(0, r * pas - fin / 2, marge * (cinq ? 0.62 : 0.34), fin)
    if (cinq) ecrire(ctx, String(r), marge * 0.72, r * pas - module * 2.5, module)
  }

  /* La rose : le faisceau d'obliques et les arcs, dans un coin. */
  const gauche = rnd() < 0.5
  const haut = rnd() < 0.35
  const foyer: Point = [gauche ? marge : W - marge, haut ? marge : H - marge]
  const portee = Math.hypot(W, H)
  const ANGLES = [15, 30, 45, 60, 75]
  ctx.fillStyle = encre
  for (const degres of ANGLES) {
    const angle = (haut ? 1 : -1) * (gauche ? 1 : -1) * (degres * Math.PI) / 180
    const sens = gauche ? angle : Math.PI - angle
    pointille(ctx, foyer, [
      foyer[0] + Math.cos(sens) * portee, foyer[1] - Math.sin(sens) * portee,
    ], fin, pas * 0.42, pas * 0.28)
  }
  /* Chaque nombre d'angle est posé sur son propre rayon, et à sa propre
     distance : au même rayon pour tous, cinq nombres séparés de quinze degrés
     se chevauchent, ce qui donne un pâté au lieu d'un faisceau. */
  for (const [rang, degres] of ANGLES.entries()) {
    const angle = (degres * Math.PI) / 180
    const distance = pas * (4.6 + rang * 2.4)
    const x = foyer[0] + (gauche ? 1 : -1) * Math.cos(angle) * distance
    const y = foyer[1] + (haut ? 1 : -1) * Math.sin(angle) * distance
    ecrire(ctx, `${degres}°`, x, y + (haut ? module : -module * 3.4), module,
      gauche ? 'gauche' : 'droite')
  }
  for (const n of [5, 10, 15, 20]) {
    /* Un quart d'arc, tourné vers l'intérieur de l'image. */
    const depart = haut ? 0 : -Math.PI / 2
    const bout = haut ? Math.PI / 2 : 0
    ctx.fillStyle = appui
    if (gauche) arc(ctx, foyer[0], foyer[1], n * pas, depart, bout, fin)
    else arc(ctx, foyer[0], foyer[1], n * pas, Math.PI - bout, Math.PI - depart, fin)
  }
}

/* ---------- le papier millimétré --------------------------------------------- */

/**
 * Le papier millimétré : trois trames emboîtées, et rien d'autre.
 *
 * Tout est dans les trois épaisseurs. Le millimètre est à la limite du
 * visible, le demi-centimètre se devine, le centimètre se lit ; l'oeil
 * reconstitue une profondeur qu'aucune des trois n'a. C'est le motif le plus
 * simple du catalogue et l'un des plus difficiles à doser : une trame fine
 * trop appuyée fait un gris sale, trop pâle fait une page blanche.
 *
 * Les trois teintes sont donc obtenues en fondant la même encre vers le
 * papier, jamais en changeant de couleur : c'est un seul trait d'imprimerie
 * tiré trois fois, comme sur la vraie feuille.
 */
function millimetre(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre } = instrument(C, false, rnd)
  /* Une feuille de papier millimétré n'a rien à tirer au sort : c'est une
     trame régulière et rien d'autre. Ce qui varie d'une graine à l'autre est
     donc le cadrage, ce qui est la seule chose qui varie aussi quand on
     découpe un morceau dans une vraie feuille : le pas se resserre un peu, et
     l'origine des axes forts tombe ailleurs.

     Sans cela la famille serait sourde à sa graine, et « Variante » ne ferait
     rien dessus. Trois pavages réguliers du catalogue le sont, c'est assumé et
     tenu par un contrôle ; une feuille de papier n'a pas de raison de les
     rejoindre. */
  const cases = [50, 80, 120][densite] * (0.9 + 0.2 * rnd())
  const pas = unite / cases
  const decalage = [rnd() * 10, rnd() * 10]
  /* Un plancher relatif au petit côté, et non au pas : sous le millième de
     l'image, un trait s'efface à l'encodage et la feuille ressort blanche.
     C'est la même précaution que le joint de Mosaïque et le filet d'Horizon,
     et comme elles, elle est rapportée à l'image et jamais au pixel. */
  const fin = Math.max(pas * 0.1, unite * 0.0011)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const NIVEAUX = [
    { modulo: 1, epaisseur: fin, fondu: 0.52 },
    { modulo: 5, epaisseur: fin * 1.7, fondu: 0.24 },
    { modulo: 10, epaisseur: fin * 2.6, fondu: 0 },
  ]
  /* Le décalage rend des indices négatifs : la trame commence donc avant le
     bord, sans quoi la bande gagnée par le décalage resterait nue. */
  const debut = [Math.ceil(decalage[0]), Math.ceil(decalage[1])]
  const colonnes = Math.ceil(W / pas) + debut[0]
  const rangees = Math.ceil(H / pas) + debut[1]

  for (const { modulo, epaisseur, fondu } of NIVEAUX) {
    ctx.fillStyle = melangeHex(encre, fond, fondu)
    for (let c = -debut[0]; c <= colonnes; c += 1) {
      /* Chaque niveau ne peint que ce que le suivant ne reprendra pas : sans
         ce filtre, un axe de centimètre serait peint trois fois, et le
         vectoriel porterait trois chemins superposés. */
      if (((c % modulo) + modulo) % modulo !== 0) continue
      const suivant = modulo === 1 ? 5 : 10
      if (modulo < 10 && ((c % suivant) + suivant) % suivant === 0) continue
      ctx.fillRect((c + decalage[0]) * pas - epaisseur / 2, 0, epaisseur, H)
    }
    for (let r = -debut[1]; r <= rangees; r += 1) {
      if (((r % modulo) + modulo) % modulo !== 0) continue
      const suivant = modulo === 1 ? 5 : 10
      if (modulo < 10 && ((r % suivant) + suivant) % suivant === 0) continue
      ctx.fillRect(0, (r + decalage[1]) * pas - epaisseur / 2, W, epaisseur)
    }
  }
}

/* ---------- le rapporteur ---------------------------------------------------- */

/**
 * Le rapporteur : un demi-tour de graduations, et le nombre tous les dix
 * degrés.
 *
 * Il est posé sur un bord et non au centre, comme on pose un rapporteur sur
 * une ligne : sa base est le bord de l'image, et la moitié du disque qui
 * dépasse n'existe pas. Deux ou trois se recouvrent en partie, ce qui est ce
 * qu'on voit sur une table de dessin, et ce qui évite qu'une figure unique au
 * milieu de la page fasse une cible.
 *
 * Les nombres sont tournés vers leur centre, et c'est la seule façon de les
 * poser. Écrits droit, dix nombres séparés de dix degrés se chevauchent dès
 * qu'ils ont trois chiffres, et la couronne devient un pâté ; tournés, ils
 * s'écartent tout seuls, et c'est du reste ainsi qu'un rapporteur est gravé.
 *
 * Les rayons de construction, tous les dix degrés jusqu'au bord de l'image,
 * sont ce qui fait de la page une planche plutôt qu'un cadran posé sur du
 * vide : un rapporteur sert à prolonger une direction, et le motif prolonge.
 */
function rapporteur(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, rnd() < 0.5, rnd)
  const fin = unite * 0.0016
  const module = unite * 0.0105

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  /* La trame de fond, très pâle : une table de dessin, pas une page nue. */
  const pas = unite / [9, 14, 22][densite]
  ctx.fillStyle = melangeHex(appui, fond, 0.74)
  for (let c = 0; c * pas <= W; c += 1) ctx.fillRect(c * pas - fin / 2, 0, fin, H)
  for (let r = 0; r * pas <= H; r += 1) ctx.fillRect(0, r * pas - fin / 2, W, fin)

  /* Quatre cadrans au plus, et ce n'est pas un choix de composition. Chaque
     cadran pose cent quatre-vingt-une graduations d'un cheveu d'épaisseur, et
     rien ne se compresse plus mal qu'un cheveu : à cinq, le PNG passait deux
     mégaoctets et prenait la tête du catalogue. */
  const combien = [2, 3, 4][densite]
  const portee = Math.hypot(W, H)
  const cadrans = Array.from({ length: combien }, () => ({
    part: 0.38 + 0.3 * rnd(),
    long: rnd(),
    bas: rnd() < 0.6,
  }))

  for (const cadran of cadrans) {
    const R = unite * cadran.part
    const cx = W * (0.08 + 0.84 * cadran.long)
    const cy = cadran.bas ? H : 0
    /* `k` retourne le demi-disque : vers le haut quand il est posé en bas. */
    const k = cadran.bas ? -1 : 1
    const surLeCercle = (d: number, r: number): Point =>
      [cx + Math.cos(d) * r, cy + k * Math.sin(d) * r]

    /* Les rayons de construction, jusqu'au bord, sous tout le reste. */
    ctx.fillStyle = melangeHex(encre, fond, 0.7)
    for (let degres = 0; degres <= 180; degres += 10) {
      const d = (degres * Math.PI) / 180
      ligne(ctx, [cx, cy], surLeCercle(d, portee), fin)
    }

    ctx.fillStyle = appui
    const de = cadran.bas ? Math.PI : 0
    const a = cadran.bas ? Math.PI * 2 : Math.PI
    arc(ctx, cx, cy, R, de, a, fin * 2.2)
    arc(ctx, cx, cy, R * 0.8, de, a, fin * 1.2)

    ctx.fillStyle = encre
    for (let degres = 0; degres <= 180; degres += 1) {
      const d = (degres * Math.PI) / 180
      const dix = degres % 10 === 0
      const cinq = degres % 5 === 0
      const dedans = R * (dix ? 0.86 : cinq ? 0.91 : 0.95)
      ligne(ctx, surLeCercle(d, dedans), surLeCercle(d, R), dix ? fin * 2 : fin)
    }

    /* Les nombres, entre les deux arcs, tournés le long de la couronne.
       La rotation se lit à l'oeil sur le nombre du sommet, qui doit ressortir
       droit : à quatre-vingt-dix degrés, l'angle vaut zéro des deux côtés.
       Le cadran posé en haut ouvre vers le bas, et c'est pour cela qu'il
       tourne dans l'autre sens : la règle du cadran d'en bas, appliquée
       telle quelle, l'aurait écrit la tête en bas.

       Le texte est décalé d'une demi-hauteur pour que sa boîte soit centrée
       sur le rayon, et non suspendue dessous. */
    for (let degres = 10; degres < 180; degres += 10) {
      const d = (degres * Math.PI) / 180
      const [x, y] = surLeCercle(d, R * 0.895)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(cadran.bas ? Math.PI / 2 - d : d - Math.PI / 2)
      ecrire(ctx, String(degres), 0, -module * 2.5, module, 'centre')
      ctx.restore()
    }

    /* La ligne de base et le rayon zéro : ce qui donne au cadran son axe. */
    ctx.fillStyle = encre
    ligne(ctx, surLeCercle(Math.PI, R), surLeCercle(0, R), fin * 2)
    ligne(ctx, [cx, cy], surLeCercle(Math.PI / 2, R * 0.95), fin * 2)
  }
}

/* ---------- la mire ---------------------------------------------------------- */

/**
 * La mire de réglage : une planche de cibles, une par case.
 *
 * C'est le seul instrument du geste qui ne mesure pas une longueur mais un
 * appareil. Une mire sert à régler ce qui la regarde : l'étoile de Siemens dit
 * où l'image cesse d'être nette, l'échelle de gris dit ce que le capteur sait
 * séparer, la croix dit où est le centre, le peigne dit combien de traits par
 * millimètre passent encore.
 *
 * Les quatre cibles se posent sur une grille, une par case, tirées de la clé
 * et non d'une boucle : c'est la discipline du carreau, et elle vaut ici pour
 * la même raison, un cadre plus large ne doit pas redistribuer la planche.
 */
function mire(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, rnd() < 0.45, rnd)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [2, 3, 5][densite]
  const fin = Math.max(pas * 0.012, unite * 0.0009)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)

  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const cx = (c + 0.5) * pas
      const cy = (r + 0.5) * pas
      const R = pas * 0.38
      const choix = hacher(c, r, cle)
      const vive = hacher(c, r, cle + 1) < 0.28
      ctx.fillStyle = vive ? appui : encre

      if (choix < 0.28) {
        /* L'étoile de Siemens : des secteurs qui se rejoignent au centre, et
           dont l'oeil perd le compte avant d'y arriver. */
        const branches = 12 + Math.floor(hacher(c, r, cle + 2) * 3) * 4
        for (let i = 0; i < branches; i += 1) {
          const a0 = (i * 2 * Math.PI) / branches
          const a1 = a0 + Math.PI / branches
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, R, a0, a1)
          ctx.closePath()
          ctx.fill()
        }
        continue
      }

      if (choix < 0.52) {
        /* La croix de centrage et ses anneaux. */
        for (const part of [1, 0.66, 0.32]) arc(ctx, cx, cy, R * part, 0, Math.PI * 2, fin * 1.8)
        ligne(ctx, [cx - R * 1.16, cy], [cx + R * 1.16, cy], fin * 1.8)
        ligne(ctx, [cx, cy - R * 1.16], [cx, cy + R * 1.16], fin * 1.8)
        continue
      }

      if (choix < 0.76) {
        /* Le peigne : des groupes de traits de plus en plus serrés, chacun
           tourné d'un quart de tour pour départager les deux directions. */
        const debout = hacher(c, r, cle + 3) < 0.5
        for (let groupe = 0; groupe < 4; groupe += 1) {
          const largeur = R * 0.42
          const traits = 3 + groupe * 2
          const cadence = largeur / (traits * 2 - 1)
          const ox = cx - R + (groupe % 2) * (R * 1.06)
          const oy = cy - R + Math.floor(groupe / 2) * (R * 1.06)
          for (let i = 0; i < traits; i += 1) {
            const d = i * cadence * 2
            if (debout) ctx.fillRect(ox + d, oy, cadence, largeur * 1.7)
            else ctx.fillRect(ox, oy + d, largeur * 1.7, cadence)
          }
        }
        continue
      }

      /* L'échelle de valeurs : du fond à l'encre en marches égales. */
      const marches = 6
      for (let i = 0; i < marches; i += 1) {
        ctx.fillStyle = melangeHex(fond, vive ? appui : encre, (i + 1) / marches)
        ctx.fillRect(cx - R, cy - R + (i * R * 2) / marches, R * 2, (R * 2) / marches + fin)
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreMesure(
  ctx: Pinceau, W: number, H: number, id: IdMesure,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'tapis') tapis(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'millimetre') millimetre(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'rapporteur') rapporteur(ctx, W, H, C, densite, rnd, unite)
  else mire(ctx, W, H, C, densite, rnd, unite)
}
