import { useEffect, useMemo, useRef } from 'react'
import type { VertexMaterial } from '../../types/material'
import type { ProjectFiring, ExperimentContext } from '../../types/project'
import type { FiringResult, FiringAtmosphere, Surface } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { atmosphereLabel, hasAnyProjectFiring } from '../../engine/effectiveFiring'
import {
  formatExperimentSummary,
  hasExperimentContext,
} from '../../engine/experimentContext'
import { formatDateEs } from '../../engine/format'
import { SampleComparisonCard } from './SampleComparisonCard'

interface Props {
  projectName: string
  projectId: string
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  experiment: ExperimentContext | undefined
  firing: ProjectFiring | undefined
  samples: TriaxialSample[]
  results: Record<number, FiringResult>
  comparisonIds: number[]
  referenceId: number | null
  onClose: () => void
  onMakeReference: (id: number) => void
}

const SURF_LABEL: Record<Surface, string> = {
  mate: 'Mate', satinada: 'Satinada', brillante: 'Brillante', variable: 'Variable',
}
const GLOSS_LABEL: Record<1 | 2 | 3, string> = { 1: 'Mate', 2: 'Satinado', 3: 'Brillante' }
const OPACITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Transparente', 2: 'Semitransparente', 3: 'Opaco' }
const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' }

function pad(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

function levelText(v: number | undefined, map: Record<1 | 2 | 3, string>): string {
  if (v === 1 || v === 2 || v === 3) return map[v]
  return '—'
}

export function SampleComparisonView({
  projectName, projectId, vertices, experiment, firing,
  samples, results, comparisonIds, referenceId,
  onClose, onMakeReference,
}: Props) {
  const items = useMemo(() => {
    return comparisonIds
      .map((id) => samples.find((s) => s.id === id))
      .filter((s): s is TriaxialSample => Boolean(s))
  }, [comparisonIds, samples])

  const reference = referenceId != null ? items.find((s) => s.id === referenceId) : items[0]

  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const firingLine = hasAnyProjectFiring(firing)
    ? [
        firing?.date ? formatDateEs(firing.date) : null,
        firing?.temperature !== undefined ? `${firing.temperature} °C` : null,
        firing?.atmosphere ? atmosphereLabel(firing.atmosphere) : null,
        firing?.cone ? `Cono ${firing.cone}` : null,
        firing?.kiln ?? null,
      ].filter(Boolean).join(' · ')
    : null

  const experimentLine = hasExperimentContext(experiment)
    ? formatExperimentSummary(experiment)
    : null

  return (
    <div className="cmp-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cmp-dialog-head">
          <div>
            <p className="inspector-eyebrow">COMPARAR MUESTRAS</p>
            <h2 id="cmp-dialog-title">{items.map((s) => pad(s.id)).join(' · ')}</h2>
            <p className="cmp-dialog-project">{projectName}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Cerrar comparación">×</button>
        </header>

        {(experimentLine || firingLine) && (
          <div className="cmp-context">
            {experimentLine && (
              <div>
                <span className="cmp-context-label">CONTEXTO</span>
                <span>{experimentLine}</span>
              </div>
            )}
            {firingLine && (
              <div>
                <span className="cmp-context-label">COCCIÓN DEL LOTE</span>
                <span>{firingLine}</span>
              </div>
            )}
          </div>
        )}

        <div className="cmp-cards">
          {items.map((s) => (
            <SampleComparisonCard
              key={s.id}
              sample={s}
              vertices={vertices}
              result={results[s.id]}
              projectId={projectId}
              projectFiring={firing}
              reference={reference}
              isReference={reference?.id === s.id}
              onMakeReference={() => onMakeReference(s.id)}
            />
          ))}
        </div>

        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th scope="col">Campo</th>
                {items.map((s) => (
                  <th key={s.id} scope="col">{pad(s.id)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">A %</th>{items.map((s) => <td key={s.id}>{s.a}</td>)}</tr>
              <tr><th scope="row">B %</th>{items.map((s) => <td key={s.id}>{s.b}</td>)}</tr>
              <tr><th scope="row">C %</th>{items.map((s) => <td key={s.id}>{s.c}</td>)}</tr>
              <tr><th scope="row">Color</th>{items.map((s) => <td key={s.id}>{results[s.id]?.observedColor ?? '—'}</td>)}</tr>
              <tr><th scope="row">Superficie</th>{items.map((s) => <td key={s.id}>{results[s.id]?.surface ? SURF_LABEL[results[s.id].surface as Surface] : '—'}</td>)}</tr>
              <tr><th scope="row">Brillo</th>{items.map((s) => <td key={s.id}>{levelText(results[s.id]?.gloss, GLOSS_LABEL)}</td>)}</tr>
              <tr><th scope="row">Opacidad</th>{items.map((s) => <td key={s.id}>{levelText(results[s.id]?.opacity, OPACITY_LABEL)}</td>)}</tr>
              <tr><th scope="row">Fluidez</th>{items.map((s) => <td key={s.id}>{levelText(results[s.id]?.fluidity, LEVEL_LABEL)}</td>)}</tr>
              <tr>
                <th scope="row">Cocción</th>
                {items.map((s) => {
                  const r = results[s.id]
                  const parts: string[] = []
                  if (r?.temperature !== undefined) parts.push(`${r.temperature} °C`)
                  if (r?.atmosphere) parts.push(atmosphereLabel(r.atmosphere as FiringAtmosphere))
                  if (r?.cone) parts.push(`Cono ${r.cone}`)
                  return <td key={s.id}>{parts.length > 0 ? parts.join(' · ') : 'Lote'}</td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
