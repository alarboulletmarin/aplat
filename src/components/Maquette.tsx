// SPDX-License-Identifier: AGPL-3.0-only

import { useRef } from 'react'
import { RAYONS } from '../lib/moteur'
import type { Textes } from '../i18n'
import type { Instant } from '../hooks/useHorloge'
import { useAjustement } from '../hooks/useAjustement'

/**
 * La maquette d'écran. C'est la valeur du produit : voir le motif derrière des
 * icônes avant de télécharger, plutôt que de le découvrir une fois posé.
 *
 * Tout y est factice et le dit. La note sous l'aperçu le rappelle, et
 * l'ensemble est retiré de l'arbre d'accessibilité : ce sont des formes, pas
 * des informations.
 */

function IconeFactice({ classe, indice }: { classe: string; indice: number }) {
  /* Jamais deux fois le même arrondi : c'est ce qui fait lire la grille comme
     un vrai écran plutôt que comme un damier. */
  return (
    <span className={classe}>
      <i style={{ borderRadius: RAYONS[indice % RAYONS.length] }} />
    </span>
  )
}

export function MaquetteTelephone({
  textes,
  instant,
  colonnes,
  signature,
}: {
  textes: Textes
  instant: Instant
  colonnes: number
  signature: string
}) {
  const cadre = useRef<HTMLDivElement>(null)
  const total = colonnes === 4 ? 16 : 24
  const nombre = useAjustement(cadre, colonnes, total, signature)
  const applications = textes.maquette.applications.slice(0, nombre)
  const dock = textes.maquette.dock.slice(0, 4)

  return (
    <div className="maq" id="maquette" ref={cadre} aria-hidden="true">
      <div className="maq-etat">
        <span>{instant.heure}</span>
        <span className="maq-etat-d">
          <span className="maq-barres">
            <i />
            <i />
            <i />
          </span>
          <span className="maq-wifi" />
          <span className="maq-pile">
            <i />
          </span>
        </span>
      </div>

      <div className="maq-widget">
        <span className="maq-quantieme">{instant.quantieme}</span>
        <span className="maq-date">
          <span className="maq-jour">{instant.jour}</span>
          <span className="maq-mois">{instant.mois}</span>
        </span>
        <span className="maq-points">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="maq-grille">
        {applications.map((nom, indice) => (
          <span className="maq-app" key={nom}>
            <IconeFactice classe="maq-app-i" indice={indice} />
            <span className="maq-app-t">{nom}</span>
          </span>
        ))}
      </div>

      <div className="maq-pied">
        <span className="maq-recherche">{textes.maquette.recherche}</span>
        <span className="maq-dock">
          {dock.map((nom, indice) => (
            <IconeFactice classe="maq-dock-i" indice={indice + 2} key={nom} />
          ))}
        </span>
      </div>
    </div>
  )
}

export function MaquetteBureau({
  textes,
  instant,
  signature,
}: {
  textes: Textes
  instant: Instant
  signature: string
}) {
  const cadre = useRef<HTMLDivElement>(null)
  const total = textes.maquette.bureau.length
  const nombre = useAjustement(cadre, 1, total, signature)
  const fichiers = textes.maquette.bureau.slice(0, nombre)
  const dock = textes.maquette.dock.slice(0, 6)

  return (
    <div className="maqo" id="maquette-bureau" ref={cadre} aria-hidden="true">
      <div className="maqo-barre">
        <span className="maqo-logo" />
        {textes.maquette.menu.map((entree) => (
          <span className="maqo-menu" key={entree}>
            {entree}
          </span>
        ))}
        <span className="maqo-barre-d">
          <span className="maqo-wifi" />
          <span>{instant.heure}</span>
        </span>
      </div>

      <div className="maqo-corps">
        <div className="maqo-icones">
          {fichiers.map((nom, indice) => (
            <span className="maqo-app" key={nom}>
              <IconeFactice classe="maqo-app-i" indice={indice} />
              <span className="maqo-app-t">{nom}</span>
            </span>
          ))}
        </div>
        <div className="maqo-widget">
          <span className="maqo-quantieme">{instant.quantieme}</span>
          <span className="maqo-date">
            <span className="maqo-jour">{instant.jour}</span>
            <span className="maqo-mois">{instant.mois}</span>
          </span>
        </div>
      </div>

      <div className="maqo-dock-b">
        <span className="maqo-dock">
          {dock.map((nom, indice) => (
            <IconeFactice classe="maqo-dock-i" indice={indice + 2} key={nom} />
          ))}
        </span>
      </div>
    </div>
  )
}
