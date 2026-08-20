import type { LibraryMaterial } from '../types/libraryMaterial'
import { isLibraryCategory } from '../types/libraryMaterial'
import { normalizeMaterialName } from './materialIdentity'

export const LIBRARY_EXPORT_KIND = 'material-library'
export const LIBRARY_EXPORT_VERSION = 1

export interface LibraryExportFile {
  app: 'MonkLab - Triaxial'
  kind: typeof LIBRARY_EXPORT_KIND
  version: number
  exportedAt: string
  materials: LibraryMaterial[]
}

export function serializeLibrary(materials: LibraryMaterial[]): string {
  const sorted = [...materials].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const payload: LibraryExportFile = {
    app: 'MonkLab - Triaxial',
    kind: LIBRARY_EXPORT_KIND,
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    materials: sorted,
  }
  return JSON.stringify(payload, null, 2)
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export class LibraryImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LibraryImportError'
  }
}

/**
 * Parses and validates a library JSON payload. Throws LibraryImportError on
 * structural problems; returns clean LibraryMaterial[] otherwise. Never
 * imports partial data from a malformed file.
 */
export function parseLibraryFile(raw: string | unknown): LibraryMaterial[] {
  let data: unknown
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new LibraryImportError('El archivo no es JSON válido.')
    }
  } else {
    data = raw
  }
  if (!isRecord(data)) throw new LibraryImportError('Formato desconocido.')
  if (data.kind !== LIBRARY_EXPORT_KIND) {
    throw new LibraryImportError('Este archivo no es una biblioteca de MonkLab.')
  }
  const version = typeof data.version === 'number' ? data.version : 0
  if (version < 1 || version > LIBRARY_EXPORT_VERSION) {
    throw new LibraryImportError(`Versión no soportada (${String(version)}).`)
  }
  const list = data.materials
  if (!Array.isArray(list)) {
    throw new LibraryImportError('El archivo no contiene un arreglo de materiales.')
  }
  const out: LibraryMaterial[] = []
  for (let i = 0; i < list.length; i++) {
    const m = list[i]
    if (!isRecord(m)) throw new LibraryImportError(`Material ${i + 1} inválido.`)
    const name = typeof m.name === 'string' ? m.name.trim() : ''
    if (!name) throw new LibraryImportError(`Material ${i + 1} sin nombre.`)
    if (!isLibraryCategory(m.category)) {
      throw new LibraryImportError(`Material "${name}" tiene categoría inválida.`)
    }
    const now = new Date().toISOString()
    out.push({
      id: typeof m.id === 'string' && m.id ? m.id : crypto.randomUUID(),
      name,
      category: m.category,
      formula: typeof m.formula === 'string' && m.formula ? m.formula : undefined,
      notes: typeof m.notes === 'string' && m.notes ? m.notes : undefined,
      createdAt: typeof m.createdAt === 'string' ? m.createdAt : now,
      updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : now,
    })
  }
  return out
}

export interface ImportPlanEntry {
  incoming: LibraryMaterial
  status: 'new' | 'duplicate-name' | 'identical'
  duplicateOf?: LibraryMaterial
}

export interface ImportPlan {
  entries: ImportPlanEntry[]
  newCount: number
  duplicateCount: number
  identicalCount: number
}

function materialsEqual(a: LibraryMaterial, b: LibraryMaterial): boolean {
  return (
    a.name === b.name &&
    a.category === b.category &&
    (a.formula ?? '') === (b.formula ?? '') &&
    (a.notes ?? '') === (b.notes ?? '')
  )
}

/**
 * Classifies incoming materials against the existing library.
 * "identical" = same id AND same content (safe to skip).
 * "duplicate-name" = normalized name already exists (regardless of id).
 * "new" = neither.
 */
export function planImport(
  incoming: LibraryMaterial[],
  existing: LibraryMaterial[],
): ImportPlan {
  const byId = new Map<string, LibraryMaterial>()
  const byNormName = new Map<string, LibraryMaterial>()
  for (const m of existing) {
    byId.set(m.id, m)
    byNormName.set(normalizeMaterialName(m.name), m)
  }
  const entries: ImportPlanEntry[] = incoming.map((m) => {
    const idHit = byId.get(m.id)
    if (idHit && materialsEqual(idHit, m)) {
      return { incoming: m, status: 'identical', duplicateOf: idHit }
    }
    const nameHit = byNormName.get(normalizeMaterialName(m.name))
    if (nameHit) {
      return { incoming: m, status: 'duplicate-name', duplicateOf: nameHit }
    }
    return { incoming: m, status: 'new' }
  })
  return {
    entries,
    newCount: entries.filter((e) => e.status === 'new').length,
    duplicateCount: entries.filter((e) => e.status === 'duplicate-name').length,
    identicalCount: entries.filter((e) => e.status === 'identical').length,
  }
}

/**
 * Applies the plan: always keeps existing materials untouched.
 * - `onlyNew=true`: skip both duplicate-name and identical.
 * - `onlyNew=false`: also import duplicate-name entries with a fresh UUID
 *   (never overwrite existing) so both remain independently addressable.
 * "identical" entries are always skipped.
 */
export function applyImportPlan(
  plan: ImportPlan,
  existing: LibraryMaterial[],
  onlyNew: boolean,
): LibraryMaterial[] {
  const usedIds = new Set(existing.map((m) => m.id))
  const additions: LibraryMaterial[] = []
  for (const e of plan.entries) {
    if (e.status === 'identical') continue
    if (e.status === 'duplicate-name' && onlyNew) continue
    let id = e.incoming.id
    if (usedIds.has(id)) id = crypto.randomUUID()
    usedIds.add(id)
    additions.push({ ...e.incoming, id })
  }
  return [...existing, ...additions]
}
