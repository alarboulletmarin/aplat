// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La coulée : un ruban large qui traverse l'image sans qu'on sache où il
 * commence.
 *
 * Truchet pose deux quarts de disque par tuile et laisse les arcs se
 * raccorder ; le geste est le même ici, mais ce qui se raccorde n'est plus un
 * aplat, c'est une bande. Chaque tuile porte deux arcs épais qui entrent et
 * sortent par le milieu de deux de ses côtés, et comme les milieux de côtés
 * sont communs à deux tuiles, les bandes se prolongent d'une tuile à l'autre.
 * On obtient des rubans qui serpentent d'un bord à l'autre du cadre, avec des
 * épingles à cheveux qu'aucune main n'a placées.
 *
 * Ce qui fait la famille n'est pourtant pas là : c'est la couleur. Un ruban
 * n'est une chose que si toute sa longueur porte la même teinte, et une tuile
 * ne sait rien de la longueur qui la traverse. Les milieux de côtés sont donc
 * réunis en classes par une union-trouve avant le moindre tracé, chaque arc
 * demande la sienne, et la teinte se tire de la classe. Sans cette étape, le
 * motif redevient un damier bariolé ; avec elle, l'oeil suit un ruban rouge
 * sur un mètre de mur.
 *
 * Un ruban sur quatre environ n'est pas peint du tout, et c'est voulu : le
 * fond de la palette reste alors visible sur toute la longueur du ruban, si
 * bien que le vide se lit comme une bande de la même largeur que les autres.
 * C'est ce qui donne l'image sa respiration, et ce qu'un remplissage complet
 * lui retirait.
 *
 * La largeur ne dépasse jamais ce qui laisserait deux arcs d'une même tuile se
 * toucher en son centre : deux rubans distincts qui se rejoignent par un pixel
 * cessent d'être deux rubans, et la couleur ne le rattrape pas.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { hacher } from './trace'

export const IDS_COULEES = ['meandres'] as const

export type IdCoulee = (typeof IDS_COULEES)[number]

export function estCoulee(valeur: unknown): valeur is IdCoulee {
  return IDS_COULEES.includes(valeur as IdCoulee)
}

/* ---------- union-trouve ----------------------------------------------------- */

/** La classe d'un élément, en aplatissant le chemin au passage. */
function trouver(parents: Int32Array, depart: number): number {
  let racine = depart
  while (parents[racine] !== racine) racine = parents[racine]
  let courant = depart
  while (parents[courant] !== racine) {
    const suivant = parents[courant]
    parents[courant] = racine
    courant = suivant
  }
  return racine
}

function unir(parents: Int32Array, a: number, b: number): void {
  const ra = trouver(parents, a)
  const rb = trouver(parents, b)
  if (ra !== rb) parents[Math.max(ra, rb)] = Math.min(ra, rb)
}

/* ---------- tracé ------------------------------------------------------------ */

/**
 * Un quart d'anneau : l'arc extérieur à l'aller, l'intérieur au retour, et les
 * deux bouts fermés droit. Le pinceau ne connaît pas le trait, alors une bande
 * courbe se construit comme une surface, exactement comme le ruban de
 * `trace.ts` construit une bande droite.
 */
function arcEpais(
  ctx: Pinceau, cx: number, cy: number, rayon: number,
  depart: number, fin: number, epaisseur: number,
): void {
  ctx.beginPath()
  ctx.arc(cx, cy, rayon + epaisseur / 2, depart, fin)
  ctx.arc(cx, cy, rayon - epaisseur / 2, fin, depart, true)
  ctx.closePath()
  ctx.fill()
}

/**
 * Les méandres.
 *
 * La grille se mesure au petit côté, comme tout le reste du moteur, et le
 * pavage déborde du cadre par le bas et par la droite : un ruban coupé net au
 * bord est ce qu'on veut voir sur un fond d'écran, un ruban qui s'arrête
 * proprement avant le bord ne l'est pas.
 */
function meandres(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [3, 5, 8][densite]
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)

  /* Les deux arcs d'une tuile sont centrés sur des coins opposés, à une
     diagonale l'un de l'autre. Leurs rayons extérieurs valent `pas / 2 + e / 2`
     chacun, et leur somme doit rester sous la diagonale : au-delà, ils se
     touchent au centre de la tuile et deux rubans n'en font plus qu'un. */
  const epaisseur = pas * 0.34

  /* Les milieux de côtés, numérotés une fois pour toutes. Un milieu appartient
     à deux tuiles, et c'est précisément ce qui fait qu'un ruban passe de l'une
     à l'autre.

     La numérotation se fait rangée par rangée, les verticaux puis les
     horizontaux de la même rangée, et le pas ne dépend donc que du nombre de
     colonnes. C'est ce qui rend le motif indépendant de la résolution : le
     représentant d'une classe est son plus petit numéro, la teinte se tire de
     ce numéro, et une image d'une rangée plus haute ne doit pas renuméroter
     ce qui est au-dessus. Une numérotation par blocs, tous les verticaux puis
     tous les horizontaux, l'aurait fait, et tous les rubans auraient changé de
     couleur d'un format à l'autre. */
  const rang = 2 * colonnes + 1
  const vertical = (r: number, c: number) => r * rang + c
  const horizontal = (r: number, c: number) => r * rang + colonnes + 1 + c
  const total = (rangees + 1) * rang

  const parents = new Int32Array(total)
  for (let i = 0; i < total; i += 1) parents[i] = i

  /* Le sens de chaque tuile, lu deux fois : une fois pour réunir les milieux,
     une fois pour tracer. Le relire coûte un hachage et évite un tableau de
     la taille de la grille. */
  const penche = (r: number, c: number): boolean => hacher(c, r, cle) < 0.5

  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const gauche = vertical(r, c)
      const droite = vertical(r, c + 1)
      const haut = horizontal(r, c)
      const bas = horizontal(r + 1, c)
      if (penche(r, c)) {
        unir(parents, haut, gauche)
        unir(parents, bas, droite)
      } else {
        unir(parents, haut, droite)
        unir(parents, bas, gauche)
      }
    }
  }

  /* La teinte d'un ruban, tirée de sa classe. Le dernier rang de la liste ne
     désigne aucune couleur : c'est le ruban qu'on ne peint pas, celui par
     lequel le fond de la palette traverse l'image. */
  const teinte = (racine: number): string | null => {
    const rang = Math.floor(hacher(racine, racine >>> 16, cle + 1) * (C.length + 1))
    return rang < C.length ? C[rang] : null
  }

  const rayon = pas / 2
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const x = c * pas
      const y = r * pas
      const haut = horizontal(r, c)
      const bas = horizontal(r + 1, c)

      /* Les deux arcs, chacun avec son coin, ses angles et sa classe. Chaque
         arc touche le milieu du bord haut ou celui du bord bas, et il suffit
         de l'un des deux milieux qu'il relie pour nommer sa classe. Les
         angles se lisent depuis le coin : un arc part du milieu d'un côté et
         arrive au milieu de l'autre, toujours dans le sens des aiguilles. */
      const arcs = penche(r, c)
        ? [
          { cx: x, cy: y, de: 0, a: Math.PI / 2, classe: haut },
          { cx: x + pas, cy: y + pas, de: Math.PI, a: Math.PI * 1.5, classe: bas },
        ]
        : [
          { cx: x + pas, cy: y, de: Math.PI / 2, a: Math.PI, classe: haut },
          { cx: x, cy: y + pas, de: Math.PI * 1.5, a: Math.PI * 2, classe: bas },
        ]

      for (const arc of arcs) {
        const couleur = teinte(trouver(parents, arc.classe))
        if (couleur === null) continue
        ctx.fillStyle = couleur
        arcEpais(ctx, arc.cx, arc.cy, rayon, arc.de, arc.a, epaisseur)
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreCoulee(
  ctx: Pinceau, W: number, H: number, id: IdCoulee,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  void id
  meandres(ctx, W, H, C, densite, rnd, unite)
}
