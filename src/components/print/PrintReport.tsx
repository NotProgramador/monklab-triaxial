import type { PreparationTotals } from '../../engine/calculatePreparation'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { recipeTotal } from '../../engine/expandRecipe'
import { buildStandaloneSvg } from '../../engine/exportSvg'
import { formatDateEs, formatWeight } from '../../engine/format'
import type { TriaxialProject } from '../../types/project'
import type { TriaxialSample } from '../../types/triaxial'

interface Props {
  project: TriaxialProject
  samples: TriaxialSample[]
  preparation: PreparationTotals
}

export function PrintReport({ project, samples, preparation }: Props) {
  const svg = buildStandaloneSvg({
    samples,
    step: project.step,
    vertices: project.vertices,
    projectName: project.name,
    selectedSampleId: null,
  })
  const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  const showIngredients = preparation.invalidRecipes.length === 0 && preparation.expandedIngredients.length > 0
  const now = formatDateEs()

  return (
    <div className="print-report print-only">
      {/* PÁGINA 1 */}
      <section className="print-page">
        <header className="print-header">
          <div>
            <div className="print-brand">MONKLAB · TRIAXIAL</div>
            <h1>{project.name}</h1>
          </div>
          <div className="print-date">Impreso el {now}</div>
        </header>

        <section className="print-params">
          <div><span>División</span><b>{project.step} %</b></div>
          <div><span>Muestras</span><b>{samples.length}</b></div>
          <div><span>Peso por muestra</span><b>{project.sampleWeight} g</b></div>
          <div><span>Margen</span><b>{project.preparationMargin} %</b></div>
        </section>

        <section className="print-vertices-grid">
          {(['A', 'B', 'C'] as const).map((id) => {
            const v = project.vertices[id]
            return (
              <div className="print-vertex-col" key={id}>
                <div className="print-vertex-header">
                  <span className="swatch" style={{ background: v.color }} />
                  <strong>{id} · {v.name}</strong>
                </div>
                {v.recipe && v.recipe.ingredients.length > 0 ? (
                  <table className="print-recipe">
                    <tbody>
                      {v.recipe.ingredients.map((ing) => (
                        <tr key={ing.id}>
                          <td>{ing.name}</td>
                          <td className="num">{ing.percentage.toFixed(2)} %</td>
                        </tr>
                      ))}
                      <tr className="total">
                        <td>Total</td>
                        <td className="num">{recipeTotal(v.recipe).toFixed(2)} %</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="print-vertex-simple">Material simple</p>
                )}
              </div>
            )
          })}
        </section>

        <section className="print-diagram-block">
          <h2>Diagrama triaxial</h2>
          <img src={svgDataUri} alt="Diagrama triaxial" />
          <p className="print-note">
            Vista cromática aproximada. La interpolación visual no predice el
            color real después de la cocción.
          </p>
        </section>
      </section>

      {/* PÁGINA 2 */}
      <section className="print-page">
        <h2>Hoja de preparación</h2>
        <div className="print-params">
          <div><span>Muestras</span><b>{preparation.sampleCount}</b></div>
          <div><span>Peso por muestra</span><b>{project.sampleWeight} g</b></div>
          <div><span>Bruto</span><b>{formatWeight(preparation.grossTotal)} g</b></div>
          <div><span>Margen</span><b>{preparation.marginPercent} %</b></div>
          <div><span>Total con margen</span><b>{formatWeight(preparation.withMarginTotal)} g</b></div>
        </div>

        <h3>Mezclas maestras a preparar</h3>
        <table className="print-table">
          <tbody>
            <tr><td>A · {project.vertices.A.name}</td><td className="num">{formatWeight(preparation.withMarginPerVertex.a)} g</td></tr>
            <tr><td>B · {project.vertices.B.name}</td><td className="num">{formatWeight(preparation.withMarginPerVertex.b)} g</td></tr>
            <tr><td>C · {project.vertices.C.name}</td><td className="num">{formatWeight(preparation.withMarginPerVertex.c)} g</td></tr>
          </tbody>
        </table>

        {showIngredients && (
          <>
            <h3>Materias primas necesarias</h3>
            <table className="print-table">
              <tbody>
                {preparation.expandedIngredients.map((i) => (
                  <tr key={i.name}><td>{i.name}</td><td className="num">{formatWeight(i.grams, 2)} g</td></tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td className="num">
                    {formatWeight(preparation.expandedIngredients.reduce((s, i) => s + i.grams, 0))} g
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {preparation.invalidRecipes.length > 0 && (
          <p className="print-warn">
            No se listan materias primas: recetas inválidas en {preparation.invalidRecipes.map((v) => v.name).join(', ')}.
          </p>
        )}
      </section>

      {/* PÁGINA 3 */}
      <section className="print-page">
        <h2>Muestras</h2>
        <table className="print-table print-samples">
          <thead>
            <tr>
              <th>#</th>
              <th>A %</th><th>B %</th><th>C %</th>
              <th>{project.vertices.A.name} g</th>
              <th>{project.vertices.B.name} g</th>
              <th>{project.vertices.C.name} g</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => {
              const w = calculateSampleWeights(s, project.sampleWeight)
              const r = project.results[s.id]
              return (
                <tr key={s.id}>
                  <td>{String(s.id).padStart(2, '0')}</td>
                  <td className="num">{s.a}</td>
                  <td className="num">{s.b}</td>
                  <td className="num">{s.c}</td>
                  <td className="num">{formatWeight(w.a)}</td>
                  <td className="num">{formatWeight(w.b)}</td>
                  <td className="num">{formatWeight(w.c)}</td>
                  <td>{r ? 'Registrado' : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
