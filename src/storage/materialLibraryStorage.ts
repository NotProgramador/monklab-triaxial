import type { LibraryMaterial } from '../types/libraryMaterial'
import { MATERIALS_STORE, openDb, txStore } from './indexedDb'

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function listMaterials(): Promise<LibraryMaterial[]> {
  if (!isAvailable()) return []
  try {
    const db = await openDb()
    return await new Promise<LibraryMaterial[]>((resolve, reject) => {
      const t = db.transaction(MATERIALS_STORE, 'readonly')
      const store = t.objectStore(MATERIALS_STORE)
      const out: LibraryMaterial[] = []
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as LibraryMaterial)
          cursor.continue()
        } else {
          out.sort((a, b) => a.name.localeCompare(b.name, 'es'))
          resolve(out)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function getMaterial(id: string): Promise<LibraryMaterial | null> {
  if (!isAvailable()) return null
  try {
    const rec = await txStore<LibraryMaterial | undefined>(MATERIALS_STORE, 'readonly', (s) => s.get(id))
    return rec ?? null
  } catch {
    return null
  }
}

export async function saveMaterial(material: LibraryMaterial): Promise<void> {
  if (!isAvailable()) return
  await txStore(MATERIALS_STORE, 'readwrite', (s) => s.put(material))
}

export async function deleteMaterial(id: string): Promise<void> {
  if (!isAvailable()) return
  try {
    await txStore(MATERIALS_STORE, 'readwrite', (s) => s.delete(id))
  } catch {
    // ignore
  }
}
