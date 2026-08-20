import type { VertexMaterial } from '../../types/material'
import type { ProjectFiring } from '../../types/project'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import type { ViewMode } from '../triangle/TriaxialDiagram'
import type { BalancePrecision } from '../../engine/weighingPrecision'
import { countRegistered } from '../../engine/resultStatus'
import { FormulationInspector } from './FormulationInspector'
import { ResultsInspector } from './ResultsInspector'

interface Props {
  sample: TriaxialSample | null
  samples: TriaxialSample[]
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
  result: FiringResult | undefined
  results: Record<number, FiringResult>
  projectId: string
  projectFiring: ProjectFiring | undefined
  balancePrecision?: BalancePrecision
  mode: ViewMode
  comparisonIds: readonly number[]
  comparisonMax: number
  onToggleComparison: (id: number) => void
  onResultChange: (r: FiringResult | undefined) => void
  onSelect: (id: number) => void
}

export function SampleInspector({
  sample, samples, vertices, sampleWeight, result, results, projectId, projectFiring, balancePrecision, mode,
  comparisonIds, comparisonMax, onToggleComparison,
  onResultChange, onSelect,
}: Props) {
  const totalCount = samples.length
  const registeredCount = countRegistered(samples.map((s) => s.id), results)

  if (!sample) {
    return (
      <aside className="sample-inspector">
        <p className="inspector-eyebrow">MUESTRA</p>
        <h2>Selecciona un punto</h2>
        <p className="inspector-empty">
          Haz clic sobre una muestra del diagrama o de la tabla para consultar
          su composición y pesada.
        </p>
      </aside>
    )
  }

  const idx = samples.findIndex((s) => s.id === sample.id)
  const prev = idx > 0 ? samples[idx - 1] : null
  const next = idx >= 0 && idx < samples.length - 1 ? samples[idx + 1] : null
  const padded = String(sample.id).padStart(2, '0')

  return (
    <aside className="sample-inspector">
      <div className="inspector-header">
        <div>
          <p className="inspector-eyebrow">MUESTRA</p>
          <h2>T{padded}</h2>
        </div>
        <div className="inspector-header-side">
          <div className="sample-total">{sample.a + sample.b + sample.c}%</div>
          {mode === 'results' && (
            <div className="result-count" aria-label="Muestras registradas">
              {registeredCount} / {totalCount}
            </div>
          )}
        </div>
      </div>

      <nav className="sample-nav" aria-label="Navegación de muestras">
        <button
          type="button"
          className="btn-ghost btn-nav"
          onClick={() => prev && onSelect(prev.id)}
          disabled={!prev}
          aria-label="Muestra anterior"
        >
          ‹ Ant.
        </button>
        <span className="sample-nav-index">
          {idx + 1} de {totalCount}
        </span>
        <button
          type="button"
          className="btn-ghost btn-nav"
          onClick={() => next && onSelect(next.id)}
          disabled={!next}
          aria-label="Muestra siguiente"
        >
          Sig. ›
        </button>
      </nav>

      {mode === 'formulation' ? (
        <FormulationInspector
          sample={sample}
          vertices={vertices}
          sampleWeight={sampleWeight}
          balancePrecision={balancePrecision}
        />
      ) : (
        <ResultsInspector
          sample={sample}
          vertices={vertices}
          result={result}
          projectId={projectId}
          projectFiring={projectFiring}
          inComparison={comparisonIds.includes(sample.id)}
          comparisonFull={comparisonIds.length >= comparisonMax && !comparisonIds.includes(sample.id)}
          onToggleComparison={() => onToggleComparison(sample.id)}
          onResultChange={onResultChange}
        />
      )}
    </aside>
  )
}
