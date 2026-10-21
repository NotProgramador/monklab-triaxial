import { useMemo, useState } from 'react'
import type { FormulaComponent } from '../../types/material'
import type { ExperimentContext, ExperimentProject, ProjectFiring } from '../../types/project'
import type { FiringResult } from '../../types/result'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import type { BalancePrecision } from '../../engine/weighingPrecision'
import { isRepresentable } from '../../engine/weighingPrecision'
import { calculateMonoPreparation } from '../../engine/calculateMonoPreparation'
import { MONOAXIAL_SAMPLE_ID } from '../../engine/generateMonoaxial'
import { FormulaComponentEditor } from '../materials/FormulaComponentEditor'
import { ExperimentContextPanel } from '../experiment/ExperimentContextPanel'
import { FiringConditionsPanel } from '../firing/FiringConditionsPanel'
import { ResultEditor } from '../results/ResultEditor'
import { MonoPreparationSheet } from './MonoPreparationSheet'

type Mode = 'formulation' | 'results'

interface Props {
  project: ExperimentProject
  library: LibraryMaterial[]
  onUpdateComponent: (c: FormulaComponent) => void
  onUpdateBaseWeight: (v: number) => void
  onUpdateMargin: (v: number) => void
  onUpdateBalance: (p: BalancePrecision | undefined) => void
  onUpdateFiring: (f: ProjectFiring) => void
  onUpdateExperiment: (e: ExperimentContext) => void
  onUpdateResult: (r: FiringResult | undefined) => void
}

export function MonoaxialWorkspace({
  project, library,
  onUpdateComponent, onUpdateBaseWeight, onUpdateMargin, onUpdateBalance,
  onUpdateFiring, onUpdateExperiment, onUpdateResult,
}: Props) {
  const [mode, setMode] = useState<Mode>('formulation')
  const component = project.components[0]
  const result = project.results[MONOAXIAL_SAMPLE_ID]

  const totals = useMemo(
    () => calculateMonoPreparation(component, project.sampleWeight, project.preparationMargin),
    [component, project.sampleWeight, project.preparationMargin],
  )

  return (
    <>
      <section className="controls-bar controls-bar--mono no-print">
        <div className="control-group">
          <label htmlFor="mono-base">Cantidad base</label>
          <div className="input-suffix">
            <input
              id="mono-base"
              type="number"
              min="0.1"
              step="0.1"
              value={project.sampleWeight}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v) && v > 0) onUpdateBaseWeight(v)
              }}
            />
            <span>g</span>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="mono-margin">Margen</label>
          <div className="input-suffix">
            <input
              id="mono-margin"
              type="number"
              min="0"
              step="1"
              value={project.preparationMargin}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isFinite(v) && v >= 0) onUpdateMargin(v)
              }}
            />
            <span>%</span>
          </div>
        </div>

        <fieldset className="control-group control-group--balance">
          <legend>Balanza</legend>
          <div className="btn-row" role="radiogroup" aria-label="Precisión de la balanza">
            {([undefined, 1, 0.1, 0.01] as const).map((p) => {
              const isActive = project.balancePrecision === p
              const label = p === undefined ? 'Sin definir' : `${p} g`
              return (
                <button
                  key={String(p)}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`chip-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => onUpdateBalance(p as BalancePrecision | undefined)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {project.balancePrecision !== undefined
            && !isRepresentable(project.sampleWeight, project.balancePrecision) && (
            <p className="hint hint-warn">
              {project.sampleWeight} g no es representable con balanza {project.balancePrecision} g.
            </p>
          )}
        </fieldset>

        <div className="control-group control-group--modes">
          <label>Modo</label>
          <div className="btn-row">
            <button
              type="button"
              className={`chip-btn ${mode === 'formulation' ? 'is-active' : ''}`}
              onClick={() => setMode('formulation')}
              aria-pressed={mode === 'formulation'}
            >Formulación</button>
            <button
              type="button"
              className={`chip-btn ${mode === 'results' ? 'is-active' : ''}`}
              onClick={() => setMode('results')}
              aria-pressed={mode === 'results'}
            >Resultados</button>
          </div>
        </div>
      </section>

      <ExperimentContextPanel
        experiment={project.experiment}
        onChange={onUpdateExperiment}
      />

      {mode === 'results' && (
        <FiringConditionsPanel
          firing={project.firing}
          onChange={onUpdateFiring}
        />
      )}

      <section className="workspace mono-workspace">
        {mode === 'formulation' ? (
          <>
            <div className="materials-column no-print" id="mono-editor-panel">
              <h2 className="mono-section-title">Formulación</h2>
              <FormulaComponentEditor
                component={component}
                library={library}
                onChange={onUpdateComponent}
              />
            </div>
            <div className="mono-prep-column">
              <MonoPreparationSheet
                totals={totals}
                balancePrecision={project.balancePrecision}
              />
            </div>
          </>
        ) : (
          <div className="mono-results-column" id="mono-results-panel">
            <aside className="sample-inspector mono-inspector">
              <div className="inspector-header">
                <div>
                  <p className="inspector-eyebrow">RESULTADO</p>
                  <h2>{component.name || 'Formulación'}</h2>
                </div>
              </div>

              <section className="inspector-section">
                <h3>Registro de cocción</h3>
                <ResultEditor
                  projectId={project.id}
                  sampleId={MONOAXIAL_SAMPLE_ID}
                  result={result}
                  onChange={onUpdateResult}
                />
              </section>
            </aside>
          </div>
        )}
      </section>
    </>
  )
}
