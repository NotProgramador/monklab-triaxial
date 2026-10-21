import type { CompositionSample } from '../types/compositionSample'

/**
 * Monoaxial mode has exactly one formulation. We still produce a sample so
 * that the generic result / photo storage (keyed by `sampleId`) can continue
 * to be reused — identity 1 is the sole sample. The user never sees "T01";
 * the mono UI shows "RESULTADO" instead.
 */
export function generateMonoaxial(componentId: string): CompositionSample[] {
  if (typeof componentId !== 'string' || componentId.length === 0) {
    throw new Error('componentId monoaxial inválido.')
  }
  return [
    {
      id: 1,
      composition: { [componentId]: 100 },
    },
  ]
}

/** Single-sample id used by every monoaxial project for its result/photo slot. */
export const MONOAXIAL_SAMPLE_ID = 1
