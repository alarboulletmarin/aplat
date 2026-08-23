// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'

/**
 * Un compteur qui avance à chaque redimensionnement, une fois la rafale
 * retombée, et une fois les polices prêtes — elles changent la métrique des
 * vignettes. Les rendus qui dépendent de la mise en page s'y accrochent.
 */
export function useRevisionFenetre(): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let minuterie: ReturnType<typeof setTimeout>
    const avancer = () => {
      clearTimeout(minuterie)
      minuterie = setTimeout(() => setRevision((n) => n + 1), 120)
    }
    window.addEventListener('resize', avancer)
    const sombre = window.matchMedia('(prefers-color-scheme: dark)')
    sombre.addEventListener('change', avancer)
    document.fonts?.ready.then(() => setRevision((n) => n + 1))
    return () => {
      clearTimeout(minuterie)
      window.removeEventListener('resize', avancer)
      sombre.removeEventListener('change', avancer)
    }
  }, [])

  return revision
}
