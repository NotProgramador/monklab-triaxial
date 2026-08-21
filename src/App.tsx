import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

import { generateTriaxial, sampleCountForStep, ALLOWED_STEPS } from './engine/generateTriaxial'
import { calculatePreparation } from './engine/calculatePreparation'
import { collectInvalidRecipes, hasAnyRecipe } from './engine/expandRecipe'
import { createDefaultProject } from './engine/defaults'
import { deserializeProject, serializeProject } from './engine/serialization'
import { downloadFile, samplesToCsv } from './engine/exportCsv'
import { buildStandaloneSvg } from './engine/exportSvg'

import { TriaxialDiagram, type ViewMode } from './components/triangle/TriaxialDiagram'
import { SampleInspector } from './components/samples/SampleInspector'
import { SamplesTable } from './components/samples/SamplesTable'
import { PreparationSheet } from './components/samples/PreparationSheet'
import { VertexEditor } from './components/materials/VertexEditor'
import { VertexCards } from './components/materials/VertexCards'
import { ProjectHeader } from './components/project/ProjectHeader'
import { PrintReport } from './components/print/PrintReport'
import { FiringConditionsPanel } from './components/firing/FiringConditionsPanel'
import { ExperimentContextPanel } from './components/experiment/ExperimentContextPanel'
import { LibraryPanel } from './components/library/LibraryPanel'
import { SampleComparisonTray } from './components/comparison/SampleComparisonTray'
import { SampleComparisonView } from './components/comparison/SampleComparisonView'
import { ProjectComparisonView } from './components/comparison/ProjectComparisonView'
import { SeriesPanel } from './components/series/SeriesPanel'
import { clampReference, MAX_COMPARISON, toggleComparisonSample } from './engine/comparison'
import { printLabelsDocument } from './print/printLabelsDocument'

import type { ExperimentContext, ProjectFiring, TriaxialProject } from './types/project'
import type { VertexMaterial } from './types/material'
import type { LibraryMaterial } from './types/libraryMaterial'
import type { FiringResult } from './types/result'
import type { BalancePrecision } from './engine/weighingPrecision'
import { isRepresentable } from './engine/weighingPrecision'
import { listMaterials } from './storage/materialLibraryStorage'
import {
  deleteProject as delProject,
  listProjects,
  loadLastProject,
  loadProject,
  saveProject,
} from './storage/projectStorage'

type Toast = { kind: 'ok' | 'error' | 'warn'; message: string } | null
type PrintMode = 'none' | 'report'
type VertexId = 'A' | 'B' | 'C'

function App() {
  const [project, setProject] = useState<TriaxialProject>(() => createDefaultProject())
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(1)
  const [showGradient, setShowGradient] = useState(true)
  const [mode, setMode] = useState<ViewMode>('formulation')
  const [activeVertexId, setActiveVertexId] = useState<VertexId>('A')
  const [savedTick, setSavedTick] = useState(0)
  const [toast, setToast] = useState<Toast>(null)
  const [printMode, setPrintMode] = useState<PrintMode>('none')
  const [library, setLibrary] = useState<LibraryMaterial[]>([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [comparisonIds, setComparisonIds] = useState<number[]>([])
  const [referenceId, setReferenceId] = useState<number | null>(null)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [projectComparisonOpen, setProjectComparisonOpen] = useState(false)
  const [projectComparisonSeed, setProjectComparisonSeed] = useState<string[]>([])
  const [seriesPanelOpen, setSeriesPanelOpen] = useState(false)

  useEffect(() => {
    listMaterials().then(setLibrary)
  }, [])

  const refreshLibrary = useCallback(() => {
    listMaterials().then(setLibrary)
  }, [])

  // Toggle a sample in the comparison list (capped at MAX_COMPARISON).
  const toggleComparison = useCallback((id: number) => {
    setComparisonIds((prev) => {
      const next = toggleComparisonSample(prev, id)
      setReferenceId((ref) => clampReference(next, ref))
      return next
    })
  }, [])
  const clearComparison = useCallback(() => {
    setComparisonIds([])
    setReferenceId(null)
    setComparisonOpen(false)
  }, [])
  const makeReference = useCallback((id: number) => setReferenceId(id), [])

  useEffect(() => {
    let cancelled = false
    loadLastProject().then((p) => {
      if (cancelled) return
      if (p) setProject(p)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const [savedProjects, setSavedProjects] = useState(() => listProjects())
  useEffect(() => { setSavedProjects(listProjects()) }, [savedTick, project.id])

  const samples = useMemo(() => generateTriaxial(project.step), [project.step])

  // Clamp comparison against the current sample set (e.g. after changing step).
  useEffect(() => {
    const known = new Set(samples.map((s) => s.id))
    setComparisonIds((prev) => {
      const filtered = prev.filter((id) => known.has(id))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [samples])

  useEffect(() => {
    if (selectedId != null && !samples.find((s) => s.id === selectedId)) {
      setSelectedId(samples[0]?.id ?? null)
    }
  }, [samples, selectedId])

  const selected = selectedId != null ? samples.find((s) => s.id === selectedId) ?? null : null

  const preparation = useMemo(
    () => calculatePreparation(samples, project.vertices, project.sampleWeight, project.preparationMargin),
    [samples, project.vertices, project.sampleWeight, project.preparationMargin],
  )
  const recipesActive = hasAnyRecipe(project.vertices)
  const invalidRecipes = useMemo(() => collectInvalidRecipes(project.vertices), [project.vertices])

  const showToast = useCallback((t: Exclude<Toast, null>) => {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (printMode === 'none') return
    const cls = 'is-printing-report'
    document.body.classList.add(cls)
    const t = setTimeout(() => {
      window.print()
    }, 60)
    const onAfter = () => setPrintMode('none')
    window.addEventListener('afterprint', onAfter)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', onAfter)
      document.body.classList.remove(cls)
    }
  }, [printMode])

  const update = (patch: Partial<TriaxialProject>) => {
    setProject((p) => ({ ...p, ...patch, updatedAt: new Date().toISOString() }))
    setDirty(true)
  }
  const updateVertex = (id: VertexId, v: VertexMaterial) => {
    update({ vertices: { ...project.vertices, [id]: { ...v, id } } })
  }
  const updateResult = (sampleId: number, r: FiringResult | undefined) => {
    const results = { ...project.results }
    if (r === undefined) delete results[sampleId]
    else results[sampleId] = r
    update({ results })
  }
  const updateFiring = (firing: ProjectFiring) => {
    update({ firing })
  }
  const updateExperiment = (experiment: ExperimentContext) => {
    update({ experiment })
  }

  const handleSave = () => {
    const res = saveProject(project)
    if (res.ok) {
      setDirty(false)
      setSavedTick((t) => t + 1)
      showToast({ kind: 'ok', message: 'Proyecto guardado.' })
    } else {
      showToast({ kind: 'error', message: 'No se pudo guardar: ' + res.message })
    }
  }
  const handleNew = () => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    setProject(createDefaultProject())
    setDirty(true)
    setSelectedId(1)
    setActiveVertexId('A')
  }
  const handleDuplicate = () => {
    const now = new Date().toISOString()
    setProject({
      ...project,
      id: crypto.randomUUID(),
      name: project.name + ' (copia)',
      createdAt: now,
      updatedAt: now,
    })
    setDirty(true)
  }
  const handleDelete = async () => {
    if (!confirm(`Eliminar "${project.name}"?`)) return
    await delProject(project.id)
    setProject(createDefaultProject())
    setDirty(true)
    setSavedTick((t) => t + 1)
    showToast({ kind: 'ok', message: 'Proyecto eliminado (incluidas fotografías).' })
  }
  const handleOpen = async (id: string) => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return
    const p = await loadProject(id)
    if (p) {
      setProject(p)
      setDirty(false)
      setSelectedId(1)
      setActiveVertexId('A')
    }
  }
  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const p = deserializeProject(text)
      setProject({ ...p, id: crypto.randomUUID() })
      setDirty(true)
      showToast({ kind: 'warn', message: 'Proyecto importado. Las fotografías no se incluyen en JSON.' })
    } catch (err) {
      showToast({ kind: 'error', message: 'Archivo no válido: ' + (err as Error).message })
    }
  }
  const handleExport = () => {
    downloadFile(
      `${slug(project.name)}.monklab.json`,
      serializeProject(project),
      'application/json',
    )
    showToast({ kind: 'warn', message: 'JSON exportado. Las fotografías se conservan localmente.' })
  }
  const handleExportCsv = () => {
    downloadFile(
      `${slug(project.name)}.csv`,
      samplesToCsv(samples, project.vertices, project.sampleWeight, project.results, project.firing, project.balancePrecision, project.experiment),
      'text/csv;charset=utf-8',
    )
  }
  const handleExportSvg = () => {
    const svg = buildStandaloneSvg({
      samples,
      step: project.step,
      vertices: project.vertices,
      results: project.results,
      mode,
      selectedSampleId: null,
      projectName: project.name,
    })
    downloadFile(`${slug(project.name)}.svg`, svg, 'image/svg+xml')
  }

  if (!loaded) return null

  const currentSampleCount = sampleCountForStep(project.step)

  return (
    <>
      <main className="app screen-only">
        <ProjectHeader
          project={project}
          savedProjects={savedProjects}
          dirty={dirty}
          onRename={(name) => update({ name })}
          onNew={handleNew}
          onSave={handleSave}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onOpen={handleOpen}
          onImport={handleImport}
          onExport={handleExport}
          onPrintReport={() => setPrintMode('report')}
          onPrintLabels={() => printLabelsDocument(project.name, samples)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onCompareProjects={() => { setProjectComparisonSeed([]); setProjectComparisonOpen(true) }}
          onOpenSeries={() => setSeriesPanelOpen(true)}
        />

        <section className="controls-bar no-print">
          <div className="control-group">
            <label>División</label>
            <div className="btn-row">
              {ALLOWED_STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip-btn ${project.step === s ? 'is-active' : ''}`}
                  onClick={() => update({ step: s })}
                  aria-pressed={project.step === s}
                >
                  {s}%
                </button>
              ))}
            </div>
            <p className="hint">
              {project.step}% · {currentSampleCount} muestras
              {project.step === 5 && ' · rendimiento reducido'}
            </p>
          </div>

          <div className="control-group">
            <label htmlFor="sw">Peso por muestra</label>
            <div className="input-suffix">
              <input
                id="sw"
                type="number"
                min="0.1"
                step="0.1"
                value={project.sampleWeight}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v > 0) update({ sampleWeight: v })
                }}
              />
              <span>g</span>
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="mg">Margen preparación</label>
            <div className="input-suffix">
              <input
                id="mg"
                type="number"
                min="0"
                step="1"
                value={project.preparationMargin}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v >= 0) update({ preparationMargin: v })
                }}
              />
              <span>%</span>
            </div>
          </div>

          <fieldset className="control-group control-group--balance">
            <legend>Balanza</legend>
            <div className="btn-row" role="radiogroup" aria-label="Precisión de la balanza">
              {([undefined, 1, 0.1, 0.01] as const).map((p) => {
                const isActive = project.balancePrecision === p
                const label = p === undefined ? 'Sin definir' : `${p} g`
                return (
                  <button
                    key={String(p)}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`chip-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => update({ balancePrecision: p as BalancePrecision | undefined })}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {project.balancePrecision !== undefined
              && !isRepresentable(project.sampleWeight, project.balancePrecision) && (
              <p className="hint hint-warn">
                {project.sampleWeight} g no es representable con balanza {project.balancePrecision} g.
              </p>
            )}
          </fieldset>

          <div className="control-group control-group--modes">
            <label>Modo</label>
            <div className="btn-row">
              <button
                type="button"
                className={`chip-btn ${mode === 'formulation' ? 'is-active' : ''}`}
                onClick={() => setMode('formulation')}
                aria-pressed={mode === 'formulation'}
              >Formulación</button>
              <button
                type="button"
                className={`chip-btn ${mode === 'results' ? 'is-active' : ''}`}
                onClick={() => setMode('results')}
                aria-pressed={mode === 'results'}
              >Resultados</button>
            </div>
          </div>

          {mode === 'formulation' && (
            <div className="control-group">
              <label>Vista</label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={showGradient}
                  onChange={(e) => setShowGradient(e.target.checked)}
                />
                <span>Degradado teórico</span>
              </label>
            </div>
          )}

          <div className="control-group control-group--exports">
            <label>Exportar</label>
            <div className="btn-row">
              <button type="button" className="btn-ghost" onClick={handleExportCsv}>CSV</button>
              <button type="button" className="btn-ghost" onClick={handleExportSvg}>SVG</button>
            </div>
          </div>
        </section>

        {invalidRecipes.length > 0 && (
          <div className="global-warn" role="status">
            <strong>Hay recetas incompletas.</strong>
            <span> Las materias primas expandidas no pueden calcularse mientras {invalidRecipes.map((v) => v.vertexId).join(', ')} no sumen 100 %.</span>
          </div>
        )}

        <ExperimentContextPanel
          experiment={project.experiment}
          onChange={updateExperiment}
        />

        {mode === 'results' && (
          <FiringConditionsPanel
            firing={project.firing}
            onChange={updateFiring}
          />
        )}

        {mode === 'results' && (
          <SampleComparisonTray
            comparisonIds={comparisonIds}
            samples={samples}
            onRemove={toggleComparison}
            onClear={clearComparison}
            onOpen={() => setComparisonOpen(true)}
          />
        )}

        <section className="workspace">
          <div className="materials-column no-print" id="vertex-editor-panel">
            <VertexCards
              vertices={project.vertices}
              activeId={activeVertexId}
              onActivate={setActiveVertexId}
            />
            <VertexEditor
              vertex={project.vertices[activeVertexId]}
              library={library}
              onChange={(v) => updateVertex(activeVertexId, v)}
            />
          </div>

          <div className="diagram-stage">
            <div className="diagram-stage-header">
              <span className="stage-eyebrow">DIAGRAMA TRIAXIAL</span>
              <span className="stage-meta">{currentSampleCount} muestras · división {project.step}%</span>
            </div>
            <div className="diagram-section">
              <TriaxialDiagram
                samples={samples}
                step={project.step}
                vertices={project.vertices}
                selectedSampleId={selectedId}
                results={project.results}
                showGradient={showGradient && mode === 'formulation'}
                mode={mode}
                sampleWeight={project.sampleWeight}
                comparisonIds={comparisonIds}
                onSampleSelect={(s) => setSelectedId(s.id)}
              />
            </div>
            {showGradient && mode === 'formulation' && (
              <p className="disclaimer">
                Interpolación visual teórica · no predice el resultado de cocción.
              </p>
            )}
          </div>

          <SampleInspector
            sample={selected}
            samples={samples}
            vertices={project.vertices}
            sampleWeight={project.sampleWeight}
            result={selected ? project.results[selected.id] : undefined}
            results={project.results}
            projectId={project.id}
            projectFiring={project.firing}
            balancePrecision={project.balancePrecision}
            mode={mode}
            comparisonIds={comparisonIds}
            comparisonMax={MAX_COMPARISON}
            onToggleComparison={toggleComparison}
            onResultChange={(r) => selected && updateResult(selected.id, r)}
            onSelect={(id) => setSelectedId(id)}
          />
        </section>

        <PreparationSheet
          totals={preparation}
          vertices={project.vertices}
          hasRecipes={recipesActive}
          balancePrecision={project.balancePrecision}
        />

        <section className="table-section">
          <h2>Muestras</h2>
          <SamplesTable
            samples={samples}
            vertices={project.vertices}
            sampleWeight={project.sampleWeight}
            selectedId={selectedId}
            results={project.results}
            balancePrecision={project.balancePrecision}
            comparisonIds={comparisonIds}
            comparisonMax={MAX_COMPARISON}
            onSelect={(s) => setSelectedId(s.id)}
            onToggleComparison={toggleComparison}
          />
        </section>

        {toast && (
          <div className={`toast toast--${toast.kind}`} role="status">{toast.message}</div>
        )}
      </main>

      {printMode === 'report' && (
        <PrintReport project={project} samples={samples} preparation={preparation} />
      )}

      <LibraryPanel
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onChanged={refreshLibrary}
      />

      {projectComparisonOpen && (
        <ProjectComparisonView
          savedProjects={savedProjects}
          currentProject={project}
          currentDirty={dirty}
          initialSelectedIds={projectComparisonSeed}
          onClose={() => setProjectComparisonOpen(false)}
        />
      )}

      <SeriesPanel
        open={seriesPanelOpen}
        savedProjects={savedProjects}
        currentProject={project}
        currentDirty={dirty}
        onClose={() => setSeriesPanelOpen(false)}
        onOpenProject={(id) => { setSeriesPanelOpen(false); handleOpen(id) }}
        onCompareSelected={(ids) => {
          setProjectComparisonSeed(ids)
          setSeriesPanelOpen(false)
          setProjectComparisonOpen(true)
        }}
      />

      {comparisonOpen && comparisonIds.length >= 2 && (
        <SampleComparisonView
          projectName={project.name}
          projectId={project.id}
          vertices={project.vertices}
          experiment={project.experiment}
          firing={project.firing}
          samples={samples}
          results={project.results}
          comparisonIds={comparisonIds}
          referenceId={referenceId}
          onClose={() => setComparisonOpen(false)}
          onMakeReference={makeReference}
        />
      )}
    </>
  )
}

function slug(name: string): string {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto'
}

export default App
