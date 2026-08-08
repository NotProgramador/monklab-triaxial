import type { VertexMaterial } from '../types/material'
import type { FiringAtmosphere, FiringResult, Surface } from '../types/result'
import type { TriaxialSample } from '../types/triaxial'
import { calculateSampleWeights } from './calculateSampleWeights'

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
): string {
  const header = [
    'Muestra',
    'A %', 'B %', 'C %',
    `${vertices.A.name || 'A'} g`,
    `${vertices.B.name || 'B'} g`,
    `${vertices.C.name || 'C'} g`,
    'Estado',
    'Temperatura',
    'Cono',
    'Atmósfera',
    'Superficie',
    'Color observado',
    'Defectos',
    'Notas',
  ]
  const rows: string[] = [header.map(csvEscape).join(';')]
  for (const s of samples) {
    const w = calculateSampleWeights(s, sampleWeight)
    const r = results[s.id]
    rows.push([
      s.id,
      s.a, s.b, s.c,
      w.a.toFixed(3), w.b.toFixed(3), w.c.toFixed(3),
      r ? 'Registrado' : 'Sin resultado',
      r?.temperature ?? '',
      r?.cone ?? '',
      r?.atmosphere ? ATMOS_LABEL[r.atmosphere] : '',
      r?.surface ? SURF_LABEL[r.surface] : '',
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
