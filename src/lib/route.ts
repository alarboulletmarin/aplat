// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Trois documents, un seul bundle.
 *
 * `/` présente le projet, `/app` le fait tourner, `/moteur` explique comment
 * il tourne. La séparation n'est pas une navigation ajoutée à l'application :
 * celle-ci reste l'écran unique décrit par les notes de conception
 * (docs/notes-de-conception.md), et les deux autres pages
 * sont ce qu'on voit avant d'y entrer, ou après en être sorti.
 *
 * Ce fichier dit ce qu'un chemin désigne, et rien de plus. Le passage d'un
 * document à l'autre est tenu par React Router (`main.tsx`), qui remplace la
 * page sans recharger le document : c'était auparavant un lien nu, donc un
 * démarrage complet, un écran vide et le morceau de la page visée à aller
 * chercher ensuite. Le morceau reste, la file d'attente non.
 *
 * Ce que la bibliothèque ne change pas : une seule page est montée à la fois,
 * et l'application reste à l'abri du rendu des deux autres, comme elles du
 * sien. La navigation est entre les documents, jamais dans l'application, qui
 * demeure l'écran unique des notes de conception.
 */

export type Route = 'accueil' | 'app' | 'moteur'

/** Le chemin de l'application, tel qu'il s'écrit dans les liens. */
export const CHEMIN_APP = '/app'

/** Celui de la présentation. La marque y ramène, depuis les trois pages. */
export const CHEMIN_ACCUEIL = '/'

/** Celui de la page qui explique le mécanisme. */
export const CHEMIN_MOTEUR = '/moteur'

/**
 * Les paramètres qui décrivent un motif.
 *
 * `l` et `t` n'en sont pas : ce sont les restes des liens d'avant, quand
 * l'affichage voyageait dans l'adresse. Ils sont encore honorés au chargement
 * (`affichage.ts`), et `/?l=en` désigne toujours l'accueil en anglais, pas
 * l'application.
 */
const PARAMETRES_MOTIF = ['m', 'p', 'd', 's', 'r'] as const

/** Le chemin, débarrassé de sa barre oblique finale et de sa casse. */
function normaliser(chemin: string): string {
  const propre = chemin.toLowerCase().replace(/\/+$/, '')
  return propre === '' ? '/' : propre
}

/**
 * La page que sert un chemin.
 *
 * Les adresses connues sont nommées, tout le reste retombe sur la
 * présentation : une adresse inventée montre le produit plutôt qu'une page
 * d'erreur, et c'est déjà ce que faisait la version à deux documents.
 */
export function route(chemin: string): Route {
  switch (normaliser(chemin)) {
    case CHEMIN_APP:
      return 'app'
    case CHEMIN_MOTEUR:
      return 'moteur'
    default:
      return 'accueil'
  }
}

/**
 * L'adresse vers laquelle rediriger, ou null s'il n'y a rien à faire.
 *
 * Aplat a vécu à la racine : les liens partagés d'alors s'écrivent
 * `/?m=vagues&p=lime&s=7314`, et ils portent une image que quelqu'un a voulu
 * transmettre. Les laisser tomber sur la page de présentation reviendrait à
 * perdre exactement ce que le produit promet, « copier le lien suffit à
 * retrouver la même image ». Ils sont donc reconduits vers l'application avec
 * leur requête intacte.
 *
 * La règle ne regarde que les paramètres de motif : une adresse nue, ou qui ne
 * porte que la langue et le thème, reste sur l'accueil.
 *
 * Elle ne regarde que l'accueil, aussi : `/moteur?m=vagues` ne rebondit pas.
 * La page du moteur part toujours du même motif choisi, et un lien qui la
 * désigne mène à l'explication, pas à l'outil.
 */
export function redirection(chemin: string, recherche: string): string | null {
  if (route(chemin) !== 'accueil') return null

  let q: URLSearchParams
  try {
    q = new URLSearchParams(recherche)
  } catch {
    return null
  }

  if (!PARAMETRES_MOTIF.some((cle) => q.has(cle))) return null
  return `${CHEMIN_APP}${recherche.startsWith('?') ? recherche : `?${recherche}`}`
}

/**
 * Le lien vers l'application, nu.
 *
 * Il n'a rien à emporter : la langue et le thème choisis sur l'accueil sont
 * retenus sur l'appareil (`affichage.ts`), et le stockage est commun aux trois
 * pages. Arriver sur l'application dans sa langue ne passe plus par le lien.
 */
export function lienApp(): string {
  return CHEMIN_APP
}

/**
 * Le lien vers la page du moteur, nu comme les deux autres.
 *
 * Trois endroits y mènent, et aucun n'est un appel : le pied de la
 * présentation, le pied de l'application, et la dernière tuile de la galerie.
 * La question « comment c'est fait » se pose après avoir vu, jamais avant.
 */
export function lienMoteur(): string {
  return CHEMIN_MOTEUR
}

/**
 * Le lien vers la présentation, nu pour la même raison.
 *
 * C'est celui de la marque, en haut des trois pages : un logo ramène chez soi.
 * Aucun paramètre de motif n'a le droit d'y entrer : `redirection()` renverrait
 * aussitôt vers `/app`, et le lien ne mènerait nulle part.
 */
export function lienAccueil(): string {
  return CHEMIN_ACCUEIL
}

/**
 * Réécrit l'adresse courante sans quitter la page ni empiler d'entrée.
 *
 * Les trois documents corrigent leur propre adresse : l'accueil et le moteur
 * ôtent les `l` et `t` des liens d'avant, une fois, au montage ;
 * l'application y réécrit ses réglages à chaque tirage, pour que le lien
 * qu'on copie soit toujours celui de l'image affichée. Aucun de ces trois
 * n'est une navigation : le chemin ne bouge pas, la page non plus.
 *
 * D'où le passage direct par l'historique plutôt que par `useNavigate()`.
 * Une adresse poussée par React Router traverse son état, et donc rend tout
 * ce qui est sous le routeur : l'application le paierait à chaque réglage,
 * en doublant ses rendus pour une adresse que personne ne relit.
 *
 * L'état de l'historique est **repassé tel quel**, et c'est la seule
 * subtilité de cette fonction. React Router y range de quoi se retrouver
 * dans la pile (la clé de l'entrée, son rang) ; l'écraser avec `null`, ce que
 * fait un `replaceState` naïf, lui fait perdre le fil du retour arrière.
 * Il est ici relu et reposé, si bien que l'adresse change et que rien
 * d'autre ne bouge.
 */
export function remplacerAdresse(adresse: string): void {
  try {
    window.history.replaceState(window.history.state, '', adresse)
  } catch {
    /* certaines ouvertures locales refusent replaceState : sans conséquence,
       l'adresse restera celle du chargement et la page fonctionne pareil */
  }
}
