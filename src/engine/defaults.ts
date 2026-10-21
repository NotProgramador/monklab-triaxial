import type { ExperimentProject } from '../types/project'
import { PROJECT_VERSION } from '../types/project'
import type { FormulaComponent } from '../types/material'
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
