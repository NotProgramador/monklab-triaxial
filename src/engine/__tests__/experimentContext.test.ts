import { describe, expect, it } from 'vitest'
import {
  applicationMethodLabel,
  formatExperimentSummary,
  hasExperimentContext,
} from '../experimentContext'

describe('hasExperimentContext', () => {
  it('undefined / {} → false', () => {
    expect(hasExperimentContext(undefined)).toBe(false)
    expect(hasExperimentContext({})).toBe(false)
  })
  it('substrate en blanco → false', () => {
    expect(hasExperimentContext({ substrate: '   ' })).toBe(false)
  })
  it('substrate real → true', () => {
    expect(hasExperimentContext({ substrate: 'Loza blanca' })).toBe(true)
  })
  it('bisqueTemperature → true', () => {
    expect(hasExperimentContext({ bisqueTemperature: 950 })).toBe(true)
  })
  it('applicationMethod → true', () => {
    expect(hasExperimentContext({ applicationMethod: 'inmersion' })).toBe(true)
  })
  it('coats → true', () => {
    expect(hasExperimentContext({ coats: 2 })).toBe(true)
  })
  it('applicationNotes real → true', () => {
    expect(hasExperimentContext({ applicationNotes: 'algo' })).toBe(true)
  })
})

describe('formatExperimentSummary', () => {
  it('vacío → ""', () => expect(formatExperimentSummary({})).toBe(''))
  it('substrate solo', () => {
    expect(formatExperimentSummary({ substrate: 'Loza blanca' })).toBe('Loza blanca')
  })
  it('substrate + bisque', () => {
    expect(formatExperimentSummary({ substrate: 'Loza blanca', bisqueTemperature: 950 }))
      .toBe('Loza blanca · Bizcocho 950 °C')
  })
  it('method + coats plural', () => {
    expect(formatExperimentSummary({ applicationMethod: 'inmersion', coats: 2 }))
      .toBe('Inmersión · 2 capas')
  })
  it('coats singular', () => {
    expect(formatExperimentSummary({ coats: 1 })).toBe('1 capa')
  })
  it('demo completo', () => {
    const s = formatExperimentSummary({
      substrate: 'Loza blanca', bisqueTemperature: 950,
      applicationMethod: 'inmersion', coats: 2,
      applicationNotes: 'Aplicación uniforme.',
    })
    expect(s).toBe('Loza blanca · Bizcocho 950 °C · Inmersión · 2 capas')
  })
  it('no genera separadores vacíos', () => {
    expect(formatExperimentSummary({ substrate: 'X', coats: 3 })).toBe('X · 3 capas')
    expect(formatExperimentSummary({ bisqueTemperature: 980, coats: 3 }))
      .toBe('Bizcocho 980 °C · 3 capas')
  })
})

describe('applicationMethodLabel', () => {
  it('mapea a etiquetas humanas', () => {
    expect(applicationMethodLabel('brocha')).toBe('Brocha')
    expect(applicationMethodLabel('inmersion')).toBe('Inmersión')
    expect(applicationMethodLabel('vertido')).toBe('Vertido')
    expect(applicationMethodLabel('pistola')).toBe('Pistola')
    expect(applicationMethodLabel('otro')).toBe('Otro')
    expect(applicationMethodLabel(undefined)).toBe('')
  })
})
