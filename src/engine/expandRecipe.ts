import type { VertexMaterial, Recipe } from '../types/material'
import type { TriaxialSample } from '../types/triaxial'
import { calculateSampleWeights } from './calculateSampleWeights'
import { ingredientKey } from './materialIdentity'

export interface ExpandedIngredient {
  name: string
  grams: number
  materialId?: string
}

export type InvalidVertex = { vertexId: 'A' | 'B' | 'C'; name: string; total: number }

export type VertexExpansion =
  | { valid: true; ingredients: ExpandedIngredient[] }
  | { valid: false; reason: 'invalid-recipe-total'; total: number }

export type SampleExpansion =
  | { valid: true; ingredients: ExpandedIngredient[] }
  | { valid: false; invalidVertices: InvalidVertex[] }

export function recipeTotal(recipe: Recipe | undefined): number {
  if (!recipe) return 0
  return recipe.ingredients.reduce(
    (sum, i) => sum + (Number.isFinite(i.percentage) ? i.percentage : 0),
    0,
  )
}

export function isRecipeValid(recipe: Recipe | undefined): boolean {
  if (!recipe) return false
  if (recipe.ingredients.length === 0) return false
  const total = recipeTotal(recipe)
  return Math.abs(total - 100) < 0.01
}

/**
 * Normaliza los porcentajes de una receta a 100.00 exactos.
 * - Rescala proporcionalmente.
 * - Redondea a 2 decimales.
 * - Ajusta el ingrediente de mayor porcentaje para compensar el residuo,
 *   garantizando total exacto = 100.00.
 */
export function normalizeRecipeTo100(recipe: Recipe): Recipe {
  const total = recipeTotal(recipe)
  if (total <= 0 || recipe.ingredients.length === 0) return recipe

  const scaled = recipe.ingredients.map((i) => ({
    ...i,
    percentage: Math.round((i.percentage / total) * 100 * 100) / 100,
  }))
  const sumRounded = scaled.reduce((s, i) => s + i.percentage, 0)
  const diff = Math.round((100 - sumRounded) * 100) / 100

  if (diff !== 0) {
    let maxIdx = 0
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i].percentage > scaled[maxIdx].percentage) maxIdx = i
    }
    scaled[maxIdx] = {
      ...scaled[maxIdx],
      percentage: Math.round((scaled[maxIdx].percentage + diff) * 100) / 100,
    }
  }
  return { ...recipe, ingredients: scaled }
}

function expandVertexStrict(vertex: VertexMaterial, grams: number): VertexExpansion {
  if (!vertex.recipe) {
    return {
      valid: true,
      ingredients: [{ name: vertex.name || vertex.id, grams }],
    }
  }
  if (vertex.recipe.ingredients.length === 0) {
    return { valid: false, reason: 'invalid-recipe-total', total: 0 }
  }
  const total = recipeTotal(vertex.recipe)
  if (Math.abs(total - 100) >= 0.01) {
    return { valid: false, reason: 'invalid-recipe-total', total }
  }
  const ingredients = vertex.recipe.ingredients.map((ing) => ({
    name: ing.name,
    grams: (ing.percentage / 100) * grams,
    materialId: ing.materialId,
  }))
  return { valid: true, ingredients }
}

export function expandSample(
  sample: TriaxialSample,
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial },
  sampleWeight: number,
): SampleExpansion {
  const w = calculateSampleWeights(sample, sampleWeight)
  const results = {
    A: expandVertexStrict(vertices.A, w.a),
    B: expandVertexStrict(vertices.B, w.b),
    C: expandVertexStrict(vertices.C, w.c),
  }
  const invalid: InvalidVertex[] = (['A', 'B', 'C'] as const)
    .filter((id) => !results[id].valid)
    .map((id) => {
      const r = results[id] as Extract<VertexExpansion, { valid: false }>
      return { vertexId: id, name: vertices[id].name || id, total: r.total }
    })

  if (invalid.length > 0) {
    return { valid: false, invalidVertices: invalid }
  }

  const all = [
    ...(results.A as Extract<VertexExpansion, { valid: true }>).ingredients,
    ...(results.B as Extract<VertexExpansion, { valid: true }>).ingredients,
    ...(results.C as Extract<VertexExpansion, { valid: true }>).ingredients,
  ]
  return { valid: true, ingredients: aggregateIngredients(all) }
}

export function aggregateIngredients(parts: ExpandedIngredient[]): ExpandedIngredient[] {
  const grams = new Map<string, number>()
  const displayNames = new Map<string, string>()
  const materialIds = new Map<string, string | undefined>()
  for (const p of parts) {
    const key = ingredientKey(p.materialId, p.name)
    grams.set(key, (grams.get(key) ?? 0) + p.grams)
    if (!displayNames.has(key)) displayNames.set(key, p.name.trim())
    if (p.materialId && !materialIds.has(key)) materialIds.set(key, p.materialId)
  }
  return Array.from(grams.entries()).map(([key, g]) => ({
    name: displayNames.get(key) ?? key,
    grams: g,
    materialId: materialIds.get(key),
  }))
}

export function hasAnyRecipe(vertices: {
  A: VertexMaterial; B: VertexMaterial; C: VertexMaterial
}): boolean {
  return Boolean(vertices.A.recipe || vertices.B.recipe || vertices.C.recipe)
}

export function collectInvalidRecipes(vertices: {
  A: VertexMaterial; B: VertexMaterial; C: VertexMaterial
}): InvalidVertex[] {
  return (['A', 'B', 'C'] as const)
    .filter((id) => vertices[id].recipe !== undefined && !isRecipeValid(vertices[id].recipe))
    .map((id) => ({
      vertexId: id,
      name: vertices[id].name || id,
      total: recipeTotal(vertices[id].recipe),
    }))
}
