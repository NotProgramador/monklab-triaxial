import type { Recipe, VertexMaterial } from '../types/material'
import type {
  ApplicationMethod,
  ExperimentContext,
  ProjectFiring,
  TriaxialProject,
} from '../types/project'
import type { TriaxialSample } from '../types/triaxial'
import { normalizeMaterialName } from './materialIdentity'
import { atmosphereLabel } from './effectiveFiring'
import { APPLICATION_METHOD_LABELS } from './experimentContext'
import { generateTriaxial } from './generateTriaxial'

/** Cross-project identity for a mixture: "40|20|40". Never uses sample.id. */
export function compositionKey(sample: Pick<TriaxialSample, 'a' | 'b' | 'c'>): string {
  return `${sample.a}|${sample.b}|${sample.c}`
}

/**
 * Compositions present in EVERY project (exact intersection, never
 * interpolated). Order preserved from the first project's generated grid so
 * the result is deterministic.
 */
export function findCommonCompositions(projects: TriaxialProject[]): string[] {
  if (projects.length === 0) return []
  const sampleSets = projects.map((p) => new Set(generateTriaxial(p.step).map(compositionKey)))
  const firstOrder = generateTriaxial(projects[0].step).map(compositionKey)
  const seen = new Set<string>()
  const out: string[] = []
  for (const key of firstOrder) {
    if (seen.has(key)) continue
    if (sampleSets.every((s) => s.has(key))) {
      seen.add(key)
      out.push(key)
    }
  }
  return out
}

/** Locate the sample within a project whose composition matches `key`. */
export function sampleByComposition(project: TriaxialProject, key: string): TriaxialSample | null {
  return generateTriaxial(project.step).find((s) => compositionKey(s) === key) ?? null
}

// ============ Vertex / recipe comparison ============

export type VertexRecipeStatus = 'identical' | 'compatible_legacy' | 'ambiguous' | 'different'

interface NormalizedIngredient {
  materialId?: string
  name: string
  normalized: string
  percentage: number
}

function normalizeRecipe(recipe: Recipe | undefined): NormalizedIngredient[] {
  if (!recipe) return []
  return recipe.ingredients
    .map((i) => ({
      materialId: i.materialId,
      name: i.name,
      normalized: normalizeMaterialName(i.name),
      percentage: Number.isFinite(i.percentage) ? i.percentage : 0,
    }))
    .sort((a, b) => a.normalized.localeCompare(b.normalized))
}

/**
 * Classify two recipes for cross-project comparison. Returns the *weakest*
 * label needed to describe them together:
 *  - identical:         same ingredient keys, same percentages
 *  - compatible_legacy: same normalized names, same percentages, no materialIds
 *                       on either side
 *  - ambiguous:         same names + percentages, but at least one pair has
 *                       DIFFERENT materialIds (may be same or different
 *                       physical material — we don't know)
 *  - different:         ingredient sets or percentages differ
 */
export function compareVertexRecipes(v1: VertexMaterial, v2: VertexMaterial): VertexRecipeStatus {
  const r1 = normalizeRecipe(v1.recipe)
  const r2 = normalizeRecipe(v2.recipe)

  // Both without recipes → treat as identical simples (spec neutrality: use name).
  if (r1.length === 0 && r2.length === 0) {
    const n1 = normalizeMaterialName(v1.name)
    const n2 = normalizeMaterialName(v2.name)
    return n1 === n2 ? 'identical' : 'different'
  }
  if (r1.length !== r2.length) return 'different'

  // Zip by normalized name (both sorted).
  let anyDifferentIds = false
  let anyMissingIds = false
  for (let i = 0; i < r1.length; i++) {
    const a = r1[i]
    const b = r1[i] // placeholder
    const bReal = r2[i]
    if (a.normalized !== bReal.normalized) return 'different'
    if (Math.abs(a.percentage - bReal.percentage) > 0.001) return 'different'
    if (a.materialId && bReal.materialId) {
      if (a.materialId !== bReal.materialId) anyDifferentIds = true
    } else if (a.materialId || bReal.materialId) {
      anyMissingIds = true
    }
    void b
  }
  if (anyDifferentIds) return 'ambiguous'
  // both fully identified with matching ids OR both legacy
  const anyIds = r1.some((i) => i.materialId) || r2.some((i) => i.materialId)
  if (anyMissingIds) return 'ambiguous'
  if (anyIds) return 'identical'
  return 'compatible_legacy'
}

// ============ Conditions matrix ============

export type FieldStatus = 'same' | 'different' | 'missing'

export interface ConditionRow {
  field: string
  label: string
  values: (string | null)[]
  status: FieldStatus
}

function stringifyMethod(m: ApplicationMethod | undefined): string | null {
  return m ? APPLICATION_METHOD_LABELS[m] : null
}

function stringifyNumberOrNull(n: number | undefined): string | null {
  return n === undefined || !Number.isFinite(n) ? null : String(n)
}

function stringifyText(s: string | undefined): string | null {
  const t = s?.trim()
  return t ? t : null
}

function classifyRow(values: (string | null)[]): FieldStatus {
  const nullCount = values.filter((v) => v === null).length
  // Every project silent on this field → not a difference; treat as "same".
  if (nullCount === values.length) return 'same'
  // Asymmetric: some documented it, some didn't.
  if (nullCount > 0) return 'missing'
  const first = values[0]
  return values.every((v) => v === first) ? 'same' : 'different'
}

function experimentRows(experiments: (ExperimentContext | undefined)[]): ConditionRow[] {
  const substrate = experiments.map((e) => stringifyText(e?.substrate))
  const bisque = experiments.map((e) => stringifyNumberOrNull(e?.bisqueTemperature))
  const method = experiments.map((e) => stringifyMethod(e?.applicationMethod))
  const coats = experiments.map((e) => stringifyNumberOrNull(e?.coats))
  return [
    { field: 'substrate', label: 'Soporte', values: substrate, status: classifyRow(substrate) },
    { field: 'bisque', label: 'Bizcocho °C', values: bisque, status: classifyRow(bisque) },
    { field: 'application', label: 'Aplicación', values: method, status: classifyRow(method) },
    { field: 'coats', label: 'Capas', values: coats, status: classifyRow(coats) },
  ]
}

function firingRows(firings: (ProjectFiring | undefined)[]): ConditionRow[] {
  const temp = firings.map((f) => stringifyNumberOrNull(f?.temperature))
  const cone = firings.map((f) => stringifyText(f?.cone))
  const atm = firings.map((f) => (f?.atmosphere ? atmosphereLabel(f.atmosphere) : null))
  const kiln = firings.map((f) => stringifyText(f?.kiln))
  return [
    { field: 'temperature', label: 'Temp cocción °C', values: temp, status: classifyRow(temp) },
    { field: 'cone', label: 'Cono', values: cone, status: classifyRow(cone) },
    { field: 'atmosphere', label: 'Atmósfera', values: atm, status: classifyRow(atm) },
    { field: 'kiln', label: 'Horno', values: kiln, status: classifyRow(kiln) },
  ]
}

/** Emit ordered rows describing every documented condition field. */
export function compareProjectConditions(projects: TriaxialProject[]): ConditionRow[] {
  return [
    ...experimentRows(projects.map((p) => p.experiment)),
    ...firingRows(projects.map((p) => p.firing)),
  ]
}
