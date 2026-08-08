import { describe, expect, it } from 'vitest'
import { vertexStatus } from '../vertexStatus'
import type { VertexMaterial } from '../../../types/material'

function make(overrides: Partial<VertexMaterial>): VertexMaterial {
  return {
    id: 'A',
    name: 'X',
    type: 'material',
    color: '#ffffff',
    ...overrides,
  }
}

describe('vertexStatus', () => {
  it('sin receta → simple', () => {
    expect(vertexStatus(make({}))).toMatchObject({ kind: 'simple' })
  })
  it('receta vacía → empty', () => {
    expect(vertexStatus(make({ recipe: { ingredients: [] } }))).toMatchObject({
      kind: 'empty',
    })
  })
  it('receta que suma 100 → ok', () => {
    const v = make({
      recipe: {
        ingredients: [
          { id: '1', name: 'x', percentage: 50 },
          { id: '2', name: 'y', percentage: 50 },
        ],
      },
    })
    expect(vertexStatus(v)).toMatchObject({ kind: 'ok', ingredientCount: 2 })
  })
  it('receta 90 → invalid', () => {
    const v = make({
      recipe: {
        ingredients: [
          { id: '1', name: 'x', percentage: 40 },
          { id: '2', name: 'y', percentage: 50 },
        ],
      },
    })
    const st = vertexStatus(v)
    expect(st.kind).toBe('invalid')
    expect(st.total).toBeCloseTo(90, 5)
  })
})
