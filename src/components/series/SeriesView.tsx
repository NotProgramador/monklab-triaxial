import { useMemo, useState } from 'react'
import type { ExperimentSeries } from '../../types/experimentSeries'
import type { ProjectSummary, TriaxialProject } from '../../types/project'
import { atmosphereLabel, hasAnyProjectFiring } from '../../engine/effectiveFiring'
import { countRegistered } from '../../engine/resultStatus'
import { formatExperimentSummary } from '../../engine/experimentContext'
import { formatDateEs } from '../../engine/format'
import { moveDown, moveUp, partitionOrphans } from '../../engine/seriesOrder'
import { MODE_LABELS } from '../../types/experimentMode'
import { MONOAXIAL_SAMPLE_ID } from '../../engine/generateMonoaxial'

const MAX_COMPARE = 3
const MIN_COMPARE = 2

interface Props {
  series: ExperimentSeries
  savedProjects: ProjectSummary[]
  projectCache: Record<string, TriaxialProject | null>
  currentProject: TriaxialProject
  currentDirty: boolean
  onBack: () => void
  onUpdate: (next: ExperimentSeries) => Promise<void>
  onOpenProject: (id: string) => void
  onCompare: (projectIds: string[]) => void
}

function sampleCountForStep(step: number): number {
  if (step === 20) return 21
  if (step === 25) return 15
  if (step === 10) return 66
  return 231
}

export function SeriesView({
  series, savedProjects, projectCache, currentProject, currentDirty,
  onBack, onUpdate, onOpenProject, onCompare,
}: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const knownIds = useMemo(
    () => new Set(savedProjects.map((s) => s.id)),
    [savedProjects],
  )

  const { valid, orphans } = useMemo(
    () => partitionOrphans(series.projectIds, knownIds),
    [series.projectIds, knownIds],
  )

  const availableToAdd = useMemo(
    () => savedProjects.filter((s) => !series.projectIds.includes(s.id)),
    [savedProjects, series.projectIds],
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_COMPARE) return prev
      return [...prev, id]
    })
  }

  const addProject = async (id: string) => {
    const next = { ...series, projectIds: [...series.projectIds, id] }
    await onUpdate(next)
    setShowAdd(false)
  }

  const removeProject = async (id: string) => {
    if (!confirm('¿Quitar este proyecto de la serie?\nEl proyecto no se eliminará.')) return
    const next = { ...series, projectIds: series.projectIds.filter((x) => x !== id) }
    setSelected((s) => s.filter((x) => x !== id))
    await onUpdate(next)
  }

  const clearOrphan = async (id: string) => {
    const next = { ...series, projectIds: series.projectIds.filter((x) => x !== id) }
    await onUpdate(next)
  }

  const shift = async (id: string, direction: 'up' | 'down') => {
    const index = series.projectIds.indexOf(id)
    if (index < 0) return
    const nextIds = direction === 'up'
      ? moveUp(series.projectIds, index)
      : moveDown(series.projectIds, index)
    await onUpdate({ ...series, projectIds: nextIds })
  }

  const compareNow = () => {
    if (selected.length < MIN_COMPARE) return
    onCompare(selected)
  }

  // Detect A/B/C shape differences across *triaxial* projects in the series
  // (informational only). Non-triaxial projects skip this check.
  const differentShapes = useMemo(() => {
    const shapes = new Set<string>()
    for (const id of valid) {
      const p = id === currentProject.id ? currentProject : projectCache[id]
      if (!p || p.mode !== 'triaxial') continue
      shapes.add(`${p.vertices.A.name}|${p.vertices.B.name}|${p.vertices.C.name}`)
    }
    return shapes.size > 1
  }, [valid, projectCache, currentProject])

  // Cross-project comparison is still triaxial-only. If the selection
  // includes a non-triaxial project we disable the launch button and
  // explain why.
  const selectedModes = useMemo(() => {
    const modes = new Set<string>()
    for (const id of selected) {
      const p = id === currentProject.id ? currentProject : projectCache[id]
      if (p) modes.add(p.mode)
    }
    return modes
  }, [selected, projectCache, currentProject])
  const compareBlocked = selected.length >= MIN_COMPARE
    && (selectedModes.size > 1 || !selectedModes.has('triaxial'))

  return (
    <>
      <div className="series-view-toolbar">
        <button type="button" className="btn-ghost btn-tiny" onClick={onBack}>‹ Volver</button>
        {series.description && <p className="series-view-desc">{series.description}</p>}
        <div className="series-view-actions">
          <button type="button" className="btn-ghost" onClick={() => setShowAdd((v) => !v)}>
            + Añadir proyecto
          </button>
          <button
            type="button"
            className="btn"
            onClick={compareNow}
            disabled={selected.length < MIN_COMPARE || compareBlocked}
            title={
              selected.length < MIN_COMPARE
                ? 'Selecciona al menos 2 proyectos'
                : compareBlocked
                  ? 'La comparación entre este tipo de proyectos se habilitará en una fase posterior.'
                  : undefined
            }
          >
            Comparar seleccionados ({selected.length})
          </button>
        </div>
      </div>

      {compareBlocked && (
        <p className="hint hint-warn" role="status">
          La comparación entre este tipo de proyectos se habilitará en una fase posterior.
        </p>
      )}

      {differentShapes && (
        <p className="hint hint-warn">
          Los proyectos de esta serie no usan necesariamente las mismas recetas.
        </p>
      )}

      {showAdd && (
        <div className="series-add-drawer">
          <h3 className="cmp-section-title">Añadir proyecto</h3>
          {availableToAdd.length === 0 ? (
            <p className="hint">No hay proyectos disponibles.</p>
          ) : (
            <ul className="series-add-list">
              {availableToAdd.map((p) => (
                <li key={p.id}>
                  <button type="button" className="series-add-item" onClick={() => addProject(p.id)}>
                    <span className="series-add-name">{p.name}</span>
                    <span className="series-add-meta">{formatDateEs(p.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="series-cards">
        {valid.length === 0 && orphans.length === 0 && (
          <p className="hint">Esta serie está vacía.</p>
        )}
        {valid.map((id, idx) => {
          const p = id === currentProject.id ? currentProject : projectCache[id]
          const summary = savedProjects.find((s) => s.id === id)
          const isSelected = selected.includes(id)
          const atMax = !isSelected && selected.length >= MAX_COMPARE
          const isMono = p?.mode === 'monoaxial'
          const totalSamples = p
            ? (isMono ? 1 : sampleCountForStep(p.step ?? 20))
            : 0
          const registered = p
            ? (isMono
                ? countRegistered([MONOAXIAL_SAMPLE_ID], p.results)
                : countRegistered(
                    Array.from({ length: totalSamples }, (_, i) => i + 1),
                    p.results,
                  ))
            : 0
          const firingLine = p && hasAnyProjectFiring(p.firing)
            ? [
                p.firing?.temperature !== undefined ? `${p.firing.temperature} °C` : null,
                p.firing?.atmosphere ? atmosphereLabel(p.firing.atmosphere) : null,
                p.firing?.cone ? `Cono ${p.firing.cone}` : null,
              ].filter(Boolean).join(' · ')
            : ''
          const experimentLine = p ? formatExperimentSummary(p.experiment) : ''
          return (
            <article key={id} className={`series-card ${isSelected ? 'is-selected' : ''}`}>
              <header className="series-card-head">
                <label className="series-card-select">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={atMax}
                    onChange={() => toggleSelect(id)}
                    aria-label={`Seleccionar ${p?.name ?? id} para comparar`}
                  />
                  <span className="series-card-name">{p?.name ?? summary?.name ?? '—'}</span>
                </label>
                <div className="series-card-reorder">
                  <button
                    type="button"
                    className="btn-ghost btn-tiny"
                    onClick={() => shift(id, 'up')}
                    disabled={idx === 0}
                    aria-label={`Mover ${p?.name ?? id} hacia arriba`}
                  >↑</button>
                  <button
                    type="button"
                    className="btn-ghost btn-tiny"
                    onClick={() => shift(id, 'down')}
                    disabled={idx === valid.length - 1}
                    aria-label={`Mover ${p?.name ?? id} hacia abajo`}
                  >↓</button>
                </div>
              </header>
              {p ? (
                <dl className="series-card-facts">
                  <div><dt>Tipo</dt><dd>{MODE_LABELS[p.mode]}</dd></div>
                  {!isMono && (
                    <div><dt>División</dt><dd>{p.step ?? '—'} %</dd></div>
                  )}
                  <div><dt>Resultados</dt><dd>{registered} / {totalSamples}</dd></div>
                  {firingLine && <div><dt>Cocción</dt><dd>{firingLine}</dd></div>}
                  {experimentLine && <div><dt>Contexto</dt><dd>{experimentLine}</dd></div>}
                </dl>
              ) : (
                <p className="hint">Cargando…</p>
              )}
              <div className="series-card-actions">
                <button
                  type="button"
                  className="btn-ghost btn-tiny"
                  onClick={() => {
                    if (currentDirty && id !== currentProject.id) {
                      if (!confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
                    }
                    onOpenProject(id)
                  }}
                >Abrir</button>
                <button
                  type="button"
                  className="btn-ghost btn-tiny btn-danger"
                  onClick={() => removeProject(id)}
                >Quitar</button>
              </div>
            </article>
          )
        })}
        {orphans.map((id) => (
          <article key={id} className="series-card series-card--orphan">
            <header className="series-card-head">
              <span className="series-card-name">Proyecto no disponible</span>
            </header>
            <p className="hint">ID {id.slice(0, 8)}…</p>
            <div className="series-card-actions">
              <button
                type="button"
                className="btn-ghost btn-tiny btn-danger"
                onClick={() => clearOrphan(id)}
              >Quitar referencia</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
