import { useState } from 'react'
import type { ApplicationMethod, ExperimentContext } from '../../types/project'
import {
  APPLICATION_METHOD_LABELS,
  formatExperimentSummary,
  hasExperimentContext,
} from '../../engine/experimentContext'

interface Props {
  experiment: ExperimentContext | undefined
  onChange: (e: ExperimentContext) => void
}

const METHODS: ApplicationMethod[] = ['brocha', 'inmersion', 'vertido', 'pistola', 'otro']

export function ExperimentContextPanel({ experiment, onChange }: Props) {
  const defined = hasExperimentContext(experiment)
  const [open, setOpen] = useState(false)
  const panelId = 'experiment-context-panel'
  const e = experiment ?? {}
  const patch = (p: Partial<ExperimentContext>) => onChange({ ...e, ...p })
  const summary = defined ? formatExperimentSummary(experiment) : 'Sin definir'

  return (
    <section className="experiment-panel">
      <div className="experiment-panel-head">
        <div className="experiment-panel-summary">
          <span className="experiment-panel-eyebrow">CONTEXTO EXPERIMENTAL</span>
          <span className="experiment-panel-line">{summary}</span>
          {defined && e.applicationNotes && (
            <span className="experiment-panel-sub">{e.applicationNotes}</span>
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
        <div id={panelId} className="experiment-panel-body">
          <label className="field">
            <span>Soporte / pasta base</span>
            <input
              type="text"
              placeholder="Loza blanca, gres, porcelana…"
              value={e.substrate ?? ''}
              onChange={(ev) => patch({ substrate: ev.target.value || undefined })}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Temperatura de bizcocho °C</span>
              <input
                type="number"
                min="0"
                step="1"
                value={e.bisqueTemperature ?? ''}
                onChange={(ev) => {
                  const v = ev.target.value
                  if (v === '') return patch({ bisqueTemperature: undefined })
                  const n = Number(v)
                  if (Number.isFinite(n) && n >= 0) patch({ bisqueTemperature: n })
                }}
              />
            </label>
            <label className="field">
              <span>Método de aplicación</span>
              <select
                value={e.applicationMethod ?? ''}
                onChange={(ev) => patch({ applicationMethod: (ev.target.value || undefined) as ApplicationMethod | undefined })}
              >
                <option value="">—</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{APPLICATION_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Capas</span>
            <input
              type="number"
              min="1"
              step="1"
              value={e.coats ?? ''}
              onChange={(ev) => {
                const v = ev.target.value
                if (v === '') return patch({ coats: undefined })
                const n = Number(v)
                if (Number.isFinite(n) && Number.isInteger(n) && n >= 1) patch({ coats: n })
              }}
            />
          </label>

          <label className="field">
            <span>Notas de aplicación</span>
            <textarea
              rows={2}
              placeholder="Tres manos cruzadas, inmersión 2 segundos…"
              value={e.applicationNotes ?? ''}
              onChange={(ev) => patch({ applicationNotes: ev.target.value || undefined })}
            />
          </label>
        </div>
      )}
    </section>
  )
}
