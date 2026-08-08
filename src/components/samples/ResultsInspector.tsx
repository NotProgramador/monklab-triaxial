import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { hasMeaningfulResult } from '../../engine/resultStatus'
import { ResultEditor } from '../results/ResultEditor'

interface Props {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  result: FiringResult | undefined
  projectId: string
  onResultChange: (r: FiringResult | undefined) => void
}

export function ResultsInspector({ sample, vertices, result, projectId, onResultChange }: Props) {
  const registered = hasMeaningfulResult(result)

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
