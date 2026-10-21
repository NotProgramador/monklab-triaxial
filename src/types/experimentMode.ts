export type ExperimentMode = 'monoaxial' | 'biaxial' | 'triaxial'

export const ALL_EXPERIMENT_MODES: readonly ExperimentMode[] = ['monoaxial', 'biaxial', 'triaxial']

/**
 * Modes that the current UI knows how to operate. Fase 2 ships the
 * monoaxial and triaxial workspaces. Biaxial is still schema-known but
 * UI-rejected until its own phase ships.
 */
export const SUPPORTED_UI_MODES: readonly ExperimentMode[] = ['monoaxial', 'triaxial']

export function isExperimentMode(value: unknown): value is ExperimentMode {
  return value === 'monoaxial' || value === 'biaxial' || value === 'triaxial'
}

export function isSupportedUIMode(mode: ExperimentMode): boolean {
  return SUPPORTED_UI_MODES.includes(mode)
}

/** Primary tool label shown in the header per mode. */
export const MODE_LABELS: Record<ExperimentMode, string> = {
  monoaxial: 'Formulación única',
  biaxial: 'Biaxial',
  triaxial: 'Triaxial',
}

/** Secondary / technical label when both the family name and the mode are useful. */
export const MODE_SUBLABELS: Record<ExperimentMode, string> = {
  monoaxial: 'Monoaxial',
  biaxial: 'Biaxial',
  triaxial: 'Triaxial',
}
