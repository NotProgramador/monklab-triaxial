import { describe, expect, it } from 'vitest'
import { ingredientKey, normalizeMaterialName } from '../materialIdentity'
import { aggregateIngredients } from '../expandRecipe'

describe('normalizeMaterialName', () => {
  it('trim + lowercase + strip accents', () => {
    expect(normalizeMaterialName(' Caolín ')).toBe('caolin')
    expect(normalizeMaterialName('CAOLIN')).toBe('caolin')
    expect(normalizeMaterialName('caolin')).toBe('caolin')
    expect(normalizeMaterialName('Sílice')).toBe('silice')
    expect(normalizeMaterialName('  ')).toBe('')
    expect(normalizeMaterialName(undefined)).toBe('')
  })
  it('collapses whitespace', () => {
    expect(normalizeMaterialName('Caolín   EPK')).toBe('caolin epk')
  })
})

describe('ingredientKey', () => {
  it('con materialId → prefijo id:', () => {
    expect(ingredientKey('abc-123', 'Caolín')).toBe('id:abc-123')
  })
  it('sin materialId → prefijo n: normalizado', () => {
    expect(ingredientKey(undefined, 'Sílice')).toBe('n:silice')
  })
})

describe('aggregateIngredients (V1.3.2)', () => {
  it('mismo materialId, distintos nombres → una fila', () => {
    const agg = aggregateIngredients([
      { name: 'Caolín', grams: 5, materialId: 'm1' },
      { name: 'CAOLÍN', grams: 3, materialId: 'm1' },
    ])
    expect(agg).toHaveLength(1)
    expect(agg[0].grams).toBe(8)
    expect(agg[0].materialId).toBe('m1')
    // Nombre preserva la primera aparición (no forzar canónico)
    expect(agg[0].name).toBe('Caolín')
  })

  it('distinto materialId, mismo nombre → dos filas', () => {
    const agg = aggregateIngredients([
      { name: 'Caolín', grams: 5, materialId: 'm1' },
      { name: 'Caolín', grams: 3, materialId: 'm2' },
    ])
    expect(agg).toHaveLength(2)
  })

  it('legacy sin materialId agrupa por nombre normalizado', () => {
    const agg = aggregateIngredients([
      { name: 'Caolín', grams: 5 },
      { name: 'caolin', grams: 3 },
      { name: 'Sílice', grams: 2 },
    ])
    expect(agg).toHaveLength(2)
    expect(agg.find((i) => /caol/i.test(i.name))!.grams).toBe(8)
  })

  it('mezcla legacy + con id → NO se fusionan aunque los nombres coincidan', () => {
    // Un ingrediente con id y otro libre con el mismo nombre normalizado son ítems
    // distintos por diseño: el usuario ya expresó identidad explícita en uno.
    const agg = aggregateIngredients([
      { name: 'Caolín', grams: 5, materialId: 'm1' },
      { name: 'Caolín', grams: 3 },
    ])
    expect(agg).toHaveLength(2)
  })
})
