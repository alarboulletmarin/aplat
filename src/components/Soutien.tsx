// SPDX-License-Identifier: AGPL-3.0-only

import { lienSoutien } from '../lib/build'
import type { Textes } from '../i18n'

/**
 * Le lien de soutien, dans le pied des deux pages.
 *
 * Aplat est gratuit, sans compte, sans pub et sans traceur, et le reste. Ce
 * lien est donc une porte et non une caisse : il vit dans le pied, à côté de la
 * licence et de la source, et rien dans le produit ne le rappelle. Pas de
 * bandeau, pas de rappel après un téléchargement, pas de compteur : ce sont
 * exactement les frictions asymétriques que le design refuse.
 *
 * Le bouton officiel de Ko-fi est une image servie par leur CDN. Elle n'entre
 * pas ici : la page ne fait aucune requête vers un tiers, c'est écrit dans la
 * promesse et vérifié par `tools/shot.mjs`. La tasse est donc dessinée, comme
 * tous les autres pictogrammes du produit, et le lien reste un lien.
 */
export function Soutien({ textes }: { textes: Textes }) {
  return (
    <a
      className="soutien"
      id="lien-soutien"
      href={lienSoutien()}
      rel="noopener noreferrer"
      target="_blank"
      title={textes.pied.soutienTitre}
    >
      <span className="ico-tasse" aria-hidden="true">
        <i />
        <b />
      </span>
      <span>{textes.pied.soutien}</span>
    </a>
  )
}
