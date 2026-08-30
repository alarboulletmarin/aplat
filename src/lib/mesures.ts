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
 * Elle a été écrite ici et vit maintenant dans `trace.ts` : le dossard s'est mis
 * à écrire des nombres lui aussi, et une table que deux gestes partagent
 * n'appartient plus à l'un des deux.
 *
 * Chaque famille peint son propre fond, et c'est le seul geste du catalogue à
 * le faire pour toutes les siennes. Un tapis de coupe est sombre, du papier
 * millimétré est clair : ce n'est pas une préférence, c'est ce que sont ces
 * objets. La palette ne choisit donc pas la clarté du fond, elle le teinte, et
 * treize palettes donnent treize tapis qui restent des tapis.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  arcEpais, duClairAuSombre, ecrire, hacher, melangeHex, pointille, ruban,
  tracerCercle, tracerPolygone, type Point,
} from './trace'

export const IDS_MESURES = [
  'tapis', 'millimetre', 'rapporteur', 'mire', 'reglette', 'charte', 'gabarit',
  'thermometres',
] as const

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

/* ---------- les teintes ------------------------------------------------------ */

/**
 * Le fond d'un instrument, et ses deux encres.
 *
 * Le fond ne se prend pas dans la palette, il s'y teinte : un tapis de coupe
 * part du noir, du papier millimétré part du blanc, et la palette ne fait que
 * les colorer. C'est ce qui permet aux treize palettes de donner treize tapis
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

/* ---------- la règle à calcul ------------------------------------------------ */

/**
 * La règle à calcul : des échelles logarithmiques empilées, et une réglette qui
 * a glissé.
 *
 * Les trois autres instruments du geste portent des graduations régulières.
 * Celui-ci porte les seules du catalogue qui se resserrent, et c'est tout son
 * dessin : de un à deux, la décade prend le tiers de la longueur ; de cinq à
 * dix, elle en prend un septième. Le peigne s'épaissit en allant vers la droite
 * puis repart large, et ce battement, répété sur quatre échelles décalées les
 * unes des autres, est ce que la règle à calcul a de plus beau. Ce n'est pas un
 * ornement : c'est ce que la table des logarithmes fait à une ligne droite.
 *
 * Chaque bande porte un corps et une réglette, celle du milieu, qui a glissé
 * d'une fraction de décade tirée de la clé. C'est le geste même de l'objet, et
 * sans ce décalage les quatre échelles s'aligneraient en un quadrillage, ce qui
 * est exactement le contraire de ce qu'on regarde.
 *
 * Quatre sortes d'échelles se tirent de la clé : la décade simple, la décade
 * double qui compresse deux fois plus, l'inverse qui court de droite à gauche,
 * et une échelle linéaire, qui est celle des mantisses sur un vrai modèle. La
 * dernière ne sert qu'à une chose, mais elle est décisive : posée contre une
 * échelle logarithmique, elle rend le resserrement de l'autre lisible d'un coup
 * d'oeil. Seule, aucune des deux ne dit rien.
 *
 * La finesse des graduations se lit sur la largeur de la décade rapportée au
 * petit côté, jamais sur la densité directement : une décade large peut porter
 * ses traits tous les centièmes, une décade étroite ne le peut pas, et c'est la
 * même règle aux trois crans comme aux deux résolutions.
 */
function reglette(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, rnd() < 0.4, rnd)
  const cle = Math.floor(rnd() * 0x7fffffff)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const hauteur = unite / [2.6, 3.8, 5.4][densite]
  const decade = unite / [1.1, 1.5, 2][densite]
  const fin = Math.max(unite * 0.0012, hauteur * 0.007)

  /* Les valeurs graduées d'une décade. Le pas grossit avec la valeur, et c'est
     la table d'une vraie règle : le logarithme resserre, la subdivision desserre
     pour compenser, et il reste un peigne à peu près régulier dont seuls les
     entiers trahissent la compression. La première version reprenait les pas
     d'une règle de trente centimètres, un centième près de un ; sur une image
     de téléphone, cela faisait un trait par pixel et le peigne devenait un
     aplat. La table fine ne sert donc que si la décade est assez large. */
  const graduations = (fine: boolean): number[] => {
    const valeurs: number[] = []
    const paliers: [number, number, number][] = fine
      ? [[1, 2, 0.1], [2, 5, 0.2], [5, 10, 0.5]]
      : [[1, 2, 0.2], [2, 5, 0.5], [5, 10, 1]]
    for (const [de, a, pas] of paliers) {
      for (let k = 0; k * pas < a - de - 1e-9; k += 1) valeurs.push(de + k * pas)
    }
    return valeurs
  }

  const stock = melangeHex(fond, appui, 0.14)
  const glissiere = melangeHex(fond, appui, 0.38)
  const bandes = Math.ceil(H / hauteur) + 1

  for (let b = -1; b < bandes - 1; b += 1) {
    const y = b * hauteur
    /* Le corps ne prend pas toute la bande : sans le vide qui l'entoure, les
       règles se touchent et l'image redevient une trame continue, où l'on ne
       distingue plus un objet posé d'un fond quadrillé. */
    const corps = hauteur * 0.7
    const haut = y + (hauteur - corps) / 2
    /* Les deux rails et la réglette : trois parts égales du corps. Les chiffres
       tiennent dans ce qu'un rail laisse au-dessus de ses traits, jamais plus :
       débordants, ils passaient sur la bande voisine et l'image devenait un mur
       de nombres. */
    const rail = corps / 3
    const module = rail * 0.052
    const glisse = (hacher(b, 11, cle) - 0.5) * decade

    ctx.fillStyle = stock
    ctx.fillRect(0, haut, W, corps)
    ctx.fillStyle = glissiere
    ctx.fillRect(0, haut + rail, W, rail)

    for (let e = 0; e < 4; e += 1) {
      /* Les deux échelles du milieu appartiennent à la réglette et suivent son
         glissement ; celles des rails restent sur le corps. */
      const mobile = e === 1 || e === 2
      const base = haut + (e < 2 ? rail : rail * 2)
      const vers = e === 0 || e === 2 ? -1 : 1
      const sorte = hacher(b, 40 + e, cle)
      const doubles = sorte >= 0.42 && sorte < 0.66
      const inverse = sorte >= 0.66 && sorte < 0.82
      const lineaire = sorte >= 0.82

      const pd = doubles ? decade / 2 : decade
      const origine = mobile ? glisse : 0
      const fine = pd > unite * 0.62
      const valeurs = lineaire
        ? Array.from({ length: fine ? 20 : 10 }, (_, k) => k / (fine ? 20 : 10))
        : graduations(fine)

      const place = (v: number): number => {
        if (lineaire) return v
        const u = Math.log10(v)
        return inverse ? 1 - u : u
      }

      const nombres = e === 0 || e === 3
      const premiers = decade > unite * 0.55

      ctx.fillStyle = encre
      for (let d = -2; d * pd < W + pd * 2; d += 1) {
        for (const v of valeurs) {
          const x = origine + (d + place(v)) * pd
          if (x < -pd || x > W + pd) continue
          const entier = Math.abs(v - Math.round(v)) < 1e-9
          const demi = Math.abs(v * 2 - Math.round(v * 2)) < 1e-9
          const long = rail * (entier ? 0.58 : demi ? 0.32 : 0.17)
          ctx.fillRect(x - fin / 2, vers < 0 ? base - long : base, fin * (entier ? 1.8 : 1), long)
        }
      }

      /* Les chiffres ne vont qu'aux deux échelles des rails : les quatre
         numérotées feraient un mur de nombres, et l'objet se lit sur ses
         traits, pas sur ses légendes. */
      if (!nombres || lineaire) continue
      for (let d = -2; d * pd < W + pd * 2; d += 1) {
        for (let n = 1; n <= 9; n += 1) {
          if (!premiers && n !== 1 && n !== 2 && n !== 5) continue
          const x = origine + (d + place(n)) * pd
          if (x < 0 || x > W) continue
          const yTexte = vers < 0
            ? base - rail * 0.58 - module * 5 - rail * 0.08
            : base + rail * 0.58 + rail * 0.08
          ecrire(ctx, String(n), x, yTexte, module, 'centre')
        }
      }
    }

    /* Le curseur : un cadre mince posé en travers de la bande, et le cheveu qui
       le traverse. C'est ce qui achève de nommer l'objet. */
    const cx = (0.08 + 0.84 * hacher(b, 3, cle)) * W
    const demi = decade * 0.055
    ctx.fillStyle = appui
    ctx.fillRect(cx - fin, haut - corps * 0.06, fin * 2, corps * 1.12)
    for (const cote of [-1, 1]) {
      ctx.fillRect(cx + cote * demi - fin, haut - corps * 0.06, fin * 2, corps * 1.12)
    }
    for (const bord of [haut - corps * 0.06, haut + corps * 1.06 - fin * 2]) {
      ctx.fillRect(cx - demi, bord, demi * 2, fin * 2)
    }
  }
}

/* ---------- la charte -------------------------------------------------------- */

/**
 * La charte : le nuancier d'atelier, une pastille par teinte et par valeur,
 * chacune sous son numéro.
 *
 * C'est le seul instrument du geste qui ne mesure pas une longueur mais une
 * couleur, et c'est aussi la seule famille du catalogue qui montre la palette
 * comme une échelle plutôt que comme une poignée de teintes. Partout ailleurs,
 * les couleurs livrées se posent côte à côte, franches ; ici, chacune descend
 * du très pâle au très sourd, et l'on voit d'un coup ce que la palette contient
 * réellement. Une palette qu'on croyait claire se révèle avoir trois teintes
 * moyennes ; un camaïeu, lui, donne une charte qui n'a plus de colonnes du tout,
 * rien qu'un dégradé en escalier, et c'est un portrait juste.
 *
 * L'échelle se plie au milieu. Vers le haut, la teinte se dilue dans le papier,
 * ce qui est un lavis ; vers le bas, elle s'enfonce vers le noir, ce qui est une
 * ombre. Diluer dans le blanc pur des deux côtés aurait donné des roses et des
 * lavandes qui ne sont dans aucune palette : c'est le papier de l'instrument qui
 * sert de blanc, comme sur une vraie charte imprimée.
 *
 * Une colonne sur cinq est neutre, et sans elle le nuancier ment. Un oeil ne
 * juge pas une valeur dans l'absolu ; il la compare. La colonne grise est
 * l'étalon à côté duquel les autres se lisent, et toute charte d'atelier en
 * porte une.
 *
 * Le numéro sous chaque pastille se lit comme un vrai code : la centaine dit la
 * colonne, la dizaine dit le barreau. Il ne sert à rien, et c'est justement ce
 * qui fait reconnaître l'objet.
 */
function charte(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, false, rnd)
  const cle = Math.floor(rnd() * 0x7fffffff)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const large = unite / [3.4, 5.6, 8.6][densite]
  /* La pastille est plus haute que large, la place du numéro comprise : une
     pastille carrée fait une mosaïque, et une mosaïque n'est pas un nuancier. */
  const haut = large * 1.34
  const marge = large * 0.1
  const module = large * 0.045
  const barreaux = 7
  const decale = Math.floor(hacher(0, 1, cle) * C.length)
  /* Une colonne neutre toutes les quatre à six : plus rapprochées, les gris
     cessent d'être un étalon et deviennent la moitié de la planche. */
  const neutre = 4 + Math.floor(hacher(0, 2, cle) * 3)

  /* La planche n'est pas calée sur le coin de l'image, elle a glissé. C'est
     juste pour l'objet, une feuille posée n'étant jamais d'équerre avec ce qui
     la cadre, et c'est surtout ce qui fait que la charte réagit à sa graine.
     Sans ce glissement, tout ce que la graine changeait ici était trois petits
     entiers, le décalage des teintes, l'écart des colonnes neutres et la teinte
     du papier ; au cran calme, six colonnes sur quatre teintes, deux graines
     différentes tombaient sur la même planche. */
  const glisseX = hacher(0, 3, cle) * large
  const glisseY = hacher(0, 4, cle) * haut

  const colonnes = Math.ceil(W / large) + 2
  const rangees = Math.ceil(H / haut) + 2

  for (let r = -1; r < rangees - 1; r += 1) {
    for (let c = -1; c < colonnes - 1; c += 1) {
      const x = c * large - glisseX
      const y = r * haut - glisseY
      /* Le barreau se lit sur la rangée absolue, et la colonne sur son numéro :
         la charte continue donc de barreau en barreau d'une rangée à l'autre,
         au lieu de recommencer son échelle à chaque fois. */
      const barreau = ((r % barreaux) + barreaux) % barreaux
      const gris = ((c % neutre) + neutre) % neutre === 0
      /* La teinte de colonne est écartée du papier avant de servir de tête
         d'échelle. Sans cela, une palette qui contient un presque blanc, et la
         plupart en contiennent un, donne une colonne entière de pastilles
         indistinctes du fond : l'échelle est là, mais elle n'a plus de haut. */
      const brute = C[(((c + decale) % C.length) + C.length) % C.length]
      const base = gris ? melangeHex(encre, appui, 0.5) : melangeHex(brute, encre, 0.2)

      /* Le pli de l'échelle : au-dessus du milieu on dilue dans le papier, en
         dessous on enfonce vers le noir. */
      const milieu = (barreaux - 1) / 2
      const t = (barreau - milieu) / milieu
      const teinte = t < 0
        ? melangeHex(base, fond, -t * 0.66)
        : melangeHex(base, '#000000', t * 0.58)

      ctx.fillStyle = teinte
      ctx.fillRect(x + marge, y + marge, large - marge * 2, haut * 0.72 - marge)

      /* Le numéro, sous la pastille, dans le blanc de la carte. */
      ctx.fillStyle = melangeHex(encre, fond, 0.4)
      const code = String(100 + (((c + decale) % 9) + 9) % 9 * 10 + barreau + 1)
      ecrire(ctx, code, x + large / 2, y + haut * 0.79, module, 'centre')
    }
  }

  /* Les repères de coupe : quatre équerres aux angles de la planche, comme sur
     une épreuve d'imprimeur. Ils fixent l'échelle du reste et disent que ce
     qu'on regarde est une feuille et non un carrelage. */
  const bras = unite * 0.05
  const fin = Math.max(unite * 0.0016, large * 0.012)
  ctx.fillStyle = appui
  for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const px = ax === 0 ? bras * 0.5 : W - bras * 1.5
    const py = ay === 0 ? bras * 0.5 : H - bras * 1.5
    ctx.fillRect(px, py + (ay === 0 ? 0 : bras - fin), bras, fin)
    ctx.fillRect(px + (ax === 0 ? 0 : bras - fin), py, fin, bras)
  }
}

/* ---------- le gabarit ------------------------------------------------------- */

/**
 * Le gabarit : la plaque du dessinateur, percée de formes qui grandissent.
 *
 * Les quatre premiers instruments impriment leurs graduations sur un fond. Le
 * gabarit ne dessine rien : il enlève. La plaque couvre l'image d'un bord à
 * l'autre, et tout ce qu'on voit d'elle est ce qu'elle laisse voir du papier au
 * travers de ses trous. C'est le seul du geste à travailler par soustraction, et
 * cela tient à une mécanique du pinceau : le contour et ses trous entrent dans
 * un même chemin, rempli par la règle paire et impaire. Séparés en deux chemins,
 * les trous se rempliraient de la teinte de la plaque et l'objet redeviendrait
 * un semis de pastilles.
 *
 * La série est ce qui fait l'instrument. Un gabarit ne porte pas des cercles, il
 * porte *les* cercles, du plus petit au plus grand, chacun sous sa cote ; c'est
 * cette progression, et le nombre qui l'accompagne, qui sépare une plaque à
 * dessin d'un claustra. Les trous se posent donc à la file, chacun réservant sa
 * place selon sa taille, et la série repart quand elle a fini.
 *
 * Une rangée sur cinq change de forme : ronds, carrés, hexagones, triangles. Un
 * vrai gabarit en mêle deux ou trois, jamais une seule ni toutes.
 *
 * Chaque rangée est un chemin à elle, et les rangées se suivent en pavant la
 * hauteur : un cadre plus haut n'ajoute donc qu'à la fin de la liste, et rien de
 * ce qui est déjà posé ne bouge.
 */
function gabarit(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, false, rnd)
  const cle = Math.floor(rnd() * 0x7fffffff)
  /* La plaque : la teinte de la palette posée en voile sur le papier, comme une
     plaque de plastique teinté. */
  const plaque = melangeHex(appui, fond, 0.3)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const bande = unite / [3.2, 5, 7.4][densite]
  /* La cote tient sous le plus gros trou de la rangée, et ce seul calcul fixe
     sa taille : le centre est à 0,46 de la bande, le plus grand rayon vaut 0,33,
     il reste donc moins d'un cinquième de bande pour cinq modules de haut. Une
     cote plus grosse déborde sur la rangée suivante, où elle flotte entre deux
     plaques et se lit comme une ligne de texte. */
  const module = bande * 0.032
  const petit = bande * 0.13
  const grand = bande * 0.33
  const tailles = 7

  const rangees = Math.ceil(H / bande) + 2

  for (let r = -1; r < rangees - 1; r += 1) {
    const y = r * bande
    const centre = y + bande * 0.46
    const sorte = Math.floor(hacher(r, 91, cle) * 4)
    /* Le premier calibre de la rangée : la série ne repart pas au même endroit
       d'une rangée à l'autre, sans quoi les trous s'aligneraient en colonnes et
       la plaque redeviendrait un quadrillage. */
    const depart = Math.floor(hacher(r, 17, cle) * tailles)
    const cotes: { x: number; rayon: number; cote: number }[] = []

    let x = -grand
    for (let k = 0; x < W + grand; k += 1) {
      const rang = (k + depart) % tailles
      const rayon = petit + ((grand - petit) * rang) / (tailles - 1)
      x += rayon + bande * 0.055
      cotes.push({ x, rayon, cote: 2 * (rang + 2) })
      x += rayon + bande * 0.055
    }

    ctx.fillStyle = plaque
    ctx.beginPath()
    tracerPolygone(ctx, [[0, y], [W, y], [W, y + bande], [0, y + bande]])
    for (const { x: cx, rayon } of cotes) {
      if (sorte === 0) {
        tracerCercle(ctx, cx, centre, rayon)
        continue
      }
      /* Le carré, l'hexagone et le triangle se tracent dans le même cercle :
         un gabarit range ses formes par la cote de ce qu'elles inscrivent, et
         non par leur aire. */
      const faces = sorte === 1 ? 4 : sorte === 2 ? 6 : 3
      const tourne = sorte === 1 ? Math.PI / 4 : sorte === 2 ? 0 : -Math.PI / 2
      const points: Point[] = []
      for (let i = 0; i < faces; i += 1) {
        const a = tourne + (i * Math.PI * 2) / faces
        points.push([cx + Math.cos(a) * rayon, centre + Math.sin(a) * rayon])
      }
      tracerPolygone(ctx, points)
    }
    ctx.fill('evenodd')

    /* Les cotes, gravées sur la plaque sous chaque trou. */
    ctx.fillStyle = melangeHex(encre, plaque, 0.26)
    for (const { x: cx, rayon, cote } of cotes) {
      if (cx < 0 || cx > W) continue
      ecrire(ctx, String(cote), cx, centre + rayon + bande * 0.055, module, 'centre')
    }
  }
}

/* ---------- les thermomètres ------------------------------------------------- */

/**
 * Les thermomètres : un mur de colonnes graduées, chacune remplie à sa hauteur.
 *
 * Le geste avait toutes ses silhouettes sauf celle-là. Le tapis et le millimétré
 * sont des quadrillages, le rapporteur des demi-disques, la mire et la charte
 * des planches de cases, la règle à calcul des barres couchées, le gabarit une
 * plaque. Rien n'y était debout. Un instrument vertical change la lecture de
 * l'image entière : l'oeil suit les colonnes du bas vers le haut, et le niveau
 * de chacune se compare à celui des voisines sans qu'on ait rien à écrire.
 *
 * Le tube est un verre vide, et c'est ce qui sépare ce motif d'une barre de
 * couleur. On voit deux zones dans chaque colonne, le liquide et ce qui reste
 * au-dessus, séparés par un ménisque net ; une colonne pleine d'un seul tenant
 * serait un bâton, pas un thermomètre. Il faut donc que le verre soit
 * franchement teinté : presque transparent, le tube vide se confond avec le
 * papier, il ne reste de l'instrument que son bulbe, et l'image devient un semis
 * de points.
 *
 * La pilule est écrite ici plutôt que prise dans `trace.ts` : la capsule du
 * catalogue est couchée, ses deux calottes sont à gauche et à droite, et
 * appelée sur un rectangle plus haut que large elle ne rend qu'un cercle. Un
 * tube demande ses calottes en haut et en bas, ce qui est un autre chemin.
 *
 * Les graduations ne courent que sur un côté, comme sur un vrai tube, et les
 * nombres se posent de l'autre. Les mettre des deux côtés doublait le trait sans
 * rien ajouter, et la colonne cessait d'avoir un sens de lecture.
 */
function thermometres(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const { fond, encre, appui } = instrument(C, rnd() < 0.35, rnd)
  const cle = Math.floor(rnd() * 0x7fffffff)

  ctx.fillStyle = fond
  ctx.fillRect(0, 0, W, H)

  const bande = unite / [1.9, 2.7, 3.8][densite]
  const pas = unite / [5, 8, 12][densite]
  const tube = pas * 0.4
  const fin = Math.max(unite * 0.0012, tube * 0.06)
  /* La cote se lit à côté du tube, et la moitié du pas lui est comptée : à
     pleine taille, trois chiffres tenaient plus large que l'écart entre deux
     tubes et l'image devenait un mur de nombres. */
  const module = pas * 0.034
  const verre = melangeHex(appui, fond, 0.44)

  /* Le tube debout : deux calottes, en haut et en bas. */
  const pilule = (cx: number, haut: number, pied: number, demi: number): void => {
    if (pied - haut < demi * 2) return
    ctx.beginPath()
    ctx.moveTo(cx - demi, haut + demi)
    ctx.arc(cx, haut + demi, demi, Math.PI, 0)
    ctx.lineTo(cx + demi, pied - demi)
    ctx.arc(cx, pied - demi, demi, 0, Math.PI)
    ctx.closePath()
    ctx.fill()
  }

  const colonnes = Math.ceil(W / pas) + 2
  const rangees = Math.ceil(H / bande) + 2

  for (let r = -1; r < rangees - 1; r += 1) {
    for (let c = -1; c < colonnes - 1; c += 1) {
      const x = (c + 0.5) * pas
      const y = r * bande
      /* Le bulbe est un rayon, plus large que le tube d'un peu plus de moitié :
         c'est ce qui le fait lire comme un réservoir et non comme un bout de
         colonne. */
      const bulbe = tube * 0.78
      const pied = y + bande * 0.88 - bulbe
      const sommet = y + bande * 0.08
      const course = pied - sommet
      if (course <= tube) continue

      const teinte = C[Math.floor(hacher(c, r, cle) * C.length)]
      /* Le niveau ne descend jamais jusqu'au bulbe ni ne monte jusqu'au bord :
         un tube vide ou débordant se lit comme une panne, pas comme une
         mesure. */
      const niveau = 0.14 + 0.76 * hacher(c, r, cle + 5)

      ctx.fillStyle = verre
      pilule(x, sommet, pied + bulbe, tube / 2)

      ctx.fillStyle = teinte
      pilule(x, pied - course * niveau, pied + bulbe, tube / 2)
      ctx.beginPath()
      tracerCercle(ctx, x, pied + bulbe * 0.2, bulbe)
      ctx.fill()

      /* Les graduations, à droite du tube ; les nombres, à gauche. */
      const crans = 20
      ctx.fillStyle = melangeHex(encre, fond, 0.22)
      for (let k = 0; k <= crans; k += 1) {
        const yk = pied - (course * k) / crans
        const cinq = k % 5 === 0
        ctx.fillRect(x + tube * 0.6, yk - fin / 2, tube * (cinq ? 0.85 : 0.45), fin)
      }
      for (let k = 0; k <= crans; k += 10) {
        const yk = pied - (course * k) / crans
        ecrire(ctx, String(k * 5), x - tube * 0.7, yk - module * 2.5, module, 'droite')
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
  else if (id === 'mire') mire(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'reglette') reglette(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'charte') charte(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'gabarit') gabarit(ctx, W, H, C, densite, rnd, unite)
  else thermometres(ctx, W, H, C, densite, rnd, unite)
}
