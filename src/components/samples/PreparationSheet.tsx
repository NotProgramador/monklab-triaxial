import type { PreparationTotals } from '../../engine/calculatePreparation'
import { formatWeight } from '../../engine/format'
import type { VertexMaterial } from '../../types/material'

interface Props {
  totals: PreparationTotals
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  hasRecipes: boolean
}

export function PreparationSheet({ totals, vertices, hasRecipes }: Props) {
  const showIngredients = hasRecipes && totals.invalidRecipes.length === 0
  return (
    <section className="prep-sheet">
      <h2>Hoja de preparación</h2>

      <div className="prep-summary">
        <div><span className="label">Muestras</span><strong>{totals.sampleCount}</strong></div>
        <div><span className="label">Bruto</span><strong>{formatWeight(totals.grossTotal)} g</strong></div>
        <div><span className="label">Margen</span><strong>{totals.marginPercent}%</strong></div>
        <div><span className="label">Total con margen</span><strong>{formatWeight(totals.withMarginTotal)} g</strong></div>
      </div>

      <div className="prep-grid">
        <div className="prep-block">
          <h3>Mezclas maestras a preparar</h3>
          <div className="weight-list">
            <div className="weight-row"><span>A · {vertices.A.name}</span><strong>{formatWeight(totals.withMarginPerVertex.a)} g</strong></div>
            <div className="weight-row"><span>B · {vertices.B.name}</span><strong>{formatWeight(totals.withMarginPerVertex.b)} g</strong></div>
            <div className="weight-row"><span>C · {vertices.C.name}</span><strong>{formatWeight(totals.withMarginPerVertex.c)} g</strong></div>
          </div>
        </div>

        {hasRecipes && (
          <div className="prep-block">
            <h3>Materias primas necesarias</h3>
            {showIngredients ? (
              <div className="weight-list">
                {totals.expandedIngredients.map((i) => (
                  <div key={i.name} className="weight-row">
                    <span>{i.name}</span>
                    <strong>{formatWeight(i.grams, 2)} g</strong>
                  </div>
                ))}
                <div className="weight-row weight-total">
                  <span>Total</span>
                  <strong>{formatWeight(totals.expandedIngredients.reduce((s, i) => s + i.grams, 0))} g</strong>
                </div>
              </div>
            ) : (
              <div className="warn-box">
                <strong>No se pueden calcular las materias primas.</strong>
                <ul>
                  {totals.invalidRecipes.map((v) => (
                    <li key={v.vertexId}>
                      Receta de <b>{v.name}</b> suma {v.total.toFixed(2)} %.
                    </li>
                  ))}
                </ul>
                <p>Corrige las recetas marcadas antes de calcular las materias primas.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
