import type { TriaxialSample } from '../types/triaxial'

const LABELS_PER_PAGE = 21

export function chunkSamplesForLabels(
  samples: TriaxialSample[],
  size: number = LABELS_PER_PAGE,
): TriaxialSample[][] {
  if (size <= 0) return []
  if (samples.length === 0) return []
  const pages: TriaxialSample[][] = []
  for (let i = 0; i < samples.length; i += size) {
    pages.push(samples.slice(i, i + size))
  }
  return pages
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function padId(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

export function buildLabelsHtml(projectName: string, samples: TriaxialSample[]): string {
  const pages = chunkSamplesForLabels(samples)
  const projectSafe = escapeHtml(projectName)

  const pagesHtml = pages
    .map((page) => {
      const cells = page
        .map((s) => {
          const id = padId(s.id)
          const ratio = `${s.a} / ${s.b} / ${s.c}`
          const detail = `A ${s.a} · B ${s.b} · C ${s.c}`
          return `<article class="label">
  <div class="label-id">${id}</div>
  <div class="label-ratio">${escapeHtml(ratio)}</div>
  <div class="label-detail">${escapeHtml(detail)}</div>
  <div class="label-project">${projectSafe}</div>
</article>`
        })
        .join('\n')
      return `<section class="labels-page"><div class="labels-grid">\n${cells}\n</div></section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiquetas MonkLab — ${projectSafe}</title>
<style>
@page { size: A4 portrait; margin: 7mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: auto;
  background: #fff;
  color: #111;
}
body {
  font-family: Arial, Helvetica, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.labels-page {
  width: 196mm;
  height: 275mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.labels-page:last-child {
  break-after: auto;
  page-break-after: auto;
}
.labels-grid {
  width: 196mm;
  height: 275mm;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 2mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
.label {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0.3mm solid #222;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2mm;
  break-inside: avoid;
  page-break-inside: avoid;
}
.label-id {
  font-size: 18pt;
  font-weight: 700;
  line-height: 1;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.label-ratio {
  margin-top: 2mm;
  font-size: 10pt;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
.label-detail {
  margin-top: 1mm;
  font-size: 7pt;
  color: #666;
}
.label-project {
  margin-top: 2mm;
  font-size: 6.5pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.2;
  max-height: 2.4em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: #444;
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`
}

export function printLabelsDocument(projectName: string, samples: TriaxialSample[]): void {
  if (typeof document === 'undefined') return
  if (samples.length === 0) return

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.visibility = 'hidden'
  document.body.appendChild(iframe)

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  const doc = iframe.contentDocument
  if (!doc) {
    cleanup()
    return
  }

  doc.open()
  doc.write(buildLabelsHtml(projectName, samples))
  doc.close()

  const win = iframe.contentWindow
  if (!win) {
    cleanup()
    return
  }

  win.addEventListener('afterprint', cleanup, { once: true })
  const fallback = window.setTimeout(cleanup, 60_000)
  win.addEventListener('afterprint', () => window.clearTimeout(fallback), { once: true })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        win.focus()
        win.print()
      } catch {
        cleanup()
      }
    })
  })
}
