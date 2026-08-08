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

export function formatDateEs(input?: Date | string): string {
  let date: Date
  if (input === undefined) {
    date = new Date()
  } else if (typeof input === 'string') {
    // Interpret YYYY-MM-DD as local midnight (avoid TZ drift for date-only inputs).
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
    date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(input)
    if (!Number.isFinite(date.getTime())) return ''
  } else {
    date = input
  }
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}
