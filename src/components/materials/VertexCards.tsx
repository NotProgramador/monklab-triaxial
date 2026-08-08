import type { VertexMaterial } from '../../types/material'
import { vertexStatus, type VertexStatusKind } from './vertexStatus'

type VertexId = 'A' | 'B' | 'C'

interface Props {
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  activeId: VertexId
  onActivate: (id: VertexId) => void
}

const STATUS_ICON: Record<VertexStatusKind, string> = {
  ok: '✓',
  invalid: '⚠',
  empty: '⚠',
  simple: '·',
}

export function VertexCards({ vertices, activeId, onActivate }: Props) {
  return (
    <div className="vertex-cards" role="tablist" aria-label="Vértices A B C">
      {(['A', 'B', 'C'] as const).map((id) => {
        const v = vertices[id]
        const st = vertexStatus(v)
        const isActive = id === activeId
        const subtitle =
          st.kind === 'simple'
            ? 'Material simple'
            : st.kind === 'empty'
              ? 'Receta · sin ingredientes'
              : `Receta · ${st.ingredientCount} ${st.ingredientCount === 1 ? 'componente' : 'componentes'}`
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="vertex-editor-panel"
            id={`vertex-card-${id}`}
            className={`vertex-card ${isActive ? 'is-active' : ''} vertex-card--${st.kind}`}
            onClick={() => onActivate(id)}
          >
            <span className="vc-row">
              <span className="vc-id">{id}</span>
              <span className="vc-swatch" style={{ background: v.color }} aria-hidden />
              <span className="vc-name">{v.name || `Vértice ${id}`}</span>
              <span className="vc-pct">100 %</span>
            </span>
            <span className="vc-meta">
              <span className="vc-subtitle">{subtitle}</span>
              <span className={`vc-status vc-status--${st.kind}`}>
                <span aria-hidden>{STATUS_ICON[st.kind]}</span>
                <span>{st.kind === 'simple' ? '' : st.label}</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
