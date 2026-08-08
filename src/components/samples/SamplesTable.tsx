import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { calculateSampleWeights } from '../../engine/calculateSampleWeights'
import { formatWeight } from '../../engine/format'

interface Props {
  samples: TriaxialSample[]
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  sampleWeight: number
  selectedId: number | null
  results: Record<number, FiringResult>
  onSelect: (s: TriaxialSample) => void
}

export function SamplesTable({ samples, vertices, sampleWeight, selectedId, results, onSelect }: Props) {
  return (
    <div className="samples-table-wrapper">
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
            const r = results[s.id]
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
                <td>{formatWeight(w.a)}</td>
                <td>{formatWeight(w.b)}</td>
                <td>{formatWeight(w.c)}</td>
                <td>
                  {r ? (
                    <span className="chip chip--ok">Registrado</span>
                  ) : (
                    <span className="chip chip--neutral">Sin resultado</span>
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
