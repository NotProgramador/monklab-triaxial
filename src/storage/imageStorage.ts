import { IMAGES_STORE as STORE, openDb, txStore } from './indexedDb'

function key(projectId: string, sampleId: number): string {
  return `${projectId}::${sampleId}`
}

interface ImageRecord {
  key: string
  projectId: string
  sampleId: number
  blob: Blob
  mimeType: string
  updatedAt: string
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return txStore(STORE, mode, fn)
}

export async function saveSampleImage(
  projectId: string,
  sampleId: number,
  file: Blob,
): Promise<void> {
  const record: ImageRecord = {
    key: key(projectId, sampleId),
    projectId,
    sampleId,
    blob: file,
    mimeType: file.type || 'image/jpeg',
    updatedAt: new Date().toISOString(),
  }
  await tx('readwrite', (s) => s.put(record))
}

export async function getSampleImage(projectId: string, sampleId: number): Promise<Blob | null> {
  try {
    const rec = await tx<ImageRecord | undefined>('readonly', (s) => s.get(key(projectId, sampleId)))
    return rec?.blob ?? null
  } catch {
    return null
  }
}

export async function deleteSampleImage(projectId: string, sampleId: number): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(key(projectId, sampleId)))
  } catch {
    // ignore
  }
}

export async function deleteProjectImages(projectId: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      const store = t.objectStore(STORE)
      const idx = store.index('projectId')
      const req = idx.openCursor(IDBKeyRange.only(projectId))
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
      t.onerror = () => reject(t.error)
    })
  } catch {
    // ignore
  }
}

export async function resizeImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const { width, height } = bitmap
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      quality,
    )
  })
}

let cachedUrl: { key: string; url: string } | null = null
export function urlForBlob(k: string, blob: Blob): string {
  if (cachedUrl && cachedUrl.key === k) return cachedUrl.url
  if (cachedUrl) URL.revokeObjectURL(cachedUrl.url)
  const url = URL.createObjectURL(blob)
  cachedUrl = { key: k, url }
  return url
}
export function releaseBlobUrl(k: string): void {
  if (cachedUrl && cachedUrl.key === k) {
    URL.revokeObjectURL(cachedUrl.url)
    cachedUrl = null
  }
}
