import { useEffect, useState } from 'react'
import type { VertexMaterial } from '../../types/material'
import type { ProjectFiring } from '../../types/project'
import type { FiringResult, FiringAtmosphere, Surface } from '../../types/result'
import type { TriaxialSample } from '../../types/triaxial'
import {
  atmosphereLabel,
  getEffectiveFiring,
  hasSampleFiringOverride,
} from '../../engine/effectiveFiring'
import { hasMeaningfulResult } from '../../engine/resultStatus'
import { getSampleImage, releaseBlobUrl, urlForBlob } from '../../storage/imageStorage'
import { compositionDelta, compositionDistance } from '../../engine/comparison'

interface Props {
  sample: TriaxialSample
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial }
  result: FiringResult | undefined
  projectId: string
  projectFiring: ProjectFiring | undefined
  reference?: TriaxialSample
  isReference?: boolean
  onMakeReference?: () => void
}

const SURF_LABEL: Record<Surface, string> = {
  mate: 'Mate', satinada: 'Satinada', brillante: 'Brillante', variable: 'Variable',
}
const GLOSS_LABEL: Record<1 | 2 | 3, string> = { 1: 'Mate', 2: 'Satinado', 3: 'Brillante' }
const OPACITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Transparente', 2: 'Semitransparente', 3: 'Opaco' }
const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' }

function pad(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

function levelText(v: number | undefined, map: Record<1 | 2 | 3, string>): string {
  if (v === 1 || v === 2 || v === 3) return map[v]
  return '—'
}

function DeltaChip({ label, value }: { label: string; value: number }) {
  const sign = value === 0 ? '' : value > 0 ? '+' : ''
  const cls = value === 0 ? 'is-zero' : value > 0 ? 'is-plus' : 'is-minus'
  return <span className={`delta-chip delta-chip--${cls}`}>{label} {sign}{value}</span>
}

export function SampleComparisonCard({
  sample, vertices, result, projectId, projectFiring, reference, isReference, onMakeReference,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const cacheKey = `cmp::${projectId}::${sample.id}`

  useEffect(() => {
    let cancelled = false
    if (result?.hasPhoto) {
      getSampleImage(projectId, sample.id).then((blob) => {
        if (cancelled) return
        setPhotoUrl(blob ? urlForBlob(cacheKey, blob) : null)
      })
    } else {
      setPhotoUrl(null)
    }
    return () => {
      cancelled = true
      releaseBlobUrl(cacheKey)
    }
  }, [projectId, sample.id, result?.hasPhoto, cacheKey])

  const registered = hasMeaningfulResult(result)
  const effective = getEffectiveFiring(projectFiring, result)
  const override = hasSampleFiringOverride(result)
  const delta = reference && reference.id !== sample.id ? compositionDelta(sample, reference) : null
  const distance = reference && reference.id !== sample.id ? compositionDistance(sample, reference) : null

  const swatch = result?.observedColor ?? null

  return (
    <article className={`cmp-card ${isReference ? 'is-reference' : ''}`} aria-labelledby={`cmp-card-${sample.id}-title`}>
      <header className="cmp-card-head">
        <div>
          <h3 id={`cmp-card-${sample.id}-title`}>{pad(sample.id)}</h3>
          <p className="cmp-card-pct">{sample.a} / {sample.b} / {sample.c}</p>
        </div>
        <div className="cmp-card-flags">
          {isReference && <span className="cmp-flag cmp-flag--ref">Referencia</span>}
          {registered
            ? <span className="cmp-flag cmp-flag--ok">● Registrado</span>
            : <span className="cmp-flag cmp-flag--pending">○ Sin resultado</span>}
        </div>
      </header>

      <div className="cmp-card-media">
        {photoUrl ? (
          <img src={photoUrl} alt={`Fotografía de ${pad(sample.id)}`} />
        ) : swatch ? (
          <div className="cmp-swatch" style={{ background: swatch }} aria-label={`Color observado ${swatch}`} />
        ) : (
          <div className="cmp-swatch cmp-swatch--empty" aria-label="Sin color registrado" />
        )}
      </div>

      <dl className="cmp-card-facts">
        <div>
          <dt>A · {vertices.A.name || 'A'}</dt>
          <dd>{sample.a}%</dd>
        </div>
        <div>
          <dt>B · {vertices.B.name || 'B'}</dt>
          <dd>{sample.b}%</dd>
        </div>
        <div>
          <dt>C · {vertices.C.name || 'C'}</dt>
          <dd>{sample.c}%</dd>
        </div>
        {delta && (
          <div className="cmp-card-delta">
            <dt>Δ respecto a referencia</dt>
            <dd>
              <DeltaChip label="A" value={delta.a} />
              <DeltaChip label="B" value={delta.b} />
              <DeltaChip label="C" value={delta.c} />
              {distance !== null && <span className="cmp-distance">· distancia {distance}</span>}
            </dd>
          </div>
        )}
        <div>
          <dt>Color</dt>
          <dd>{result?.observedColor ?? 'Sin color'}</dd>
        </div>
        <div>
          <dt>Superficie</dt>
          <dd>{result?.surface ? SURF_LABEL[result.surface as Surface] : '—'}</dd>
        </div>
        <div>
          <dt>Brillo</dt>
          <dd>{levelText(result?.gloss, GLOSS_LABEL)}</dd>
        </div>
        <div>
          <dt>Opacidad</dt>
          <dd>{levelText(result?.opacity, OPACITY_LABEL)}</dd>
        </div>
        <div>
          <dt>Fluidez</dt>
          <dd>{levelText(result?.fluidity, LEVEL_LABEL)}</dd>
        </div>
        {result?.defects && (
          <div>
            <dt>Defectos</dt>
            <dd>{result.defects}</dd>
          </div>
        )}
        {result?.notes && (
          <div>
            <dt>Notas</dt>
            <dd>{result.notes}</dd>
          </div>
        )}
      </dl>

      {override && (
        <p className="cmp-card-override">
          <strong>Condición propia:</strong>{' '}
          {[
            effective.temperature !== undefined ? `${effective.temperature} °C` : null,
            effective.atmosphere ? atmosphereLabel(effective.atmosphere as FiringAtmosphere) : null,
            effective.cone ? `Cono ${effective.cone}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {onMakeReference && !isReference && (
        <button type="button" className="btn-ghost btn-tiny cmp-card-ref-btn" onClick={onMakeReference}>
          Usar como referencia
        </button>
      )}
    </article>
  )
}
