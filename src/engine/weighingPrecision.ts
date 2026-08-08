/**
 * Balance-precision layer.
 *
 * NEVER modifies theoretical (recipe/preparation) values. Produces derived
 * "practical" quantities aligned to the user's balance resolution using a
 * largest-remainder algorithm so aggregate totals are preserved.
 */

export type BalancePrecision = 1 | 0.1 | 0.01

export interface PracticalWeight {
  theoretical: number
  practical: number
  delta: number
  exact: boolean
  belowResolution: boolean
}

export interface QuantizeResult {
  values: number[]
  practicalTotal: number
  theoreticalTotal: number
  targetAdjusted: boolean
  belowResolution: boolean[]
}

export const BALANCE_PRECISIONS: readonly BalancePrecision[] = [1, 0.1, 0.01]

export function isBalancePrecision(v: unknown): v is BalancePrecision {
  return v === 1 || v === 0.1 || v === 0.01
}

export function decimalsForPrecision(p: BalancePrecision): number {
  if (p === 1) return 0
  if (p === 0.1) return 1
  return 2
}

export function unitsPerGram(p: BalancePrecision): number {
  return Math.round(1 / p)
}

/** Rounds a real number to the balance grid. Half-away-from-zero, avoiding FP artifacts. */
export function roundToPrecision(value: number, precision: BalancePrecision): number {
  if (!Number.isFinite(value)) return 0
  const u = unitsPerGram(precision)
  return Math.round(value * u) / u
}

/** True when `value` lies exactly on the balance grid (within tight epsilon). */
export function isRepresentable(value: number, precision: BalancePrecision): boolean {
  if (!Number.isFinite(value)) return false
  const u = unitsPerGram(precision)
  const scaled = value * u
  return Math.abs(scaled - Math.round(scaled)) < 1e-6
}

/** Formats a weight preserving significant zeros for the given balance precision. */
export function formatWeightForPrecision(value: number, precision: BalancePrecision): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(decimalsForPrecision(precision))
}

/**
 * Largest-remainder allocation.
 *
 * Given theoretical values whose sum is `theoreticalTotal` and a balance
 * precision, produce practical values (multiples of `precision`) whose sum
 * equals `roundToPrecision(theoreticalTotal, precision)` — i.e. no drift.
 *
 * Deterministic tie-break: larger residue first, then earlier index first.
 */
export function quantizeWeights(
  values: number[],
  precision: BalancePrecision,
  overrideTotal?: number,
): QuantizeResult {
  const u = unitsPerGram(precision)
  const theoreticalTotal = values.reduce((s, v) => s + Math.max(0, v || 0), 0)
  const rawTarget = overrideTotal ?? theoreticalTotal
  // Snap target to grid — practical totals must be representable
  const targetUnits = Math.round(Math.max(0, rawTarget) * u)
  const targetAdjusted = Math.abs(targetUnits / u - rawTarget) > 1e-9

  if (values.length === 0) {
    return {
      values: [],
      practicalTotal: 0,
      theoreticalTotal,
      targetAdjusted,
      belowResolution: [],
    }
  }

  // Convert each theoretical value to (integer floor units, fractional residue).
  const scaled = values.map((v) => Math.max(0, v || 0) * u)
  const floors = scaled.map((s) => Math.floor(s))
  const residues = scaled.map((s, i) => s - floors[i])

  let assigned = floors.reduce((s, n) => s + n, 0)
  const remaining = targetUnits - assigned

  const order = residues
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (b.r - a.r) || (a.i - b.i))

  if (remaining > 0) {
    for (let k = 0; k < remaining; k++) {
      floors[order[k % order.length].i] += 1
    }
  } else if (remaining < 0) {
    // Target below sum-of-floors: strip units from largest floor.
    let strip = -remaining
    const byFloor = floors
      .map((f, i) => ({ f, i }))
      .sort((a, b) => (b.f - a.f) || (a.i - b.i))
    let k = 0
    while (strip > 0 && k < byFloor.length * u) {
      const { i } = byFloor[k % byFloor.length]
      if (floors[i] > 0) {
        floors[i] -= 1
        strip -= 1
      }
      k += 1
    }
  }

  const out = floors.map((f) => f / u)
  // Use the integer total to avoid FP drift when 200+ divisions are re-summed
  const practicalUnits = floors.reduce((s, n) => s + n, 0)
  const practicalTotal = practicalUnits / u
  const belowResolution = values.map((v, i) => (v || 0) > 0 && out[i] === 0)

  return {
    values: out,
    practicalTotal,
    theoreticalTotal,
    targetAdjusted,
    belowResolution,
  }
}

/** Per-value analysis for a single number (does not preserve aggregate totals). */
export function analyzeWeight(theoretical: number, precision: BalancePrecision): PracticalWeight {
  const practical = roundToPrecision(theoretical, precision)
  return {
    theoretical,
    practical,
    delta: practical - theoretical,
    exact: isRepresentable(theoretical, precision),
    belowResolution: theoretical > 0 && practical === 0,
  }
}

export interface QuantizedList {
  items: { name: string; theoretical: number; practical: number; exact: boolean; belowResolution: boolean }[]
  practicalTotal: number
  theoreticalTotal: number
  adjustedCount: number
  belowResolutionCount: number
}

/**
 * Quantize a named list (e.g. ingredients) preserving the target total on the grid.
 */
export function quantizeNamed(
  items: { name: string; grams: number }[],
  precision: BalancePrecision,
  overrideTotal?: number,
): QuantizedList {
  const q = quantizeWeights(items.map((i) => i.grams), precision, overrideTotal)
  let adjusted = 0
  const rows = items.map((it, i) => {
    const practical = q.values[i]
    const exact = Math.abs(practical - it.grams) < 1e-9
    if (!exact) adjusted += 1
    return {
      name: it.name,
      theoretical: it.grams,
      practical,
      exact,
      belowResolution: q.belowResolution[i],
    }
  })
  return {
    items: rows,
    practicalTotal: q.practicalTotal,
    theoreticalTotal: q.theoreticalTotal,
    adjustedCount: adjusted,
    belowResolutionCount: rows.filter((r) => r.belowResolution).length,
  }
}
