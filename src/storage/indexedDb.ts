/**
 * Shared IndexedDB opener for MonkLab-Triaxial.
 *
 * Single DB `monklab-triaxial` with two stores:
 *   - `images`    (v1): keyPath `key`, index by `projectId`.
 *   - `materials` (v2): keyPath `id`.
 *
 * Version bumps must add stores idempotently — earlier version installs
 * created only the stores that existed at their version.
 */

export const DB_NAME = 'monklab-triaxial'
export const DB_VERSION = 2

export const IMAGES_STORE = 'images'
export const MATERIALS_STORE = 'materials'

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: 'key' })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!db.objectStoreNames.contains(MATERIALS_STORE)) {
        db.createObjectStore(MATERIALS_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB error'))
  })
}

export async function txStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode)
    const store = t.objectStore(storeName)
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    t.onerror = () => reject(t.error)
  })
}
