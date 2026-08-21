/**
 * Pure reordering helpers for a series' projectIds array.
 * Always return a new array (safe for React state); noop when out of bounds.
 */

export function moveUp<T>(arr: readonly T[], index: number): T[] {
  if (index <= 0 || index >= arr.length) return arr.slice()
  const out = arr.slice()
  ;[out[index - 1], out[index]] = [out[index], out[index - 1]]
  return out
}

export function moveDown<T>(arr: readonly T[], index: number): T[] {
  if (index < 0 || index >= arr.length - 1) return arr.slice()
  const out = arr.slice()
  ;[out[index], out[index + 1]] = [out[index + 1], out[index]]
  return out
}

/**
 * Given a series' projectIds and the set of known project ids, split into
 * valid (still exists) and orphaned entries preserving original order.
 */
export function partitionOrphans(
  projectIds: readonly string[],
  knownProjectIds: ReadonlySet<string>,
): { valid: string[]; orphans: string[] } {
  const valid: string[] = []
  const orphans: string[] = []
  for (const id of projectIds) {
    if (knownProjectIds.has(id)) valid.push(id)
    else orphans.push(id)
  }
  return { valid, orphans }
}
