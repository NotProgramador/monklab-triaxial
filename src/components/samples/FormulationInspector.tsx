import type { VertexMaterial } from '../../types/material'
import type { TriaxialSample } from '../../types/triaxial'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { expandSample, hasAnyRecipe } from '../../engine/expandRecipe'
import { formatWeight } from '../../engine/format'

interface Props {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
}

export function FormulationInspector({ sample, vertices, sampleWeight }: Props) {
  const w = calculateSampleWeights(sample, sampleWeight)
  const expansion = hasAnyRecipe(vertices) ? expandSample(sample, vertices, sampleWeight) : null

  return (
    <>
      <section className="inspector-section">
        <h3>Composición</h3>
        <div className="composition-list">
          <div className="composition-row">
            <span>A · {vertices.A.name || 'A'}</span>
            <strong>{sample.a}%</strong>
          </div>
          <div className="composition-row">
            <span>B · {vertices.B.name || 'B'}</span>
            <strong>{sample.b}%</strong>
          </div>
          <div className="composition-row">
            <span>C · {vertices.C.name || 'C'}</span>
            <strong>{sample.c}%</strong>
          </div>
        </div>
      </section>

      <section className="inspector-section">
        <h3>Pesada primaria</h3>
        <div className="weight-list">
          <div className="weight-row">
            <span>{vertices.A.name || 'A'}</span>
            <strong>{formatWeight(w.a)} g</strong>
          </div>
          <div className="weight-row">
            <span>{vertices.B.name || 'B'}</span>
            <strong>{formatWeight(w.b)} g</strong>
          </div>
          <div className="weight-row">
            <span>{vertices.C.name || 'C'}</span>
            <strong>{formatWeight(w.c)} g</strong>
          </div>
          <div className="weight-row weight-total">
            <span>Total</span>
            <strong>{formatWeight(w.total)} g</strong>
          </div>
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
                <strong>
                  {formatWeight(expansion.ingredients.reduce((s, i) => s + i.grams, 0))} g
                </strong>
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
    </>
  )
}
