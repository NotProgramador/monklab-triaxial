import type { VertexMaterial } from '../../types/material'
import type { TriaxialSample } from '../../types/triaxial'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { expandSample, hasAnyRecipe } from '../../engine/expandRecipe'
import { formatWeight } from '../../engine/format'
import {
  formatWeightForPrecision,
  quantizeNamed,
  quantizeWeights,
  type BalancePrecision,
} from '../../engine/weighingPrecision'

interface Props {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
  balancePrecision?: BalancePrecision
}

export function FormulationInspector({ sample, vertices, sampleWeight, balancePrecision }: Props) {
  const w = calculateSampleWeights(sample, sampleWeight)
  const expansion = hasAnyRecipe(vertices) ? expandSample(sample, vertices, sampleWeight) : null

  const primaryTheoretical = [w.a, w.b, w.c]
  const primaryLabels = [vertices.A.name || 'A', vertices.B.name || 'B', vertices.C.name || 'C']
  const primaryQ = balancePrecision !== undefined
    ? quantizeWeights(primaryTheoretical, balancePrecision, sampleWeight)
    : null

  const expandedQ =
    balancePrecision !== undefined && expansion && expansion.valid
      ? quantizeNamed(expansion.ingredients, balancePrecision, sampleWeight)
      : null

  const primaryAdjusted = primaryQ
    ? primaryQ.values.reduce((n, v, i) => (v !== primaryTheoretical[i] ? n + 1 : n), 0)
    : 0
  const primaryBelow = primaryQ ? primaryQ.belowResolution.filter(Boolean).length : 0

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

      {balancePrecision !== undefined && (
        <BalanceBadge
          precision={balancePrecision}
          adjusted={primaryAdjusted + (expandedQ?.adjustedCount ?? 0)}
          below={primaryBelow + (expandedQ?.belowResolutionCount ?? 0)}
        />
      )}

      <section className="inspector-section">
        <h3>Pesada primaria</h3>
        <div className="weight-list">
          {primaryTheoretical.map((teor, i) => (
            <WeightRow
              key={i}
              label={primaryLabels[i]}
              theoretical={teor}
              practical={primaryQ?.values[i]}
              precision={balancePrecision}
              belowResolution={primaryQ?.belowResolution[i]}
            />
          ))}
          <div className="weight-row weight-total">
            <span>Total</span>
            <strong>
              {balancePrecision !== undefined && primaryQ
                ? `${formatWeightForPrecision(primaryQ.practicalTotal, balancePrecision)} g`
                : `${formatWeight(w.total)} g`}
            </strong>
          </div>
        </div>
      </section>

      {expansion && (
        <section className="inspector-section">
          <h3>Pesada expandida</h3>
          {expansion.valid ? (
            <div className="weight-list">
              {expansion.ingredients.map((ing, i) => (
                <WeightRow
                  key={ing.name}
                  label={ing.name}
                  theoretical={ing.grams}
                  practical={expandedQ?.items[i].practical}
                  precision={balancePrecision}
                  belowResolution={expandedQ?.items[i].belowResolution}
                />
              ))}
              <div className="weight-row weight-total">
                <span>Total</span>
                <strong>
                  {balancePrecision !== undefined && expandedQ
                    ? `${formatWeightForPrecision(expandedQ.practicalTotal, balancePrecision)} g`
                    : `${formatWeight(expansion.ingredients.reduce((s, i) => s + i.grams, 0))} g`}
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

function WeightRow({
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
        <strong>{formatWeight(theoretical, 3)} g</strong>
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

function BalanceBadge({
  precision, adjusted, below,
}: {
  precision: BalancePrecision
  adjusted: number
  below: number
}) {
  const kind = below > 0 ? 'below' : adjusted > 0 ? 'adjusted' : 'ok'
  const icon = kind === 'ok' ? '✓' : '⚠'
  const msg =
    below > 0
      ? `${below} cantidad${below === 1 ? '' : 'es'} por debajo de la resolución.`
      : adjusted > 0
        ? `${adjusted} cantidad${adjusted === 1 ? '' : 'es'} requiere${adjusted === 1 ? '' : 'n'} redondeo.`
        : 'Todas las cantidades son compatibles.'
  return (
    <section className={`inspector-section balance-badge balance-badge--${kind}`}>
      <div className="balance-badge-head">
        <span className="balance-badge-eyebrow">BALANZA</span>
        <span className="balance-badge-value">{precision} g</span>
      </div>
      <p className="balance-badge-msg">
        <span aria-hidden>{icon}</span> {msg}
      </p>
    </section>
  )
}
