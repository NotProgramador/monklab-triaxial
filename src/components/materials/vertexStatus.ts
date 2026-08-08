import type { VertexMaterial } from '../../types/material'
import { isRecipeValid, recipeTotal } from '../../engine/expandRecipe'

export type VertexStatusKind = 'ok' | 'empty' | 'invalid' | 'simple'

export interface VertexStatus {
  kind: VertexStatusKind
  label: string
  total: number
  ingredientCount: number
}

export function vertexStatus(v: VertexMaterial): VertexStatus {
  if (!v.recipe) {
    return { kind: 'simple', label: 'Material simple', total: 0, ingredientCount: 0 }
  }
  const count = v.recipe.ingredients.length
  const total = recipeTotal(v.recipe)
  if (count === 0) {
    return { kind: 'empty', label: 'Sin ingredientes', total: 0, ingredientCount: 0 }
  }
  if (!isRecipeValid(v.recipe)) {
    return { kind: 'invalid', label: `${total.toFixed(2).replace(/\.00$/, '')} %`, total, ingredientCount: count }
  }
  return { kind: 'ok', label: '100 %', total, ingredientCount: count }
}
