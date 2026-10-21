import { useEffect, useRef } from 'react'

export type NewProjectKind = 'monoaxial' | 'triaxial'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (kind: NewProjectKind) => void
}

/**
 * Project-type picker: Formulación única (monoaxial), Biaxial (disabled —
 * próximamente) and Triaxial. Rendered as a dialog with Escape-to-close so
 * the user can cancel without creating anything. Mode selection drives
 * `createMonoaxialProject` / `createDefaultProject` in `App.tsx`.
 */
export function NewProjectDialog({ open, onClose, onPick }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="cmp-overlay" role="presentation" onClick={onClose}>
      <div
        className="cmp-dialog new-project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cmp-dialog-head">
          <div>
            <p className="inspector-eyebrow">NUEVO PROYECTO</p>
            <h2 id="new-project-title">Elige el tipo de experimento</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="new-project-grid">
          <button
            type="button"
            className="new-project-card"
            onClick={() => onPick('monoaxial')}
          >
            <span className="np-eyebrow">Monoaxial</span>
            <span className="np-title">Formulación única</span>
            <span className="np-desc">
              Una receta para esmalte, engobe, pasta o mezcla individual.
            </span>
          </button>

          <button
            type="button"
            className="new-project-card is-disabled"
            disabled
            aria-disabled="true"
            title="Disponible en una fase posterior"
          >
            <span className="np-eyebrow">Biaxial · Próximamente</span>
            <span className="np-title">Mezcla lineal A ↔ B</span>
            <span className="np-desc">
              Barrido entre dos materiales. Disponible en una fase posterior.
            </span>
          </button>

          <button
            type="button"
            className="new-project-card"
            onClick={() => onPick('triaxial')}
          >
            <span className="np-eyebrow">Triaxial</span>
            <span className="np-title">Mezcla triangular A / B / C</span>
            <span className="np-desc">
              Diagrama triangular con 21, 15, 66 o 231 muestras.
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
