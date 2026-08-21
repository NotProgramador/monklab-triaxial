import { useEffect, useMemo, useState } from 'react'
import type { ExperimentSeries } from '../../types/experimentSeries'
import type { ProjectSummary, TriaxialProject } from '../../types/project'
import type { FiringResult } from '../../types/result'
import { formatDateEs } from '../../engine/format'
import {
  deleteSeries as deleteSeriesFromStore,
  listSeries,
  saveSeries,
} from '../../storage/seriesStorage'
import { loadProject } from '../../storage/projectStorage'
import { SeriesView } from './SeriesView'

interface Props {
  open: boolean
  savedProjects: ProjectSummary[]
  currentProject: TriaxialProject
  currentDirty: boolean
  onClose: () => void
  onOpenProject: (id: string) => void
  onCompareSelected: (projectIds: string[]) => void
}

interface Draft {
  id?: string
  name: string
  description: string
}

function emptyDraft(): Draft {
  return { name: '', description: '' }
}

export function SeriesPanel({
  open, savedProjects, currentProject, currentDirty,
  onClose, onOpenProject, onCompareSelected,
}: Props) {
  const [series, setSeries] = useState<ExperimentSeries[]>([])
  const [projectCache, setProjectCache] = useState<Record<string, TriaxialProject | null>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const refresh = () => listSeries().then(setSeries)

  useEffect(() => {
    if (!open) return
    refresh()
  }, [open])

  useEffect(() => {
    if (!open) return
    // Prefetch each referenced project once so cards render immediately.
    const wanted = new Set<string>()
    for (const s of series) for (const pid of s.projectIds) wanted.add(pid)
    const missing = Array.from(wanted).filter((id) => !(id in projectCache))
    if (missing.length === 0) return
    let cancelled = false
    async function fetchAll() {
      const patch: Record<string, TriaxialProject | null> = {}
      for (const id of missing) {
        if (id === currentProject.id) { patch[id] = currentProject; continue }
        patch[id] = await loadProject(id)
      }
      if (!cancelled) setProjectCache((prev) => ({ ...prev, ...patch }))
    }
    fetchAll()
    return () => { cancelled = true }
  }, [open, series, projectCache, currentProject])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draft) setDraft(null)
        else if (openId) setOpenId(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, draft, openId, onClose])

  const uniqueProjectIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of series) for (const pid of s.projectIds) set.add(pid)
    return set
  }, [series])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return series
    return series.filter((s) => s.name.toLowerCase().includes(q))
  }, [series, query])

  if (!open) return null

  const startCreate = () => { setDraft(emptyDraft()); setError(null) }
  const startEdit = (s: ExperimentSeries) => {
    setDraft({ id: s.id, name: s.name, description: s.description ?? '' })
    setError(null)
  }

  const commit = async () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) { setError('El nombre es obligatorio.'); return }
    const nowIso = new Date().toISOString()
    let next: ExperimentSeries
    if (draft.id) {
      const existing = series.find((s) => s.id === draft.id)
      if (!existing) return
      next = { ...existing, name, description: draft.description.trim() || undefined, updatedAt: nowIso }
    } else {
      next = {
        id: crypto.randomUUID(),
        name,
        description: draft.description.trim() || undefined,
        projectIds: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    }
    await saveSeries(next)
    setDraft(null)
    setError(null)
    await refresh()
  }

  const removeSeries = async (s: ExperimentSeries) => {
    if (!confirm(`Eliminar la serie "${s.name}"?\nLos proyectos no se eliminarán.`)) return
    await deleteSeriesFromStore(s.id)
    if (openId === s.id) setOpenId(null)
    await refresh()
  }

  const persistSeries = async (updated: ExperimentSeries) => {
    const next = { ...updated, updatedAt: new Date().toISOString() }
    await saveSeries(next)
    setSeries((prev) => prev.map((s) => (s.id === next.id ? next : s)))
  }

  const openSeries = openId ? series.find((s) => s.id === openId) ?? null : null

  return (
    <div className="cmp-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmp-dialog cmp-dialog--series"
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-panel-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cmp-dialog-head">
          <div>
            <p className="inspector-eyebrow">SERIES EXPERIMENTALES</p>
            <h2 id="series-panel-title">
              {openSeries ? openSeries.name : `${series.length} series · ${uniqueProjectIds.size} proyectos organizados`}
            </h2>
            {!openSeries && (
              <p className="cmp-dialog-project">Agrupa proyectos que forman parte de una misma investigación.</p>
            )}
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        {!openSeries && !draft && (
          <>
            <div className="library-toolbar">
              <input
                type="search"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" className="btn" onClick={startCreate}>+ Nueva serie</button>
            </div>

            {series.length === 0 && (
              <div className="library-empty">
                <p>No hay series todavía.</p>
                <div className="library-empty-actions">
                  <button type="button" className="btn" onClick={startCreate}>+ Nueva serie</button>
                </div>
              </div>
            )}

            <div className="series-list">
              {filtered.map((s) => (
                <div className="series-row" key={s.id}>
                  <div className="series-row-main">
                    <span className="series-row-name">{s.name}</span>
                    <span className="series-row-meta">
                      {s.projectIds.length} proyecto{s.projectIds.length === 1 ? '' : 's'} · Actualizada {formatDateEs(s.updatedAt)}
                    </span>
                    {s.description && <span className="series-row-desc">{s.description}</span>}
                  </div>
                  <div className="series-row-actions">
                    <button type="button" className="btn-ghost btn-tiny" onClick={() => startEdit(s)}>Editar</button>
                    <button type="button" className="btn-ghost btn-tiny btn-danger" onClick={() => removeSeries(s)}>Eliminar</button>
                    <button type="button" className="btn btn-tiny" onClick={() => setOpenId(s.id)}>Abrir</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {openSeries && (
          <SeriesView
            series={openSeries}
            savedProjects={savedProjects}
            projectCache={projectCache}
            currentProject={currentProject}
            currentDirty={currentDirty}
            onBack={() => setOpenId(null)}
            onUpdate={persistSeries}
            onOpenProject={onOpenProject}
            onCompare={onCompareSelected}
          />
        )}

        {draft && (
          <div className="library-editor">
            <h3>{draft.id ? 'Editar serie' : 'Nueva serie'}</h3>
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                value={draft.name}
                autoFocus
                placeholder="Engobe blanco / hierro / cobalto"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea
                rows={2}
                value={draft.description}
                placeholder="Variaciones de temperatura y soporte."
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            {error && <p className="library-error">{error}</p>}
            <div className="library-editor-actions">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancelar</button>
              <button type="button" className="btn" onClick={commit}>Guardar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Local: helpers exposed for series count when computed from cache.
export type _ExposedFiringResult = FiringResult
