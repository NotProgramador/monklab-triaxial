import type { FormulaComponent, VertexMaterial } from './material'
import type { FiringResult } from './result'
import type { BalancePrecision } from '../engine/weighingPrecision'
import type { ExperimentMode } from './experimentMode'

export const PROJECT_VERSION = 3

export interface ProjectFiring {
  date?: string
  temperature?: number
  cone?: string
  atmosphere?: 'oxidacion' | 'reduccion' | 'neutra' | 'otro'
  kiln?: string
  notes?: string
}

export type ApplicationMethod = 'brocha' | 'inmersion' | 'vertido' | 'pistola' | 'otro'

export interface ExperimentContext {
  substrate?: string
  bisqueTemperature?: number
  applicationMethod?: ApplicationMethod
  coats?: number
  applicationNotes?: string
}

/**
 * V3 canonical project. `components` is the persisted source of truth.
 * `vertices` is a *derived* runtime convenience view used by the current
 * triaxial UI/engine — it is never persisted (serialization strips it).
 * The adapter module keeps the two in sync at every mutation.
 *
 * `TriaxialProject` is kept as a backward-compatible alias so legacy
 * imports continue to compile; the alias will be removed in a later phase.
 */
export interface ExperimentProject {
  version: number
  id: string
  name: string
  createdAt: string
  updatedAt: string

  mode: ExperimentMode
  components: FormulaComponent[]

  step: number
  sampleWeight: number
  preparationMargin: number
  balancePrecision?: BalancePrecision

  /** @derived from components. Never persisted. Triaxial-only convenience. */
  vertices: {
    A: VertexMaterial
    B: VertexMaterial
    C: VertexMaterial
  }

  firing?: ProjectFiring
  experiment?: ExperimentContext
  results: Record<number, FiringResult>
}

/** Legacy alias — transition aid, do not use for new code. */
export type TriaxialProject = ExperimentProject

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
