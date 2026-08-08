import { describe, expect, it } from 'vitest'
import { chunkSamplesForLabels, buildLabelsHtml } from '../printLabelsDocument'
import { generateTriaxial } from '../../engine/generateTriaxial'

describe('chunkSamplesForLabels', () => {
  it('step 20 → 21 muestras → 1 página', () => {
    const pages = chunkSamplesForLabels(generateTriaxial(20))
    expect(pages).toHaveLength(1)
    expect(pages[0]).toHaveLength(21)
  })

  it('step 25 → 15 muestras → 1 página', () => {
    const pages = chunkSamplesForLabels(generateTriaxial(25))
    expect(pages).toHaveLength(1)
    expect(pages[0]).toHaveLength(15)
  })

  it('step 10 → 66 muestras → 4 páginas (21+21+21+3)', () => {
    const pages = chunkSamplesForLabels(generateTriaxial(10))
    expect(pages.map((p) => p.length)).toEqual([21, 21, 21, 3])
  })

  it('step 5 → 231 muestras → 11 páginas (10×21 + 21)', () => {
    const pages = chunkSamplesForLabels(generateTriaxial(5))
    expect(pages).toHaveLength(11)
    expect(pages[10]).toHaveLength(21)
    expect(pages.reduce((n, p) => n + p.length, 0)).toBe(231)
  })

  it('samples vacíos → sin páginas', () => {
    expect(chunkSamplesForLabels([])).toEqual([])
  })

  it('respeta el orden original', () => {
    const samples = generateTriaxial(10)
    const pages = chunkSamplesForLabels(samples)
    const flat = pages.flat()
    expect(flat.map((s) => s.id)).toEqual(samples.map((s) => s.id))
  })
})

describe('buildLabelsHtml', () => {
  it('escapa caracteres HTML del nombre del proyecto', () => {
    const html = buildLabelsHtml('<script>alert("x")</script>', generateTriaxial(20))
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;')
  })

  it('genera exactamente N .label por página', () => {
    const html = buildLabelsHtml('Demo', generateTriaxial(20))
    const matches = html.match(/class="label"/g) ?? []
    expect(matches).toHaveLength(21)
  })

  it('incluye @page 7mm y grid 3×7', () => {
    const html = buildLabelsHtml('Demo', generateTriaxial(20))
    expect(html).toContain('@page { size: A4 portrait; margin: 7mm; }')
    expect(html).toContain('repeat(3, 1fr)')
    expect(html).toContain('repeat(7, 1fr)')
  })

  it('paginación: 66 muestras → 4 secciones .labels-page', () => {
    const html = buildLabelsHtml('Demo', generateTriaxial(10))
    const matches = html.match(/class="labels-page"/g) ?? []
    expect(matches).toHaveLength(4)
  })
})
