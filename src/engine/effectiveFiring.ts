import type { ProjectFiring } from '../types/project'
import type { FiringAtmosphere, FiringResult } from '../types/result'
import { formatDateEs } from './format'

export interface EffectiveFiring {
  date?: string
  temperature?: number
  cone?: string
  atmosphere?: FiringAtmosphere
  kiln?: string
  notes?: string
  /** Which sample-level fields override the project firing. */
  overriddenBy: { temperature: boolean; cone: boolean; atmosphere: boolean }
}

const ATMOS_LABEL: Record<FiringAtmosphere, string> = {
  oxidacion: 'Oxidación',
  reduccion: 'Reducción',
  neutra: 'Neutra',
  otro: 'Otro',
}

export function atmosphereLabel(a: FiringAtmosphere | undefined): string {
  return a ? ATMOS_LABEL[a] : ''
}

export function hasSampleFiringOverride(r: FiringResult | undefined): boolean {
  if (!r) return false
  return (
    (typeof r.temperature === 'number' && Number.isFinite(r.temperature)) ||
    (typeof r.cone === 'string' && r.cone.length > 0) ||
    r.atmosphere !== undefined
  )
}

export function getEffectiveFiring(
  projectFiring: ProjectFiring | undefined,
  result: FiringResult | undefined,
): EffectiveFiring {
  const p = projectFiring ?? {}
  const r = result ?? {}
  const sampleTemp = typeof r.temperature === 'number' && Number.isFinite(r.temperature) ? r.temperature : undefined
  const sampleCone = typeof r.cone === 'string' && r.cone.length > 0 ? r.cone : undefined
  const sampleAtm = r.atmosphere
  return {
    date: p.date,
    temperature: sampleTemp ?? p.temperature,
    cone: sampleCone ?? p.cone,
    atmosphere: sampleAtm ?? p.atmosphere,
    kiln: p.kiln,
    notes: p.notes,
    overriddenBy: {
      temperature: sampleTemp !== undefined,
      cone: sampleCone !== undefined,
      atmosphere: sampleAtm !== undefined,
    },
  }
}

/** Returns true if the project firing has any user-defined value. */
export function hasAnyProjectFiring(p: ProjectFiring | undefined): boolean {
  if (!p) return false
  return Boolean(p.date || p.temperature !== undefined || p.cone || p.atmosphere || p.kiln || p.notes)
}

/**
 * Compact one-line summary like:
 *   "1040 °C · Oxidación · Cono 06 · 08 ago 2026 · Horno eléctrico"
 * Segments with empty data are skipped. Returns "" if firing is empty.
 */
export function formatFiringSummary(f: ProjectFiring | undefined): string {
  if (!f) return ''
  const parts: string[] = []
  if (typeof f.temperature === 'number') parts.push(`${f.temperature} °C`)
  if (f.atmosphere) parts.push(atmosphereLabel(f.atmosphere))
  if (f.cone) parts.push(`Cono ${f.cone}`)
  if (f.date) parts.push(formatDateEs(f.date))
  if (f.kiln) parts.push(f.kiln)
  return parts.join(' · ')
}
