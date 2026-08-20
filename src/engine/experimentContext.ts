import type { ApplicationMethod, ExperimentContext } from '../types/project'

export const APPLICATION_METHOD_LABELS: Record<ApplicationMethod, string> = {
  brocha: 'Brocha',
  inmersion: 'Inmersión',
  vertido: 'Vertido',
  pistola: 'Pistola',
  otro: 'Otro',
}

export function applicationMethodLabel(m: ApplicationMethod | undefined): string {
  return m ? APPLICATION_METHOD_LABELS[m] : ''
}

function isNonEmptyString(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function hasExperimentContext(e: ExperimentContext | undefined): boolean {
  if (!e) return false
  return (
    isNonEmptyString(e.substrate) ||
    (typeof e.bisqueTemperature === 'number' && Number.isFinite(e.bisqueTemperature)) ||
    e.applicationMethod !== undefined ||
    (typeof e.coats === 'number' && Number.isFinite(e.coats)) ||
    isNonEmptyString(e.applicationNotes)
  )
}

/**
 * One-line summary: skip empty segments; correct singular/plural for coats.
 */
export function formatExperimentSummary(e: ExperimentContext | undefined): string {
  if (!e) return ''
  const parts: string[] = []
  if (isNonEmptyString(e.substrate)) parts.push(e.substrate.trim())
  if (typeof e.bisqueTemperature === 'number') parts.push(`Bizcocho ${e.bisqueTemperature} °C`)
  if (e.applicationMethod) parts.push(applicationMethodLabel(e.applicationMethod))
  if (typeof e.coats === 'number' && e.coats >= 1) {
    parts.push(`${e.coats} ${e.coats === 1 ? 'capa' : 'capas'}`)
  }
  return parts.join(' · ')
}
