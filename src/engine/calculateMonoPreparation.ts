import type { FormulaComponent } from '../types/material'
import { aggregateIngredients, expandFormulaComponent, recipeTotal, type ExpandedIngredient } from './expandRecipe'

export type MonoPreparationStatus =
  | { valid: true }
  | { valid: false; reason: 'invalid-recipe-total'; recipeTotal: number }
  | { valid: false; reason: 'empty-recipe' }

export interface MonoPreparationTotals {
  baseWeight: number
  marginPercent: number
  totalWeight: number
  ingredients: ExpandedIngredient[]
  status: MonoPreparationStatus
}

/**
 * Preparation for a single formulation (monoaxial). Mirrors the triaxial
 * engine in shape but operates on one component:
 *   - `baseWeight` + `marginPercent` → `totalWeight = base · (1 + m/100)`
 *   - recipe expansion yields `(name, grams, materialId)` entries scaled to
 *     `totalWeight`; aggregation collapses repeated identities.
 *   - a bare material (no recipe) produces a single entry `name = totalWeight`.
 * The pure engine does NOT apply balance quantisation — that is the UI's job
 * (see `quantizeNamed`), so these totals remain the exact theoretical values.
 */
export function calculateMonoPreparation(
  component: FormulaComponent,
  baseWeight: number,
  marginPercent: number,
): MonoPreparationTotals {
  const base = Number.isFinite(baseWeight) && baseWeight > 0 ? baseWeight : 0
  const margin = Number.isFinite(marginPercent) && marginPercent >= 0 ? marginPercent : 0
  const factor = 1 + margin / 100
  const total = base * factor

  if (component.recipe && component.recipe.ingredients.length === 0) {
    return {
      baseWeight: base,
      marginPercent: margin,
      totalWeight: total,
      ingredients: [],
      status: { valid: false, reason: 'empty-recipe' },
    }
  }

  if (component.recipe) {
    const rtotal = recipeTotal(component.recipe)
    if (Math.abs(rtotal - 100) >= 0.01) {
      return {
        baseWeight: base,
        marginPercent: margin,
        totalWeight: total,
        ingredients: [],
        status: { valid: false, reason: 'invalid-recipe-total', recipeTotal: rtotal },
      }
    }
  }

  const expansion = expandFormulaComponent(component, total)
  if (!expansion.valid) {
    return {
      baseWeight: base,
      marginPercent: margin,
      totalWeight: total,
      ingredients: [],
      status: { valid: false, reason: 'invalid-recipe-total', recipeTotal: expansion.total },
    }
  }

  return {
    baseWeight: base,
    marginPercent: margin,
    totalWeight: total,
    ingredients: aggregateIngredients(expansion.ingredients),
    status: { valid: true },
  }
}
