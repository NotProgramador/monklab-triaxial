import type { PreparationTotals } from '../../engine/calculatePreparation'
import { formatWeight } from '../../engine/format'
import {
  formatWeightForPrecision,
  quantizeNamed,
  quantizeWeights,
  type BalancePrecision,
} from '../../engine/weighingPrecision'
import type { VertexMaterial } from '../../types/material'

interface Props {
  totals: PreparationTotals
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  hasRecipes: boolean
  balancePrecision?: BalancePrecision
}

export function PreparationSheet({ totals, vertices, hasRecipes, balancePrecision }: Props) {
  const showIngredients = hasRecipes && totals.invalidRecipes.length === 0

  const masterTheoretical = [
    totals.withMarginPerVertex.a,
    totals.withMarginPerVertex.b,
    totals.withMarginPerVertex.c,
  ]
  const masterQ = balancePrecision !== undefined
    ? quantizeWeights(masterTheoretical, balancePrecision, totals.withMarginTotal)
    : null

  const ingredientsQ =
    balancePrecision !== undefined && showIngredients
      ? quantizeNamed(totals.expandedIngredients, balancePrecision, totals.withMarginTotal)
      : null

  const totalStr = balancePrecision !== undefined && masterQ
    ? `${formatWeightForPrecision(masterQ.practicalTotal, balancePrecision)} g`
    : `${formatWeight(totals.withMarginTotal)} g`

  const format = (v: number) =>
    balancePrecision !== undefined ? formatWeightForPrecision(v, balancePrecision) : formatWeight(v)

  return (
    <section className="prep-sheet">
      <h2>Hoja de preparación</h2>

      <div className="prep-summary">
        <div><span className="label">Muestras</span><strong>{totals.sampleCount}</strong></div>
        <div><span className="label">Bruto</span><strong>{formatWeight(totals.grossTotal)} g</strong></div>
        <div><span className="label">Margen</span><strong>{totals.marginPercent}%</strong></div>
        <div><span className="label">Total con margen</span><strong>{totalStr}</strong></div>
        {balancePrecision !== undefined && (
          <div><span className="label">Balanza</span><strong>{balancePrecision} g</strong></div>
        )}
      </div>

      {balancePrecision !== undefined && (
        <p className="prep-note">
          Pesada práctica ajustada a resolución de {balancePrecision} g. Los valores teóricos permanecen sin modificar.
        </p>
      )}

      <div className="prep-grid">
        <div className="prep-block">
          <h3>Mezclas maestras a preparar</h3>
          <div className="weight-list">
            {(['A', 'B', 'C'] as const).map((id, i) => {
              const name = vertices[id].name || id
              const teor = masterTheoretical[i]
              const prac = masterQ?.values[i]
              return (
                <PrepRow key={id} label={`${id} · ${name}`} theoretical={teor} practical={prac} precision={balancePrecision} />
              )
            })}
          </div>
        </div>

        {hasRecipes && (
          <div className="prep-block">
            <h3>Materias primas necesarias</h3>
            {showIngredients ? (
              <div className="weight-list">
                {totals.expandedIngredients.map((i, idx) => (
                  <PrepRow
                    key={i.name}
                    label={i.name}
                    theoretical={i.grams}
                    practical={ingredientsQ?.items[idx].practical}
                    precision={balancePrecision}
                    belowResolution={ingredientsQ?.items[idx].belowResolution}
                  />
                ))}
                <div className="weight-row weight-total">
                  <span>Total</span>
                  <strong>
                    {balancePrecision !== undefined && ingredientsQ
                      ? `${format(ingredientsQ.practicalTotal)} g`
                      : `${formatWeight(totals.expandedIngredients.reduce((s, i) => s + i.grams, 0))} g`}
                  </strong>
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

function PrepRow({
  label, theoretical, practical, precision, belowResolution,
}: {
  label: string
  theoretical: number
  practical?: number
  precision?: BalancePrecision
  belowResolution?: boolean
}) {
  if (precision === undefined) {
    return (
      <div className="weight-row">
        <span>{label}</span>
        <strong>{formatWeight(theoretical, 2)} g</strong>
      </div>
    )
  }
  const p = practical!
  const exact = Math.abs(p - theoretical) < 1e-9
  const teorStr = formatWeight(theoretical, 3)
  const pracStr = `${formatWeightForPrecision(p, precision)} g`
  return (
    <div className={`weight-row weight-row--practical ${belowResolution ? 'is-below' : ''}`}>
      <span>{label}</span>
      <span className="wr-values">
        {exact ? (
          <strong>{pracStr}</strong>
        ) : (
          <>
            <span className="wr-theoretical" title={`Teórico ${teorStr} g`}>{teorStr} g →</span>
            <strong>{pracStr}</strong>
            {belowResolution && (
              <span className="wr-flag wr-flag--below" title="Por debajo de la resolución">⚠</span>
            )}
          </>
        )}
      </span>
    </div>
  )
}
