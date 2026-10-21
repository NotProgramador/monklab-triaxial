import type { TriaxialProject } from '../types/project'
import type { FiringResult } from '../types/result'
import type { TriaxialSample } from '../types/triaxial'
import {
  atmosphereLabel,
  getEffectiveFiring,
  hasSampleFiringOverride,
} from '../engine/effectiveFiring'
import { APPLICATION_METHOD_LABELS } from '../engine/experimentContext'
import { formatDateEs } from '../engine/format'
import {
  compareProjectConditions,
  compareVertexRecipes,
  sampleByComposition,
  type VertexRecipeStatus,
} from '../engine/projectComparison'
import { getSampleImage } from '../storage/imageStorage'

// ------------------------------------------------------------------
// Escape (isolated iframe HTML — user data is untrusted).
// ------------------------------------------------------------------
export function escapeHtml(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ------------------------------------------------------------------
// Data model
// ------------------------------------------------------------------
export const RECIPE_STATUS_LABEL: Record<VertexRecipeStatus, string> = {
  identical: 'Coincidente',
  compatible_legacy: 'Coincidencia legacy',
  ambiguous: 'Identidad ambigua',
  different: 'Diferente',
}

const SURF_LABEL: Record<string, string> = {
  mate: 'Mate', satinada: 'Satinada', brillante: 'Brillante', variable: 'Variable',
}
const GLOSS_LABEL: Record<1 | 2 | 3, string> = { 1: 'Mate', 2: 'Satinado', 3: 'Brillante' }
const OPACITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Transparente', 2: 'Semitransparente', 3: 'Opaco' }
const LEVEL_LABEL: Record<1 | 2 | 3, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' }

function fmtLevel(v: number | undefined, map: Record<1 | 2 | 3, string>): string {
  if (v === 1 || v === 2 || v === 3) return map[v]
  return ''
}

function fmtSurface(v: string | undefined): string {
  if (!v) return ''
  return SURF_LABEL[v] ?? v
}

export interface ReportColumn {
  projectId: string
  projectName: string
  step: number
  sample: TriaxialSample | null
  localSampleLabel: string      // "T09" or "—"
  result: FiringResult | undefined
  registered: boolean
  effectiveTemperature?: number
  effectiveCone?: string
  effectiveAtmosphereLabel?: string
  hasOwnFiringOverride: boolean
  substrate?: string
  bisqueTemperature?: number
  applicationMethodLabel?: string
  coats?: number
  firingDate?: string           // display
  firingKiln?: string
  observedColor?: string
  surfaceLabel?: string
  glossLabel?: string
  opacityLabel?: string
  fluidityLabel?: string
  defects?: string
  notes?: string
  hasPhoto: boolean
  photoDataUrl?: string
}

export interface RecipeRow {
  vertex: 'A' | 'B' | 'C'
  vertexName: string
  perColumn: VertexRecipeStatus[]  // status of each column vs reference (col 0)
  worst: VertexRecipeStatus
}

export interface ComparisonReportModel {
  composition: { a: number; b: number; c: number }
  compositionLabel: string
  seriesName?: string
  printedAt: string
  columns: ReportColumn[]
  recipeRows: RecipeRow[]
  conditionRows: ReturnType<typeof compareProjectConditions>
  differencesList: string[]      // human-readable bullets
}

export interface BuildModelInput {
  projects: TriaxialProject[]
  compositionKeyValue: string    // "40|20|40"
  seriesName?: string
  photoDataUrls?: Record<string, string>   // key: `${projectId}::${sampleId}`
}

function pad(id: number): string {
  return 'T' + String(id).padStart(2, '0')
}

function columnFor(project: TriaxialProject, key: string, photoDataUrls?: Record<string, string>): ReportColumn {
  const sample = sampleByComposition(project, key)
  const result: FiringResult | undefined = sample ? project.results[sample.id] : undefined
  const eff = getEffectiveFiring(project.firing, result)
  const override = hasSampleFiringOverride(result)
  const registered = Boolean(result && (
    result.observedColor || result.surface || result.gloss || result.opacity ||
    result.fluidity || (result.notes && result.notes.trim()) || (result.defects && result.defects.trim()) ||
    result.hasPhoto || result.temperature !== undefined || result.cone || result.atmosphere
  ))
  const experiment = project.experiment
  const firing = project.firing
  const photoKey = sample ? `${project.id}::${sample.id}` : ''
  return {
    projectId: project.id,
    projectName: project.name,
    step: project.step ?? 0,
    sample,
    localSampleLabel: sample ? pad(sample.id) : '—',
    result,
    registered,
    effectiveTemperature: eff.temperature,
    effectiveCone: eff.cone,
    effectiveAtmosphereLabel: eff.atmosphere ? atmosphereLabel(eff.atmosphere) : undefined,
    hasOwnFiringOverride: override,
    substrate: experiment?.substrate,
    bisqueTemperature: experiment?.bisqueTemperature,
    applicationMethodLabel: experiment?.applicationMethod
      ? APPLICATION_METHOD_LABELS[experiment.applicationMethod]
      : undefined,
    coats: experiment?.coats,
    firingDate: firing?.date ? formatDateEs(firing.date) : undefined,
    firingKiln: firing?.kiln,
    observedColor: result?.observedColor,
    surfaceLabel: fmtSurface(result?.surface),
    glossLabel: fmtLevel(result?.gloss, GLOSS_LABEL),
    opacityLabel: fmtLevel(result?.opacity, OPACITY_LABEL),
    fluidityLabel: fmtLevel(result?.fluidity, LEVEL_LABEL),
    defects: result?.defects,
    notes: result?.notes,
    hasPhoto: Boolean(result?.hasPhoto),
    photoDataUrl: photoDataUrls?.[photoKey],
  }
}

function recipeRows(projects: TriaxialProject[]): RecipeRow[] {
  if (projects.length < 2) return []
  const reference = projects[0]
  return (['A', 'B', 'C'] as const).map((vid) => {
    const perColumn = projects.map((p) => compareVertexRecipes(reference.vertices[vid], p.vertices[vid]))
    const worst: VertexRecipeStatus =
      perColumn.includes('different') ? 'different' :
      perColumn.includes('ambiguous') ? 'ambiguous' :
      perColumn.includes('compatible_legacy') ? 'compatible_legacy' : 'identical'
    return { vertex: vid, vertexName: reference.vertices[vid].name, perColumn, worst }
  })
}

function buildDifferencesList(model: {
  columns: ReportColumn[]
  conditionRows: ReturnType<typeof compareProjectConditions>
  recipeRows: RecipeRow[]
}): string[] {
  const bullets: string[] = []
  for (const row of model.conditionRows) {
    if (row.status === 'different') {
      const values = row.values.map((v) => v ?? '—').join(' / ')
      bullets.push(`${row.label}: ${values}`)
    }
  }
  for (const r of model.recipeRows) {
    if (r.worst === 'different') {
      bullets.push(`Receta del vértice ${r.vertex}: diferente entre proyectos`)
    }
  }
  const colors = model.columns.map((c) => c.observedColor).filter((c): c is string => !!c)
  if (colors.length > 1 && new Set(colors).size > 1) {
    bullets.push(`Color observado: ${model.columns.map((c) => c.observedColor ?? '—').join(' / ')}`)
  }
  const surfaces = model.columns.map((c) => c.surfaceLabel).filter((s): s is string => !!s)
  if (surfaces.length > 1 && new Set(surfaces).size > 1) {
    bullets.push(`Superficie: ${model.columns.map((c) => c.surfaceLabel || '—').join(' / ')}`)
  }
  const gloss = model.columns.map((c) => c.glossLabel).filter((s): s is string => !!s)
  if (gloss.length > 1 && new Set(gloss).size > 1) {
    bullets.push(`Brillo: ${model.columns.map((c) => c.glossLabel || '—').join(' / ')}`)
  }
  const opacity = model.columns.map((c) => c.opacityLabel).filter((s): s is string => !!s)
  if (opacity.length > 1 && new Set(opacity).size > 1) {
    bullets.push(`Opacidad: ${model.columns.map((c) => c.opacityLabel || '—').join(' / ')}`)
  }
  const fluidity = model.columns.map((c) => c.fluidityLabel).filter((s): s is string => !!s)
  if (fluidity.length > 1 && new Set(fluidity).size > 1) {
    bullets.push(`Fluidez: ${model.columns.map((c) => c.fluidityLabel || '—').join(' / ')}`)
  }
  return bullets
}

export function buildComparisonReportModel(input: BuildModelInput): ComparisonReportModel {
  const [aStr, bStr, cStr] = input.compositionKeyValue.split('|')
  const composition = { a: Number(aStr), b: Number(bStr), c: Number(cStr) }
  const columns = input.projects.map((p) => columnFor(p, input.compositionKeyValue, input.photoDataUrls))
  const conditionRows = compareProjectConditions(input.projects)
  const rRows = recipeRows(input.projects)
  const differencesList = buildDifferencesList({ columns, conditionRows, recipeRows: rRows })
  return {
    composition,
    compositionLabel: `${composition.a} / ${composition.b} / ${composition.c}`,
    seriesName: input.seriesName,
    printedAt: formatDateEs(new Date()),
    columns,
    recipeRows: rRows,
    conditionRows,
    differencesList,
  }
}

// ------------------------------------------------------------------
// HTML builder
// ------------------------------------------------------------------
function conditionStatusLabel(status: 'same' | 'different' | 'missing'): string {
  if (status === 'same') return 'Coincide'
  if (status === 'different') return 'Difiere'
  return 'Faltante'
}

export function buildProjectComparisonReportHtml(model: ComparisonReportModel): string {
  const columnCount = model.columns.length
  const columnHeaders = model.columns
    .map((c) => `<th scope="col">${escapeHtml(c.projectName)}</th>`)
    .join('')

  const projectListRows = model.columns.map((c, i) => `
    <li>
      <span class="ord">${i + 1}</span>
      <span class="pname">${escapeHtml(c.projectName)}</span>
      <span class="pmeta">División ${c.step} % · Muestra local ${escapeHtml(c.localSampleLabel)}</span>
    </li>`).join('')

  const recipeRowsHtml = model.recipeRows.map((r) => `
    <tr>
      <th scope="row">${r.vertex} · ${escapeHtml(r.vertexName)}</th>
      ${r.perColumn.map((s) => `<td class="status status--${s}">${escapeHtml(RECIPE_STATUS_LABEL[s])}</td>`).join('')}
    </tr>`).join('')

  const conditionRowsHtml = model.conditionRows.map((row) => `
    <tr class="row-${row.status}">
      <th scope="row">${escapeHtml(row.label)}</th>
      ${row.values.map((v) => `<td>${escapeHtml(v ?? '—')}</td>`).join('')}
      <td class="status status--${row.status}">${escapeHtml(conditionStatusLabel(row.status))}</td>
    </tr>`).join('')

  const overrideBlock = model.columns
    .filter((c) => c.hasOwnFiringOverride)
    .map((c) => {
      const parts = [
        c.effectiveTemperature !== undefined ? `${c.effectiveTemperature} °C` : null,
        c.effectiveAtmosphereLabel ?? null,
        c.effectiveCone ? `Cono ${c.effectiveCone}` : null,
      ].filter(Boolean).join(' · ')
      return `<li><strong>${escapeHtml(c.projectName)} · ${escapeHtml(c.localSampleLabel)}:</strong> ${escapeHtml(parts)}</li>`
    }).join('')

  const resultCardsHtml = model.columns.map((c) => {
    let mediaHtml = ''
    if (c.photoDataUrl) {
      mediaHtml = `<div class="media"><img src="${c.photoDataUrl}" alt="${escapeHtml(c.projectName + ' ' + c.localSampleLabel)}"/></div>`
    } else if (c.observedColor) {
      mediaHtml = `<div class="media"><div class="swatch" style="background:${escapeHtml(c.observedColor)}"></div></div>`
    } else {
      mediaHtml = `<div class="media"><div class="swatch swatch--empty"></div><div class="empty-caption">Sin imagen / color registrado</div></div>`
    }
    const rows: string[] = []
    if (!c.registered) rows.push(`<div class="fact fact--pending">SIN RESULTADO REGISTRADO</div>`)
    if (c.observedColor) rows.push(`<div class="fact"><span>Color</span><strong>${escapeHtml(c.observedColor)}</strong></div>`)
    if (c.surfaceLabel) rows.push(`<div class="fact"><span>Superficie</span><strong>${escapeHtml(c.surfaceLabel)}</strong></div>`)
    if (c.glossLabel) rows.push(`<div class="fact"><span>Brillo</span><strong>${escapeHtml(c.glossLabel)}</strong></div>`)
    if (c.opacityLabel) rows.push(`<div class="fact"><span>Opacidad</span><strong>${escapeHtml(c.opacityLabel)}</strong></div>`)
    if (c.fluidityLabel) rows.push(`<div class="fact"><span>Fluidez</span><strong>${escapeHtml(c.fluidityLabel)}</strong></div>`)
    if (c.defects) rows.push(`<div class="fact fact-wide"><span>Defectos</span><strong>${escapeHtml(c.defects)}</strong></div>`)
    if (c.notes) rows.push(`<div class="fact fact-wide"><span>Notas</span><strong class="notes">${escapeHtml(c.notes)}</strong></div>`)
    if (c.hasOwnFiringOverride) rows.push(`<div class="fact fact-wide"><span>Cocción propia</span><strong>${escapeHtml([c.effectiveTemperature !== undefined ? `${c.effectiveTemperature} °C` : '', c.effectiveAtmosphereLabel, c.effectiveCone ? `Cono ${c.effectiveCone}` : ''].filter(Boolean).join(' · '))}</strong></div>`)
    return `
      <article class="result-card">
        <header>
          <h4>${escapeHtml(c.projectName)}</h4>
          <p class="local-id">${escapeHtml(c.localSampleLabel)}</p>
        </header>
        ${mediaHtml}
        <div class="facts">${rows.join('')}</div>
      </article>`
  }).join('')

  const differencesHtml = model.differencesList.length
    ? `<ul class="diff-list">${model.differencesList.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
    : `<p class="hint">Los proyectos comparados no presentan diferencias documentadas en los campos analizados.</p>`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>MonkLab · Reporte comparativo</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Helvetica, Arial, sans-serif; }
body { font-size: 9pt; line-height: 1.35; }
h1 { margin: 0; font-size: 15pt; letter-spacing: -0.01em; }
h2 { margin: 0 0 4pt; font-size: 11pt; border-bottom: 1px solid #999; padding-bottom: 2pt; }
h3 { margin: 8pt 0 3pt; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.14em; color: #555; }
h4 { margin: 0; font-size: 10pt; }
p { margin: 2pt 0; }

.report-page { page-break-after: always; }
.report-page:last-child { page-break-after: auto; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #000;
  padding-bottom: 6pt;
  margin-bottom: 8pt;
}
.brand { font-size: 7pt; letter-spacing: 3pt; font-weight: 700; color: #555; }
.title-block h1 { margin-top: 2pt; }
.meta-block { text-align: right; font-size: 8pt; color: #444; }
.meta-block .composition {
  font-size: 14pt;
  font-weight: 700;
  color: #000;
  letter-spacing: 0.02em;
}

.project-list { list-style: none; margin: 4pt 0; padding: 0; display: grid; grid-template-columns: repeat(${columnCount}, 1fr); gap: 6pt; }
.project-list li {
  display: grid;
  gap: 2pt;
  border: 1px solid #ccc;
  padding: 4pt 6pt;
  border-radius: 2mm;
}
.project-list .ord { font-size: 7pt; color: #666; letter-spacing: 0.14em; }
.project-list .pname { font-weight: 700; font-size: 10pt; }
.project-list .pmeta { font-size: 8pt; color: #555; }

table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th, td { padding: 3pt 5pt; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
thead th { background: #eee; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8pt; }
th[scope="row"] { color: #555; font-weight: 600; width: 22%; }

.status { font-weight: 700; letter-spacing: 0.03em; text-align: center; white-space: nowrap; }
.status--identical, .status--same { color: #2d6a3f; }
.status--different { color: #6e5300; }
.status--ambiguous { color: #6e5300; }
.status--compatible_legacy, .status--missing { color: #6b6b66; }
.row-different { background: #fbf5df; }

.override-block { margin: 4pt 0 6pt; padding: 4pt 8pt; background: #fbf5df; border: 1px solid #eadea0; border-radius: 2mm; font-size: 9pt; }
.override-block ul { margin: 2pt 0 0; padding-left: 16pt; }

.results-grid {
  display: grid;
  grid-template-columns: repeat(${columnCount}, 1fr);
  gap: 6pt;
  margin-top: 4pt;
}
.result-card {
  border: 1px solid #ccc;
  border-radius: 2mm;
  padding: 6pt;
  display: grid;
  gap: 5pt;
}
.result-card header { display: flex; justify-content: space-between; align-items: baseline; }
.result-card .local-id { font-family: ui-monospace, monospace; font-size: 9pt; color: #555; }
.media { width: 100%; height: 55mm; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 2mm; overflow: hidden; }
.media img { max-width: 100%; max-height: 100%; object-fit: contain; }
.swatch { width: 100%; height: 100%; }
.swatch--empty { background: repeating-linear-gradient(45deg, #ececec 0 6px, #f7f7f7 6px 12px); }
.empty-caption { position: absolute; font-size: 8pt; color: #666; }

.facts { display: grid; gap: 3pt; }
.fact { display: flex; justify-content: space-between; gap: 6pt; font-size: 9pt; }
.fact > span { color: #666; }
.fact > strong { font-weight: 600; font-family: ui-monospace, monospace; text-align: right; }
.fact-wide { display: grid; grid-template-columns: 1fr; gap: 1pt; }
.fact-wide strong { text-align: left; font-family: inherit; }
.notes { max-height: 8em; overflow: hidden; }
.fact--pending { font-weight: 700; color: #6b6b66; letter-spacing: 0.05em; }

.diff-list { margin: 4pt 0 0; padding-left: 16pt; font-size: 9pt; }
.diff-list li { margin: 2pt 0; }

.disclaimer {
  margin-top: 8pt;
  padding: 5pt 7pt;
  font-size: 8pt;
  color: #555;
  border: 1px solid #ccc;
  background: #f7f7f5;
  border-radius: 2mm;
}
.hint { font-size: 9pt; color: #666; font-style: italic; }
</style>
</head>
<body>

<section class="report-page">
  <header class="header">
    <div class="title-block">
      <div class="brand">MONKLAB · TRIAXIAL</div>
      <h1>Reporte comparativo</h1>
      ${model.seriesName ? `<p>Serie: ${escapeHtml(model.seriesName)}</p>` : ''}
    </div>
    <div class="meta-block">
      <div class="composition">${escapeHtml(model.compositionLabel)}</div>
      <div>Composición A / B / C %</div>
      <div>Impreso el ${escapeHtml(model.printedAt)}</div>
    </div>
  </header>

  <h3>Proyectos comparados</h3>
  <ul class="project-list">${projectListRows}</ul>

  <h3>Recetas de vértices</h3>
  <table>
    <thead>
      <tr><th scope="col">Vértice</th>${columnHeaders}</tr>
    </thead>
    <tbody>${recipeRowsHtml}</tbody>
  </table>

  <h3>Contexto y cocción</h3>
  <table>
    <thead>
      <tr><th scope="col">Campo</th>${columnHeaders}<th scope="col">Estado</th></tr>
    </thead>
    <tbody>${conditionRowsHtml}</tbody>
  </table>

  ${overrideBlock ? `<div class="override-block"><strong>Condición propia de muestra:</strong><ul>${overrideBlock}</ul></div>` : ''}
</section>

<section class="report-page">
  <h2>Resultados observados</h2>
  <div class="results-grid">${resultCardsHtml}</div>

  <h3>Diferencias documentadas</h3>
  ${differencesHtml}

  <p class="disclaimer">
    Este reporte presenta diferencias documentadas. No establece relaciones causales entre variables de formulación, aplicación, cocción y resultado.
  </p>
</section>

</body>
</html>`
}

// ------------------------------------------------------------------
// Blob → data URL (isolated iframe cannot rely on blob: URLs)
// ------------------------------------------------------------------
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function collectPhotoDataUrls(projects: TriaxialProject[], compositionKeyValue: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const p of projects) {
    const s = sampleByComposition(p, compositionKeyValue)
    if (!s) continue
    const r = p.results[s.id]
    if (!r?.hasPhoto) continue
    try {
      const blob = await getSampleImage(p.id, s.id)
      if (!blob) continue
      out[`${p.id}::${s.id}`] = await blobToDataUrl(blob)
    } catch {
      // photo failure never blocks the report
    }
  }
  return out
}

// ------------------------------------------------------------------
// Iframe orchestrator
// ------------------------------------------------------------------
export interface PrintReportInput {
  projects: TriaxialProject[]
  compositionKeyValue: string
  seriesName?: string
}

export async function printProjectComparisonReport(input: PrintReportInput): Promise<void> {
  if (typeof document === 'undefined') return
  if (input.projects.length < 2) return

  const photoDataUrls = await collectPhotoDataUrls(input.projects, input.compositionKeyValue)
  const model = buildComparisonReportModel({ ...input, photoDataUrls })
  const html = buildProjectComparisonReportHtml(model)

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

  const cleanup = () => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe) }

  const doc = iframe.contentDocument
  if (!doc) { cleanup(); return }
  doc.open()
  doc.write(html)
  doc.close()

  const win = iframe.contentWindow
  if (!win) { cleanup(); return }

  win.addEventListener('afterprint', cleanup, { once: true })
  const fallback = window.setTimeout(cleanup, 120_000)
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
