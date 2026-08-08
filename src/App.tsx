import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

import { generateTriaxial, sampleCountForStep, ALLOWED_STEPS } from './engine/generateTriaxial'
import { calculatePreparation } from './engine/calculatePreparation'
import { hasAnyRecipe } from './engine/expandRecipe'
import { createDefaultProject } from './engine/defaults'
import { deserializeProject, serializeProject } from './engine/serialization'
import { downloadFile, samplesToCsv } from './engine/exportCsv'
import { buildStandaloneSvg } from './engine/exportSvg'

import { TriaxialDiagram, type ViewMode } from './components/triangle/TriaxialDiagram'
import { SampleInspector } from './components/samples/SampleInspector'
import { SamplesTable } from './components/samples/SamplesTable'
import { PreparationSheet } from './components/samples/PreparationSheet'
import { VertexEditor } from './components/materials/VertexEditor'
import { ProjectHeader } from './components/project/ProjectHeader'
import { PrintReport } from './components/print/PrintReport'
import { printLabelsDocument } from './print/printLabelsDocument'

import type { TriaxialProject } from './types/project'
import type { VertexMaterial } from './types/material'
import type { FiringResult } from './types/result'
import {
  deleteProject as delProject,
  listProjects,
  loadLastProject,
  loadProject,
  saveProject,
} from './storage/projectStorage'

type Toast = { kind: 'ok' | 'error' | 'warn'; message: string } | null
type PrintMode = 'none' | 'report'

function App() {
  const [project, setProject] = useState<TriaxialProject>(() => createDefaultProject())
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(1)
  const [showGradient, setShowGradient] = useState(true)
  const [mode, setMode] = useState<ViewMode>('formulation')
  const [savedTick, setSavedTick] = useState(0)
  const [toast, setToast] = useState<Toast>(null)
  const [printMode, setPrintMode] = useState<PrintMode>('none')

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
  const updateVertex = (id: 'A' | 'B' | 'C', v: VertexMaterial) => {
    update({ vertices: { ...project.vertices, [id]: { ...v, id } } })
  }
  const updateResult = (sampleId: number, r: FiringResult | undefined) => {
    const results = { ...project.results }
    if (r === undefined) delete results[sampleId]
    else results[sampleId] = r
    update({ results })
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
      samplesToCsv(samples, project.vertices, project.sampleWeight, project.results),
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
                >
                  {s}% · {sampleCountForStep(s)}
                </button>
              ))}
            </div>
            {project.step === 5 && (
              <p className="hint hint-warn">Se generarán 231 muestras.</p>
            )}
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
            <label htmlFor="mg">Margen de preparación</label>
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

          <div className="control-group">
            <label>Vista</label>
            <div className="btn-row">
              <button
                type="button"
                className={`chip-btn ${mode === 'formulation' ? 'is-active' : ''}`}
                onClick={() => setMode('formulation')}
              >Formulación</button>
              <button
                type="button"
                className={`chip-btn ${mode === 'results' ? 'is-active' : ''}`}
                onClick={() => setMode('results')}
              >Resultados</button>
            </div>
          </div>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={showGradient}
                onChange={(e) => setShowGradient(e.target.checked)}
              />
              <span> Degradado teórico</span>
            </label>
          </div>

          <div className="control-group" style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn-ghost" onClick={handleExportCsv}>CSV</button>
            <button type="button" className="btn-ghost" onClick={handleExportSvg}>SVG</button>
          </div>
        </section>

        <section className="workspace">
          <div className="vertices-column no-print">
            <VertexEditor vertex={project.vertices.A} onChange={(v) => updateVertex('A', v)} />
            <VertexEditor vertex={project.vertices.B} onChange={(v) => updateVertex('B', v)} />
            <VertexEditor vertex={project.vertices.C} onChange={(v) => updateVertex('C', v)} />
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
              onSampleSelect={(s) => setSelectedId(s.id)}
            />
            {showGradient && mode === 'formulation' && (
              <p className="disclaimer">
                Vista cromática aproximada. El degradado representa una interpolación
                visual de los colores de referencia. No predice el color real después
                de la cocción.
              </p>
            )}
          </div>

          <SampleInspector
            sample={selected}
            vertices={project.vertices}
            sampleWeight={project.sampleWeight}
            result={selected ? project.results[selected.id] : undefined}
            projectId={project.id}
            onResultChange={(r) => selected && updateResult(selected.id, r)}
          />
        </section>

        <PreparationSheet
          totals={preparation}
          vertices={project.vertices}
          hasRecipes={recipesActive}
        />

        <section className="table-section">
          <h2>Muestras</h2>
          <SamplesTable
            samples={samples}
            vertices={project.vertices}
            sampleWeight={project.sampleWeight}
            selectedId={selectedId}
            results={project.results}
            onSelect={(s) => setSelectedId(s.id)}
          />
        </section>

        {toast && (
          <div className={`toast toast--${toast.kind}`} role="status">{toast.message}</div>
        )}
      </main>

      {printMode === 'report' && (
        <PrintReport project={project} samples={samples} preparation={preparation} />
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
