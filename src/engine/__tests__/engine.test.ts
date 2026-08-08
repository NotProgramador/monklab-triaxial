import { describe, expect, it } from 'vitest'
import { generateTriaxial, sampleCountForStep } from '../generateTriaxial'
import { barycentricToCartesian } from '../barycentric'
import { calculateSampleWeights } from '../calculateSampleWeights'
import { aggregateIngredients, expandSample, isRecipeValid, normalizeRecipeTo100, recipeTotal } from '../expandRecipe'
import { calculatePreparation } from '../calculatePreparation'
import { deserializeProject, serializeProject } from '../serialization'
import { createDefaultProject } from '../defaults'
import { buildStandaloneSvg } from '../exportSvg'
import type { VertexMaterial } from '../../types/material'

const V = {
  A: { id: 'A', name: 'A', type: 'material', color: '#ffffff' } as VertexMaterial,
  B: { id: 'B', name: 'B', type: 'material', color: '#000000' } as VertexMaterial,
  C: { id: 'C', name: 'C', type: 'material', color: '#888888' } as VertexMaterial,
}

describe('generateTriaxial', () => {
  it('step 20 -> 21 muestras', () => expect(generateTriaxial(20)).toHaveLength(21))
  it('step 25 -> 15', () => expect(generateTriaxial(25)).toHaveLength(15))
  it('step 10 -> 66', () => expect(generateTriaxial(10)).toHaveLength(66))
  it('step 5 -> 231', () => expect(generateTriaxial(5)).toHaveLength(231))
  it('sampleCountForStep', () => {
    expect(sampleCountForStep(20)).toBe(21)
    expect(sampleCountForStep(5)).toBe(231)
  })
  it('todas suman 100', () => {
    for (const s of generateTriaxial(20)) expect(s.a + s.b + s.c).toBe(100)
  })
  it('primera y última', () => {
    const list = generateTriaxial(20)
    expect(list[0]).toMatchObject({ id: 1, a: 100, b: 0, c: 0 })
    expect(list[20]).toMatchObject({ id: 21, a: 0, b: 0, c: 100 })
  })
  it('numeración step 20', () => {
    const list = generateTriaxial(20)
    expect(list[3]).toMatchObject({ id: 4, a: 60, b: 40, c: 0 })
    expect(list[7]).toMatchObject({ id: 8, a: 40, b: 40, c: 20 })
  })
})

describe('barycentric', () => {
  const verts = { A: { x: 0, y: 0 }, B: { x: 100, y: 0 }, C: { x: 50, y: 100 } }
  it('vértices', () => {
    expect(barycentricToCartesian(100, 0, 0, verts)).toEqual({ x: 0, y: 0 })
    expect(barycentricToCartesian(0, 100, 0, verts)).toEqual({ x: 100, y: 0 })
    expect(barycentricToCartesian(0, 0, 100, verts)).toEqual({ x: 50, y: 100 })
  })
})

describe('calculateSampleWeights', () => {
  it('40/20/40 con 20g -> 8/4/8', () => {
    const w = calculateSampleWeights({ id: 1, a: 40, b: 20, c: 40 }, 20)
    expect(w.a).toBe(8); expect(w.b).toBe(4); expect(w.c).toBe(8)
  })
  it('40/20/40 con 50g -> 20/10/20', () => {
    const w = calculateSampleWeights({ id: 1, a: 40, b: 20, c: 40 }, 50)
    expect(w.a).toBe(20); expect(w.b).toBe(10); expect(w.c).toBe(20)
  })
})

describe('expandRecipe (comportamiento estricto)', () => {
  const validRecipe: VertexMaterial = {
    id: 'A', name: 'Engobe', type: 'engobe', color: '#ffffff',
    recipe: { ingredients: [
      { id: '1', name: 'Caolín', percentage: 50 },
      { id: '2', name: 'Sílice', percentage: 30 },
      { id: '3', name: 'Feldespato', percentage: 20 },
    ] },
  }
  const shortRecipe: VertexMaterial = {
    id: 'A', name: 'Corta', type: 'engobe', color: '#ffffff',
    recipe: { ingredients: [
      { id: '1', name: 'Caolín', percentage: 50 },
      { id: '2', name: 'Sílice', percentage: 30 },
      { id: '3', name: 'Feldespato', percentage: 10 },
    ] },
  }
  const overRecipe: VertexMaterial = {
    id: 'A', name: 'Excedida', type: 'engobe', color: '#ffffff',
    recipe: { ingredients: [
      { id: '1', name: 'Caolín', percentage: 50 },
      { id: '2', name: 'Sílice', percentage: 40 },
      { id: '3', name: 'Feldespato', percentage: 20 },
    ] },
  }

  it('validación de totales', () => {
    expect(recipeTotal(validRecipe.recipe)).toBe(100)
    expect(isRecipeValid(validRecipe.recipe)).toBe(true)
    expect(isRecipeValid(shortRecipe.recipe)).toBe(false)
    expect(isRecipeValid(overRecipe.recipe)).toBe(false)
  })
  it('receta válida expande sin normalizar', () => {
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, { A: validRecipe, B: V.B, C: V.C }, 20)
    expect(r.valid).toBe(true)
    if (r.valid) {
      const cao = r.ingredients.find((p) => p.name === 'Caolín')!
      expect(cao.grams).toBeCloseTo(4)
    }
  })
  it('receta al 90% NO se expande silenciosamente', () => {
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, { A: shortRecipe, B: V.B, C: V.C }, 20)
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.invalidVertices[0].vertexId).toBe('A')
      expect(r.invalidVertices[0].total).toBeCloseTo(90)
    }
  })
  it('receta al 110% NO se expande silenciosamente', () => {
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, { A: overRecipe, B: V.B, C: V.C }, 20)
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.invalidVertices[0].total).toBeCloseTo(110)
    }
  })
  it('normalización explícita repara la receta', () => {
    const total = recipeTotal(shortRecipe.recipe)
    const normalized = {
      ...shortRecipe,
      recipe: {
        ingredients: shortRecipe.recipe!.ingredients.map((i) => ({
          ...i, percentage: (i.percentage / total) * 100,
        })),
      },
    }
    expect(recipeTotal(normalized.recipe)).toBeCloseTo(100)
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, { A: normalized, B: V.B, C: V.C }, 20)
    expect(r.valid).toBe(true)
  })
  it('receta declarada pero vacía es INVÁLIDA', () => {
    const empty: VertexMaterial = { ...V.A, recipe: { ingredients: [] } }
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, { A: empty, B: V.B, C: V.C }, 20)
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.invalidVertices[0].vertexId).toBe('A')
      expect(r.invalidVertices[0].total).toBe(0)
    }
    expect(isRecipeValid(empty.recipe)).toBe(false)
  })
  it('sin recipe se trata como material simple', () => {
    const r = expandSample({ id: 1, a: 40, b: 20, c: 40 }, V, 20)
    expect(r.valid).toBe(true)
  })
  it('normalizeRecipeTo100 suma exactamente 100.00', () => {
    const r = normalizeRecipeTo100({ ingredients: [
      { id: '1', name: 'a', percentage: 45 },
      { id: '2', name: 'b', percentage: 20 },
      { id: '3', name: 'c', percentage: 20 },
      { id: '4', name: 'd', percentage: 5 },
    ] })
    const total = r.ingredients.reduce((s, i) => s + i.percentage, 0)
    expect(total).toBe(100)
    for (const i of r.ingredients) {
      expect(Math.round(i.percentage * 100) / 100).toBe(i.percentage)
    }
  })
  it('agrega ingredientes duplicados sin colisión de nombre', () => {
    const agg = aggregateIngredients([
      { name: 'Caolín', grams: 2 },
      { name: 'caolín', grams: 3 },
      { name: 'Sílice', grams: 1 },
    ])
    expect(agg).toHaveLength(2)
    expect(agg.find((i) => i.name.toLowerCase() === 'caolín')!.grams).toBe(5)
  })
})

describe('calculatePreparation', () => {
  it('total con margen 10%', () => {
    const p = calculatePreparation(generateTriaxial(20), V, 20, 10)
    expect(p.sampleCount).toBe(21)
    expect(p.grossTotal).toBeCloseTo(420)
    expect(p.withMarginTotal).toBeCloseTo(462)
    expect(p.invalidRecipes).toHaveLength(0)
  })
  it('con receta inválida NO expande ingredientes', () => {
    const bad: VertexMaterial = {
      ...V.A, recipe: { ingredients: [{ id: '1', name: 'X', percentage: 60 }] },
    }
    const p = calculatePreparation(generateTriaxial(20), { A: bad, B: V.B, C: V.C }, 20, 10)
    expect(p.invalidRecipes).toHaveLength(1)
    expect(p.expandedIngredients).toHaveLength(0)
    expect(p.withMarginTotal).toBeCloseTo(462)
  })
})

describe('serialization', () => {
  it('roundtrip', () => {
    const p = createDefaultProject('Test')
    const rt = deserializeProject(serializeProject(p))
    expect(rt.name).toBe('Test'); expect(rt.step).toBe(20)
  })
  it('rechaza sin vértices', () => {
    expect(() => deserializeProject('{"version":1}')).toThrow()
  })
  it('rechaza versión futura', () => {
    expect(() => deserializeProject('{"version":999,"vertices":{"A":{},"B":{},"C":{}},"step":20,"sampleWeight":20}')).toThrow()
  })
  it('rechaza step inválido (17)', () => {
    expect(() =>
      deserializeProject('{"version":1,"vertices":{"A":{},"B":{},"C":{}},"step":17,"sampleWeight":20}'),
    ).toThrow(/División/)
  })
  it('rechaza peso inválido', () => {
    expect(() =>
      deserializeProject('{"version":1,"vertices":{"A":{},"B":{},"C":{}},"step":20,"sampleWeight":-1}'),
    ).toThrow(/Peso/)
  })
  it('roundtrip firing V1.2.1 (date, kiln, notes)', () => {
    const p = createDefaultProject('T')
    p.firing = {
      date: '2026-08-08', temperature: 1040, cone: '06',
      atmosphere: 'oxidacion', kiln: 'Horno eléctrico', notes: 'Curva estándar',
    }
    const rt = deserializeProject(serializeProject(p))
    expect(rt.firing).toMatchObject(p.firing)
  })

  it('firing.date con formato inválido → undefined', () => {
    const rt = deserializeProject(JSON.stringify({
      version: 2,
      vertices: { A: {}, B: {}, C: {} }, step: 20, sampleWeight: 20,
      firing: { date: '08/08/2026', temperature: 1040 },
    }))
    expect(rt.firing?.date).toBeUndefined()
    expect(rt.firing?.temperature).toBe(1040)
  })

  it('firing.temperature negativa → undefined', () => {
    const rt = deserializeProject(JSON.stringify({
      version: 2,
      vertices: { A: {}, B: {}, C: {} }, step: 20, sampleWeight: 20,
      firing: { temperature: -5 },
    }))
    expect(rt.firing?.temperature).toBeUndefined()
  })

  it('proyecto V1.1 sin firing sigue importando', () => {
    const rt = deserializeProject(JSON.stringify({
      version: 1,
      vertices: { A: {}, B: {}, C: {} }, step: 20, sampleWeight: 20,
    }))
    expect(rt.firing).toBeUndefined()
  })

  it('roundtrip gloss/opacity/fluidity en results', () => {
    const p = createDefaultProject('T')
    p.results = { 9: { observedColor: '#75696c', gloss: 3, opacity: 1, fluidity: 2 } }
    const rt = deserializeProject(serializeProject(p))
    expect(rt.results[9]).toMatchObject({ observedColor: '#75696c', gloss: 3, opacity: 1, fluidity: 2 })
  })

  it('rechaza percentage NaN convirtiéndolo a 0', () => {
    const p = deserializeProject(JSON.stringify({
      version: 1,
      vertices: {
        A: { id: 'A', name: 'A', color: '#ffffff', recipe: { ingredients: [{ id: '1', name: 'X', percentage: null }] } },
        B: {}, C: {},
      },
      step: 20, sampleWeight: 20,
    }))
    expect(p.vertices.A.recipe!.ingredients[0].percentage).toBe(0)
  })
})

describe('buildStandaloneSvg', () => {
  it('produce SVG con xmlns y sin dependencias externas', () => {
    const svg = buildStandaloneSvg({
      samples: generateTriaxial(20),
      step: 20,
      vertices: V,
      projectName: 'Ensayo',
    })
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 800 760"')
    expect(svg).toContain('Ensayo')
    expect(svg).toContain('100 %')
    expect(svg).not.toContain('class="')
  })

  it('NO dibuja anillo de selección aunque se pase selectedSampleId', () => {
    const svg = buildStandaloneSvg({
      samples: generateTriaxial(20),
      step: 20,
      vertices: V,
      selectedSampleId: 13,
    })
    expect(svg).not.toContain('sample-node-ring')
    // Solo hay 21 <circle> — uno por muestra, sin anillo extra
    const circles = svg.match(/<circle /g) ?? []
    expect(circles).toHaveLength(21)
  })

  it('step 5 conserva los 231 números de muestra (documental)', () => {
    const svg = buildStandaloneSvg({
      samples: generateTriaxial(5),
      step: 5,
      vertices: V,
    })
    // Cada muestra emite un <text>...id</text>. 231 muestras + 3 labels de vértice (id) + 3 nombres + 3 percent = 240 <text>
    const texts = svg.match(/<text /g) ?? []
    expect(texts.length).toBeGreaterThanOrEqual(231)
  })
})
