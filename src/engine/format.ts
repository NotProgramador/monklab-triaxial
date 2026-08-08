export function formatWeight(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(decimals))
  return rounded.toString()
}

export function formatPercentValue(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(decimals)
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(decimals))
  return `${rounded}%`
}

export function roundTo(value: number, decimals = 4): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function formatDateEs(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}
