import type { TriaxialSample } from '../types/triaxial'

export const MAX_COMPARISON = 4

/**
 * Toggle a sample id in the comparison list.
 *  - If present → removed.
 *  - If absent + list < MAX → appended.
 *  - If absent + list already at MAX → unchanged (caller shows a message).
 * Never returns the same array reference (safe for React state).
 */
export function toggleComparisonSample(
  current: readonly number[],
  id: number,
  max: number = MAX_COMPARISON,
): number[] {
  if (current.includes(id)) return current.filter((n) => n !== id)
  if (current.length >= max) return current.slice()
  return [...current, id]
}

/**
 * Clamp reference id to a value that still exists in the current comparison.
 * Falls back to the first entry, or null if empty.
 */
export function clampReference(
  current: readonly number[],
  reference: number | null,
): number | null {
  if (reference !== null && current.includes(reference)) return reference
  return current[0] ?? null
}

export interface CompositionDelta {
  a: number
  b: number
  c: number
}

export function compositionDelta(
  target: TriaxialSample,
  reference: TriaxialSample,
): CompositionDelta {
  return {
    a: target.a - reference.a,
    b: target.b - reference.b,
    c: target.c - reference.c,
  }
}

/**
 * Total absolute compositional distance (sum of |ΔA|+|ΔB|+|ΔC|).
 * Not a chemical measure — a visual hint of "how far apart" two mixtures are
 * on the triangle.
 */
export function compositionDistance(
  target: TriaxialSample,
  reference: TriaxialSample,
): number {
  const d = compositionDelta(target, reference)
  return Math.abs(d.a) + Math.abs(d.b) + Math.abs(d.c)
}
