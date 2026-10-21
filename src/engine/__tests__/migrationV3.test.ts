import { describe, expect, it, vi } from 'vitest'
import { deserializeProject, migrateProjectPhotos, serializeProject } from '../serialization'
import { createDefaultProject } from '../defaults'
import { generateTriaxial } from '../generateTriaxial'
import { calculatePreparation } from '../calculatePreparation'
import { expandSample } from '../expandRecipe'
import { PROJECT_VERSION } from '../../types/project'

vi.mock('../../storage/imageStorage', () => ({
  saveSampleImage: vi.fn(async () => undefined),
  loadSampleImage: vi.fn(async () => null),
  deleteProjectImages: vi.fn(async () => undefined),
  deleteSampleImage: vi.fn(async () => undefined),
}))
import { saveSampleImage } from '../../storage/imageStorage'

const V2_FIXTURE = {
  version: 2,
  id: 'qa-1040',
  name: 'QA 1040',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-10T00:00:00.000Z',
  step: 20,
  sampleWeight: 20,
  preparationMargin: 10,
  balancePrecision: 0.01 as const,
  vertices: {
    A: {
      id: 'A', name: 'Base caolín', type: 'material', color: '#f4e8d0',
      recipe: {
        ingredients: [
          { id: 'i1', materialId: 'mat-caolin', name: 'Caolín', percentage: 70 },
          { id: 'i2', materialId: 'mat-arcilla', name: 'Arcilla bola', percentage: 30 },
        ],
      },
    },
    B: {
      id: 'B', name: 'Fundente', type: 'material', color: '#a54835',
      recipe: {
        ingredients: [
          { id: 'i3', materialId: 'mat-feldk', name: 'Feldespato potásico', percentage: 60 },
          { id: 'i4', materialId: 'mat-silice', name: 'Sílice', percentage: 40 },
        ],
      },
    },
    C: {
      id: 'C', name: 'Colorante', type: 'oxido', color: '#315a87',
      recipe: {
        ingredients: [
          { id: 'i5', materialId: 'mat-fe', name: 'Óxido hierro', percentage: 80 },
          { id: 'i6', materialId: 'mat-co', name: 'Carbonato cobalto', percentage: 20 },
        ],
      },
    },
  },
  firing: { temperature: 1040, atmosphere: 'oxidacion', cone: '06', kiln: 'Horno QA' },
  experiment: { substrate: 'Loza blanca', bisqueTemperature: 950, applicationMethod: 'inmersion', coats: 2 },
  results: {
    1: { observedColor: '#ffffff', surface: 'satinada', notes: 'vértice A' },
    9: { observedColor: '#75696c', surface: 'satinada', gloss: 2, opacity: 3 },
    21: { observedColor: '#315a87', surface: 'brillante' },
  },
}

describe('migración V2 → V3', () => {
  it('deserialize V2 produce runtime V3 con mode=triaxial y 3 components A/B/C', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    expect(p.version).toBe(PROJECT_VERSION)
    expect(p.version).toBe(3)
    expect(p.mode).toBe('triaxial')
    expect(p.components).toHaveLength(3)
    expect(p.components.map((c) => c.id)).toEqual(['A', 'B', 'C'])
    expect(p.components[0].name).toBe('Base caolín')
    expect(p.components[1].name).toBe('Fundente')
    expect(p.components[2].name).toBe('Colorante')
  })

  it('serialize V3 NO incluye vertices', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    const json = JSON.parse(serializeProject(p))
    expect(json.version).toBe(3)
    expect(json.mode).toBe('triaxial')
    expect(Array.isArray(json.components)).toBe(true)
    expect(json.components).toHaveLength(3)
    expect(json.vertices).toBeUndefined()
  })

  it('preserva id, createdAt, firing, experiment, balancePrecision, step, sampleWeight, margin', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    expect(p.id).toBe('qa-1040')
    expect(p.name).toBe('QA 1040')
    expect(p.createdAt).toBe('2026-08-01T00:00:00.000Z')
    expect(p.updatedAt).toBe('2026-08-10T00:00:00.000Z')
    expect(p.step).toBe(20)
    expect(p.sampleWeight).toBe(20)
    expect(p.preparationMargin).toBe(10)
    expect(p.balancePrecision).toBe(0.01)
    expect(p.firing).toMatchObject({ temperature: 1040, cone: '06', atmosphere: 'oxidacion', kiln: 'Horno QA' })
    expect(p.experiment).toMatchObject({ substrate: 'Loza blanca', bisqueTemperature: 950 })
  })

  it('preserva results con los mismos sample ids', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    expect(Object.keys(p.results).sort((a, b) => Number(a) - Number(b))).toEqual(['1', '9', '21'])
    expect(p.results[9]).toMatchObject({ observedColor: '#75696c', surface: 'satinada', gloss: 2, opacity: 3 })
  })

  it('preserva materialId en ingredientes', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    expect(p.components[0].recipe?.ingredients[0].materialId).toBe('mat-caolin')
    expect(p.components[0].recipe?.ingredients[1].materialId).toBe('mat-arcilla')
    expect(p.components[2].recipe?.ingredients[1].materialId).toBe('mat-co')
  })

  it('preserva vista derivada vertices.A/B/C para la UI triaxial', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    expect(p.vertices.A.name).toBe('Base caolín')
    expect(p.vertices.B.name).toBe('Fundente')
    expect(p.vertices.C.name).toBe('Colorante')
    expect(p.vertices.A.recipe?.ingredients[0].name).toBe('Caolín')
  })
})

describe('invariantes matemáticos preservados tras V2→V3', () => {
  it('step 20 → 21 muestras, T09=40/20/40, T01=100/0/0, T21=0/0/100', () => {
    const samples = generateTriaxial(20)
    expect(samples).toHaveLength(21)
    expect(samples[0]).toMatchObject({ id: 1, a: 100, b: 0, c: 0 })
    expect(samples[8]).toMatchObject({ id: 9, a: 40, b: 20, c: 40 })
    expect(samples[20]).toMatchObject({ id: 21, a: 0, b: 0, c: 100 })
  })

  it('pesada T09 20g = A8/B4/C8 y receta expandida idéntica', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    const samples = generateTriaxial(p.step!)
    const t09 = samples.find((s) => s.id === 9)!
    const expansion = expandSample(t09, p.vertices, p.sampleWeight)
    expect(expansion.valid).toBe(true)
    if (!expansion.valid) return

    // Pesos por vértice: A=8, B=4, C=8
    // Receta expandida esperada (según el fixture):
    //   A (70/30 caolín/arcilla sobre 8g):   Caolín 5.6, Arcilla bola 2.4
    //   B (60/40 feldk/sílice sobre 4g):     Feldespato potásico 2.4, Sílice 1.6
    //   C (80/20 FeO/CoCO3 sobre 8g):        Óxido hierro 6.4, Carbonato cobalto 1.6
    const byName = Object.fromEntries(expansion.ingredients.map((i) => [i.name, i.grams]))
    expect(byName['Caolín']).toBeCloseTo(5.6, 10)
    expect(byName['Arcilla bola']).toBeCloseTo(2.4, 10)
    expect(byName['Feldespato potásico']).toBeCloseTo(2.4, 10)
    expect(byName['Sílice']).toBeCloseTo(1.6, 10)
    expect(byName['Óxido hierro']).toBeCloseTo(6.4, 10)
    expect(byName['Carbonato cobalto']).toBeCloseTo(1.6, 10)
  })

  it('calculatePreparation sobre proyecto migrado: 21 muestras, 420g totales, 462g con margen 10%', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    const prep = calculatePreparation(generateTriaxial(p.step!), p.vertices, p.sampleWeight, p.preparationMargin)
    expect(prep.sampleCount).toBe(21)
    expect(prep.grossTotal).toBeCloseTo(420)
    expect(prep.withMarginTotal).toBeCloseTo(462)
    expect(prep.invalidRecipes).toHaveLength(0)
  })
})

describe('createDefaultProject V3', () => {
  it('nace como V3 triaxial con 3 components A/B/C', () => {
    const p = createDefaultProject()
    expect(p.version).toBe(3)
    expect(p.mode).toBe('triaxial')
    expect(p.components).toHaveLength(3)
    expect(p.components.map((c) => c.id)).toEqual(['A', 'B', 'C'])
    expect(p.step).toBe(20)
    expect(p.sampleWeight).toBe(20)
    expect(p.preparationMargin).toBe(10)
    expect(p.components[0].color).toBe('#f4e8d0')
    expect(p.components[1].color).toBe('#a54835')
    expect(p.components[2].color).toBe('#315a87')
  })
  it('vista derivada vertices refleja components', () => {
    const p = createDefaultProject('X')
    expect(p.vertices.A.color).toBe('#f4e8d0')
    expect(p.vertices.B.color).toBe('#a54835')
    expect(p.vertices.C.color).toBe('#315a87')
  })
})

describe('V3 roundtrip', () => {
  it('serialize → deserialize → serialize es estructuralmente estable y sin vertices', () => {
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    const j1 = JSON.parse(serializeProject(p))
    const p2 = deserializeProject(JSON.stringify(j1))
    const j2 = JSON.parse(serializeProject(p2))

    expect(j1.version).toBe(3)
    expect(j2.version).toBe(3)
    expect(j1.vertices).toBeUndefined()
    expect(j2.vertices).toBeUndefined()
    expect(j1.components).toEqual(j2.components)
    expect(j1.mode).toBe(j2.mode)
    expect(j1.id).toBe(j2.id)
    expect(j1.step).toBe(j2.step)
    expect(j1.sampleWeight).toBe(j2.sampleWeight)
    expect(j1.results).toEqual(j2.results)
  })

  it('reimportar V3 es idempotente (3 components, sin duplicar)', () => {
    const p1 = deserializeProject(JSON.stringify(V2_FIXTURE))
    const p2 = deserializeProject(serializeProject(p1))
    expect(p2.components).toHaveLength(3)
    expect(p2.components.map((c) => c.id)).toEqual(['A', 'B', 'C'])
    expect(p2.components[0].recipe?.ingredients[0].percentage).toBe(70)
  })
})

describe('V1 photo migration — pipeline completo', () => {
  it('V1 con result.photo base64 → saveSampleImage se llama, hasPhoto=true', async () => {
    vi.mocked(saveSampleImage).mockClear()
    const V1 = {
      version: 1,
      id: 'legacy-v1',
      name: 'Legacy',
      vertices: { A: {}, B: {}, C: {} },
      step: 20,
      sampleWeight: 20,
      results: {
        9: {
          observedColor: '#75696c',
          // 1x1 PNG transparente
          photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        },
      },
    }
    const p = await migrateProjectPhotos(JSON.stringify(V1))
    expect(p.version).toBe(3)
    expect(p.mode).toBe('triaxial')
    expect(p.results[9].hasPhoto).toBe(true)
    expect(saveSampleImage).toHaveBeenCalledTimes(1)
    expect(saveSampleImage).toHaveBeenCalledWith('legacy-v1', 9, expect.any(Blob))
  })
})

describe('V2 → V3 NO toca IndexedDB', () => {
  it('migrateProjectPhotos sobre V2 NUNCA llama saveSampleImage', async () => {
    vi.mocked(saveSampleImage).mockClear()
    await migrateProjectPhotos(JSON.stringify(V2_FIXTURE))
    expect(saveSampleImage).not.toHaveBeenCalled()
  })

  it('migrateProjectPhotos sobre V3 NUNCA llama saveSampleImage', async () => {
    vi.mocked(saveSampleImage).mockClear()
    const p = deserializeProject(JSON.stringify(V2_FIXTURE))
    const v3Json = serializeProject(p)
    await migrateProjectPhotos(v3Json)
    expect(saveSampleImage).not.toHaveBeenCalled()
  })

  it('hasPhoto=true en V2 se preserva sin interpretarse como legacy base64', async () => {
    vi.mocked(saveSampleImage).mockClear()
    const V2_WITH_PHOTO = {
      ...V2_FIXTURE,
      id: 'with-photo',
      results: { 9: { ...V2_FIXTURE.results[9], hasPhoto: true } },
    }
    const p = await migrateProjectPhotos(JSON.stringify(V2_WITH_PHOTO))
    expect(p.results[9].hasPhoto).toBe(true)
    expect(saveSampleImage).not.toHaveBeenCalled()
  })
})

describe('versiones futuras', () => {
  it('version 999 → rechaza', () => {
    expect(() => deserializeProject(JSON.stringify({
      version: 999, vertices: { A: {}, B: {}, C: {} }, step: 20, sampleWeight: 20,
    }))).toThrow(/no soportada/)
  })
})
