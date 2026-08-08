import { describe, expect, it } from 'vitest'
import {
  analyzeWeight,
  decimalsForPrecision,
  formatWeightForPrecision,
  isRepresentable,
  quantizeNamed,
  quantizeWeights,
  roundToPrecision,
} from '../weighingPrecision'

describe('roundToPrecision', () => {
  it('0.16 / 0.01 → 0.16', () => expect(roundToPrecision(0.16, 0.01)).toBe(0.16))
  it('0.16 / 0.1 → 0.2', () => expect(roundToPrecision(0.16, 0.1)).toBe(0.2))
  it('0.16 / 1 → 0', () => expect(roundToPrecision(0.16, 1)).toBe(0))
  it('8.06 / 0.1 → 8.1', () => expect(roundToPrecision(8.06, 0.1)).toBe(8.1))
  it('8.03 / 0.1 → 8', () => expect(roundToPrecision(8.03, 0.1)).toBe(8))
  it('0.30000000000000004 / 0.01 → 0.3', () => expect(roundToPrecision(0.30000000000000004, 0.01)).toBe(0.3))
})

describe('isRepresentable', () => {
  it('20 en 0.1 → true', () => expect(isRepresentable(20, 0.1)).toBe(true))
  it('20.05 en 0.1 → false', () => expect(isRepresentable(20.05, 0.1)).toBe(false))
  it('0.15 en 0.01 → true', () => expect(isRepresentable(0.15, 0.01)).toBe(true))
  it('0.155 en 0.01 → false', () => expect(isRepresentable(0.155, 0.01)).toBe(false))
})

describe('formatWeightForPrecision + decimals', () => {
  it('decimalsForPrecision', () => {
    expect(decimalsForPrecision(1)).toBe(0)
    expect(decimalsForPrecision(0.1)).toBe(1)
    expect(decimalsForPrecision(0.01)).toBe(2)
  })
  it('conserva ceros significativos', () => {
    expect(formatWeightForPrecision(8, 1)).toBe('8')
    expect(formatWeightForPrecision(8, 0.1)).toBe('8.0')
    expect(formatWeightForPrecision(8, 0.01)).toBe('8.00')
  })
})

describe('quantizeWeights básico', () => {
  it('[6.66, 6.66, 6.68] target 20 precision 0.1 → suma 20.0', () => {
    const q = quantizeWeights([6.66, 6.66, 6.68], 0.1, 20)
    // Todos múltiplos de 0.1
    for (const v of q.values) expect(v * 10).toBe(Math.round(v * 10))
    expect(q.values.reduce((s, v) => s + v, 0)).toBeCloseTo(20.0, 6)
    expect(q.values.every((v) => v >= 0)).toBe(true)
  })

  it('T09 real (8.68/3.84/3.92/3.08/0.32/0.16) precision 0.1 → suma 20.0', () => {
    const teor = [8.68, 3.84, 3.92, 3.08, 0.32, 0.16]
    const q = quantizeWeights(teor, 0.1, 20)
    for (const v of q.values) expect(v * 10).toBe(Math.round(v * 10))
    expect(q.values.reduce((s, v) => s + v, 0)).toBeCloseTo(20.0, 6)
    // 0.16 requiere ajuste (no es representable en 0.1)
    // debe redondear a 0.1 o 0.2 — cualquiera de las dos válidas
    const cobalto = q.values[5]
    expect([0.1, 0.2]).toContain(cobalto)
  })

  it('T09 con precision 0.01 → todos representables exactamente', () => {
    const teor = [8.68, 3.84, 3.92, 3.08, 0.32, 0.16]
    const q = quantizeWeights(teor, 0.01, 20)
    expect(q.values).toEqual(teor)
    expect(q.practicalTotal).toBeCloseTo(20, 6)
  })

  it('target no representable marca targetAdjusted', () => {
    const q = quantizeWeights([10, 10.05], 0.1, 20.05)
    expect(q.targetAdjusted).toBe(true)
    expect(q.practicalTotal).toBeCloseTo(20.1, 6)
  })

  it('belowResolution: 0.02 g con precision 0.1', () => {
    const q = quantizeWeights([0.02, 5, 5], 0.1)
    expect(q.belowResolution[0]).toBe(true)
    expect(q.belowResolution[1]).toBe(false)
  })

  it('array vacío no explota', () => {
    const q = quantizeWeights([], 0.1)
    expect(q.values).toEqual([])
    expect(q.practicalTotal).toBe(0)
  })

  it('231 valores no explota y suma se conserva', () => {
    const values = Array.from({ length: 231 }, (_, i) => (i + 1) * 0.037)
    const teorTotal = values.reduce((s, v) => s + v, 0)
    const q = quantizeWeights(values, 0.1)
    expect(q.values.length).toBe(231)
    // La suma práctica es el teórico redondeado a 0.1
    expect(q.practicalTotal * 10).toBe(Math.round(teorTotal * 10))
  })

  it('no muta el input', () => {
    const input = [6.66, 6.66, 6.68]
    const snapshot = [...input]
    quantizeWeights(input, 0.1, 20)
    expect(input).toEqual(snapshot)
  })

  it('determinismo: mismo input, mismo output', () => {
    const a = quantizeWeights([6.66, 6.66, 6.68], 0.1, 20)
    const b = quantizeWeights([6.66, 6.66, 6.68], 0.1, 20)
    expect(a.values).toEqual(b.values)
  })

  it('preparación demo: 21×20g @ 10% → 462g @ 0.1 conserva 462.0', () => {
    // Simular expandedIngredients con 6 materias primas del proyecto demo
    const items = [
      { name: 'Caolín', grams: 182.28 },
      { name: 'Arcilla bola', grams: 88.20 },
      { name: 'Sílice', grams: 88.20 },
      { name: 'Feldespato', grams: 84.00 },
      { name: 'Óxido de hierro', grams: 8.40 },
      { name: 'Óxido de cobalto', grams: 10.92 },
    ]
    // total teórico ~ 462
    const q = quantizeNamed(items, 0.1, 462)
    expect(q.practicalTotal).toBeCloseTo(462.0, 6)
    for (const it of q.items) {
      expect(it.practical * 10).toBe(Math.round(it.practical * 10))
    }
  })
})

describe('analyzeWeight', () => {
  it('0.02 en 0.1 → belowResolution', () => {
    const a = analyzeWeight(0.02, 0.1)
    expect(a.practical).toBe(0)
    expect(a.belowResolution).toBe(true)
    expect(a.exact).toBe(false)
  })
  it('0.16 en 0.01 → exacto', () => {
    const a = analyzeWeight(0.16, 0.01)
    expect(a.exact).toBe(true)
    expect(a.belowResolution).toBe(false)
    expect(a.practical).toBe(0.16)
  })
  it('0.16 en 0.1 → práctico 0.2, no exacto', () => {
    const a = analyzeWeight(0.16, 0.1)
    expect(a.practical).toBe(0.2)
    expect(a.exact).toBe(false)
    expect(a.belowResolution).toBe(false)
  })
})
