// SPDX-License-Identifier: AGPL-3.0-only

import { memo, useRef } from 'react'
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
 *
 * Les deux maquettes sont mémoïsées, et ce n'est pas une précaution de
 * principe. `useAjustement` mesure la boîte après chaque rendu, dans un effet
 * de mise en page sans liste de dépendances : c'est la seule façon de retirer
 * une rangée puis de remesurer, mais cela force un recalcul de mise en page sur
 * la centaine de nœuds de la grille. Tant que rien de la scène ne bougeait
 * entre deux clics, personne ne le payait. Le rideau clair/sombre, lui, change
 * un état de la scène à chaque pixel glissé : sans la mémoïsation, il coûtait
 * un recalcul complet par image, et vingt-cinq images sur cent tombaient sur un
 * processeur d'entrée de gamme.
 *
 * Les quatre propriétés sont stables par construction : le dictionnaire est un
 * objet de module, l'instant vient d'un `useMemo`, les colonnes et la signature
 * sont des valeurs simples. La comparaison superficielle suffit donc, et une
 * propriété ajoutée sans l'être casserait l'ajustement de façon visible plutôt
 * que silencieuse.
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

function TelephoneNu({
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

function BureauNu({
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

export const MaquetteTelephone = memo(TelephoneNu)
export const MaquetteBureau = memo(BureauNu)
