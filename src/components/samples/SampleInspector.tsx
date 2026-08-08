import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { expandSample, hasAnyRecipe } from '../../engine/expandRecipe'
import { formatWeight } from '../../engine/format'
import { ResultEditor } from '../results/ResultEditor'

interface Props {
  sample: TriaxialSample | null
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
  result: FiringResult | undefined
  projectId: string
  onResultChange: (r: FiringResult | undefined) => void
}

export function SampleInspector({
  sample, vertices, sampleWeight, result, projectId, onResultChange,
}: Props) {
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

  const w = calculateSampleWeights(sample, sampleWeight)
  const expansion = hasAnyRecipe(vertices)
    ? expandSample(sample, vertices, sampleWeight)
    : null

  return (
    <aside className="sample-inspector">
      <div className="inspector-header">
        <div>
          <p className="inspector-eyebrow">MUESTRA</p>
          <h2>{String(sample.id).padStart(2, '0')}</h2>
        </div>
        <div className="sample-total">{sample.a + sample.b + sample.c}%</div>
      </div>

      <section className="inspector-section">
        <h3>Composición</h3>
        <div className="composition-list">
          <div className="composition-row"><span>{vertices.A.name || 'A'}</span><strong>{sample.a}%</strong></div>
          <div className="composition-row"><span>{vertices.B.name || 'B'}</span><strong>{sample.b}%</strong></div>
          <div className="composition-row"><span>{vertices.C.name || 'C'}</span><strong>{sample.c}%</strong></div>
        </div>
      </section>

      <section className="inspector-section">
        <h3>Pesada primaria</h3>
        <div className="weight-list">
          <div className="weight-row"><span>{vertices.A.name || 'A'}</span><strong>{formatWeight(w.a)} g</strong></div>
          <div className="weight-row"><span>{vertices.B.name || 'B'}</span><strong>{formatWeight(w.b)} g</strong></div>
          <div className="weight-row"><span>{vertices.C.name || 'C'}</span><strong>{formatWeight(w.c)} g</strong></div>
          <div className="weight-row weight-total"><span>Total</span><strong>{formatWeight(w.total)} g</strong></div>
        </div>
      </section>

      {expansion && (
        <section className="inspector-section">
          <h3>Pesada expandida</h3>
          {expansion.valid ? (
            <div className="weight-list">
              {expansion.ingredients.map((ing) => (
                <div key={ing.name} className="weight-row">
                  <span>{ing.name}</span>
                  <strong>{formatWeight(ing.grams, 3)} g</strong>
                </div>
              ))}
              <div className="weight-row weight-total">
                <span>Total</span>
                <strong>{formatWeight(expansion.ingredients.reduce((s, i) => s + i.grams, 0))} g</strong>
              </div>
            </div>
          ) : (
            <div className="warn-box">
              <strong>No disponible.</strong>
              <ul>
                {expansion.invalidVertices.map((v) => (
                  <li key={v.vertexId}>
                    La receta de <b>{v.name}</b> suma {v.total.toFixed(2)} %.
                  </li>
                ))}
              </ul>
              <p>Corrige o normaliza la receta para obtener la pesada expandida.</p>
            </div>
          )}
        </section>
      )}

      <section className="inspector-section">
        <h3>Resultado de cocción</h3>
        <ResultEditor
          projectId={projectId}
          sampleId={sample.id}
          result={result}
          onChange={onResultChange}
        />
      </section>
    </aside>
  )
}
