import type { ProjectSummary, TriaxialProject } from '../types/project'
import { deserializeProject, migrateProjectPhotos, serializeProject } from '../engine/serialization'
import { deleteProjectImages } from './imageStorage'

const INDEX_KEY = 'monklab.triaxial.index'
const PROJECT_KEY_PREFIX = 'monklab.triaxial.project.'
const LAST_OPENED_KEY = 'monklab.triaxial.lastOpened'

export type StorageResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: 'quota' | 'security' | 'unavailable' | 'unknown'; message: string }

function classify(err: unknown): Exclude<StorageResult, { ok: true }> {
  if (err instanceof DOMException) {
    if (err.name === 'QuotaExceededError') {
      return { ok: false, reason: 'quota', message: 'Sin espacio en almacenamiento local.' }
    }
    if (err.name === 'SecurityError') {
      return { ok: false, reason: 'security', message: 'Almacenamiento bloqueado por el navegador.' }
    }
  }
  return { ok: false, reason: 'unknown', message: (err as Error)?.message ?? 'Error desconocido' }
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function readIndex(): ProjectSummary[] {
  if (!storageAvailable()) return []
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(list: ProjectSummary[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list))
}

export function listProjects(): ProjectSummary[] {
  return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function loadProject(id: string): Promise<TriaxialProject | null> {
  if (!storageAvailable()) return null
  try {
    const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id)
    if (!raw) return null
    const migrated = await migrateProjectPhotos(raw)
    // Guardar limpio si migró
    try {
      localStorage.setItem(PROJECT_KEY_PREFIX + id, serializeProject(migrated))
    } catch { /* si no cabe, mantener original */ }
    return migrated
  } catch (err) {
    console.error('Error cargando proyecto', err)
    return null
  }
}

export function loadProjectSync(id: string): TriaxialProject | null {
  if (!storageAvailable()) return null
  try {
    const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id)
    if (!raw) return null
    return deserializeProject(raw)
  } catch {
    return null
  }
}

export function saveProject(project: TriaxialProject): StorageResult {
  if (!storageAvailable()) {
    return { ok: false, reason: 'unavailable', message: 'localStorage no disponible.' }
  }
  const updated = { ...project, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(PROJECT_KEY_PREFIX + updated.id, serializeProject(updated))
    const index = readIndex().filter((p) => p.id !== updated.id)
    index.push({
      id: updated.id,
      name: updated.name,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
    writeIndex(index)
    localStorage.setItem(LAST_OPENED_KEY, updated.id)
    return { ok: true, value: undefined }
  } catch (err) {
    return classify(err)
  }
}

export async function deleteProject(id: string): Promise<void> {
  if (!storageAvailable()) return
  try {
    localStorage.removeItem(PROJECT_KEY_PREFIX + id)
    writeIndex(readIndex().filter((p) => p.id !== id))
    if (localStorage.getItem(LAST_OPENED_KEY) === id) {
      localStorage.removeItem(LAST_OPENED_KEY)
    }
  } catch {
    // ignore
  }
  await deleteProjectImages(id)
}

export async function loadLastProject(): Promise<TriaxialProject | null> {
  if (!storageAvailable()) return null
  const id = localStorage.getItem(LAST_OPENED_KEY)
  if (!id) return null
  return loadProject(id)
}

export function setLastOpened(id: string): void {
  if (!storageAvailable()) return
  try {
    localStorage.setItem(LAST_OPENED_KEY, id)
  } catch { /* ignore */ }
}
