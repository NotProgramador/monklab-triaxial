import { useEffect, useRef, useState } from 'react'
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

// gloss/opacity/fluidity son numéricos en el tipo; mapeamos a 3 niveles
// semánticos (1=bajo, 2=medio, 3=alto) para una UI limpia sin migrar tipos.
const LEVELS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Bajo' },
  { value: 2, label: 'Medio' },
  { value: 3, label: 'Alto' },
]

const GLOSS_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Mate',
  2: 'Satinado',
  3: 'Brillante',
}
const OPACITY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Transparente',
  2: 'Semitransparente',
  3: 'Opaco',
}

function toLevel(n: number | undefined): 1 | 2 | 3 | '' {
  if (n === 1 || n === 2 || n === 3) return n
  return ''
}

export function ResultEditor({ projectId, sampleId, result, onChange }: Props) {
  const r = result ?? {}
  const patch = (p: Partial<FiringResult>) => onChange({ ...r, ...p })
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
      <div className="result-group">
        <h4 className="result-group-title">Color / apariencia</h4>
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
            <span>Hex</span>
            <input
              type="text"
              value={r.observedColor ?? ''}
              placeholder="#75696C"
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === '') patch({ observedColor: undefined })
                else if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) patch({ observedColor: v })
                else patch({ observedColor: v })
              }}
            />
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

        <div className="level-row">
          <div className="field">
            <span>Brillo</span>
            <div className="chip-picker" role="radiogroup" aria-label="Brillo">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  role="radio"
                  aria-checked={toLevel(r.gloss) === lv.value}
                  className={`chip-btn ${toLevel(r.gloss) === lv.value ? 'is-active' : ''}`}
                  onClick={() => patch({ gloss: toLevel(r.gloss) === lv.value ? undefined : lv.value })}
                >
                  {GLOSS_LABELS[lv.value]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Opacidad</span>
            <div className="chip-picker" role="radiogroup" aria-label="Opacidad">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  role="radio"
                  aria-checked={toLevel(r.opacity) === lv.value}
                  className={`chip-btn ${toLevel(r.opacity) === lv.value ? 'is-active' : ''}`}
                  onClick={() => patch({ opacity: toLevel(r.opacity) === lv.value ? undefined : lv.value })}
                >
                  {OPACITY_LABELS[lv.value]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="result-group">
        <h4 className="result-group-title">Cocción</h4>
        <div className="field-row">
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
          <label className="field">
            <span>Cono</span>
            <input
              type="text"
              value={r.cone ?? ''}
              onChange={(e) => patch({ cone: e.target.value || undefined })}
            />
          </label>
        </div>
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

      <div className="result-group">
        <h4 className="result-group-title">Comportamiento</h4>
        <div className="field">
          <span>Fluidez</span>
          <div className="chip-picker" role="radiogroup" aria-label="Fluidez">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                type="button"
                role="radio"
                aria-checked={toLevel(r.fluidity) === lv.value}
                className={`chip-btn ${toLevel(r.fluidity) === lv.value ? 'is-active' : ''}`}
                onClick={() => patch({ fluidity: toLevel(r.fluidity) === lv.value ? undefined : lv.value })}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Defectos</span>
          <input
            type="text"
            value={r.defects ?? ''}
            onChange={(e) => patch({ defects: e.target.value || undefined })}
          />
        </label>
      </div>

      <div className="result-group">
        <h4 className="result-group-title">Documentación</h4>
        <div className="field">
          <span>Fotografía</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              handlePhoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {!photoUrl && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              Añadir fotografía
            </button>
          )}
          {photoUrl && (
            <div className="photo-preview">
              <img src={photoUrl} alt="Resultado" />
              <div className="photo-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Reemplazar
                </button>
                <button type="button" className="btn-ghost btn-danger" onClick={removePhoto}>
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
        <label className="field">
          <span>Notas</span>
          <textarea
            rows={2}
            value={r.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value || undefined })}
          />
        </label>
      </div>

      {result && (
        <button type="button" className="btn-ghost btn-danger" onClick={() => onChange(undefined)}>
          Eliminar resultado
        </button>
      )}
    </div>
  )
}
