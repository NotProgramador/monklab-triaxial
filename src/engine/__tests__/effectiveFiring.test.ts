import { describe, expect, it } from 'vitest'
import {
  formatFiringSummary,
  getEffectiveFiring,
  hasAnyProjectFiring,
  hasSampleFiringOverride,
} from '../effectiveFiring'

describe('hasSampleFiringOverride', () => {
  it('undefined / {} → false', () => {
    expect(hasSampleFiringOverride(undefined)).toBe(false)
    expect(hasSampleFiringOverride({})).toBe(false)
  })
  it('observedColor únicamente → false', () => {
    expect(hasSampleFiringOverride({ observedColor: '#75696c' })).toBe(false)
  })
  it('temperature → true', () => expect(hasSampleFiringOverride({ temperature: 1080 })).toBe(true))
  it('cone → true', () => expect(hasSampleFiringOverride({ cone: '6' })).toBe(true))
  it('atmosphere → true', () => expect(hasSampleFiringOverride({ atmosphere: 'reduccion' })).toBe(true))
  it('cone vacío no cuenta', () => expect(hasSampleFiringOverride({ cone: '' })).toBe(false))
})

describe('getEffectiveFiring', () => {
  const project = { temperature: 1040, atmosphere: 'oxidacion' as const, cone: '06', date: '2026-08-08', kiln: 'Horno eléctrico', notes: 'Curva estándar' }

  it('sample vacío → hereda del proyecto', () => {
    const e = getEffectiveFiring(project, {})
    expect(e.temperature).toBe(1040)
    expect(e.atmosphere).toBe('oxidacion')
    expect(e.cone).toBe('06')
    expect(e.overriddenBy).toEqual({ temperature: false, cone: false, atmosphere: false })
  })

  it('sample temperature 1080 → override', () => {
    const e = getEffectiveFiring(project, { temperature: 1080 })
    expect(e.temperature).toBe(1080)
    expect(e.atmosphere).toBe('oxidacion')
    expect(e.overriddenBy.temperature).toBe(true)
    expect(e.overriddenBy.atmosphere).toBe(false)
  })

  it('sample atmosphere reduccion → override', () => {
    const e = getEffectiveFiring(project, { atmosphere: 'reduccion' })
    expect(e.temperature).toBe(1040)
    expect(e.atmosphere).toBe('reduccion')
    expect(e.overriddenBy.atmosphere).toBe(true)
  })

  it('sample cone 6 sobre project 06 → sample gana', () => {
    const e = getEffectiveFiring(project, { cone: '6' })
    expect(e.cone).toBe('6')
    expect(e.overriddenBy.cone).toBe(true)
  })

  it('kiln/date/notes son solo de proyecto', () => {
    const e = getEffectiveFiring(project, { temperature: 1080 })
    expect(e.date).toBe('2026-08-08')
    expect(e.kiln).toBe('Horno eléctrico')
    expect(e.notes).toBe('Curva estándar')
  })

  it('project undefined → todo de sample o vacío', () => {
    const e = getEffectiveFiring(undefined, { temperature: 900 })
    expect(e.temperature).toBe(900)
    expect(e.cone).toBeUndefined()
  })
})

describe('hasAnyProjectFiring', () => {
  it('undefined / {} → false', () => {
    expect(hasAnyProjectFiring(undefined)).toBe(false)
    expect(hasAnyProjectFiring({})).toBe(false)
  })
  it('temperature 0 → true', () => expect(hasAnyProjectFiring({ temperature: 0 })).toBe(true))
  it('date → true', () => expect(hasAnyProjectFiring({ date: '2026-08-08' })).toBe(true))
})

describe('formatFiringSummary', () => {
  it('vacío → cadena vacía', () => expect(formatFiringSummary({})).toBe(''))
  it('temperatura + atmósfera', () => {
    expect(formatFiringSummary({ temperature: 1040, atmosphere: 'oxidacion' }))
      .toBe('1040 °C · Oxidación')
  })
  it('todos los campos', () => {
    const s = formatFiringSummary({ temperature: 1040, atmosphere: 'oxidacion', cone: '06', date: '2026-08-08', kiln: 'Horno eléctrico' })
    expect(s).toContain('1040 °C')
    expect(s).toContain('Oxidación')
    expect(s).toContain('Cono 06')
    expect(s).toContain('Horno eléctrico')
  })
})
