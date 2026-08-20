import { useEffect, useMemo, useRef, useState } from 'react'
import type { LibraryCategory, LibraryMaterial } from '../../types/libraryMaterial'
import { CATEGORY_LABEL, LIBRARY_CATEGORIES } from '../../types/libraryMaterial'
import { normalizeMaterialName } from '../../engine/materialIdentity'
import {
  applyImportPlan,
  LibraryImportError,
  parseLibraryFile,
  planImport,
  serializeLibrary,
  type ImportPlan,
} from '../../engine/materialLibraryIO'
import { PRESET_MEXICO_CDMX } from '../../data/materialPresets'
import { downloadFile } from '../../engine/exportCsv'
import {
  deleteMaterial as deleteMat,
  listMaterials,
  saveMaterial,
} from '../../storage/materialLibraryStorage'

interface Props {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

interface DraftMaterial {
  id?: string
  name: string
  category: LibraryCategory
  formula: string
  notes: string
}

function emptyDraft(): DraftMaterial {
  return { name: '', category: 'otro', formula: '', notes: '' }
}

interface PendingImport {
  plan: ImportPlan
  incoming: LibraryMaterial[]
}

interface PresetPreview {
  incoming: LibraryMaterial[]
  plan: ImportPlan
}

export function LibraryPanel({ open, onClose, onChanged }: Props) {
  const [materials, setMaterials] = useState<LibraryMaterial[]>([])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<DraftMaterial | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [presetPreview, setPresetPreview] = useState<PresetPreview | null>(null)
  const [ioError, setIoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    listMaterials().then(setMaterials)
  }, [open])

  const filtered = useMemo(() => {
    const q = normalizeMaterialName(query)
    if (!q) return materials
    return materials.filter((m) => normalizeMaterialName(m.name).includes(q))
  }, [materials, query])

  if (!open) return null

  const startCreate = () => { setDraft(emptyDraft()); setError(null) }
  const startEdit = (m: LibraryMaterial) => {
    setDraft({ id: m.id, name: m.name, category: m.category, formula: m.formula ?? '', notes: m.notes ?? '' })
    setError(null)
  }
  const cancelEdit = () => { setDraft(null); setError(null) }

  const commit = async (force = false) => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) { setError('El nombre es obligatorio.'); return }
    if (!force) {
      const conflict = materials.find(
        (m) => m.id !== draft.id && normalizeMaterialName(m.name) === normalizeMaterialName(name),
      )
      if (conflict) {
        setError(`Ya existe un material llamado ${conflict.name}. Guarda de nuevo para continuar.`)
        return
      }
    }
    const now = new Date().toISOString()
    const material: LibraryMaterial = {
      id: draft.id ?? crypto.randomUUID(),
      name,
      category: draft.category,
      formula: draft.formula.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      createdAt: draft.id
        ? (materials.find((m) => m.id === draft.id)?.createdAt ?? now)
        : now,
      updatedAt: now,
    }
    await saveMaterial(material)
    const next = await listMaterials()
    setMaterials(next)
    setDraft(null)
    setError(null)
    onChanged()
  }

  const handleExport = () => {
    const raw = serializeLibrary(materials)
    const today = new Date().toISOString().slice(0, 10)
    downloadFile(`monklab-materiales-${today}.json`, raw, 'application/json')
  }

  const handleImportClick = () => {
    setIoError(null)
    fileInputRef.current?.click()
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    setIoError(null)
    try {
      const text = await file.text()
      const incoming = parseLibraryFile(text)
      const plan = planImport(incoming, materials)
      if (plan.newCount === 0 && plan.duplicateCount === 0) {
        setIoError('El archivo no contiene materiales nuevos.')
        return
      }
      setPendingImport({ plan, incoming })
    } catch (err) {
      if (err instanceof LibraryImportError) setIoError(err.message)
      else setIoError('No se pudo leer el archivo.')
    }
  }

  const commitImport = async (onlyNew: boolean) => {
    if (!pendingImport) return
    const next = applyImportPlan(pendingImport.plan, materials, onlyNew)
    // Save only the added materials
    const existingIds = new Set(materials.map((m) => m.id))
    const additions = next.filter((m) => !existingIds.has(m.id))
    for (const m of additions) await saveMaterial(m)
    setPendingImport(null)
    setMaterials(await listMaterials())
    onChanged()
  }

  const openPresetPreview = () => {
    const nowIso = new Date().toISOString()
    const incoming: LibraryMaterial[] = PRESET_MEXICO_CDMX.materials.map((p) => ({
      id: crypto.randomUUID(),
      name: p.name,
      category: p.category,
      formula: p.formula,
      createdAt: nowIso,
      updatedAt: nowIso,
    }))
    const plan = planImport(incoming, materials)
    setPresetPreview({ incoming, plan })
  }

  const commitPreset = async () => {
    if (!presetPreview) return
    // Always "only new" for preset — never duplicate by design.
    const next = applyImportPlan(presetPreview.plan, materials, true)
    const existingIds = new Set(materials.map((m) => m.id))
    const additions = next.filter((m) => !existingIds.has(m.id))
    for (const m of additions) await saveMaterial(m)
    setPresetPreview(null)
    setMaterials(await listMaterials())
    onChanged()
  }

  const removeMaterial = async (m: LibraryMaterial) => {
    if (!confirm(`Eliminar "${m.name}" de la biblioteca? Las recetas conservarán el nombre snapshot.`)) return
    await deleteMat(m.id)
    setMaterials(await listMaterials())
    onChanged()
  }

  return (
    <div className="library-overlay" role="dialog" aria-modal="true" aria-label="Biblioteca de materiales">
      <div className="library-panel">
        <header className="library-panel-head">
          <div>
            <p className="inspector-eyebrow">BIBLIOTECA</p>
            <h2>Materiales</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="library-toolbar">
          <input
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="btn-ghost" onClick={openPresetPreview}>+ Preset</button>
          <button type="button" className="btn-ghost" onClick={handleImportClick}>Importar JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              handleImportFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={handleExport}
            disabled={materials.length === 0}
          >Exportar JSON</button>
          <button type="button" className="btn" onClick={startCreate}>+ Nuevo material</button>
        </div>

        {ioError && <p className="library-error">{ioError}</p>}

        {materials.length === 0 && !draft && !pendingImport && !presetPreview && (
          <div className="library-empty">
            <p>Tu biblioteca está vacía.</p>
            <div className="library-empty-actions">
              <button type="button" className="btn" onClick={openPresetPreview}>Añadir preset México/CDMX</button>
              <button type="button" className="btn-ghost" onClick={startCreate}>Crear material</button>
              <button type="button" className="btn-ghost" onClick={handleImportClick}>Importar JSON</button>
            </div>
          </div>
        )}

        {presetPreview && (
          <div className="library-editor">
            <h3>{PRESET_MEXICO_CDMX.label}</h3>
            <p className="hint">{PRESET_MEXICO_CDMX.description}</p>
            <p>
              <strong>{presetPreview.plan.newCount}</strong> materiales nuevos
              {presetPreview.plan.duplicateCount > 0
                ? ` · ${presetPreview.plan.duplicateCount} se omitirán por nombre existente`
                : ''}.
            </p>
            <div className="library-editor-actions">
              <button type="button" className="btn-ghost" onClick={() => setPresetPreview(null)}>Cancelar</button>
              <button
                type="button"
                className="btn"
                onClick={commitPreset}
                disabled={presetPreview.plan.newCount === 0}
              >Añadir</button>
            </div>
          </div>
        )}

        {pendingImport && (
          <div className="library-editor">
            <h3>Importar biblioteca</h3>
            <p>
              <strong>{pendingImport.plan.newCount}</strong> materiales nuevos
              {pendingImport.plan.duplicateCount > 0
                ? ` · ${pendingImport.plan.duplicateCount} posibles duplicados`
                : ''}
              {pendingImport.plan.identicalCount > 0
                ? ` · ${pendingImport.plan.identicalCount} idénticos (se omitirán)`
                : ''}.
            </p>
            <div className="library-editor-actions">
              <button type="button" className="btn-ghost" onClick={() => setPendingImport(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => commitImport(true)}
                disabled={pendingImport.plan.newCount === 0}
              >Importar sólo nuevos</button>
              <button type="button" className="btn" onClick={() => commitImport(false)}>Importar todos</button>
            </div>
          </div>
        )}

        <div className="library-list">
          {filtered.length === 0 && (
            <p className="hint">{materials.length === 0 ? 'La biblioteca está vacía.' : 'Sin resultados.'}</p>
          )}
          {filtered.map((m) => (
            <div className="library-row" key={m.id}>
              <div className="library-row-main">
                <span className="library-row-name">{m.name}</span>
                <span className="library-row-cat">{CATEGORY_LABEL[m.category]}</span>
                {m.formula && <span className="library-row-formula">{m.formula}</span>}
              </div>
              <div className="library-row-actions">
                <button type="button" className="btn-ghost btn-tiny" onClick={() => startEdit(m)}>Editar</button>
                <button type="button" className="btn-ghost btn-tiny btn-danger" onClick={() => removeMaterial(m)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>

        {draft && (
          <div className="library-editor">
            <h3>{draft.id ? 'Editar material' : 'Nuevo material'}</h3>
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                value={draft.name}
                autoFocus
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Categoría</span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as LibraryCategory })}
                >
                  {LIBRARY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fórmula</span>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={draft.formula}
                  onChange={(e) => setDraft({ ...draft, formula: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Notas</span>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </label>
            {error && <p className="library-error">{error}</p>}
            <div className="library-editor-actions">
              <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancelar</button>
              <button type="button" className="btn" onClick={() => commit(false)}>Guardar</button>
              {error && (
                <button type="button" className="btn-ghost" onClick={() => commit(true)}>Guardar de todas formas</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
