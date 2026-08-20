import type { TriaxialProject } from '../types/project'
import { PROJECT_VERSION } from '../types/project'

export function createDefaultProject(name = 'Nuevo triaxial'): TriaxialProject {
  const now = new Date().toISOString()
  return {
    version: PROJECT_VERSION,
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    step: 20,
    sampleWeight: 20,
    preparationMargin: 10,
    vertices: {
      A: { id: 'A', name: 'Material A', type: 'material', color: '#f4e8d0' },
      B: { id: 'B', name: 'Material B', type: 'material', color: '#a54835' },
      C: { id: 'C', name: 'Material C', type: 'material', color: '#315a87' },
    },
    firing: {},
    experiment: {},
    results: {},
  }
}
