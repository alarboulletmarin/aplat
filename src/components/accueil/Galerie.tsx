// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react'
import { famille, palette, type Langue } from '../../lib/moteur'
import { GRAINE_MAX } from '../../lib/url'
import { remplir, type Textes } from '../../i18n'
import { Frise } from './Frise'
import { Toile } from './Toile'
import { GALERIE, TELEPHONE } from './choix'

/**
 * Douze motifs, calculés dans la page.
 *
 * Chaque vignette est un bouton qui retire sa graine. C'est la seule chose de
 * la page d'accueil qui bouge, et elle ne bouge que sur demande : rien ne
 * défile tout seul, rien ne s'anime en boucle pour attirer l'oeil. Le geste
 * est aussi une démonstration, la plus courte possible du produit entier,
 * puisque redessiner un motif avec une autre graine est exactement ce que fait
 * « Variante » dans l'application.
 *
 * Le format visé reste celui d'un téléphone alors que la vignette est petite :
 * la sonde de lisibilité mesure ce qui serait exporté, donc le voile montré
 * est celui du fichier, à l'échelle près.
 */
export function Galerie({ langue, textes }: { langue: Langue; textes: Textes }) {
  /* Les graines de départ viennent du choix arrêté ; seules celles qu'on
     relance vivent ici. */
  const [graines, setGraines] = useState<Record<number, number>>({})

  const relancer = (index: number) =>
    setGraines((precedentes) => ({
      ...precedentes,
      [index]: Math.floor(Math.random() * GRAINE_MAX) + 1,
    }))

  return (
    <section className="galerie" id="galerie" aria-labelledby="h-galerie">
      <div className="section-tete">
        <h2 className="section-titre" id="h-galerie">
          {textes.accueil.galerie.titre}
        </h2>
        <p className="section-note">{textes.accueil.galerie.note}</p>
      </div>
      <Frise decalage={2} />

      <ul className="tuiles">
        {GALERIE.map((choix, index) => {
          const motif = { ...choix, graine: graines[index] ?? choix.graine }
          const nomFamille = famille(motif.famille)?.[langue] ?? motif.famille
          const nomPalette = palette(motif.palette)[langue]
          return (
            <li key={`${choix.famille}-${choix.palette}`}>
              <button
                type="button"
                className="tuile"
                onClick={() => relancer(index)}
                aria-label={remplir(textes.accueil.galerie.relancer, {
                  famille: nomFamille,
                  palette: nomPalette,
                })}
              >
                <Toile motif={motif} resolution={TELEPHONE} className="tuile-toile" />
                <span className="tuile-pied">
                  <span className="tuile-nom">{nomFamille}</span>
                  <span className="tuile-palette">{nomPalette}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
