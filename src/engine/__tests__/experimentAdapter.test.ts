import { describe, expect, it } from 'vitest'
import {
  compositionKeyFromMap,
  componentsFromVertices,
  expectedComponentCount,
  genericCompositionKey,
  getComponent,
  triaxialSampleToComposition,
  validateComponentStructure,
  verticesFromComponents,
  withVertex,
} from '../experimentAdapter'
import { createDefaultProject } from '../defaults'
import type { FormulaComponent } from '../../types/material'

describe('expectedComponentCount', () => {
  it('monoaxial → 1', () => expect(expectedComponentCount('monoaxial')).toBe(1))
  it('biaxial → 2', () => expect(expectedComponentCount('biaxial')).toBe(2))
  it('triaxial → 3', () => expect(expectedComponentCount('triaxial')).toBe(3))
})

describe('validateComponentStructure', () => {
  const mk = (id: string): FormulaComponent => ({ id, name: id, type: 'material', color: '#ffffff' })

  it('triaxial con 3 ids únicos → válido', () => {
    expect(validateComponentStructure('triaxial', [mk('A'), mk('B'), mk('C')])).toMatchObject({ valid: true })
  })
  it('triaxial con 2 componentes → wrong-count', () => {
    const r = validateComponentStructure('triaxial', [mk('A'), mk('B')])
    expect(r.valid).toBe(false)
    expect(r.error).toBe('wrong-count')
    expect(r.expected).toBe(3)
    expect(r.actual).toBe(2)
  })
  it('biaxial con 3 → wrong-count', () => {
    const r = validateComponentStructure('biaxial', [mk('A'), mk('B'), mk('C')])
    expect(r.error).toBe('wrong-count')
  })
  it('monoaxial con 0 → wrong-count', () => {
    const r = validateComponentStructure('monoaxial', [])
    expect(r.error).toBe('wrong-count')
  })
  it('ids duplicados → duplicate-id', () => {
    const r = validateComponentStructure('triaxial', [mk('A'), mk('A'), mk('B')])
    expect(r.error).toBe('duplicate-id')
  })
  it('id vacío → empty-id', () => {
    const r = validateComponentStructure('triaxial', [mk(''), mk('B'), mk('C')])
    expect(r.error).toBe('empty-id')
  })
})

describe('verticesFromComponents / componentsFromVertices', () => {
  it('triaxial roundtrip preserva nombres y recetas', () => {
    const components: FormulaComponent[] = [
      { id: 'A', name: 'Caolín', type: 'material', color: '#f4e8d0' },
      { id: 'B', name: 'Óxido', type: 'oxido', color: '#a54835', recipe: { ingredients: [{ id: '1', name: 'FeO', percentage: 100 }] } },
      { id: 'C', name: 'Cobalto', type: 'pigmento', color: '#315a87' },
    ]
    const verts = verticesFromComponents(components)
    expect(verts.A.name).toBe('Caolín')
    expect(verts.B.recipe?.ingredients[0].name).toBe('FeO')
    expect(verts.C.id).toBe('C')
    const back = componentsFromVertices(verts)
    expect(back).toEqual(components)
  })
  it('verticesFromComponents con != 3 lanza', () => {
    expect(() => verticesFromComponents([])).toThrow()
    expect(() => verticesFromComponents([{ id: 'A', name: 'A', type: 'material', color: '#000000' }])).toThrow()
  })
})

describe('withVertex', () => {
  it('actualiza vertex y component simultáneamente', () => {
    const p = createDefaultProject('T')
    const next = withVertex(p, 'A', { ...p.vertices.A, name: 'Nuevo A', color: '#111111' })
    expect(next.vertices.A.name).toBe('Nuevo A')
    expect(next.vertices.A.color).toBe('#111111')
    const comp = getComponent(next, 'A')
    expect(comp?.name).toBe('Nuevo A')
    expect(comp?.color).toBe('#111111')
  })
  it('preserva el id forzado aunque el input llegue con otro', () => {
    const p = createDefaultProject('T')
    const next = withVertex(p, 'B', { ...p.vertices.B, id: 'A' as 'A' | 'B' | 'C' })
    expect(next.vertices.B.id).toBe('B')
    expect(getComponent(next, 'B')?.id).toBe('B')
  })
})

describe('triaxialSampleToComposition', () => {
  it('T09 40/20/40', () => {
    expect(triaxialSampleToComposition({ id: 9, a: 40, b: 20, c: 40 })).toEqual({
      id: 9,
      composition: { A: 40, B: 20, C: 40 },
    })
  })
})

describe('compositionKeyFromMap / genericCompositionKey', () => {
  it('respeta orden explícito', () => {
    expect(compositionKeyFromMap({ A: 40, B: 20, C: 40 }, ['A', 'B', 'C'])).toBe('A:40|B:20|C:40')
    expect(compositionKeyFromMap({ A: 40, B: 20, C: 40 }, ['C', 'B', 'A'])).toBe('C:40|B:20|A:40')
  })
  it('rellena faltantes con 0', () => {
    expect(compositionKeyFromMap({ A: 100 }, ['A', 'B'])).toBe('A:100|B:0')
  })
  it('genericCompositionKey ordena ids alfabéticamente', () => {
    expect(genericCompositionKey({ B: 20, A: 40, C: 40 })).toBe('A:40|B:20|C:40')
  })
})
