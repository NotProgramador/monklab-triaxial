import type { VertexMaterial } from '../../types/material'
import type { ProjectFiring } from '../../types/project'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import {
  atmosphereLabel,
  getEffectiveFiring,
  hasSampleFiringOverride,
} from '../../engine/effectiveFiring'
import { hasMeaningfulResult } from '../../engine/resultStatus'
import { ResultEditor } from '../results/ResultEditor'

interface Props {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  result: FiringResult | undefined
  projectId: string
  projectFiring: ProjectFiring | undefined
  onResultChange: (r: FiringResult | undefined) => void
}

export function ResultsInspector({
  sample, vertices, result, projectId, projectFiring, onResultChange,
}: Props) {
  const registered = hasMeaningfulResult(result)
  const effective = getEffectiveFiring(projectFiring, result)
  const isOverride = hasSampleFiringOverride(result)

  const useBatchConditions = () => {
    if (!result) return
    const {
      temperature: _t, cone: _c, atmosphere: _a,
      ...rest
    } = result
    void _t; void _c; void _a
    // Preserve everything else. If nothing meaningful remains, keep object as {}
    // so the caller can decide to drop it via hasMeaningfulResult.
    onResultChange(rest)
  }

  const hasEffective = effective.temperature !== undefined || effective.cone || effective.atmosphere

  return (
    <>
      <section className="inspector-section">
        <div className="composition-summary">
          <span className="composition-summary-pct">
            {sample.a} / {sample.b} / {sample.c}
          </span>
          <span className="composition-summary-detail">
            A · {vertices.A.name || 'A'} — B · {vertices.B.name || 'B'} — C · {vertices.C.name || 'C'}
          </span>
        </div>
        <div className={`registered-flag ${registered ? 'is-registered' : 'is-pending'}`} role="status">
          <span aria-hidden>{registered ? '●' : '○'}</span>
          <span>{registered ? 'Registrado' : 'Sin registrar'}</span>
        </div>
      </section>

      {hasEffective && (
        <section className="inspector-section firing-summary">
          <h3>Cocción</h3>
          <div className="firing-summary-lines">
            {effective.temperature !== undefined && (
              <div><strong>{effective.temperature} °C</strong></div>
            )}
            {effective.atmosphere && (
              <div>{atmosphereLabel(effective.atmosphere)}</div>
            )}
            {effective.cone && (
              <div>Cono {effective.cone}</div>
            )}
          </div>
          <p className="firing-origin">Origen: {isOverride ? 'Muestra' : 'Lote'}</p>
          {isOverride && (
            <div className="firing-override">
              <p className="firing-override-note">Esta muestra tiene condición propia.</p>
              <button type="button" className="btn-ghost" onClick={useBatchConditions}>
                Usar condiciones del lote
              </button>
            </div>
          )}
        </section>
      )}

      <section className="inspector-section">
        <h3>Registro de cocción</h3>
        <ResultEditor
          projectId={projectId}
          sampleId={sample.id}
          result={result}
          onChange={onResultChange}
        />
      </section>
    </>
  )
}
