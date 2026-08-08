import type { VertexMaterial } from '../types/material'
import type { TriaxialSample } from '../types/triaxial'
import {
  aggregateIngredients,
  collectInvalidRecipes,
  expandSample,
  type ExpandedIngredient,
  type InvalidVertex,
} from './expandRecipe'
import { calculateSampleWeights } from './calculateSampleWeights'

export interface PreparationTotals {
  sampleCount: number
  grossPerVertex: { a: number; b: number; c: number }
  grossTotal: number
  marginPercent: number
  withMarginPerVertex: { a: number; b: number; c: number }
  withMarginTotal: number
  expandedIngredients: ExpandedIngredient[] // vacío si hay recetas inválidas
  invalidRecipes: InvalidVertex[]
}

export function calculatePreparation(
  samples: TriaxialSample[],
  vertices: { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial },
  sampleWeight: number,
  marginPercent: number,
): PreparationTotals {
  const margin = Number.isFinite(marginPercent) && marginPercent >= 0 ? marginPercent : 0
  const factor = 1 + margin / 100

  let ga = 0
  let gb = 0
  let gc = 0

  for (const s of samples) {
    const w = calculateSampleWeights(s, sampleWeight)
    ga += w.a
    gb += w.b
    gc += w.c
  }

  const invalidRecipes = collectInvalidRecipes(vertices)

  let aggregated: ExpandedIngredient[] = []
  if (invalidRecipes.length === 0) {
    const allExpanded: ExpandedIngredient[] = []
    for (const s of samples) {
      const exp = expandSample(s, vertices, sampleWeight)
      if (exp.valid) allExpanded.push(...exp.ingredients)
    }
    aggregated = aggregateIngredients(allExpanded).map((i) => ({
      name: i.name,
      grams: i.grams * factor,
    }))
  }

  return {
    sampleCount: samples.length,
    grossPerVertex: { a: ga, b: gb, c: gc },
    grossTotal: ga + gb + gc,
    marginPercent: margin,
    withMarginPerVertex: {
      a: ga * factor,
      b: gb * factor,
      c: gc * factor,
    },
    withMarginTotal: (ga + gb + gc) * factor,
    expandedIngredients: aggregated,
    invalidRecipes,
  }
}
