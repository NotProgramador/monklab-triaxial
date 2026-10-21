export type ExperimentMode = 'monoaxial' | 'biaxial' | 'triaxial'

export const ALL_EXPERIMENT_MODES: readonly ExperimentMode[] = ['monoaxial', 'biaxial', 'triaxial']

/**
 * Modes that the current UI knows how to operate. The schema recognises
 * monoaxial and biaxial, but Fase 1 only ships the triaxial UI.
 */
export const SUPPORTED_UI_MODES: readonly ExperimentMode[] = ['triaxial']

export function isExperimentMode(value: unknown): value is ExperimentMode {
  return value === 'monoaxial' || value === 'biaxial' || value === 'triaxial'
}

export function isSupportedUIMode(mode: ExperimentMode): boolean {
  return SUPPORTED_UI_MODES.includes(mode)
}
