import type { ProjectFiring } from '../../types/project'
import type { FiringAtmosphere } from '../../types/result'

interface Props {
  firing: ProjectFiring | undefined
  onChange: (firing: ProjectFiring) => void
}

const ATMOS: { value: FiringAtmosphere; label: string }[] = [
  { value: 'oxidacion', label: 'Oxidación' },
  { value: 'reduccion', label: 'Reducción' },
  { value: 'neutra', label: 'Neutra' },
  { value: 'otro', label: 'Otro' },
]

export function FiringConditions({ firing, onChange }: Props) {
  const f = firing ?? {}
  const patch = (p: Partial<ProjectFiring>) => onChange({ ...f, ...p })

  return (
    <div className="firing-conditions">
      <div className="field-row">
        <label className="field">
          <span>Fecha</span>
          <input
            type="date"
            value={f.date ?? ''}
            onChange={(e) => patch({ date: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Temperatura °C</span>
          <input
            type="number"
            min="0"
            step="1"
            value={f.temperature ?? ''}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') return patch({ temperature: undefined })
              const n = Number(v)
              if (Number.isFinite(n) && n >= 0) patch({ temperature: n })
            }}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Cono</span>
          <input
            type="text"
            value={f.cone ?? ''}
            onChange={(e) => patch({ cone: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Atmósfera</span>
          <select
            value={f.atmosphere ?? ''}
            onChange={(e) => patch({ atmosphere: (e.target.value || undefined) as FiringAtmosphere | undefined })}
          >
            <option value="">—</option>
            {ATMOS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Horno</span>
        <input
          type="text"
          value={f.kiln ?? ''}
          placeholder="Horno eléctrico taller"
          onChange={(e) => patch({ kiln: e.target.value || undefined })}
        />
      </label>

      <label className="field">
        <span>Notas de cocción</span>
        <textarea
          rows={2}
          value={f.notes ?? ''}
          placeholder="Curva, meseta, incidencias…"
          onChange={(e) => patch({ notes: e.target.value || undefined })}
        />
      </label>
    </div>
  )
}
