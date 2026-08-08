import type { TriaxialSample } from '../types/triaxial'

export const ALLOWED_STEPS = [25, 20, 10, 5] as const

export function sampleCountForStep(step: number): number {
  if (step <= 0 || 100 % step !== 0) return 0
  const n = 100 / step
  return ((n + 1) * (n + 2)) / 2
}

export function generateTriaxial(step: number): TriaxialSample[] {
  if (step <= 0 || step > 100) {
    throw new Error('El paso debe ser mayor que 0 y menor o igual a 100.')
  }

  if (100 % step !== 0) {
    throw new Error('Por ahora, el paso debe dividir 100 exactamente.')
  }

  const samples: TriaxialSample[] = []
  let id = 1

  for (let a = 100; a >= 0; a -= step) {
    const remaining = 100 - a
    for (let b = remaining; b >= 0; b -= step) {
      const c = 100 - a - b
      samples.push({ id, a, b, c })
      id++
    }
  }

  return samples
}
