import type { VertexMaterial } from '../types/material'
import type { ProjectFiring } from '../types/project'
import type { FiringAtmosphere, FiringResult, Surface } from '../types/result'
import type { TriaxialSample } from '../types/triaxial'
import { calculateSampleWeights } from './calculateSampleWeights'
import { getEffectiveFiring } from './effectiveFiring'
import { hasMeaningfulResult } from './resultStatus'
import {
  formatWeightForPrecision,
  quantizeWeights,
  type BalancePrecision,
} from './weighingPrecision'

const ATMOS_LABEL: Record<FiringAtmosphere, string> = {
  oxidacion: 'Oxidación',
  reduccion: 'Reducción',
  neutra: 'Neutra',
  otro: 'Otro',
}
const SURF_LABEL: Record<Surface, string> = {
  mate: 'Mate',
  satinada: 'Satinada',
  brillante: 'Brillante',
  variable: 'Variable',
}
const LEVEL_LABEL: Record<number, string> = {
  1: 'Bajo',
  2: 'Medio',
  3: 'Alto',
}
const GLOSS_LABEL: Record<number, string> = {
  1: 'Mate',
  2: 'Satinado',
  3: 'Brillante',
}
const OPACITY_LABEL: Record<number, string> = {
  1: 'Transparente',
  2: 'Semitransparente',
  3: 'Opaco',
}

function csvEscape(v: string | number | undefined): string {
  if (v === undefined || v === null) return ''
  const s = String(v)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function samplesToCsv(
  samples: TriaxialSample[],
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial },
  sampleWeight: number,
  results: Record<number, FiringResult>,
  projectFiring?: ProjectFiring,
  balancePrecision?: BalancePrecision,
): string {
  const bp = balancePrecision
  const header = [
    'Muestra',
    'A %', 'B %', 'C %',
    `${vertices.A.name || 'A'} g`,
    `${vertices.B.name || 'B'} g`,
    `${vertices.C.name || 'C'} g`,
    'Balanza g',
    `${vertices.A.name || 'A'} g práctica`,
    `${vertices.B.name || 'B'} g práctica`,
    `${vertices.C.name || 'C'} g práctica`,
    'Estado',
    'Fecha cocción',
    'Temperatura °C',
    'Cono',
    'Atmósfera',
    'Horno',
    'Superficie',
    'Brillo',
    'Opacidad',
    'Fluidez',
    'Color observado',
    'Defectos',
    'Notas',
  ]
  const rows: string[] = [header.map(csvEscape).join(';')]
  for (const s of samples) {
    const w = calculateSampleWeights(s, sampleWeight)
    const r = results[s.id]
    const eff = getEffectiveFiring(projectFiring, r)
    const q = bp !== undefined ? quantizeWeights([w.a, w.b, w.c], bp, w.total) : null
    const pA = q ? formatWeightForPrecision(q.values[0], bp!) : ''
    const pB = q ? formatWeightForPrecision(q.values[1], bp!) : ''
    const pC = q ? formatWeightForPrecision(q.values[2], bp!) : ''
    rows.push([
      s.id,
      s.a, s.b, s.c,
      w.a.toFixed(3), w.b.toFixed(3), w.c.toFixed(3),
      bp ?? '',
      pA, pB, pC,
      hasMeaningfulResult(r) ? 'Registrado' : 'Sin resultado',
      eff.date ?? '',
      eff.temperature ?? '',
      eff.cone ?? '',
      eff.atmosphere ? ATMOS_LABEL[eff.atmosphere] : '',
      eff.kiln ?? '',
      r?.surface ? SURF_LABEL[r.surface] : '',
      r?.gloss ? (GLOSS_LABEL[r.gloss] ?? String(r.gloss)) : '',
      r?.opacity ? (OPACITY_LABEL[r.opacity] ?? String(r.opacity)) : '',
      r?.fluidity ? (LEVEL_LABEL[r.fluidity] ?? String(r.fluidity)) : '',
      r?.observedColor ?? '',
      r?.defects ?? '',
      r?.notes ?? '',
    ].map(csvEscape).join(';'))
  }
  return '﻿' + rows.join('\r\n')
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
