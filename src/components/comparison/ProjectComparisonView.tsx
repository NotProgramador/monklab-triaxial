import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectSummary, TriaxialProject } from '../../types/project'
import type { FiringResult } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import { MODE_LABELS } from '../../types/experimentMode'
import { atmosphereLabel, getEffectiveFiring, hasSampleFiringOverride } from '../../engine/effectiveFiring'
import { countRegistered, hasMeaningfulResult } from '../../engine/resultStatus'
import { formatDateEs } from '../../engine/format'
import {
  compareProjectConditions,
  compareVertexRecipes,
  findCommonCompositions,
  sampleByComposition,
  type VertexRecipeStatus,
} from '../../engine/projectComparison'
import { printProjectComparisonReport } from '../../print/projectComparisonReport'
import { formatExperimentSummary } from '../../engine/experimentContext'
import { getSampleImage, releaseBlobUrl, urlForBlob } from '../../storage/imageStorage'
import { loadProject } from '../../storage/projectStorage'

interface Props {
  savedProjects: ProjectSummary[]
  currentProject: TriaxialProject
  currentDirty: boolean
  /** Optional pre-selected ids (e.g. when opening from a series). */
  initialSelectedIds?: string[]
  /** Optional series name to include in the printed report. */
  seriesName?: string
  onClose: () => void
}

const MAX_PROJECTS = 3
const MIN_PROJECTS = 2

type FilterMode = 'all' | 'registered2plus'

const RECIPE_LABEL: Record<VertexRecipeStatus, string> = {
  identical: '✓ Recetas coincidentes',
  compatible_legacy: '≈ Coincidencia legacy por nombre',
  ambiguous: '? Mismos nombres con identidades locales distintas',
  different: '≠ Receta diferente',
}

function pad(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

function statusClass(status: string): string {
  return `cross-status cross-status--${status}`
}

export function ProjectComparisonView({
  savedProjects, currentProject, currentDirty, initialSelectedIds, seriesName, onClose,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialSelectedIds ?? [])
  const [printing, setPrinting] = useState(false)
  const [projects, setProjects] = useState<Record<string, TriaxialProject>>({})
  const [loading, setLoading] = useState(false)
  const [compositionIdx, setCompositionIdx] = useState(0)
  const [filter, setFilter] = useState<FilterMode>('all')

  // Load selected projects.
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      setLoading(true)
      const next: Record<string, TriaxialProject> = { ...projects }
      for (const id of selectedIds) {
        if (next[id]) continue
        if (id === currentProject.id) {
          next[id] = currentProject
          continue
        }
        const p = await loadProject(id)
        if (p) next[id] = p
      }
      if (!cancelled) {
        setProjects(next)
        setLoading(false)
      }
    }
    loadAll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, currentProject])

  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const orderedProjects = useMemo(() =>
    selectedIds.map((id) => projects[id]).filter((p): p is TriaxialProject => Boolean(p)),
    [selectedIds, projects],
  )

  const commonKeys = useMemo(
    () => (orderedProjects.length >= MIN_PROJECTS ? findCommonCompositions(orderedProjects) : []),
    [orderedProjects],
  )

  const filteredKeys = useMemo(() => {
    if (filter === 'all') return commonKeys
    return commonKeys.filter((k) => {
      const count = orderedProjects.reduce((n, p) => {
        const s = sampleByComposition(p, k)
        return s && hasMeaningfulResult(p.results[s.id]) ? n + 1 : n
      }, 0)
      return count >= 2
    })
  }, [commonKeys, filter, orderedProjects])

  useEffect(() => {
    if (compositionIdx >= filteredKeys.length) setCompositionIdx(0)
  }, [filteredKeys.length, compositionIdx])

  const activeKey = filteredKeys[compositionIdx] ?? null
  const conditionRows = orderedProjects.length >= MIN_PROJECTS ? compareProjectConditions(orderedProjects) : []

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_PROJECTS) return prev
      return [...prev, id]
    })
  }

  const canOpen = orderedProjects.length >= MIN_PROJECTS
  const projectsById = new Map(savedProjects.map((s) => [s.id, s]))

  const handlePrint = async () => {
    if (!activeKey || orderedProjects.length < MIN_PROJECTS) return
    setPrinting(true)
    try {
      await printProjectComparisonReport({
        projects: orderedProjects,
        compositionKeyValue: activeKey,
        seriesName,
      })
    } finally {
      // The iframe stays until afterprint; the button just re-enables so the
      // user can adjust and re-print.
      setPrinting(false)
    }
  }

  return (
    <div className="cmp-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmp-dialog cmp-dialog--projects"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proj-cmp-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cmp-dialog-head">
          <div>
            <p className="inspector-eyebrow">COMPARAR PROYECTOS</p>
            <h2 id="proj-cmp-title">
              {orderedProjects.length > 0
                ? orderedProjects.map((p) => p.name).join(' · ')
                : 'Selecciona 2 o 3 proyectos'}
            </h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <section className="proj-selector">
          <h3 className="proj-selector-title">Proyectos guardados</h3>
          {savedProjects.length === 0 && <p className="hint">No hay proyectos guardados.</p>}
          <ul className="proj-selector-list">
            {savedProjects.map((s) => {
              const isCurrent = s.id === currentProject.id
              // Index entries predating Fase 2 may lack `mode`; treat as triaxial.
              const summaryMode = s.mode ?? 'triaxial'
              const isTriaxial = summaryMode === 'triaxial'
              const dirtyBlocked = isCurrent && currentDirty
              const modeBlocked = !isTriaxial
              const disabled = dirtyBlocked || modeBlocked
              const selected = selectedIds.includes(s.id)
              const atMax = !selected && selectedIds.length >= MAX_PROJECTS
              return (
                <li key={s.id}>
                  <label className={`proj-selector-item ${selected ? 'is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled || atMax}
                      onChange={() => toggleProject(s.id)}
                    />
                    <span className="proj-selector-main">
                      <span className="proj-selector-name">{s.name}</span>
                      <span className="proj-selector-meta">
                        {formatDateEs(s.updatedAt)}
                        {isCurrent && ' · actual'}
                        {!isTriaxial && ` · ${MODE_LABELS[summaryMode]}`}
                      </span>
                    </span>
                    {dirtyBlocked && (
                      <span className="proj-selector-warn">Guarda los cambios antes de comparar este proyecto.</span>
                    )}
                    {modeBlocked && !dirtyBlocked && (
                      <span className="proj-selector-warn">
                        {MODE_LABELS[summaryMode]} · comparación próximamente.
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="proj-selector-count">
            {selectedIds.length} / {MAX_PROJECTS} · mínimo {MIN_PROJECTS}
          </p>
        </section>

        {loading && <p className="hint">Cargando…</p>}

        {canOpen && (
          <>
            <ProjectSummaryRow projects={orderedProjects} savedById={projectsById} />

            <ConditionsMatrix projects={orderedProjects} rows={conditionRows} />

            <VertexRecipesRow projects={orderedProjects} />

            <CommonCompositionSection
              commonKeys={commonKeys}
              filteredKeys={filteredKeys}
              filter={filter}
              onFilterChange={setFilter}
              index={Math.min(compositionIdx, Math.max(0, filteredKeys.length - 1))}
              onIndexChange={setCompositionIdx}
            />

            {activeKey && (
              <>
                <div className="cmp-print-bar">
                  <button
                    type="button"
                    className="btn"
                    onClick={handlePrint}
                    disabled={printing}
                    aria-label={`Imprimir reporte comparativo de composición ${activeKey.replace(/\|/g, ' / ')}`}
                  >
                    {printing ? 'Preparando reporte…' : 'Imprimir comparación'}
                  </button>
                </div>
                <CompositionCards
                  projects={orderedProjects}
                  compositionKeyValue={activeKey}
                />
              </>
            )}

            {commonKeys.length === 0 && (
              <p className="hint">No hay composiciones comunes entre los proyectos seleccionados.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProjectSummaryRow({
  projects, savedById,
}: {
  projects: TriaxialProject[]
  savedById: Map<string, ProjectSummary>
}) {
  return (
    <section className="proj-summary-row">
      {projects.map((p) => {
        const summary = savedById.get(p.id)
        const step = p.step ?? 20
        const sampleCount = 1 + (step === 20 ? 20 : step === 25 ? 14 : step === 10 ? 65 : 230)
        const registered = countRegistered(Array.from({ length: sampleCount }, (_, i) => i + 1), p.results)
        return (
          <div key={p.id} className="proj-summary-card">
            <h4>{p.name}</h4>
            <dl>
              <div><dt>División</dt><dd>{step} %</dd></div>
              <div><dt>Peso muestra</dt><dd>{p.sampleWeight} g</dd></div>
              {p.balancePrecision !== undefined && (
                <div><dt>Balanza</dt><dd>{p.balancePrecision} g</dd></div>
              )}
              <div><dt>Resultados</dt><dd>{registered} / {sampleCount}</dd></div>
              <div><dt>Actualizado</dt><dd>{formatDateEs(summary?.updatedAt ?? p.updatedAt)}</dd></div>
            </dl>
          </div>
        )
      })}
    </section>
  )
}

function ConditionsMatrix({
  projects, rows,
}: {
  projects: TriaxialProject[]
  rows: ReturnType<typeof compareProjectConditions>
}) {
  return (
    <section className="conditions-matrix">
      <h3 className="cmp-section-title">Contexto y cocción</h3>
      <div className="cmp-table-wrap">
        <table className="cmp-table cross-conditions-table">
          <thead>
            <tr>
              <th scope="col">Campo</th>
              {projects.map((p) => (
                <th key={p.id} scope="col">{p.name}</th>
              ))}
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.field} className={`row-status--${r.status}`}>
                <th scope="row">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i}>{v ?? '—'}</td>
                ))}
                <td className={statusClass(r.status)}>
                  {r.status === 'same' && 'Coincide'}
                  {r.status === 'different' && 'Difiere'}
                  {r.status === 'missing' && 'Faltante'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VertexRecipesRow({ projects }: { projects: TriaxialProject[] }) {
  const [expanded, setExpanded] = useState<'A' | 'B' | 'C' | null>(null)
  const reference = projects[0]
  return (
    <section className="vertex-recipes">
      <h3 className="cmp-section-title">Vértices A/B/C</h3>
      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th scope="col">Vértice</th>
              {projects.map((p) => <th key={p.id} scope="col">{p.name}</th>)}
              <th scope="col">Estado</th>
              <th scope="col" aria-label="Detalle"></th>
            </tr>
          </thead>
          <tbody>
            {(['A', 'B', 'C'] as const).map((vid) => {
              // Combine statuses across all pair comparisons vs reference.
              const statuses = projects.slice(1).map((p) => compareVertexRecipes(reference.vertices[vid], p.vertices[vid]))
              const worst: VertexRecipeStatus =
                statuses.includes('different') ? 'different' :
                statuses.includes('ambiguous') ? 'ambiguous' :
                statuses.includes('compatible_legacy') ? 'compatible_legacy' : 'identical'
              return (
                <tr key={vid}>
                  <th scope="row">{vid} · {reference.vertices[vid].name}</th>
                  {projects.map((p) => <td key={p.id}>{p.vertices[vid].name || vid}</td>)}
                  <td className={statusClass(worst)}>{RECIPE_LABEL[worst]}</td>
                  <td>
                    {worst !== 'identical' && (
                      <button
                        type="button"
                        className="btn-ghost btn-tiny"
                        aria-expanded={expanded === vid}
                        onClick={() => setExpanded(expanded === vid ? null : vid)}
                      >{expanded === vid ? 'Cerrar' : `${vid} · Diferencias`}</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {expanded && <RecipeDiff vid={expanded} projects={projects} />}
    </section>
  )
}

function RecipeDiff({ vid, projects }: { vid: 'A' | 'B' | 'C'; projects: TriaxialProject[] }) {
  // Union of ingredient names normalized (fallback), preserving first-seen name for display.
  const allNames: { display: string; key: string }[] = []
  const seen = new Set<string>()
  for (const p of projects) {
    const recipe = p.vertices[vid].recipe
    if (!recipe) continue
    for (const ing of recipe.ingredients) {
      const key = (ing.materialId ?? ing.name.trim().toLowerCase())
      if (seen.has(key)) continue
      seen.add(key)
      allNames.push({ display: ing.name.trim() || key, key })
    }
  }
  const percentages = (p: TriaxialProject, key: string): number | null => {
    const recipe = p.vertices[vid].recipe
    if (!recipe) return null
    for (const ing of recipe.ingredients) {
      const k = ing.materialId ?? ing.name.trim().toLowerCase()
      if (k === key) return ing.percentage
    }
    return null
  }
  return (
    <div className="cmp-table-wrap">
      <table className="cmp-table recipe-diff-table">
        <thead>
          <tr>
            <th scope="col">Ingrediente</th>
            {projects.map((p) => <th key={p.id} scope="col">{p.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {allNames.map((n) => (
            <tr key={n.key}>
              <th scope="row">{n.display}</th>
              {projects.map((p) => {
                const pct = percentages(p, n.key)
                return <td key={p.id}>{pct === null ? '—' : `${pct} %`}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CommonCompositionSection({
  commonKeys, filteredKeys, filter, onFilterChange, index, onIndexChange,
}: {
  commonKeys: string[]
  filteredKeys: string[]
  filter: FilterMode
  onFilterChange: (f: FilterMode) => void
  index: number
  onIndexChange: (n: number) => void
}) {
  const active = filteredKeys[index] ?? null
  const prev = () => onIndexChange(Math.max(0, index - 1))
  const next = () => onIndexChange(Math.min(filteredKeys.length - 1, index + 1))
  return (
    <section className="common-composition">
      <div className="common-composition-head">
        <div>
          <h3 className="cmp-section-title">Composición común</h3>
          <p className="hint">
            {commonKeys.length} composiciones comunes · {filteredKeys.length} tras filtro
          </p>
        </div>
        <div className="common-composition-filter">
          <label className="checkbox-inline">
            <input
              type="radio"
              name="cmp-filter"
              checked={filter === 'all'}
              onChange={() => onFilterChange('all')}
            />
            <span>Todas</span>
          </label>
          <label className="checkbox-inline">
            <input
              type="radio"
              name="cmp-filter"
              checked={filter === 'registered2plus'}
              onChange={() => onFilterChange('registered2plus')}
            />
            <span>Con resultados en 2+</span>
          </label>
        </div>
      </div>
      {filteredKeys.length > 0 && active && (
        <nav className="common-composition-nav" aria-label="Composición común">
          <button type="button" className="btn-ghost btn-tiny" onClick={prev} disabled={index === 0}>‹ anterior</button>
          <span className="common-composition-key">{active.replace(/\|/g, ' / ')}</span>
          <button type="button" className="btn-ghost btn-tiny" onClick={next} disabled={index >= filteredKeys.length - 1}>siguiente ›</button>
        </nav>
      )}
    </section>
  )
}

function CompositionCards({
  projects, compositionKeyValue,
}: {
  projects: TriaxialProject[]
  compositionKeyValue: string
}) {
  return (
    <section className="cmp-cards cross-cards">
      {projects.map((p) => {
        const s = sampleByComposition(p, compositionKeyValue)
        return (
          <CrossProjectCard
            key={p.id}
            project={p}
            sample={s}
          />
        )
      })}
    </section>
  )
}

function CrossProjectCard({
  project, sample,
}: {
  project: TriaxialProject
  sample: TriaxialSample | null
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const result: FiringResult | undefined = sample ? project.results[sample.id] : undefined
  const cacheKey = sample ? `xcmp::${project.id}::${sample.id}` : ''

  useEffect(() => {
    let cancelled = false
    if (sample && result?.hasPhoto) {
      getSampleImage(project.id, sample.id).then((blob) => {
        if (cancelled) return
        setPhotoUrl(blob ? urlForBlob(cacheKey, blob) : null)
      })
    } else {
      setPhotoUrl(null)
    }
    return () => {
      cancelled = true
      if (cacheKey) releaseBlobUrl(cacheKey)
    }
  }, [project.id, sample, result?.hasPhoto, cacheKey])

  if (!sample) {
    return (
      <article className="cmp-card">
        <header className="cmp-card-head">
          <div>
            <h3>{project.name}</h3>
            <p className="cmp-card-pct">—</p>
          </div>
          <span className="cmp-flag cmp-flag--pending">Sin composición</span>
        </header>
      </article>
    )
  }

  const registered = hasMeaningfulResult(result)
  const effective = getEffectiveFiring(project.firing, result)
  const override = hasSampleFiringOverride(result)
  const swatch = result?.observedColor ?? null
  const experimentLine = formatExperimentSummary(project.experiment)

  return (
    <article className="cmp-card">
      <header className="cmp-card-head">
        <div>
          <h3>{project.name}</h3>
          <p className="cmp-card-pct">{pad(sample.id)} · {sample.a} / {sample.b} / {sample.c}</p>
        </div>
        {registered
          ? <span className="cmp-flag cmp-flag--ok">● Registrado</span>
          : <span className="cmp-flag cmp-flag--pending">○ Sin registrar</span>}
      </header>

      <div className="cmp-card-media">
        {photoUrl ? <img src={photoUrl} alt={`${project.name} · ${pad(sample.id)}`} />
          : swatch ? <div className="cmp-swatch" style={{ background: swatch }} aria-label={`Color observado ${swatch}`} />
          : <div className="cmp-swatch cmp-swatch--empty" />}
      </div>

      <dl className="cmp-card-facts">
        <div><dt>Color</dt><dd>{result?.observedColor ?? '—'}</dd></div>
        <div><dt>Superficie</dt><dd>{result?.surface ?? '—'}</dd></div>
        <div><dt>Cocción efectiva</dt>
          <dd>
            {effective.temperature !== undefined ? `${effective.temperature} °C` : '—'}
            {effective.atmosphere ? ` · ${atmosphereLabel(effective.atmosphere)}` : ''}
            {effective.cone ? ` · Cono ${effective.cone}` : ''}
          </dd>
        </div>
        {experimentLine && (
          <div><dt>Contexto</dt><dd>{experimentLine}</dd></div>
        )}
        {result?.notes && <div><dt>Notas</dt><dd>{result.notes}</dd></div>}
      </dl>

      {override && (
        <p className="cmp-card-override"><strong>Condición propia de muestra.</strong></p>
      )}
    </article>
  )
}
