import { describe, expect, it } from 'vitest'
import { generateMonoaxial, MONOAXIAL_SAMPLE_ID } from '../generateMonoaxial'
import { createMonoaxialProject, createDefaultProject } from '../defaults'
import { calculateMonoPreparation } from '../calculateMonoPreparation'
import { deserializeProject, serializeProject } from '../serialization'
import { expectedComponentCount, requireExperimentStep, getExperimentStep } from '../experimentAdapter'
import { countRegistered } from '../resultStatus'
import type { FormulaComponent } from '../../types/material'

describe('Fase 2 — monoaxial generator', () => {
  it('generateMonoaxial produce 1 muestra con composition {id: 100}', () => {
    const samples = generateMonoaxial('formula')
    expect(samples).toHaveLength(1)
    expect(samples[0].id).toBe(MONOAXIAL_SAMPLE_ID)
    expect(samples[0].composition).toEqual({ formula: 100 })
    const sum = Object.values(samples[0].composition).reduce((a, b) => a + b, 0)
    expect(sum).toBe(100)
  })

  it('respeta un id arbitrario distinto de "formula"', () => {
    const samples = generateMonoaxial('mi-receta')
    expect(samples[0].composition['mi-receta']).toBe(100)
  })

  it('rechaza id vacío', () => {
    expect(() => generateMonoaxial('')).toThrow()
  })

  it('expectedComponentCount para los tres modos', () => {
    expect(expectedComponentCount('monoaxial')).toBe(1)
    expect(expectedComponentCount('biaxial')).toBe(2)
    expect(expectedComponentCount('triaxial')).toBe(3)
  })
})

describe('Fase 2 — createMonoaxialProject default', () => {
  it('mode monoaxial, 1 componente "formula", sin step', () => {
    const p = createMonoaxialProject()
    expect(p.mode).toBe('monoaxial')
    expect(p.components).toHaveLength(1)
    expect(p.components[0].id).toBe('formula')
    expect(p.step).toBeUndefined()
    expect(p.sampleWeight).toBe(100)
    expect(p.preparationMargin).toBe(10)
    expect(p.results).toEqual({})
    expect(p.components[0].recipe).toEqual({ ingredients: [] })
  })

  it('createDefaultProject sigue siendo triaxial con step 20 y 3 componentes A/B/C', () => {
    const p = createDefaultProject()
    expect(p.mode).toBe('triaxial')
    expect(p.step).toBe(20)
    expect(p.components.map((c) => c.id)).toEqual(['A', 'B', 'C'])
    expect(p.sampleWeight).toBe(20)
  })
})

describe('Fase 2 — calculateMonoPreparation', () => {
  const recipeComponent: FormulaComponent = {
    id: 'formula',
    name: 'Esmalte blanco',
    type: 'esmalte',
    color: '#d8d3ca',
    recipe: {
      ingredients: [
        { id: 'i1', name: 'Caolín', percentage: 20 },
        { id: 'i2', name: 'Feldespato potásico', percentage: 40 },
        { id: 'i3', name: 'Sílice', percentage: 25 },
        { id: 'i4', name: 'Carbonato de calcio', percentage: 10 },
        { id: 'i5', name: 'Óxido de zinc', percentage: 5 },
      ],
    },
  }

  it('500g +10% → 550g con pesada por ingrediente', () => {
    const prep = calculateMonoPreparation(recipeComponent, 500, 10)
    expect(prep.status.valid).toBe(true)
    expect(prep.baseWeight).toBe(500)
    expect(prep.marginPercent).toBe(10)
    expect(prep.totalWeight).toBeCloseTo(550)

    const byName = Object.fromEntries(prep.ingredients.map((i) => [i.name, i.grams]))
    expect(byName['Caolín']).toBeCloseTo(110, 6)
    expect(byName['Feldespato potásico']).toBeCloseTo(220, 6)
    expect(byName['Sílice']).toBeCloseTo(137.5, 6)
    expect(byName['Carbonato de calcio']).toBeCloseTo(55, 6)
    expect(byName['Óxido de zinc']).toBeCloseTo(27.5, 6)

    const sum = prep.ingredients.reduce((s, i) => s + i.grams, 0)
    expect(sum).toBeCloseTo(550, 6)
  })

  it('receta inválida (95%) → status invalid, sin ingredientes calculados', () => {
    const invalid: FormulaComponent = {
      ...recipeComponent,
      recipe: {
        ingredients: [
          { id: 'i1', name: 'Caolín', percentage: 20 },
          { id: 'i2', name: 'Feldespato potásico', percentage: 40 },
          { id: 'i3', name: 'Sílice', percentage: 25 },
          { id: 'i4', name: 'Carbonato', percentage: 10 },
          // falta el 5 % del óxido → total 95 %
        ],
      },
    }
    const prep = calculateMonoPreparation(invalid, 500, 10)
    expect(prep.status.valid).toBe(false)
    if (!prep.status.valid) {
      expect(prep.status.reason).toBe('invalid-recipe-total')
      if (prep.status.reason === 'invalid-recipe-total') {
        expect(prep.status.recipeTotal).toBeCloseTo(95)
      }
    }
    expect(prep.ingredients).toEqual([])
  })

  it('material simple sin receta → 1 entrada con el nombre del componente', () => {
    const simple: FormulaComponent = {
      id: 'formula', name: 'Caolín', type: 'material', color: '#eeeeee',
    }
    const prep = calculateMonoPreparation(simple, 500, 10)
    expect(prep.status.valid).toBe(true)
    expect(prep.ingredients).toHaveLength(1)
    expect(prep.ingredients[0]).toMatchObject({ name: 'Caolín', grams: 550 })
  })

  it('receta vacía → status "empty-recipe"', () => {
    const empty: FormulaComponent = {
      id: 'formula', name: 'Vacía', type: 'receta', color: '#fff',
      recipe: { ingredients: [] },
    }
    const prep = calculateMonoPreparation(empty, 500, 10)
    expect(prep.status.valid).toBe(false)
    if (!prep.status.valid) {
      expect(prep.status.reason).toBe('empty-recipe')
    }
  })

  it('materialId se preserva en los ingredientes expandidos', () => {
    const linked: FormulaComponent = {
      id: 'formula', name: 'E', type: 'esmalte', color: '#000',
      recipe: {
        ingredients: [
          { id: 'i1', materialId: 'lib-123', name: 'Caolín', percentage: 60 },
          { id: 'i2', name: 'Sílice', percentage: 40 },
        ],
      },
    }
    const prep = calculateMonoPreparation(linked, 100, 0)
    expect(prep.status.valid).toBe(true)
    const kaolin = prep.ingredients.find((i) => i.name === 'Caolín')
    expect(kaolin?.materialId).toBe('lib-123')
    const silica = prep.ingredients.find((i) => i.name === 'Sílice')
    expect(silica?.materialId).toBeUndefined()
  })
})

describe('Fase 2 — mono serialization roundtrip', () => {
  it('JSON mono: version 3, mode monoaxial, sin vertices, sin step, con components', () => {
    const p = createMonoaxialProject('QA Mono')
    p.components[0].recipe = {
      ingredients: [
        { id: 'i1', name: 'Caolín', percentage: 50 },
        { id: 'i2', name: 'Sílice', percentage: 50 },
      ],
    }
    const json = serializeProject(p)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(3)
    expect(parsed.mode).toBe('monoaxial')
    expect(parsed.components).toHaveLength(1)
    expect(parsed.components[0].id).toBe('formula')
    expect('vertices' in parsed).toBe(false)
    expect('step' in parsed).toBe(false)
    expect(parsed.sampleWeight).toBe(100)
    expect(parsed.app).toBe('MonkLab')
  })

  it('mono roundtrip: deserialize(serialize) preserva estructura', () => {
    const p = createMonoaxialProject('QA Mono 2')
    p.sampleWeight = 500
    p.preparationMargin = 10
    p.balancePrecision = 0.1
    p.firing = { temperature: 1040, cone: '06', atmosphere: 'oxidacion' }
    p.experiment = { substrate: 'Loza blanca', bisqueTemperature: 950, applicationMethod: 'inmersion', coats: 2 }
    p.results = { 1: { observedColor: '#eeeeee', notes: 'blanco satinado' } }
    p.components[0].recipe = {
      ingredients: [
        { id: 'i1', name: 'Caolín', percentage: 20 },
        { id: 'i2', name: 'Feldespato', percentage: 80 },
      ],
    }
    const rt = deserializeProject(serializeProject(p))
    expect(rt.mode).toBe('monoaxial')
    expect(rt.components).toHaveLength(1)
    expect(rt.components[0].name).toBe(p.components[0].name)
    expect(rt.sampleWeight).toBe(500)
    expect(rt.balancePrecision).toBe(0.1)
    expect(rt.firing?.temperature).toBe(1040)
    expect(rt.experiment?.substrate).toBe('Loza blanca')
    expect(rt.results[1]?.observedColor).toBe('#eeeeee')
    expect(rt.components[0].recipe?.ingredients).toHaveLength(2)
    expect(rt.step).toBeUndefined()
  })

  it('mono con mode "biaxial" en el JSON → deserialize OK, pero isSupportedUIMode falso (guard en UI)', () => {
    const biJson = JSON.stringify({
      version: 3, mode: 'biaxial', id: 'bi1', name: 'Bi',
      createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z',
      step: 20, sampleWeight: 20, preparationMargin: 10,
      components: [
        { id: 'A', name: 'A', type: 'material', color: '#aa0000' },
        { id: 'B', name: 'B', type: 'material', color: '#00aa00' },
      ],
    })
    const p = deserializeProject(biJson)
    expect(p.mode).toBe('biaxial') // schema acepta
    // El guard de UI vive en isSupportedUIMode y lo cubre otro test.
  })

  it('triaxial sigue requiriendo step válido (regresión)', () => {
    const bad = JSON.stringify({
      version: 3, mode: 'triaxial', id: 'tx', name: 'T',
      createdAt: '2026-10-20T00:00:00.000Z', updatedAt: '2026-10-20T00:00:00.000Z',
      // step ausente
      sampleWeight: 20, preparationMargin: 10,
      components: [
        { id: 'A', name: 'A', type: 'material', color: '#aa0000' },
        { id: 'B', name: 'B', type: 'material', color: '#00aa00' },
        { id: 'C', name: 'C', type: 'material', color: '#0000aa' },
      ],
    })
    expect(() => deserializeProject(bad)).toThrow(/División/)
  })
})

describe('Fase 2 — helpers de step', () => {
  it('requireExperimentStep lanza en mono', () => {
    const p = createMonoaxialProject()
    expect(() => requireExperimentStep(p)).toThrow()
  })

  it('requireExperimentStep devuelve step en triaxial', () => {
    const p = createDefaultProject()
    expect(requireExperimentStep(p)).toBe(20)
  })

  it('getExperimentStep → undefined en mono, número en triaxial', () => {
    expect(getExperimentStep(createMonoaxialProject())).toBeUndefined()
    expect(getExperimentStep(createDefaultProject())).toBe(20)
  })
})

describe('Fase 2 — resultado mono y conteo', () => {
  it('results[1] vacío = 0/1; con color = 1/1', () => {
    const p = createMonoaxialProject()
    expect(countRegistered([MONOAXIAL_SAMPLE_ID], p.results)).toBe(0)
    const withResult = { ...p, results: { 1: { observedColor: '#ffffff' } } }
    expect(countRegistered([MONOAXIAL_SAMPLE_ID], withResult.results)).toBe(1)
  })
})
