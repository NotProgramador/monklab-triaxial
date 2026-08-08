import { useState } from 'react'
import type { ProjectFiring } from '../../types/project'
import { formatFiringSummary, hasAnyProjectFiring } from '../../engine/effectiveFiring'
import { formatDateEs } from '../../engine/format'
import { FiringConditions } from './FiringConditions'

interface Props {
  firing: ProjectFiring | undefined
  onChange: (firing: ProjectFiring) => void
}

export function FiringConditionsPanel({ firing, onChange }: Props) {
  const defined = hasAnyProjectFiring(firing)
  const [open, setOpen] = useState(!defined)
  const panelId = 'firing-conditions-panel'

  const summary = defined ? formatFiringSummary(firing) : 'Sin definir'
  const dateLine = defined && firing?.date ? formatDateEs(firing.date) : ''

  return (
    <section className="firing-panel">
      <div className="firing-panel-head">
        <div className="firing-panel-summary">
          <span className="firing-panel-eyebrow">CONDICIONES DE COCCIÓN</span>
          <span className="firing-panel-line">{summary}</span>
          {dateLine && !summary.includes(dateLine) && (
            <span className="firing-panel-sub">{dateLine}</span>
          )}
          {firing?.kiln && summary && !summary.includes(firing.kiln) && (
            <span className="firing-panel-sub">{firing.kiln}</span>
          )}
        </div>
        <button
          type="button"
          className="btn-ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {defined ? (open ? 'Cerrar' : 'Editar') : 'Definir'}
        </button>
      </div>
      {open && (
        <div id={panelId} className="firing-panel-body">
          <FiringConditions firing={firing} onChange={onChange} />
        </div>
      )}
    </section>
  )
}
