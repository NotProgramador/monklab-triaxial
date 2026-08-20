import { describe, expect, it } from 'vitest'
import type { VertexMaterial } from '../../types/material'
import type { TriaxialProject } from '../../types/project'
import { createDefaultProject } from '../defaults'
import { generateTriaxial } from '../generateTriaxial'
import {
  compareProjectConditions,
  compareVertexRecipes,
  compositionKey,
  findCommonCompositions,
  sampleByComposition,
} from '../projectComparison'

const mkVertex = (id: 'A' | 'B' | 'C', overrides: Partial<VertexMaterial> = {}): VertexMaterial => ({
  id, name: 'V', type: 'material', color: '#ffffff', ...overrides,
})

const mkProject = (overrides: Partial<TriaxialProject> = {}): TriaxialProject => {
  const base = createDefaultProject('T')
  return { ...base, ...overrides }
}

describe('compositionKey', () => {
  it('T09 40/20/40 → "40|20|40"', () => {
    expect(compositionKey({ a: 40, b: 20, c: 40 })).toBe('40|20|40')
  })
  it('mismos porcentajes, distintos ids → misma key', () => {
    expect(compositionKey({ a: 40, b: 20, c: 40 } as never)).toBe(compositionKey({ a: 40, b: 20, c: 40 } as never))
  })
})

describe('findCommonCompositions', () => {
  it('20% vs 10% → las 21 composiciones del grid 20 caben en 10', () => {
    const p20 = mkProject({ step: 20 })
    const p10 = mkProject({ step: 10 })
    expect(findCommonCompositions([p20, p10])).toHaveLength(21)
  })
  it('20% vs 25% → sólo los vértices comparten', () => {
    const p20 = mkProject({ step: 20 })
    const p25 = mkProject({ step: 25 })
    // Los vértices 100/0/0, 0/100/0, 0/0/100 son comunes; también algunos
    // (25/25/50 no, 50/50/0 no en grid 20). En la práctica sólo los tres
    // vértices coinciden exactamente. Test: comprobar que están.
    const common = findCommonCompositions([p20, p25])
    expect(common).toContain('100|0|0')
    expect(common).toContain('0|100|0')
    expect(common).toContain('0|0|100')
  })
  it('orden determinista según el primer proyecto', () => {
    const p20 = mkProject({ step: 20 })
    const p10 = mkProject({ step: 10 })
    const common = findCommonCompositions([p20, p10])
    const firstOrder = generateTriaxial(20).map(compositionKey)
    expect(common).toEqual(firstOrder)
  })
  it('lista vacía → []', () => {
    expect(findCommonCompositions([])).toEqual([])
  })
})

describe('sampleByComposition', () => {
  it('localiza por A/B/C, no por id', () => {
    const p = mkProject({ step: 20 })
    const s = sampleByComposition(p, '40|20|40')
    expect(s?.a).toBe(40)
    expect(s?.b).toBe(20)
    expect(s?.c).toBe(40)
    expect(s?.id).toBe(9) // en grid 20 es T09
  })
})

describe('compareVertexRecipes', () => {
  const recipeA = mkVertex('A', {
    recipe: { ingredients: [
      { id: '1', materialId: 'mat-caolin', name: 'Caolín', percentage: 45 },
      { id: '2', materialId: 'mat-silice', name: 'Sílice', percentage: 55 },
    ] },
  })

  it('same materialIds + same percentages → identical', () => {
    const b = mkVertex('A', {
      recipe: { ingredients: [
        { id: 'x', materialId: 'mat-caolin', name: 'Caolín', percentage: 45 },
        { id: 'y', materialId: 'mat-silice', name: 'Sílice', percentage: 55 },
      ] },
    })
    expect(compareVertexRecipes(recipeA, b)).toBe('identical')
  })

  it('sin materialIds, mismos nombres normalizados y % → compatible_legacy', () => {
    const a = mkVertex('A', { recipe: { ingredients: [
      { id: '1', name: ' Caolín ', percentage: 45 },
      { id: '2', name: 'silice', percentage: 55 },
    ] } })
    const b = mkVertex('A', { recipe: { ingredients: [
      { id: 'x', name: 'CAOLIN', percentage: 45 },
      { id: 'y', name: 'Sílice', percentage: 55 },
    ] } })
    expect(compareVertexRecipes(a, b)).toBe('compatible_legacy')
  })

  it('mismos nombres + %, materialIds distintos → ambiguous', () => {
    const b = mkVertex('A', {
      recipe: { ingredients: [
        { id: 'x', materialId: 'other-caolin', name: 'Caolín', percentage: 45 },
        { id: 'y', materialId: 'other-silice', name: 'Sílice', percentage: 55 },
      ] },
    })
    expect(compareVertexRecipes(recipeA, b)).toBe('ambiguous')
  })

  it('un lado con id y otro legacy → ambiguous', () => {
    const b = mkVertex('A', {
      recipe: { ingredients: [
        { id: 'x', name: 'Caolín', percentage: 45 },
        { id: 'y', name: 'Sílice', percentage: 55 },
      ] },
    })
    expect(compareVertexRecipes(recipeA, b)).toBe('ambiguous')
  })

  it('porcentajes distintos → different', () => {
    const b = mkVertex('A', {
      recipe: { ingredients: [
        { id: 'x', materialId: 'mat-caolin', name: 'Caolín', percentage: 44 },
        { id: 'y', materialId: 'mat-silice', name: 'Sílice', percentage: 56 },
      ] },
    })
    expect(compareVertexRecipes(recipeA, b)).toBe('different')
  })

  it('conjunto de ingredientes distinto → different', () => {
    const b = mkVertex('A', {
      recipe: { ingredients: [
        { id: 'x', materialId: 'mat-caolin', name: 'Caolín', percentage: 100 },
      ] },
    })
    expect(compareVertexRecipes(recipeA, b)).toBe('different')
  })

  it('ambos sin receta y mismo nombre → identical (material simple)', () => {
    const a = mkVertex('A', { name: 'Sílice' })
    const b = mkVertex('A', { name: ' SÍLICE ' })
    expect(compareVertexRecipes(a, b)).toBe('identical')
  })

  it('ambos sin receta pero nombres distintos → different', () => {
    const a = mkVertex('A', { name: 'Sílice' })
    const b = mkVertex('A', { name: 'Caolín' })
    expect(compareVertexRecipes(a, b)).toBe('different')
  })
})

describe('compareProjectConditions', () => {
  it('mismo contexto y firing → same', () => {
    const base = mkProject({
      experiment: { substrate: 'Loza blanca', bisqueTemperature: 950, applicationMethod: 'inmersion', coats: 2 },
      firing: { temperature: 1040, atmosphere: 'oxidacion', cone: '06' },
    })
    const rows = compareProjectConditions([base, base])
    expect(rows.every((r) => r.status === 'same')).toBe(true)
  })

  it('temperatura distinta → different sólo en esa fila', () => {
    const a = mkProject({ firing: { temperature: 1040, atmosphere: 'oxidacion' } })
    const b = mkProject({ firing: { temperature: 1060, atmosphere: 'oxidacion' } })
    const rows = compareProjectConditions([a, b])
    const temp = rows.find((r) => r.field === 'temperature')!
    const atm = rows.find((r) => r.field === 'atmosphere')!
    expect(temp.status).toBe('different')
    expect(atm.status).toBe('same')
    expect(temp.values).toEqual(['1040', '1060'])
  })

  it('un proyecto sin campo → missing', () => {
    const a = mkProject({ experiment: { substrate: 'Loza blanca' } })
    const b = mkProject({ experiment: {} })
    const rows = compareProjectConditions([a, b])
    const substrate = rows.find((r) => r.field === 'substrate')!
    expect(substrate.status).toBe('missing')
    expect(substrate.values).toEqual(['Loza blanca', null])
  })

  it('produce todas las filas esperadas', () => {
    const rows = compareProjectConditions([mkProject(), mkProject()])
    const fields = rows.map((r) => r.field)
    expect(fields).toEqual(['substrate', 'bisque', 'application', 'coats', 'temperature', 'cone', 'atmosphere', 'kiln'])
  })
})
