import type { TriaxialSample } from '../types/triaxial'

export interface SampleWeights {
  a: number
  b: number
  c: number
  total: number
}

export function calculateSampleWeights(
  sample: TriaxialSample,
  totalWeight: number,
): SampleWeights {
  if (totalWeight < 0) {
    throw new Error('El peso total no puede ser negativo.')
  }

  return {
    a: (sample.a / 100) * totalWeight,
    b: (sample.b / 100) * totalWeight,
    c: (sample.c / 100) * totalWeight,
    total: totalWeight,
  }
}