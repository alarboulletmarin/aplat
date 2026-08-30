// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le fil : ce qui est fait de brins qui passent l'un sur l'autre.
 *
 * Deux familles, et une seule mécanique sous les deux. Un brin est un ruban,
 * puisque le pinceau ne connaît pas le trait ; ce qui fait la matière n'est pas
 * le brin mais l'ordre dans lequel on les pose, parce que le dernier posé passe
 * devant. Tout le tissage du catalogue tient dans cette phrase : il n'y a pas
 * de découpe, pas de masque, rien qu'un ordre.
 *
 * Le tricot est une maille, le cannage un tressage. La maille se referme sur
 * elle-même, rangée après rangée, et chaque V s'accroche aux deux qui le
 * précèdent ; le cannage croise six brins droits sous trois directions et
 * laisse des trous entre eux. L'un est plein, l'autre est ajouré, et c'est ce
 * qui les sépare à l'oeil bien avant qu'on ait compté les brins.
 *
 * Les deux se parcourent rangée par rangée : un cadre plus haut n'ajoute qu'à
 * la fin de la liste, un cadre plus large ne déplace pas ce qui est à gauche.
 * Rien n'est tiré dans ces boucles, dont le compte dépend du format ; ce qui
 * varie d'une maille à l'autre se lit dans la clé par ses coordonnées.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { hacher, melangeHex, ruban, type Point } from './trace'

export const IDS_TISSUS = ['tricot', 'cannage'] as const

export type IdTissu = (typeof IDS_TISSUS)[number]

export function estTissu(valeur: unknown): valeur is IdTissu {
  return IDS_TISSUS.includes(valeur as IdTissu)
}

/** Le brin : un ruban d'épaisseur constante, rempli d'un trait. */
function brin(ctx: Pinceau, teinte: string, points: readonly Point[], epaisseur: number): void {
  ctx.fillStyle = teinte
  ruban(ctx, points, epaisseur)
  ctx.fill()
}

/* ---------- tricot ----------------------------------------------------------- */

/**
 * Le tricot : le point jersey, des rangées de V pris les uns dans les autres.
 *
 * Une maille endroit se dessine comme un V, et il n'y a rien d'autre à savoir
 * sur le dessin. Tout le travail est ailleurs : un jersey est **opaque**, et
 * c'est même à cela qu'on le distingue d'un filet. Poser les V à même le fond
 * laisse passer le papier entre eux en losanges réguliers, ce qui fait une
 * résille ; les épaissir jusqu'à fermer les losanges les transforme en tuiles,
 * et l'on retombe sur les écailles. Ni l'un ni l'autre n'est du tricot.
 *
 * La rangée se peint donc en deux temps. D'abord une bande pleine, la teinte du
 * fil enfoncée dans l'ombre : c'est le creux du tissu, ce qu'on voit entre les
 * mailles et à travers elles. Puis les V par-dessus, dans la teinte franche.
 * L'ombre n'est jamais dessinée, elle est ce qui reste, et c'est la seule façon
 * d'obtenir un creux avec un pinceau qui ne sait que remplir.
 *
 * Les rangées se posent du haut vers le bas et chaque V dépasse un peu au
 * dessus de sa bande : le pied de la maille précédente s'en trouve recouvert,
 * exactement comme un fil passe sous le fil de la rangée d'avant.
 *
 * Les jambes de deux mailles voisines se rejoignent au même point : une maille
 * partage sa jambe avec sa voisine, comme au tricot. C'est ce qui fait que la
 * rangée se lit comme une chaîne continue et non comme une file de V séparés.
 *
 * La couleur va par bandes de rangées, comme une pelote qu'on change, avec de
 * loin en loin une rangée seule d'une autre teinte. Une couleur par maille
 * ferait un jacquard, ce qui est un autre objet ; une seule couleur pour tout
 * ferait un aplat.
 */
function tricot(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const large = unite / [8, 13, 20][densite]
  /* La maille est plus large que haute, comme au jersey. */
  const haut = large * 0.66
  /* Le fil doit rester mince : épais, il remplit le V et il ne reste de la
     maille qu'une petite encoche sombre, qu'on lit comme une pointe de flèche
     et plus du tout comme une boucle. */
  const fil = large * 0.27
  /* L'épaisseur d'une bande de couleur, en rangées. */
  const pelote = 3 + Math.floor(rnd() * 4)
  const glisse = rnd()

  const colonnes = Math.ceil(W / large) + 3
  const rangees = Math.ceil(H / haut) + 2

  for (let r = -1; r < rangees - 1; r += 1) {
    const y = r * haut
    const bande = Math.floor(r / pelote)
    const seule = hacher(r, 29, cle) < 0.11
    const teinte = C[Math.floor(hacher(seule ? r : bande, seule ? 61 : 7, cle) * C.length)]
    const ombre = melangeHex(teinte, '#000000', 0.4)

    ctx.fillStyle = ombre
    ctx.fillRect(-large, y, W + large * 2, haut * 1.02)

    for (let c = -2; c < colonnes - 2; c += 1) {
      const x = (c + 0.5 + glisse) * large
      const maille: Point[] = [
        [x - large * 0.5, y - haut * 0.16],
        [x - large * 0.44, y + haut * 0.34],
        [x - large * 0.19, y + haut * 0.74],
        [x, y + haut * 0.92],
        [x + large * 0.19, y + haut * 0.74],
        [x + large * 0.44, y + haut * 0.34],
        [x + large * 0.5, y - haut * 0.16],
      ]
      brin(ctx, teinte, maille, fil)
    }
  }
}

/* ---------- cannage ---------------------------------------------------------- */

/**
 * Le cannage : le rotin des chaises de Vienne, six brins sous trois directions.
 *
 * Le catalogue avait déjà un tressage, la **tresse**, et c'est justement ce qui
 * rend celui-ci utile : la tresse croise deux directions et ne laisse rien
 * passer, le cannage en croise trois et est ajouré. L'un est une étoffe, l'autre
 * un treillis. Le trou est ici la moitié du motif, et sa forme, un octogone
 * plutôt qu'un carré, vient entièrement des diagonales qui en coupent les quatre
 * coins.
 *
 * Les brins droits vont par paires, comme sur une vraie assise, mais les deux
 * brins d'une paire se touchent : c'est une bande, refendue par un cheveu plus
 * sombre. Les écarter pour de bon ouvrait une fente, et les fentes des montants
 * croisaient celles des traverses en petits carrés percés à chaque noeud, que
 * rien ne venait recouvrir. Un cannage n'a qu'une sorte de trou.
 *
 * Les diagonales passent entre les croisements, décalées d'une demi-maille.
 * Posées sur les croisements, elles traversaient aussi le centre des mailles,
 * les deux tombant sur le même pas, et le trou se retrouvait coupé en quatre.
 *
 * L'ordre de pose est le tissage. Le pinceau ne sait pas glisser un brin sous un
 * autre, mais il n'en a pas besoin : le dernier posé passe devant, et quatre
 * couches suffisent à ce que l'oeil voie un dessus et un dessous. Chaque couche
 * s'éclaircit d'un cran, ce qui donne l'ombre sans qu'on ait à la dessiner.
 */
function cannage(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const pas = unite / [6, 10, 16][densite]
  /* Les deux largeurs se tiennent, et c'est le seul calcul du motif. Le trou
     laissé entre quatre bandes est un carré de demi-côté `(1 - bande) / 2` ; son
     coin est à `racine de deux` fois cette distance de son centre, et la
     diagonale la plus proche passe à 0,354. Pour que la diagonale morde le coin
     au lieu d'en détacher un éclat, il faut que sa demi-largeur couvre l'écart
     entre les deux. Des bandes trop minces mettent le coin hors d'atteinte, et
     il ne reste qu'un semis de petits triangles dans un treillis. */
  const bande = pas * 0.42
  const biaisLarge = pas * 0.16
  const cheveu = pas * 0.04
  const glisseX = rnd() * pas
  const glisseY = rnd() * pas

  const droit = C[Math.floor(rnd() * C.length)]
  const biais = C[Math.floor(rnd() * C.length)]
  const cran = (teinte: string, niveau: number): string =>
    melangeHex(teinte, '#000000', niveau * 0.13)

  /* Assez long pour traverser le cadre où que la droite le coupe : la demi
     diagonale ne suffit pas, une droite lointaine étant centrée loin du cadre
     et n'y entrant que par un bout. */
  const portee = W + H
  const colonnes = Math.ceil(W / pas) + 2
  const rangees = Math.ceil(H / pas) + 2

  /* Les montants d'abord, tout au fond. */
  for (let c = -1; c < colonnes - 1; c += 1) {
    const x = c * pas + glisseX
    brin(ctx, cran(droit, 3), [[x, -pas], [x, H + pas]], bande)
    brin(ctx, cran(droit, 4), [[x, -pas], [x, H + pas]], cheveu)
  }

  /* Les traverses par-dessus. */
  for (let r = -1; r < rangees - 1; r += 1) {
    const y = r * pas + glisseY
    brin(ctx, cran(droit, 2), [[-pas, y], [W + pas, y]], bande)
    brin(ctx, cran(droit, 3), [[-pas, y], [W + pas, y]], cheveu)
  }

  /* Puis les deux biais, chacun par le milieu des mailles. */
  const combien = Math.ceil((W + H) / pas) + 2
  for (const sens of [1, -1]) {
    for (let n = -combien; n <= combien; n += 1) {
      /* La droite `x + sens y = d`, prise par son point le plus proche de
         l'origine et par sa direction. */
      const d = (n + 0.5) * pas + glisseX + sens * glisseY
      const mx = d / 2
      const my = (sens * d) / 2
      brin(ctx, cran(biais, sens === 1 ? 1 : 0), [
        [mx - portee, my + sens * portee], [mx + portee, my - sens * portee],
      ], biaisLarge)
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreTissu(
  ctx: Pinceau, W: number, H: number, id: IdTissu,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'tricot') tricot(ctx, W, H, C, densite, rnd, unite)
  else cannage(ctx, W, H, C, densite, rnd, unite)
}
