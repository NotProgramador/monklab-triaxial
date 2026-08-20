/**
 * Text normalization + identity helpers for material aggregation.
 *
 * Normalization is used only as a search/comparison key. Stored `name` values
 * are never modified — "Sílice" stays "Sílice".
 */

export function normalizeMaterialName(input: string | undefined | null): string {
  if (!input) return ''
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/\s+/g, ' ')
}

/**
 * Aggregation key for an ingredient. Prefers materialId when set; falls back
 * to normalized name for legacy free-text ingredients.
 */
export function ingredientKey(materialId: string | undefined, name: string): string {
  if (materialId) return `id:${materialId}`
  return `n:${normalizeMaterialName(name)}`
}
