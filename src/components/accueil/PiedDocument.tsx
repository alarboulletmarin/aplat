// SPDX-License-Identifier: AGPL-3.0-only

import { etiquetteVersion, lienLicence, lienSource } from '../../lib/build'
import type { Textes } from '../../i18n'
import { Lien } from '../Lien'
import { Soutien } from '../Soutien'

/**
 * Le pied des documents qui se déroulent : la présentation et le mécanisme.
 *
 * Il est ici, et pas recopié dans chacun, parce qu'il porte des mentions qui
 * ne sont pas décoratives. L'AGPL demande que quiconque utilise le logiciel
 * puisse obtenir la source *correspondante* : un lien vers la branche
 * principale ne la désigne pas, le commit si. La LCEN, elle, demande de nommer
 * l'hébergeur et son adresse, et elle vaut pour chaque document servi. Deux
 * exemplaires de ces lignes, c'est un exemplaire qui sera corrigé le jour venu
 * et un autre qui restera faux.
 *
 * `moteur` est le lien vers la page du mécanisme. Il n'est pas un appel : il
 * est au pied, à côté de la licence et de la source, pour qui se demande ce
 * qui vient de se passer.
 */
export function PiedDocument({
  textes,
  mention,
  moteur,
}: {
  textes: Textes
  /** La phrase du bas, propre au document. */
  mention: string
  /** Le lien vers la page du mécanisme, ou rien quand on y est déjà. */
  moteur?: string
}) {
  return (
    <footer className="accueil-pied">
      <span>{textes.entete.mention}</span>
      <span className="accueil-pied-meta">
        <span>{etiquetteVersion()}</span>
        {moteur && <Lien vers={moteur}>{textes.pied.moteur}</Lien>}
        <a href={lienSource()} rel="noopener noreferrer" target="_blank">
          {textes.pied.source}
        </a>
        <a href={lienLicence()} rel="noopener noreferrer" target="_blank">
          {textes.pied.licence}
        </a>
        <a href="/THIRD-PARTY.txt" rel="noopener noreferrer" target="_blank">
          {textes.pied.tiers}
        </a>
        <Soutien textes={textes} />
      </span>
      <span>{mention}</span>
      <span className="accueil-pied-mentions">{textes.pied.hebergement}</span>
    </footer>
  )
}
