// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { plateforme } from './plateforme'

const cas = (userAgent: string, maxTouchPoints = 0) => plateforme({ userAgent, maxTouchPoints })

describe('plateforme', () => {
  it('reconnaît un iPhone', () => {
    expect(cas('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('ios')
  })

  it('reconnaît un iPad récent, qui se présente comme un Mac', () => {
    expect(cas('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5)).toBe('ios')
  })

  it('ne prend pas un Mac pour un iPad', () => {
    expect(cas('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0)).toBe('autre')
  })

  it('reconnaît Android', () => {
    expect(cas('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe('android')
  })

  it('retombe sur l’ordinateur pour tout le reste, et sans navigateur', () => {
    expect(cas('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('autre')
    expect(plateforme(undefined)).toBe('autre')
  })
})
