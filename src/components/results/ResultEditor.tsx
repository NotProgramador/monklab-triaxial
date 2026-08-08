import { useEffect, useState } from 'react'
import type { FiringAtmosphere, FiringResult, Surface } from '../../types/result'
import {
  deleteSampleImage, getSampleImage, resizeImage, saveSampleImage,
  urlForBlob, releaseBlobUrl,
} from '../../storage/imageStorage'

interface Props {
  projectId: string
  sampleId: number
  result: FiringResult | undefined
  onChange: (r: FiringResult | undefined) => void
}

const ATMOS: { value: FiringAtmosphere; label: string }[] = [
  { value: 'oxidacion', label: 'Oxidación' },
  { value: 'reduccion', label: 'Reducción' },
  { value: 'neutra', label: 'Neutra' },
  { value: 'otro', label: 'Otro' },
]

const SURF: { value: Surface; label: string }[] = [
  { value: 'mate', label: 'Mate' },
  { value: 'satinada', label: 'Satinada' },
  { value: 'brillante', label: 'Brillante' },
  { value: 'variable', label: 'Variable' },
]

export function ResultEditor({ projectId, sampleId, result, onChange }: Props) {
  const r = result ?? {}
  const patch = (p: Partial<FiringResult>) => onChange({ ...r, ...p })
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const cacheKey = `${projectId}::${sampleId}`

  useEffect(() => {
    let cancelled = false
    if (r.hasPhoto) {
      getSampleImage(projectId, sampleId).then((blob) => {
        if (cancelled) return
        if (blob) setPhotoUrl(urlForBlob(cacheKey, blob))
        else setPhotoUrl(null)
      })
    } else {
      setPhotoUrl(null)
    }
    return () => {
      cancelled = true
      releaseBlobUrl(cacheKey)
    }
  }, [projectId, sampleId, r.hasPhoto, cacheKey])

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const resized = await resizeImage(file, 1600, 0.85)
      await saveSampleImage(projectId, sampleId, resized)
      patch({ hasPhoto: true })
      setPhotoUrl(urlForBlob(cacheKey, resized))
    } catch (err) {
      alert('No se pudo guardar la foto: ' + (err as Error).message)
    }
  }

  const removePhoto = async () => {
    await deleteSampleImage(projectId, sampleId)
    releaseBlobUrl(cacheKey)
    setPhotoUrl(null)
    patch({ hasPhoto: undefined })
  }

  return (
    <div className="result-editor">
      <div className="field-row">
        <label className="field field-color">
          <span>Color observado</span>
          <input
            type="color"
            value={r.observedColor ?? '#cccccc'}
            onChange={(e) => patch({ observedColor: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Temperatura °C</span>
          <input
            type="number"
            value={r.temperature ?? ''}
            onChange={(e) => {
              const v = Number(e.target.value)
              patch({ temperature: e.target.value === '' ? undefined : v })
            }}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Cono</span>
          <input
            type="text"
            value={r.cone ?? ''}
            onChange={(e) => patch({ cone: e.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span>Atmósfera</span>
          <select
            value={r.atmosphere ?? ''}
            onChange={(e) => patch({ atmosphere: (e.target.value || undefined) as FiringAtmosphere | undefined })}
          >
            <option value="">—</option>
            {ATMOS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Superficie</span>
        <select
          value={r.surface ?? ''}
          onChange={(e) => patch({ surface: (e.target.value || undefined) as Surface | undefined })}
        >
          <option value="">—</option>
          {SURF.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Defectos</span>
        <input
          type="text"
          value={r.defects ?? ''}
          onChange={(e) => patch({ defects: e.target.value || undefined })}
        />
      </label>

      <label className="field">
        <span>Notas</span>
        <textarea
          rows={2}
          value={r.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value || undefined })}
        />
      </label>

      <label className="field">
        <span>Fotografía</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handlePhoto(e.target.files?.[0])}
        />
      </label>

      {photoUrl && (
        <div className="photo-preview">
          <img src={photoUrl} alt="Resultado" />
          <button type="button" className="btn-ghost btn-danger" onClick={removePhoto}>
            Eliminar foto
          </button>
        </div>
      )}

      {result && (
        <button type="button" className="btn-ghost btn-danger" onClick={() => onChange(undefined)}>
          Eliminar resultado
        </button>
      )}
    </div>
  )
}
