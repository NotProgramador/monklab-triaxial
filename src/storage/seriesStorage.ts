import type { ExperimentSeries } from '../types/experimentSeries'
import { openDb, SERIES_STORE, txStore } from './indexedDb'

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function listSeries(): Promise<ExperimentSeries[]> {
  if (!isAvailable()) return []
  try {
    const db = await openDb()
    return await new Promise<ExperimentSeries[]>((resolve, reject) => {
      const t = db.transaction(SERIES_STORE, 'readonly')
      const store = t.objectStore(SERIES_STORE)
      const out: ExperimentSeries[] = []
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as ExperimentSeries)
          cursor.continue()
        } else {
          out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          resolve(out)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function getSeries(id: string): Promise<ExperimentSeries | null> {
  if (!isAvailable()) return null
  try {
    const rec = await txStore<ExperimentSeries | undefined>(SERIES_STORE, 'readonly', (s) => s.get(id))
    return rec ?? null
  } catch {
    return null
  }
}

export async function saveSeries(series: ExperimentSeries): Promise<void> {
  if (!isAvailable()) return
  await txStore(SERIES_STORE, 'readwrite', (s) => s.put(series))
}

export async function deleteSeries(id: string): Promise<void> {
  if (!isAvailable()) return
  try {
    await txStore(SERIES_STORE, 'readwrite', (s) => s.delete(id))
  } catch {
    // ignore
  }
}
