import { formatWeight } from '../../engine/format'
import {
  formatWeightForPrecision,
  quantizeNamed,
  type BalancePrecision,
} from '../../engine/weighingPrecision'
import type { MonoPreparationTotals } from '../../engine/calculateMonoPreparation'

interface Props {
  totals: MonoPreparationTotals
  balancePrecision?: BalancePrecision
}

export function MonoPreparationSheet({ totals, balancePrecision }: Props) {
  const quantised =
    balancePrecision !== undefined && totals.status.valid
      ? quantizeNamed(
          totals.ingredients.map((i) => ({ name: i.name, grams: i.grams })),
          balancePrecision,
          totals.totalWeight,
        )
      : null

  const totalStr =
    balancePrecision !== undefined && quantised
      ? `${formatWeightForPrecision(quantised.practicalTotal, balancePrecision)} g`
      : `${formatWeight(totals.totalWeight)} g`

  return (
    <section className="prep-sheet mono-prep-sheet">
      <h2>Hoja de pesada</h2>

      <div className="prep-summary">
        <div><span className="label">Cantidad base</span><strong>{formatWeight(totals.baseWeight)} g</strong></div>
        <div><span className="label">Margen</span><strong>{totals.marginPercent}%</strong></div>
        <div><span className="label">Total</span><strong>{totalStr}</strong></div>
        {balancePrecision !== undefined && (
          <div><span className="label">Balanza</span><strong>{balancePrecision} g</strong></div>
        )}
      </div>

      {balancePrecision !== undefined && (
        <p className="prep-note">
          Pesada práctica ajustada a resolución de {balancePrecision} g. Los valores teóricos permanecen sin modificar.
        </p>
      )}

      {totals.status.valid ? (
        <div className="prep-block">
          <h3>Materias primas</h3>
          <div className="weight-list">
            {totals.ingredients.map((ing, idx) => (
              <PrepRow
                key={ing.name + '::' + idx}
                label={ing.name}
                theoretical={ing.grams}
                practical={quantised?.items[idx].practical}
                precision={balancePrecision}
                belowResolution={quantised?.items[idx].belowResolution}
              />
            ))}
            <div className="weight-row weight-total">
              <span>Total</span>
              <strong>
                {balancePrecision !== undefined && quantised
                  ? `${formatWeightForPrecision(quantised.practicalTotal, balancePrecision)} g`
                  : `${formatWeight(totals.totalWeight)} g`}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="warn-box">
          {totals.status.reason === 'empty-recipe' ? (
            <>
              <strong>Añade ingredientes a la receta.</strong>
              <p>Agrega al menos una materia prima para calcular la pesada.</p>
            </>
          ) : (
            <>
              <strong>Completa la receta al 100 % para calcular la pesada.</strong>
              <p>El total actual es {totals.status.recipeTotal.toFixed(2)} %.</p>
            </>
          )}
        </div>
      )}
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
