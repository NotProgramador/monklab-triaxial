import { describe, expect, it } from 'vitest'
import { countRegistered, hasMeaningfulResult } from '../resultStatus'

describe('hasMeaningfulResult', () => {
  it('undefined → false', () => expect(hasMeaningfulResult(undefined)).toBe(false))
  it('objeto vacío → false', () => expect(hasMeaningfulResult({})).toBe(false))
  it('notes vacías → false', () => expect(hasMeaningfulResult({ notes: '' })).toBe(false))
  it('notes con espacios → false', () => expect(hasMeaningfulResult({ notes: '   ' })).toBe(false))
  it('observedColor → true', () => expect(hasMeaningfulResult({ observedColor: '#75696c' })).toBe(true))
  it('notes con contenido → true', () => expect(hasMeaningfulResult({ notes: 'algo' })).toBe(true))
  it('hasPhoto true → true', () => expect(hasMeaningfulResult({ hasPhoto: true })).toBe(true))
  it('hasPhoto false → false', () => expect(hasMeaningfulResult({ hasPhoto: false })).toBe(false))
  it('temperature 0 → true (0 es valor real)', () => expect(hasMeaningfulResult({ temperature: 0 })).toBe(true))
  it('gloss 2 → true', () => expect(hasMeaningfulResult({ gloss: 2 })).toBe(true))
})

describe('countRegistered', () => {
  it('cuenta solo los que tienen dato real', () => {
    const results = {
      1: {},
      2: { notes: '' },
      3: { observedColor: '#000' },
      4: { hasPhoto: true },
      5: { gloss: 1 },
    }
    expect(countRegistered([1, 2, 3, 4, 5, 6], results)).toBe(3)
  })
})
