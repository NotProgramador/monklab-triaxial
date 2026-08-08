import type { VertexMaterial } from './material'
import type { FiringResult } from './result'

export const PROJECT_VERSION = 2

export interface ProjectFiring {
  date?: string
  temperature?: number
  cone?: string
  atmosphere?: 'oxidacion' | 'reduccion' | 'neutra' | 'otro'
  kiln?: string
  notes?: string
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

  vertices: {
    A: VertexMaterial
    B: VertexMaterial
    C: VertexMaterial
  }

  firing?: ProjectFiring
  results: Record<number, FiringResult>
}

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
