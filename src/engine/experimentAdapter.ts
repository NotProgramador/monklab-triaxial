import type { FormulaComponent, VertexMaterial } from '../types/material'
import type { ExperimentProject } from '../types/project'
import type { TriaxialSample } from '../types/triaxial'
import type { CompositionSample } from '../types/compositionSample'
import type { ExperimentMode } from '../types/experimentMode'
import { isExperimentMode } from '../types/experimentMode'

/**
 * The ONE place that translates between the generic V3 model
 * (`components[]` + `composition` map) and the legacy triaxial view
 * (`{A,B,C}` vertices + `TriaxialSample {a,b,c}`). Any other module that
 * needs to bridge the two must route through here.
 */

export function expectedComponentCount(mode: ExperimentMode): number {
  switch (mode) {
    case 'monoaxial': return 1
    case 'biaxial':   return 2
    case 'triaxial':  return 3
  }
}

export type ComponentStructureError =
  | 'wrong-count'
  | 'duplicate-id'
  | 'empty-id'
  | 'invalid-mode'

export interface ComponentStructureResult {
  valid: boolean
  error?: ComponentStructureError
  expected?: number
  actual?: number
}

export function validateComponentStructure(
  mode: ExperimentMode,
  components: FormulaComponent[],
): ComponentStructureResult {
  if (!isExperimentMode(mode)) return { valid: false, error: 'invalid-mode' }
  const expected = expectedComponentCount(mode)
  if (!Array.isArray(components) || components.length !== expected) {
    return { valid: false, error: 'wrong-count', expected, actual: Array.isArray(components) ? components.length : 0 }
  }
  const seen = new Set<string>()
  for (const c of components) {
    if (!c || typeof c.id !== 'string' || c.id.length === 0) {
      return { valid: false, error: 'empty-id' }
    }
    if (seen.has(c.id)) {
      return { valid: false, error: 'duplicate-id' }
    }
    seen.add(c.id)
  }
  return { valid: true }
}

/** Build the legacy triaxial vertex view from `components`. Triaxial only. */
export function verticesFromComponents(
  components: FormulaComponent[],
): { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial } {
  if (components.length !== 3) {
    throw new Error('verticesFromComponents requiere exactamente 3 componentes (modo triaxial).')
  }
  const [a, b, c] = components
  return {
    A: componentToVertex(a, 'A'),
    B: componentToVertex(b, 'B'),
    C: componentToVertex(c, 'C'),
  }
}

/** Build `components[]` from the legacy triaxial vertex view. */
export function componentsFromVertices(
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial },
): FormulaComponent[] {
  return [
    vertexToComponent(vertices.A),
    vertexToComponent(vertices.B),
    vertexToComponent(vertices.C),
  ]
}

function componentToVertex(c: FormulaComponent, forcedId: 'A' | 'B' | 'C'): VertexMaterial {
  return {
    id: forcedId,
    name: c.name,
    type: c.type,
    color: c.color,
    chemicalFormula: c.chemicalFormula,
    notes: c.notes,
    recipe: c.recipe,
  }
}

function vertexToComponent(v: VertexMaterial): FormulaComponent {
  return {
    id: v.id,
    name: v.name,
    type: v.type,
    color: v.color,
    chemicalFormula: v.chemicalFormula,
    notes: v.notes,
    recipe: v.recipe,
  }
}

/** Return the component with the given id, or undefined. */
export function getComponent(
  project: Pick<ExperimentProject, 'components'>,
  id: string,
): FormulaComponent | undefined {
  return project.components.find((c) => c.id === id)
}

/** Rebuild the derived triaxial vertex view from the authoritative components. */
export function syncVerticesFromComponents<T extends ExperimentProject>(project: T): T {
  if (project.mode !== 'triaxial') return project
  return { ...project, vertices: verticesFromComponents(project.components) }
}

/**
 * Replace a single vertex and keep the authoritative `components[]` in
 * sync. The vertex id is preserved. Used by the triaxial UI editor.
 */
export function withVertex<T extends ExperimentProject>(
  project: T,
  id: 'A' | 'B' | 'C',
  vertex: VertexMaterial,
): T {
  const normalizedVertex = { ...vertex, id }
  const nextVertices = { ...project.vertices, [id]: normalizedVertex }
  const nextComponents = project.components.map((c) =>
    c.id === id ? vertexToComponent(normalizedVertex) : c,
  )
  return { ...project, vertices: nextVertices, components: nextComponents }
}

/** Adapter: turn a legacy triaxial sample into a generic composition sample. */
export function triaxialSampleToComposition(sample: TriaxialSample): CompositionSample {
  return {
    id: sample.id,
    composition: { A: sample.a, B: sample.b, C: sample.c },
  }
}

/**
 * Deterministic key for a generic composition map. Keys ordered according
 * to `componentOrder` (ids). Format: `"<id>:<pct>|<id>:<pct>|..."`.
 */
export function compositionKeyFromMap(
  composition: Record<string, number>,
  componentOrder: readonly string[],
): string {
  return componentOrder
    .map((id) => `${id}:${composition[id] ?? 0}`)
    .join('|')
}

/**
 * Deterministic key for a composition map without a predetermined order:
 * ids are sorted alphabetically. Useful for cross-project matching when
 * both projects share the same mode and component ids.
 */
export function genericCompositionKey(composition: Record<string, number>): string {
  const ids = Object.keys(composition).sort()
  return compositionKeyFromMap(composition, ids)
}
