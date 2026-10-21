import type { ExperimentProject } from '../types/project'
import { PROJECT_VERSION } from '../types/project'
import type { FormulaComponent, VertexMaterial } from '../types/material'
import { verticesFromComponents } from './experimentAdapter'

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createDefaultProject(name = 'Nuevo triaxial'): ExperimentProject {
  const now = new Date().toISOString()
  const components: FormulaComponent[] = [
    { id: 'A', name: 'Material A', type: 'material', color: '#f4e8d0' },
    { id: 'B', name: 'Material B', type: 'material', color: '#a54835' },
    { id: 'C', name: 'Material C', type: 'material', color: '#315a87' },
  ]
  return {
    version: PROJECT_VERSION,
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    mode: 'triaxial',
    components,
    step: 20,
    sampleWeight: 20,
    preparationMargin: 10,
    vertices: verticesFromComponents(components),
    firing: {},
    experiment: {},
    results: {},
  }
}

/**
 * Monoaxial default — a single formulation. The component id "formula" is
 * stable and chosen deliberately: no "A"/"B"/"C" to avoid implying a grid.
 * `step` is intentionally omitted (monoaxial has no division).
 */
export function createMonoaxialProject(name = 'Nueva formulación'): ExperimentProject {
  const now = new Date().toISOString()
  const components: FormulaComponent[] = [
    {
      id: 'formula',
      name,
      type: 'receta',
      color: '#d8d3ca',
      recipe: { ingredients: [] },
    },
  ]
  return {
    version: PROJECT_VERSION,
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    mode: 'monoaxial',
    components,
    // step intentionally omitted — monoaxial has no division.
    sampleWeight: 100,
    preparationMargin: 10,
    balancePrecision: 0.1,
    // `vertices` is a derived triaxial-only convenience; the mono UI never
    // reads it, but keeping a benign placeholder means the type stays square
    // without introducing a union across every consumer.
    vertices: monoPlaceholderVertices(),
    firing: {},
    experiment: {},
    results: {},
  }
}

function monoPlaceholderVertices(): { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial } {
  return {
    A: { id: 'A', name: '', type: 'material', color: '#cccccc' },
    B: { id: 'B', name: '', type: 'material', color: '#cccccc' },
    C: { id: 'C', name: '', type: 'material', color: '#cccccc' },
  }
}
