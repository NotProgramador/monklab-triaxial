import { useMemo, useState } from 'react'
import {
  barycentricToCartesian,
  type TriangleVertices,
} from '../../engine/barycentric'
import { hexToRgb, interpolateBarycentric, rgbToHex } from '../../engine/interpolateColor'
import { hasMeaningfulResult } from '../../engine/resultStatus'
import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { TriaxialGrid } from './TriaxialGrid'
import { GradientCanvas } from './GradientCanvas'

export type ViewMode = 'formulation' | 'results'

interface Props {
  samples: TriaxialSample[]
  step: number
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  selectedSampleId: number | null
  results: Record<number, FiringResult>
  showGradient: boolean
  mode: ViewMode
  sampleWeight: number
  comparisonIds?: readonly number[]
  onSampleSelect: (sample: TriaxialSample) => void
}

const WIDTH = 800
const HEIGHT = 760
const PADDING_TOP = 130
const PADDING_BOTTOM = 130
const PADDING_SIDE = 90

const triangleVerts: TriangleVertices = {
  A: { x: WIDTH / 2, y: PADDING_TOP },
  B: { x: PADDING_SIDE, y: HEIGHT - PADDING_BOTTOM },
  C: { x: WIDTH - PADDING_SIDE, y: HEIGHT - PADDING_BOTTOM },
}

function truncate(name: string, max = 24): string {
  if (name.length <= max) return name
  return name.slice(0, max - 1) + '…'
}

export function TriaxialDiagram({
  samples,
  step,
  vertices,
  selectedSampleId,
  results,
  showGradient,
  mode,
  sampleWeight,
  comparisonIds = [],
  onSampleSelect,
}: Props) {
  const inComparison = new Set(comparisonIds)
  const [hovered, setHovered] = useState<TriaxialSample | null>(null)

  const nodeRadius = step <= 5 ? 8 : step <= 10 ? 12 : 16
  const fontSize = step <= 5 ? 7 : step <= 10 ? 9 : 11
  const showLabels = step > 5

  const positions = useMemo(
    () => samples.map((s) => ({
      s,
      p: barycentricToCartesian(s.a, s.b, s.c, triangleVerts),
    })),
    [samples],
  )

  const gradientTriangle = {
    ax: triangleVerts.A.x, ay: triangleVerts.A.y,
    bx: triangleVerts.B.x, by: triangleVerts.B.y,
    cx: triangleVerts.C.x, cy: triangleVerts.C.y,
    width: WIDTH, height: HEIGHT,
  }

  return (
    <div className="triaxial-diagram-container" style={{ position: 'relative' }}>
      {showGradient && mode === 'formulation' && (
        <GradientCanvas
          width={WIDTH}
          height={HEIGHT}
          vertices={triangleVerts}
          colorA={vertices.A.color}
          colorB={vertices.B.color}
          colorC={vertices.C.color}
        />
      )}
      <svg
        className="triaxial-diagram"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Diagrama triaxial"
      >
        <TriaxialGrid step={step} vertices={triangleVerts} />

        <polygon
          className="triangle-outline"
          points={`
            ${triangleVerts.A.x},${triangleVerts.A.y}
            ${triangleVerts.B.x},${triangleVerts.B.y}
            ${triangleVerts.C.x},${triangleVerts.C.y}
          `}
        />

        {positions.map(({ s, p }) => {
          const isSelected = selectedSampleId === s.id
          const result = results[s.id]
          const observedFill = mode === 'results' && result?.observedColor
            ? result.observedColor : undefined
          const emptyResult = mode === 'results' && !hasMeaningfulResult(result)

          return (
            <g
              key={s.id}
              className={`sample-group ${isSelected ? 'is-selected' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              role="button"
              tabIndex={isSelected ? 0 : -1}
              aria-label={`Muestra ${s.id}: A ${s.a}%, B ${s.b}%, C ${s.c}%`}
              onClick={() => onSampleSelect(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s)}
              onBlur={() => setHovered(null)}
              onKeyDown={(event) => {
                const tag = (event.target as HTMLElement).tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSampleSelect(s)
                  return
                }
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  const i = samples.findIndex((x) => x.id === s.id)
                  const nxt = samples[i + 1]
                  if (nxt) onSampleSelect(nxt)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const i = samples.findIndex((x) => x.id === s.id)
                  const prv = samples[i - 1]
                  if (prv) onSampleSelect(prv)
                }
              }}
            >
              {isSelected && (
                <circle
                  className="sample-node-ring"
                  r={nodeRadius + 5}
                />
              )}
              {inComparison.has(s.id) && (
                <circle
                  className="sample-node-cmp"
                  r={nodeRadius + 2}
                />
              )}
              <circle
                className={`sample-node ${emptyResult ? 'is-empty-result' : ''}`}
                r={nodeRadius}
                style={observedFill ? { fill: observedFill } : undefined}
              />
              {(showLabels || isSelected) && (
                <text
                  className="sample-number"
                  style={{ fontSize }}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {s.id}
                </text>
              )}
            </g>
          )
        })}

        <VertexLabel
          x={triangleVerts.A.x}
          y={triangleVerts.A.y - 70}
          id="A"
          material={vertices.A}
        />
        <VertexLabel
          x={triangleVerts.B.x}
          y={triangleVerts.B.y + 30}
          id="B"
          material={vertices.B}
        />
        <VertexLabel
          x={triangleVerts.C.x}
          y={triangleVerts.C.y + 30}
          id="C"
          material={vertices.C}
        />
      </svg>

      {hovered && (
        <Tooltip
          sample={hovered}
          vertices={vertices}
          triangle={gradientTriangle}
          sampleWeight={sampleWeight}
          mode={mode}
          result={results[hovered.id]}
        />
      )}
    </div>
  )
}

function VertexLabel({
  x, y, id, material,
}: {
  x: number; y: number; id: 'A' | 'B' | 'C'; material: VertexMaterial;
}) {
  const name = truncate(material.name || id, 26)
  return (
    <g textAnchor="middle">
      <text x={x} y={y} className="vertex-label">{id}</text>
      <text x={x} y={y + 18} className="vertex-sublabel">{name}</text>
      <text x={x} y={y + 34} className="vertex-percent">100 %</text>
    </g>
  )
}

function Tooltip({
  sample, vertices, sampleWeight, mode, result,
}: {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  triangle: unknown
  sampleWeight: number
  mode: ViewMode
  result: FiringResult | undefined
}) {
  const col = rgbToHex(interpolateBarycentric(
    sample.a, sample.b, sample.c,
    hexToRgb(vertices.A.color),
    hexToRgb(vertices.B.color),
    hexToRgb(vertices.C.color),
  ))
  const wa = (sample.a / 100) * sampleWeight
  const wb = (sample.b / 100) * sampleWeight
  const wc = (sample.c / 100) * sampleWeight
  const fmt = (g: number) => (Math.round(g * 100) / 100).toString().replace(/\.?0+$/, '')
  const padded = String(sample.id).padStart(2, '0')
  return (
    <div className="diagram-tooltip">
      <div className="tt-header">
        <span className="tt-swatch" style={{ background: mode === 'results' && result?.observedColor ? result.observedColor : col }} />
        <strong>T{padded}</strong>
        {mode === 'results' && (
          <span className={`tt-flag ${hasMeaningfulResult(result) ? 'is-registered' : 'is-pending'}`}>
            {hasMeaningfulResult(result) ? '● Registrado' : '○ Sin registrar'}
          </span>
        )}
      </div>
      <div>{vertices.A.name || 'A'} · {sample.a}% · {fmt(wa)} g</div>
      <div>{vertices.B.name || 'B'} · {sample.b}% · {fmt(wb)} g</div>
      <div>{vertices.C.name || 'C'} · {sample.c}% · {fmt(wc)} g</div>
    </div>
  )
}
