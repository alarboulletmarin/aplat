// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type CSSProperties } from 'react'
import { mesurer, type Langue, type Motif } from '../../lib/moteur'
import { jetonsLibelle } from '../../lib/geometrie'
import type { Resolution } from '../../lib/resolution'
import type { Textes } from '../../i18n'
import { useHorloge } from '../../hooks/useHorloge'
import { useTaille } from '../../hooks/useTaille'
import { MaquetteBureau, MaquetteTelephone } from '../Maquette'
import { Toile } from './Toile'

/**
 * Un motif derrière une vraie grille d'icônes, comme dans l'application.
 *
 * C'est la seule chose que la page d'accueil avait à montrer : ni une capture,
 * ni une image d'illustration, mais exactement ce qu'on verra en ouvrant
 * l'outil. La maquette vient du même fichier que celle de l'application, et
 * les couleurs de ses libellés sont déduites de la même sonde de lisibilité.
 *
 * La boîte porte ici sa propre géométrie, par la feuille de style : la page a
 * de la place, elle ne fait pas tenir un appareil dans le reste d'une colonne.
 * Il n'en reste qu'à publier `--mu`, le module dont dépendent toutes les
 * tailles de la maquette, et qui vaut un centième du petit côté.
 */
export function Appareil({
  motif,
  resolution,
  bureau = false,
  langue,
  textes,
  description,
  className,
}: {
  motif: Motif
  /** Le format visé : la sonde mesure celui du fichier, pas celui de la boîte. */
  resolution: Resolution
  /** La maquette de bureau plutôt que celle de téléphone. */
  bureau?: boolean
  langue: Langue
  textes: Textes
  description?: string
  className: string
}) {
  const cadre = useRef<HTMLDivElement>(null)
  const { largeur, hauteur } = useTaille(cadre)
  const instant = useHorloge(langue)

  const colonnes = bureau ? 6 : 4
  const mesure = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    resolution.largeur, resolution.hauteur,
  )

  /* Zéro tant que la boîte n'est pas mesurée : la maquette se peint alors sur
     un module nul, donc invisible, plutôt que sur une taille inventée qu'il
     faudrait reprendre à la première mesure. */
  const module = Math.min(largeur, hauteur) / 100

  const style = {
    '--mu': `${module}px`,
    '--colonnes': colonnes,
    ...jetonsLibelle(mesure.libelles),
  } as CSSProperties

  const signature = [bureau, langue, largeur, hauteur, instant.quantieme].join('|')

  return (
    <div className={`appareil ${className}`} ref={cadre} style={style}>
      <Toile
        motif={motif}
        resolution={resolution}
        className="appareil-canevas"
        description={description}
      />
      {module > 0 &&
        (bureau ? (
          <MaquetteBureau textes={textes} instant={instant} signature={signature} />
        ) : (
          <MaquetteTelephone
            textes={textes}
            instant={instant}
            colonnes={colonnes}
            signature={signature}
          />
        ))}
    </div>
  )
}
