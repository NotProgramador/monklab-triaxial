import { describe, expect, it } from 'vitest'
import { moveDown, moveUp, partitionOrphans } from '../seriesOrder'

describe('moveUp', () => {
  it('[A,B,C] up @2 → [A,C,B]', () => {
    expect(moveUp(['A', 'B', 'C'], 2)).toEqual(['A', 'C', 'B'])
  })
  it('[A,B,C] up @0 → [A,B,C] (no cambio)', () => {
    expect(moveUp(['A', 'B', 'C'], 0)).toEqual(['A', 'B', 'C'])
  })
  it('índice fuera de rango → clon sin cambios', () => {
    const arr = ['A', 'B']
    const out = moveUp(arr, 99)
    expect(out).toEqual(['A', 'B'])
    expect(out).not.toBe(arr)
  })
  it('no muta el input', () => {
    const arr = ['A', 'B', 'C']
    const snap = [...arr]
    moveUp(arr, 2)
    expect(arr).toEqual(snap)
  })
})

describe('moveDown', () => {
  it('[A,B,C] down @0 → [B,A,C]', () => {
    expect(moveDown(['A', 'B', 'C'], 0)).toEqual(['B', 'A', 'C'])
  })
  it('[A,B,C] down @2 → [A,B,C] (último, sin cambio)', () => {
    expect(moveDown(['A', 'B', 'C'], 2)).toEqual(['A', 'B', 'C'])
  })
  it('índice negativo → clon sin cambios', () => {
    expect(moveDown(['A', 'B'], -1)).toEqual(['A', 'B'])
  })
})

describe('partitionOrphans', () => {
  it('separa válidos de huérfanos preservando orden', () => {
    const { valid, orphans } = partitionOrphans(
      ['A', 'B', 'C', 'D'],
      new Set(['A', 'C']),
    )
    expect(valid).toEqual(['A', 'C'])
    expect(orphans).toEqual(['B', 'D'])
  })
  it('todos válidos → orphans vacío', () => {
    const { valid, orphans } = partitionOrphans(['A', 'B'], new Set(['A', 'B', 'C']))
    expect(valid).toEqual(['A', 'B'])
    expect(orphans).toEqual([])
  })
  it('lista vacía → ambos vacíos', () => {
    expect(partitionOrphans([], new Set())).toEqual({ valid: [], orphans: [] })
  })
})
