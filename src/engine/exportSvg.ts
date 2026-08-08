import { barycentricToCartesian, type TriangleVertices } from './barycentric'
import type { VertexMaterial } from '../types/material'
import type { FiringResult } from '../types/result'
import type { TriaxialSample } from '../types/triaxial'

const WIDTH = 800
const HEIGHT = 760
const PADDING_TOP = 130
const PADDING_BOTTOM = 130
const PADDING_SIDE = 90
const TRIANGLE: TriangleVertices = {
  A: { x: WIDTH / 2, y: PADDING_TOP },
  B: { x: PADDING_SIDE, y: HEIGHT - PADDING_BOTTOM },
  C: { x: WIDTH - PADDING_SIDE, y: HEIGHT - PADDING_BOTTOM },
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(name: string, max: number): string {
  if (name.length <= max) return name
  return name.slice(0, max - 1) + '…'
}

export interface ExportSvgOptions {
  samples: TriaxialSample[]
  step: number
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  results?: Record<number, FiringResult>
  mode?: 'formulation' | 'results'
  selectedSampleId?: number | null
  projectName?: string
}

export function buildStandaloneSvg(opts: ExportSvgOptions): string {
  const { samples, step, vertices, results = {}, mode = 'formulation', selectedSampleId = null, projectName = '' } = opts
  const nodeRadius = step <= 5 ? 8 : step <= 10 ? 12 : 16
  const fontSize = step <= 5 ? 7 : step <= 10 ? 9 : 11

  const parts: string[] = []
  parts.push(
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" font-family="Helvetica, Arial, sans-serif">`,
  )

  // background
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`)

  // title
  if (projectName) {
    parts.push(
      `<text x="${WIDTH / 2}" y="30" text-anchor="middle" font-size="14" font-weight="700" fill="#1d1d1d">${esc(projectName)}</text>`,
    )
    parts.push(
      `<text x="${WIDTH / 2}" y="48" text-anchor="middle" font-size="10" fill="#6b6b66" letter-spacing="2">MONKLAB · TRIAXIAL</text>`,
    )
  }

  // grid
  const gridLines: string[] = []
  for (let v = step; v < 100; v += step) {
    const linesA = [
      barycentricToCartesian(v, 100 - v, 0, TRIANGLE),
      barycentricToCartesian(v, 0, 100 - v, TRIANGLE),
    ]
    const linesB = [
      barycentricToCartesian(100 - v, v, 0, TRIANGLE),
      barycentricToCartesian(0, v, 100 - v, TRIANGLE),
    ]
    const linesC = [
      barycentricToCartesian(100 - v, 0, v, TRIANGLE),
      barycentricToCartesian(0, 100 - v, v, TRIANGLE),
    ]
    for (const [s, e] of [linesA, linesB, linesC]) {
      gridLines.push(`<line x1="${s.x.toFixed(2)}" y1="${s.y.toFixed(2)}" x2="${e.x.toFixed(2)}" y2="${e.y.toFixed(2)}" stroke="#c8c8c2" stroke-width="0.8"/>`)
    }
  }
  parts.push(`<g>${gridLines.join('')}</g>`)

  // triangle outline
  parts.push(
    `<polygon points="${TRIANGLE.A.x},${TRIANGLE.A.y} ${TRIANGLE.B.x},${TRIANGLE.B.y} ${TRIANGLE.C.x},${TRIANGLE.C.y}" fill="none" stroke="#1d1d1d" stroke-width="2" stroke-linejoin="round"/>`,
  )

  // nodes
  for (const s of samples) {
    const p = barycentricToCartesian(s.a, s.b, s.c, TRIANGLE)
    const selected = selectedSampleId === s.id
    const r = results[s.id]
    let fill = '#ffffff'
    let stroke = '#1d1d1d'
    let strokeWidth = 1.5
    let textFill = '#1d1d1d'

    if (mode === 'results' && r?.observedColor) fill = r.observedColor

    if (selected) {
      stroke = '#1d1d1d'
      strokeWidth = 3
    }

    parts.push(
      `<g transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})">` +
        `<circle r="${nodeRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>` +
        `<text text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="700" fill="${textFill}">${s.id}</text>` +
      `</g>`,
    )
  }

  // vertex labels with name + 100 %
  const labels: [number, number, 'A' | 'B' | 'C', 'middle' | 'start' | 'end'][] = [
    [TRIANGLE.A.x, TRIANGLE.A.y - 70, 'A', 'middle'],
    [TRIANGLE.B.x, TRIANGLE.B.y + 30, 'B', 'middle'],
    [TRIANGLE.C.x, TRIANGLE.C.y + 30, 'C', 'middle'],
  ]
  for (const [x, y, id, anchor] of labels) {
    const v = vertices[id]
    parts.push(
      `<g text-anchor="${anchor}">` +
        `<text x="${x}" y="${y}" font-size="20" font-weight="800" fill="#1d1d1d">${id}</text>` +
        `<text x="${x}" y="${y + 16}" font-size="11" fill="#1d1d1d">${esc(truncate(v.name || id, 24))}</text>` +
        `<text x="${x}" y="${y + 30}" font-size="10" fill="#6b6b66">100 %</text>` +
      `</g>`,
    )
  }

  parts.push(`</svg>`)
  return parts.join('\n')
}
