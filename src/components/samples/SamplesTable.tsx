import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { formatWeight } from '../../engine/format'
import { hasMeaningfulResult } from '../../engine/resultStatus'
import {
  formatWeightForPrecision,
  quantizeWeights,
  type BalancePrecision,
} from '../../engine/weighingPrecision'

interface Props {
  samples: TriaxialSample[]
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
  selectedId: number | null
  results: Record<number, FiringResult>
  balancePrecision?: BalancePrecision
  onSelect: (s: TriaxialSample) => void
}

export function SamplesTable({
  samples, vertices, sampleWeight, selectedId, results, balancePrecision, onSelect,
}: Props) {
  const bp = balancePrecision
  const format = (v: number, theoretical?: number): { text: string; adjusted: boolean; theoreticalText?: string } => {
    if (bp === undefined) return { text: formatWeight(v), adjusted: false }
    const teor = theoretical ?? v
    const adjusted = Math.abs(v - teor) >= 1e-9
    return {
      text: formatWeightForPrecision(v, bp),
      adjusted,
      theoreticalText: adjusted ? `Teórico ${formatWeight(teor, 3)} g` : undefined,
    }
  }

  return (
    <div className="samples-table-wrapper">
      {bp !== undefined && (
        <p className="samples-table-note">Pesadas ajustadas a balanza {bp} g. Los valores teóricos se muestran al pasar el cursor.</p>
      )}
      <table className="samples-table">
        <thead>
          <tr>
            <th>#</th>
            <th>A %</th>
            <th>B %</th>
            <th>C %</th>
            <th>{vertices.A.name || 'A'} g</th>
            <th>{vertices.B.name || 'B'} g</th>
            <th>{vertices.C.name || 'C'} g</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => {
            const w = calculateSampleWeights(s, sampleWeight)
            const q = bp !== undefined ? quantizeWeights([w.a, w.b, w.c], bp, w.total) : null
            const gA = q ? format(q.values[0], w.a) : format(w.a)
            const gB = q ? format(q.values[1], w.b) : format(w.b)
            const gC = q ? format(q.values[2], w.c) : format(w.c)
            const registered = hasMeaningfulResult(results[s.id])
            return (
              <tr
                key={s.id}
                className={selectedId === s.id ? 'selected-table-row' : ''}
                onClick={() => onSelect(s)}
              >
                <td>{String(s.id).padStart(2, '0')}</td>
                <td>{s.a}</td>
                <td>{s.b}</td>
                <td>{s.c}</td>
                <td title={gA.theoreticalText}>{gA.text}</td>
                <td title={gB.theoreticalText}>{gB.text}</td>
                <td title={gC.theoreticalText}>{gC.text}</td>
                <td>
                  {registered ? (
                    <span className="chip chip--ok">● Registrado</span>
                  ) : (
                    <span className="chip chip--neutral">○ Sin registrar</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
