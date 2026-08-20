import type { TriaxialSample } from '../../types/triaxial'
import { MAX_COMPARISON } from '../../engine/comparison'

interface Props {
  comparisonIds: readonly number[]
  samples: TriaxialSample[]
  onRemove: (id: number) => void
  onClear: () => void
  onOpen: () => void
}

function pad(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

export function SampleComparisonTray({
  comparisonIds, samples, onRemove, onClear, onOpen,
}: Props) {
  if (comparisonIds.length === 0) return null
  const knownIds = new Set(samples.map((s) => s.id))
  const items = comparisonIds.filter((id) => knownIds.has(id))
  const canCompare = items.length >= 2

  return (
    <section className="comparison-tray" aria-label="Bandeja de comparación">
      <div className="comparison-tray-head">
        <span className="comparison-tray-eyebrow">COMPARACIÓN</span>
        <div className="comparison-tray-chips" role="list">
          {items.map((id) => (
            <span key={id} className="comparison-chip" role="listitem">
              <span>{pad(id)}</span>
              <button
                type="button"
                className="comparison-chip-x"
                aria-label={`Quitar ${pad(id)} de la comparación`}
                onClick={() => onRemove(id)}
              >×</button>
            </span>
          ))}
        </div>
      </div>
      <div className="comparison-tray-actions">
        <button type="button" className="btn-ghost btn-tiny" onClick={onClear}>Limpiar</button>
        <button
          type="button"
          className="btn"
          onClick={onOpen}
          disabled={!canCompare}
          aria-label={canCompare ? `Comparar ${items.length} muestras` : 'Selecciona al menos otra muestra'}
        >
          {canCompare ? `Comparar ${items.length}` : 'Selecciona al menos otra muestra'}
        </button>
        <span className="comparison-tray-max">Máx {MAX_COMPARISON}</span>
      </div>
    </section>
  )
}
