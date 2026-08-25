// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef, type KeyboardEvent } from 'react'
import {
  estPaletteLivree, FAMILLES, ORDRE_PALETTES, palette as resoudrePalette, PALETTES,
  type Densite, type Groupe, type IdFamille, type IdPaletteQuelconque, type Langue,
} from '../lib/moteur'
import { MAX_PALETTES, teintes, type PalettePerso } from '../lib/palettes'
import { remplir, type Textes } from '../i18n'
import { Arche } from './Arche'
import { GroupeRadio, OptionRadio } from './GroupeRadio'
import { Vignette } from './Vignette'
import { EditeurPalette } from './EditeurPalette'

/**
 * Trois réglages, pas un de plus : famille, palette, densité. La résolution
 * est détectée (c'est une mesure, pas un choix) et n'apparaît qu'en dessous,
 * modifiable si besoin.
 */

/** Les quatre groupes, dans l'ordre du moteur, avec la clé de leur libellé. */
const GROUPES = [
  { id: 'abs', cle: 'groupeAbstraits' },
  { id: 'pay', cle: 'groupePaysages' },
  { id: 'lieu', cle: 'groupeLieux' },
  { id: 'fig', cle: 'groupeFigures' },
] as const satisfies readonly { id: Groupe; cle: keyof Textes['reglages'] }[]

/**
 * Les familles, en quatre onglets.
 *
 * La grille plate posait un problème qu'aucun défilement ne résout : « Vagues »
 * et « Poissons » sont à mille pixels l'un de l'autre dans une colonne étroite,
 * et on ne peut donc pas les comparer. Les onglets ramènent chaque liste à ce
 * qu'un écran montre, et le geste pour passer de l'une à l'autre coûte un appui
 * au lieu d'un défilement.
 *
 * Rien n'est caché pour autant : les onglets sont visibles ensemble, ils
 * portent le nombre de familles qu'ils contiennent, et l'onglet ouvert est
 * toujours celui de la famille en cours. C'est là que se trouve la mémoire du
 * dernier onglet, et elle est meilleure qu'un réglage enregistré : elle est
 * dans l'adresse, avec le reste, donc elle survit à un rechargement comme à un
 * lien partagé sans rien écrire sur l'appareil.
 */
export function ChoixFamille({
  valeur,
  palette,
  densite,
  graine,
  groupe,
  langue,
  textes,
  revision,
  onChoisir,
  onGroupe,
}: {
  valeur: IdFamille
  palette: IdPaletteQuelconque
  densite: Densite
  graine: number
  groupe: Groupe
  langue: Langue
  textes: Textes
  revision: number
  onChoisir: (famille: IdFamille) => void
  onGroupe: (groupe: Groupe) => void
}) {
  const onglets = useRef<HTMLDivElement>(null)
  const liste = FAMILLES.filter((f) => f.groupe === groupe)
  const contient = liste.some((f) => f.id === valeur)

  /* Les flèches parcourent les onglets sans les ouvrir : ouvrir au passage
     remplacerait toutes les vignettes du groupe à chaque touche, et le clavier
     traverserait plusieurs rendus complets pour atteindre le dernier onglet. */
  const surTouche = (evenement: KeyboardEvent<HTMLDivElement>) => {
    const deplacements = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!deplacements.includes(evenement.key)) return
    const cadre = onglets.current
    if (!cadre) return
    const boutons = Array.from(cadre.querySelectorAll<HTMLButtonElement>('.onglet'))
    const courant = boutons.indexOf(document.activeElement as HTMLButtonElement)
    if (courant < 0) return
    evenement.preventDefault()
    const suivant =
      evenement.key === 'Home'
        ? 0
        : evenement.key === 'End'
          ? boutons.length - 1
          : evenement.key === 'ArrowRight'
            ? (courant + 1) % boutons.length
            : (courant - 1 + boutons.length) % boutons.length
    boutons[suivant].focus()
  }

  return (
    <div className="carte">
      <div className="carte-titre">
        <h2 className="carte-h" id="h-famille">
          <Arche />
          <span>{textes.reglages.famille}</span>
        </h2>
      </div>

      <div
        className="onglets"
        id="onglets-familles"
        ref={onglets}
        role="tablist"
        aria-label={textes.reglages.onglets}
        onKeyDown={surTouche}
      >
        {GROUPES.map((entree) => {
          const compte = FAMILLES.filter((f) => f.groupe === entree.id).length
          const actif = entree.id === groupe
          return (
            <button
              key={entree.id}
              type="button"
              role="tab"
              id={`onglet-${entree.id}`}
              className="onglet"
              data-groupe={entree.id}
              aria-selected={actif}
              aria-controls="panneau-familles"
              tabIndex={actif ? 0 : -1}
              onClick={() => onGroupe(entree.id)}
            >
              <span>{textes.reglages[entree.cle]}</span>
              {/* Le nombre entre dans le nom accessible de l'onglet : il est
                  sous les yeux, il doit être à l'oreille aussi. */}
              <span className="onglet-n">{compte}</span>
            </button>
          )
        })}
      </div>

      <div
        className="onglet-corps"
        id="panneau-familles"
        role="tabpanel"
        aria-labelledby={`onglet-${groupe}`}
      >
        <GroupeRadio
          id="liste-familles"
          etiquettes={`h-famille onglet-${groupe}`}
          className="grille-familles"
        >
          {liste.map((f, indice) => (
            <OptionRadio
              key={f.id}
              choisi={f.id === valeur}
              porteEntree={!contient && indice === 0}
              onChoisir={() => onChoisir(f.id)}
              className="opt opt-famille"
              data-famille={f.id}
            >
              <Vignette
                famille={f.id}
                palette={palette}
                densite={densite}
                graine={graine}
                revision={revision}
              />
              <span className="opt-famille-l">
                <span className="opt-carre" aria-hidden="true" />
                <span>{f[langue]}</span>
              </span>
            </OptionRadio>
          ))}
        </GroupeRadio>
      </div>
    </div>
  )
}

/** L'échantillon d'une palette : le fond, puis trois teintes au plus. */
function Echantillon({ id }: { id: IdPaletteQuelconque }) {
  const p = resoudrePalette(id)
  const suite = teintes(p).slice(0, 4)
  return (
    <span className="opt-palette-s" aria-hidden="true">
      {suite.map((teinte, i) => (
        <i key={`${id}-${i}`} style={{ background: teinte }} />
      ))}
    </span>
  )
}

/**
 * Les onze palettes livrées, puis celles qu'on a composées.
 *
 * Les composées sont des palettes, pas un autre réglage : elles vivent dans la
 * même carte, sous le même titre, et se choisissent avec la même puce. Ce qui
 * les distingue tient en deux boutons, sous la grille, qui ne portent que sur
 * celle qui est choisie. Les mettre dans chaque puce ferait trois cibles par
 * palette, et un groupe de boutons radio n'a pas à contenir autre chose que
 * des boutons radio.
 */
export function ChoixPalette({
  valeur,
  langue,
  textes,
  persos,
  recue,
  brouillon,
  edition,
  famille,
  densite,
  graine,
  revision,
  onChoisir,
  onEditer,
  onBrouillon,
  onEnregistrer,
  onSupprimer,
  onAnnuler,
}: {
  valeur: IdPaletteQuelconque
  langue: Langue
  textes: Textes
  /** Les palettes composées, gardées sur l'appareil. */
  persos: PalettePerso[]
  /** Celle qu'un lien vient d'apporter, tant qu'elle n'est pas enregistrée. */
  recue: PalettePerso | null
  /** La palette en cours de composition, déjà dessinable. */
  brouillon: PalettePerso | null
  /** La palette qu'on modifie, ou 'nouvelle', ou null quand l'éditeur est clos. */
  edition: PalettePerso | 'nouvelle' | null
  /* Les trois réglages du motif en cours : la vignette de l'éditeur les
     emprunte, pour que la palette composée se juge sur ce qu'on regarde. */
  famille: IdFamille
  densite: Densite
  graine: number
  revision: number
  onChoisir: (palette: IdPaletteQuelconque) => void
  onEditer: (cible: PalettePerso | 'nouvelle' | null) => void
  onBrouillon: (palette: PalettePerso | null) => void
  onEnregistrer: (palette: PalettePerso) => void
  onSupprimer: (id: string) => void
  onAnnuler: () => void
}) {
  const T = textes.palettes
  const choisie = persos.find((p) => p.id === valeur) ?? null
  const recueChoisie = recue && recue.id === valeur && !persos.some((p) => p.id === recue.id)
  const pleine = persos.length >= MAX_PALETTES
  /* Deux grilles, donc deux groupes radio, donc deux portes d'entrée au
     clavier. Celle qui ne contient pas la sélection n'a aucune option cochée :
     sans `porteEntree` sur sa première puce, toutes ses options seraient à
     `tabIndex -1` et le groupe deviendrait injoignable au clavier. */
  const livreeChoisie = estPaletteLivree(valeur)

  /* L'éditeur focalise son premier champ à l'ouverture ; voici le geste
     symétrique. Sa fermeture, comme la suppression de la palette choisie,
     démonte le bouton qui portait le focus, et le navigateur le rend au
     document : le parcours clavier repartirait du haut de la page. Même
     retour que dans Partage : le focus revient au bouton qui a ouvert
     l'éditeur, ou au premier bouton d'action encore debout quand il a
     disparu, ce qui arrive après une suppression. */
  const declencheur = useRef<string | null>(null)
  const editionPrecedente = useRef(edition)
  const choisiePrecedente = useRef(choisie)
  useEffect(() => {
    const fermait = editionPrecedente.current !== null && edition === null
    const perdait = choisiePrecedente.current !== null && choisie === null && edition === null
    editionPrecedente.current = edition
    choisiePrecedente.current = choisie
    if ((!fermait && !perdait) || document.activeElement !== document.body) return
    const cible = [declencheur.current, 'btn-modifier-palette', 'btn-composer-palette']
      .map((id) => (id ? document.getElementById(id) : null))
      .find((bouton) => bouton instanceof HTMLButtonElement && !bouton.disabled)
    declencheur.current = null
    cible?.focus()
  }, [edition, choisie])

  const puce = (id: IdPaletteQuelconque, nom: string, porteEntree = false) => (
    <OptionRadio
      key={id}
      choisi={id === valeur}
      porteEntree={porteEntree}
      onChoisir={() => onChoisir(id)}
      className="opt opt-palette"
      data-palette={id}
    >
      {/* L'échantillon montre la palette ; le nom la dit. Ni l'un ni
          l'autre n'est seul à porter l'information. */}
      <Echantillon id={id} />
      <span className="opt-palette-l">
        <span className="opt-carre" aria-hidden="true" />
        <span>{nom}</span>
      </span>
    </OptionRadio>
  )

  return (
    <div className="carte">
      <h2 className="carte-h" id="h-palette">
        <Arche />
        <span>{textes.reglages.palette}</span>
      </h2>
      <GroupeRadio id="liste-palettes" etiquettes="h-palette" className="grille-palettes">
        {ORDRE_PALETTES.map((id, indice) =>
          puce(id, PALETTES[id][langue], !livreeChoisie && indice === 0),
        )}
      </GroupeRadio>

      <h3 className="groupe groupe-2" id="h-palettes-perso">
        <span className="groupe-carre" aria-hidden="true" />
        <span>{T.miennes}</span>
      </h3>

      {persos.length === 0 && !recue ? (
        <p className="historique-vide">{T.vide}</p>
      ) : (
        <GroupeRadio
          id="liste-palettes-perso"
          etiquettes="h-palettes-perso"
          className="grille-palettes"
        >
          {persos.map((p, indice) =>
            puce(p.id, p.nom, livreeChoisie && indice === 0),
          )}
          {recue && !persos.some((p) => p.id === recue.id)
            ? puce(
                recue.id,
                resoudrePalette(recue.id)[langue],
                livreeChoisie && persos.length === 0,
              )
            : null}
        </GroupeRadio>
      )}

      {recueChoisie && (
        <div className="palette-recue">
          <p className="palette-note">{T.recue}</p>
          <button
            type="button"
            id="btn-garder-palette"
            className="btn-oublier"
            onClick={() => recue && onEnregistrer({ ...recue, nom: T.nomDefaut })}
          >
            {T.garder}
          </button>
        </div>
      )}

      {choisie && !edition && (
        <div className="palette-actions">
          <button
            type="button"
            id="btn-modifier-palette"
            className="btn-oublier"
            onClick={() => {
              declencheur.current = 'btn-modifier-palette'
              onEditer(choisie)
            }}
          >
            {remplir(T.modifier, { nom: choisie.nom })}
          </button>
          <button
            type="button"
            id="btn-supprimer-palette"
            className="btn-oublier btn-oublier-alerte"
            onClick={() => onSupprimer(choisie.id)}
          >
            {remplir(T.supprimer, { nom: choisie.nom })}
          </button>
        </div>
      )}

      {edition ? (
        <EditeurPalette
          /* La clé remet l'éditeur à zéro quand on passe d'une palette à une
             autre, ou d'une modification à une composition neuve : sans elle,
             les champs garderaient les couleurs de la précédente. */
          key={edition === 'nouvelle' ? 'nouvelle' : edition.id}
          depart={edition === 'nouvelle' ? null : edition}
          brouillon={brouillon}
          famille={famille}
          densite={densite}
          graine={graine}
          revision={revision}
          textes={textes}
          onBrouillon={onBrouillon}
          onEnregistrer={onEnregistrer}
          onAnnuler={onAnnuler}
        />
      ) : (
        <div className="palette-actions">
          <button
            type="button"
            id="btn-composer-palette"
            className="btn-surprise"
            disabled={pleine}
            onClick={() => {
              declencheur.current = 'btn-composer-palette'
              onEditer('nouvelle')
            }}
          >
            <span className="ico-teintes" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{T.composer}</span>
          </button>
        </div>
      )}

      <p className="historique-n">{pleine ? T.pleine : T.note}</p>
    </div>
  )
}

export function ChoixDensite({
  valeur,
  textes,
  onChoisir,
}: {
  valeur: Densite
  textes: Textes
  onChoisir: (densite: Densite) => void
}) {
  const noms = [textes.reglages.calme, textes.reglages.moyen, textes.reglages.dense]
  return (
    <div className="bento">
      <h2 className="carte-h" id="h-densite">
        <Arche />
        <span>{textes.reglages.densite}</span>
      </h2>
      <GroupeRadio id="liste-densite" etiquettes="h-densite" className="rangee-densite">
        {([0, 1, 2] as Densite[]).map((niveau) => (
          <OptionRadio
            key={niveau}
            choisi={niveau === valeur}
            onChoisir={() => onChoisir(niveau)}
            className="opt opt-densite"
            data-densite={String(niveau)}
            data-niveau={String(niveau)}
          >
            <span className="opt-densite-d" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="opt-densite-t">{noms[niveau]}</span>
          </OptionRadio>
        ))}
      </GroupeRadio>
    </div>
  )
}

/**
 * Clair ou sombre : DESIGN_SYSTEM.md, section 7.
 *
 * Deux fichiers, pas deux aperçus. La version sombre est le même motif avec un
 * aplat noir brûlé dedans : c'est ce que montre la scène et c'est ce que rend
 * le téléchargement, au bit près.
 *
 * Elle a d'abord été un rideau qu'on tirait sur l'aperçu, pour comparer les
 * deux d'un même regard. L'idée était bonne et le résultat mauvais : le rideau
 * ne montrait qu'une simulation, si bien que l'aperçu et le fichier disaient
 * deux choses différentes, et l'aperçu avait toujours tort. Une image qu'on ne
 * peut pas télécharger n'avait rien à faire dans le cadre.
 *
 * D'où sa place ici, dans le panneau, avec les autres réglages qui décident du
 * fichier, et non près du bouton Télécharger : c'est un réglage du motif, au
 * même titre que la densité. Deux puces plutôt qu'une bascule, parce qu'une
 * bascule oblige à lire son état pour savoir ce qu'on regarde, là où deux puces
 * le montrent. La pastille dessine ce qu'elle fait, et le mot le dit : le
 * niveau ne se lit jamais à la seule couleur.
 */
export function ChoixVersion({
  valeur,
  textes,
  onChoisir,
}: {
  /** Vrai quand la version sombre est choisie. */
  valeur: boolean
  textes: Textes
  onChoisir: (sombre: boolean) => void
}) {
  const T = textes.reglages
  const options = [
    { sombre: false, nom: T.versionClaire, titre: T.versionTitreClaire },
    { sombre: true, nom: T.versionSombre, titre: T.versionTitreSombre },
  ]
  return (
    <div className="bento">
      <h2 className="carte-h" id="h-version">
        <Arche />
        <span>{T.version}</span>
      </h2>
      <GroupeRadio id="liste-version" etiquettes="h-version" className="rangee-densite">
        {options.map((option) => (
          <OptionRadio
            key={String(option.sombre)}
            choisi={option.sombre === valeur}
            onChoisir={() => onChoisir(option.sombre)}
            className="opt opt-densite opt-version"
            titre={option.titre}
            data-version={option.sombre ? 'sombre' : 'claire'}
          >
            <span className="opt-version-p" aria-hidden="true" />
            <span className="opt-densite-t">{option.nom}</span>
          </OptionRadio>
        ))}
      </GroupeRadio>
      <p className="bento-n">{T.versionNote}</p>
    </div>
  )
}
