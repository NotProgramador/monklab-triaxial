export type FiringAtmosphere = 'oxidacion' | 'reduccion' | 'neutra' | 'otro'
export type Surface = 'mate' | 'satinada' | 'brillante' | 'variable'

export interface FiringResult {
  observedColor?: string
  temperature?: number
  cone?: string
  atmosphere?: FiringAtmosphere
  surface?: Surface
  gloss?: number
  opacity?: number
  fluidity?: number
  defects?: string
  notes?: string
  hasPhoto?: boolean
}
