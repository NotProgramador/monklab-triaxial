import { describe, expect, it } from 'vitest'
import type { TriaxialProject } from '../../types/project'
import { createDefaultProject } from '../../engine/defaults'
import {
  RECIPE_STATUS_LABEL,
  buildComparisonReportModel,
  buildProjectComparisonReportHtml,
  escapeHtml,
} from '../projectComparisonReport'

function mkProj(overrides: Partial<TriaxialProject> = {}): TriaxialProject {
  return { ...createDefaultProject('P'), ...overrides }
}

describe('escapeHtml', () => {
  it('escapa &, <, >, ", \'', () => {
    expect(escapeHtml(`<b>a & "b" 'c'</b>`))
      .toBe('&lt;b&gt;a &amp; &quot;b&quot; &#39;c&#39;&lt;/b&gt;')
  })
  it('null/undefined → ""', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
  it('números pasan como texto', () => {
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('buildComparisonReportModel', () => {
  const projA = mkProj({
    id: 'a', name: 'QA 1040',
    firing: { temperature: 1040, atmosphere: 'oxidacion', cone: '06' },
    experiment: { substrate: 'Loza blanca', bisqueTemperature: 950, applicationMethod: 'inmersion', coats: 2 },
    results: {
      9: { observedColor: '#75696c', surface: 'satinada', gloss: 2, opacity: 3, notes: 'a', temperature: 1060, atmosphere: 'reduccion', cone: '04' },
    },
  })
  const projB = mkProj({
    id: 'b', name: 'QA 1060',
    firing: { temperature: 1060, atmosphere: 'oxidacion', cone: '06' },
    experiment: { substrate: 'Loza blanca', bisqueTemperature: 950, applicationMethod: 'inmersion', coats: 2 },
    results: {
      9: { observedColor: '#8a7c7c', surface: 'brillante', gloss: 3 },
    },
  })

  it('composición se descompone correctamente', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    expect(m.composition).toEqual({ a: 40, b: 20, c: 40 })
    expect(m.compositionLabel).toBe('40 / 20 / 40')
  })

  it('columnas incluyen local sample IDs (T09)', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    expect(m.columns).toHaveLength(2)
    expect(m.columns[0].localSampleLabel).toBe('T09')
    expect(m.columns[1].localSampleLabel).toBe('T09')
  })

  it('effective firing usa override cuando existe', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    expect(m.columns[0].effectiveTemperature).toBe(1060) // override
    expect(m.columns[0].hasOwnFiringOverride).toBe(true)
    expect(m.columns[0].effectiveAtmosphereLabel).toBe('Reducción')
    expect(m.columns[1].effectiveTemperature).toBe(1060) // del lote
    expect(m.columns[1].hasOwnFiringOverride).toBe(false)
  })

  it('proyecto sin resultado en esa composición → registered=false', () => {
    const empty = mkProj({ id: 'c', name: 'Sin', results: {} })
    const m = buildComparisonReportModel({ projects: [projA, empty], compositionKeyValue: '40|20|40' })
    expect(m.columns[0].registered).toBe(true)
    expect(m.columns[1].registered).toBe(false)
  })

  it('differencesList incluye Temp cocción y Color observado', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    // Temp cocción: 1040 vs 1060 (proyecto, no override) → diferente
    expect(m.differencesList.some((d) => /Temp cocción/.test(d))).toBe(true)
    // Color observado difiere
    expect(m.differencesList.some((d) => /Color observado/.test(d))).toBe(true)
  })

  it('sin diferencias → lista vacía', () => {
    const p1 = mkProj({ id: '1', name: 'A' })
    const p2 = mkProj({ id: '2', name: 'B' })
    const m = buildComparisonReportModel({ projects: [p1, p2], compositionKeyValue: '100|0|0' })
    expect(m.differencesList).toEqual([])
  })

  it('recipeRows tiene 3 vértices con estado', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    expect(m.recipeRows.map((r) => r.vertex)).toEqual(['A', 'B', 'C'])
    expect(m.recipeRows.every((r) => r.perColumn.length === 2)).toBe(true)
  })

  it('acepta seriesName opcional', () => {
    const m = buildComparisonReportModel({
      projects: [projA, projB], compositionKeyValue: '40|20|40',
      seriesName: 'Engobes',
    })
    expect(m.seriesName).toBe('Engobes')
  })

  it('acepta photoDataUrls opcional', () => {
    const m = buildComparisonReportModel({
      projects: [projA, projB], compositionKeyValue: '40|20|40',
      photoDataUrls: { 'a::9': 'data:image/png;base64,XXX' },
    })
    expect(m.columns[0].photoDataUrl).toBe('data:image/png;base64,XXX')
    expect(m.columns[1].photoDataUrl).toBeUndefined()
  })
})

describe('buildProjectComparisonReportHtml', () => {
  const projA = mkProj({ id: 'a', name: 'QA 1040' })
  const projB = mkProj({ id: 'b', name: 'QA 1060' })
  const projC = mkProj({ id: 'c', name: 'QA Gres' })

  it('2 proyectos → HTML contiene 2 columnas', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    const html = buildProjectComparisonReportHtml(m)
    const cardCount = (html.match(/class="result-card"/g) ?? []).length
    expect(cardCount).toBe(2)
    expect(html).toContain('repeat(2, 1fr)')
  })

  it('3 proyectos → HTML contiene 3 columnas', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB, projC], compositionKeyValue: '40|20|40' })
    const html = buildProjectComparisonReportHtml(m)
    const cardCount = (html.match(/class="result-card"/g) ?? []).length
    expect(cardCount).toBe(3)
    expect(html).toContain('repeat(3, 1fr)')
  })

  it('@page landscape declarado', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '40|20|40' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).toContain('@page { size: A4 landscape')
  })

  it('escapa nombres con HTML malicioso', () => {
    const evil = mkProj({ id: 'e', name: '<script>alert(1)</script>' })
    const m = buildComparisonReportModel({ projects: [evil, projB], compositionKeyValue: '100|0|0' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('notas con caracteres especiales se escapan', () => {
    const p = mkProj({ id: 'p', name: 'P', results: { 1: { notes: '<b>hola</b> & "cita"' } } })
    const p2 = mkProj({ id: 'p2', name: 'P2' })
    const m = buildComparisonReportModel({ projects: [p, p2], compositionKeyValue: '100|0|0' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).not.toContain('<b>hola</b>')
    expect(html).toContain('&lt;b&gt;hola&lt;/b&gt; &amp; &quot;cita&quot;')
  })

  it('foto data URL se incluye', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    const m = buildComparisonReportModel({
      projects: [projA, projB], compositionKeyValue: '100|0|0',
      photoDataUrls: { 'a::1': dataUrl },
    })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).toContain(`src="${dataUrl}"`)
  })

  it('proyecto sin resultado → "SIN RESULTADO REGISTRADO"', () => {
    const p1 = mkProj({ id: '1', name: 'A', results: { 1: { observedColor: '#000' } } })
    const p2 = mkProj({ id: '2', name: 'B', results: {} })
    const m = buildComparisonReportModel({ projects: [p1, p2], compositionKeyValue: '100|0|0' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).toContain('SIN RESULTADO REGISTRADO')
  })

  it('override de muestra genera bloque destacado', () => {
    const p = mkProj({ id: 'a', name: 'A', results: {
      1: { temperature: 1080, atmosphere: 'reduccion' },
    } })
    const p2 = mkProj({ id: 'b', name: 'B' })
    const m = buildComparisonReportModel({ projects: [p, p2], compositionKeyValue: '100|0|0' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).toContain('Condición propia de muestra')
    expect(html).toContain('1080 °C')
  })

  it('disclaimer sin causalidad presente', () => {
    const m = buildComparisonReportModel({ projects: [projA, projB], compositionKeyValue: '100|0|0' })
    const html = buildProjectComparisonReportHtml(m)
    expect(html).toContain('No establece relaciones causales')
  })

  it('etiquetas de recipe status usan versiones humanas', () => {
    expect(RECIPE_STATUS_LABEL.identical).toBe('Coincidente')
    expect(RECIPE_STATUS_LABEL.compatible_legacy).toBe('Coincidencia legacy')
    expect(RECIPE_STATUS_LABEL.ambiguous).toBe('Identidad ambigua')
    expect(RECIPE_STATUS_LABEL.different).toBe('Diferente')
  })
})
