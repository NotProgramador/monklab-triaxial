/**
 * A named group of projects that form a single experimental investigation.
 * Series never modify the projects they reference — they are a pure
 * organisational layer.
 */
export interface ExperimentSeries {
  id: string
  name: string
  description?: string
  /** Ordered project IDs. A project may belong to multiple series. */
  projectIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ExperimentSeriesSummary {
  id: string
  name: string
  projectCount: number
  updatedAt: string
}
