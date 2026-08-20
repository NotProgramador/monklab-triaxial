import { describe, expect, it } from 'vitest'
import {
  MAX_COMPARISON,
  clampReference,
  compositionDelta,
  compositionDistance,
  toggleComparisonSample,
} from '../comparison'

const S = (a: number, b: number, c: number, id = 1) => ({ id, a, b, c })

describe('toggleComparisonSample', () => {
  it('añade primera muestra', () => {
    expect(toggleComparisonSample([], 9)).toEqual([9])
  })
  it('añade segunda muestra', () => {
    expect(toggleComparisonSample([9], 13)).toEqual([9, 13])
  })
  it('quita muestra existente', () => {
    expect(toggleComparisonSample([9, 13], 9)).toEqual([13])
  })
  it('duplicado no añade', () => {
    // Añadir 9 a [9] → lo interpreta como toggle-off = []
    expect(toggleComparisonSample([9], 9)).toEqual([])
    // Pero añadir 9 a [] → [9]
    expect(toggleComparisonSample([], 9)).toEqual([9])
  })
  it('quinta muestra rechazada', () => {
    const four = [1, 2, 3, 4]
    expect(toggleComparisonSample(four, 5)).toEqual(four)
    expect(toggleComparisonSample(four, 5)).not.toBe(four) // nueva referencia
  })
  it('MAX_COMPARISON = 4', () => {
    expect(MAX_COMPARISON).toBe(4)
  })
})

describe('clampReference', () => {
  it('lista vacía → null', () => {
    expect(clampReference([], 9)).toBeNull()
  })
  it('referencia válida se mantiene', () => {
    expect(clampReference([9, 13], 13)).toBe(13)
  })
  it('referencia inexistente → primera', () => {
    expect(clampReference([9, 13], 99)).toBe(9)
  })
  it('referencia null → primera', () => {
    expect(clampReference([9, 13], null)).toBe(9)
  })
})

describe('compositionDelta', () => {
  it('deltas positivos y negativos', () => {
    const t09 = S(40, 20, 40)
    const t13 = S(20, 40, 40)
    expect(compositionDelta(t13, t09)).toEqual({ a: -20, b: 20, c: 0 })
  })
  it('mismo → deltas 0', () => {
    const t = S(30, 30, 40)
    expect(compositionDelta(t, t)).toEqual({ a: 0, b: 0, c: 0 })
  })
})

describe('compositionDistance', () => {
  it('T09 vs T13 → 40', () => {
    const t09 = S(40, 20, 40)
    const t13 = S(20, 40, 40)
    expect(compositionDistance(t13, t09)).toBe(40)
  })
  it('mismo → 0', () => {
    const t = S(30, 30, 40)
    expect(compositionDistance(t, t)).toBe(0)
  })
})
