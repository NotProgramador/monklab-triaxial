import type { VertexMaterial } from './material'
import type { FiringResult } from './result'
import type { BalancePrecision } from '../engine/weighingPrecision'

export const PROJECT_VERSION = 2

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

export interface TriaxialProject {
  version: number
  id: string
  name: string
  createdAt: string
  updatedAt: string

  step: number
  sampleWeight: number
  preparationMargin: number
  balancePrecision?: BalancePrecision

  vertices: {
    A: VertexMaterial
    B: VertexMaterial
    C: VertexMaterial
  }

  firing?: ProjectFiring
  experiment?: ExperimentContext
  results: Record<number, FiringResult>
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
