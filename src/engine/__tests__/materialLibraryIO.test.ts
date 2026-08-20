import { describe, expect, it } from 'vitest'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import {
  LIBRARY_EXPORT_KIND,
  LIBRARY_EXPORT_VERSION,
  LibraryImportError,
  applyImportPlan,
  parseLibraryFile,
  planImport,
  serializeLibrary,
} from '../materialLibraryIO'
import { normalizeMaterialName } from '../materialIdentity'
import { PRESET_MEXICO_CDMX } from '../../data/materialPresets'

const now = new Date().toISOString()
const mk = (id: string, name: string, overrides: Partial<LibraryMaterial> = {}): LibraryMaterial => ({
  id, name, category: 'otro', createdAt: now, updatedAt: now, ...overrides,
})

describe('serializeLibrary', () => {
  it('produce envelope canónico y materiales ordenados por nombre', () => {
    const raw = serializeLibrary([mk('b', 'Zeta'), mk('a', 'Alfa')])
    const p = JSON.parse(raw)
    expect(p.app).toBe('MonkLab - Triaxial')
    expect(p.kind).toBe(LIBRARY_EXPORT_KIND)
    expect(p.version).toBe(LIBRARY_EXPORT_VERSION)
    expect(p.materials.map((m: LibraryMaterial) => m.name)).toEqual(['Alfa', 'Zeta'])
  })
})

describe('parseLibraryFile', () => {
  it('roundtrip serializar → parsear', () => {
    const list = [mk('a', 'Caolín', { category: 'arcilla' }), mk('b', 'Sílice', { category: 'silice', formula: 'SiO2' })]
    const parsed = parseLibraryFile(serializeLibrary(list))
    expect(parsed).toHaveLength(2)
    expect(parsed.find((m) => m.name === 'Sílice')?.formula).toBe('SiO2')
  })

  it('JSON malformado → LibraryImportError', () => {
    expect(() => parseLibraryFile('not json {')).toThrow(LibraryImportError)
  })

  it('kind incorrecto → LibraryImportError', () => {
    expect(() => parseLibraryFile(JSON.stringify({ kind: 'project', version: 1, materials: [] }))).toThrow(/no es una biblioteca/)
  })

  it('versión no soportada → LibraryImportError', () => {
    expect(() => parseLibraryFile(JSON.stringify({ kind: LIBRARY_EXPORT_KIND, version: 99, materials: [] }))).toThrow(/no soportada/)
  })

  it('material sin nombre → LibraryImportError', () => {
    expect(() => parseLibraryFile(JSON.stringify({
      kind: LIBRARY_EXPORT_KIND, version: 1, materials: [{ id: 'x', name: '', category: 'otro' }],
    }))).toThrow(/sin nombre/)
  })

  it('categoría inválida → LibraryImportError', () => {
    expect(() => parseLibraryFile(JSON.stringify({
      kind: LIBRARY_EXPORT_KIND, version: 1, materials: [{ id: 'x', name: 'X', category: 'no-existe' }],
    }))).toThrow(/categoría inválida/)
  })

  it('id ausente → genera UUID', () => {
    const parsed = parseLibraryFile(JSON.stringify({
      kind: LIBRARY_EXPORT_KIND, version: 1,
      materials: [{ name: 'X', category: 'otro' }],
    }))
    expect(parsed[0].id).toMatch(/-/)
  })

  it('rechaza materiales que no es un arreglo', () => {
    expect(() => parseLibraryFile(JSON.stringify({ kind: LIBRARY_EXPORT_KIND, version: 1, materials: 'x' }))).toThrow(/arreglo de materiales/)
  })
})

describe('planImport', () => {
  const existing = [mk('id1', 'Caolín', { category: 'arcilla' })]

  it('clasifica material nuevo', () => {
    const p = planImport([mk('id2', 'Sílice', { category: 'silice' })], existing)
    expect(p.newCount).toBe(1)
    expect(p.duplicateCount).toBe(0)
  })

  it('clasifica duplicado por nombre normalizado (CAOLÍN)', () => {
    const p = planImport([mk('id2', ' CAOLÍN ', { category: 'arcilla' })], existing)
    expect(p.duplicateCount).toBe(1)
    expect(p.newCount).toBe(0)
  })

  it('clasifica idéntico (mismo id + mismo contenido)', () => {
    const p = planImport([mk('id1', 'Caolín', { category: 'arcilla' })], existing)
    expect(p.identicalCount).toBe(1)
  })

  it('colisión de UUID con contenido distinto → duplicate-name (no identical)', () => {
    const p = planImport([mk('id1', 'Feldespato', { category: 'feldespato' })], existing)
    // El name "Feldespato" no colisiona con "Caolín", pero id sí; sin embargo
    // el contenido difiere → status "new" (no identical), y el applyImportPlan
    // le asignará nuevo UUID para no sobrescribir.
    expect(p.entries[0].status).toBe('new')
  })
})

describe('applyImportPlan', () => {
  const existing = [mk('id1', 'Caolín', { category: 'arcilla' })]

  it('onlyNew=true importa sólo nuevos', () => {
    const inc = [
      mk('a', 'Sílice', { category: 'silice' }),
      mk('b', 'CAOLÍN', { category: 'arcilla' }),
    ]
    const plan = planImport(inc, existing)
    const res = applyImportPlan(plan, existing, true)
    expect(res).toHaveLength(2)
    expect(res.map((m) => m.name).sort()).toEqual(['Caolín', 'Sílice'])
  })

  it('onlyNew=false importa duplicados de nombre como entradas independientes', () => {
    const inc = [
      mk('b', 'CAOLÍN', { category: 'arcilla' }),
    ]
    const plan = planImport(inc, existing)
    const res = applyImportPlan(plan, existing, false)
    expect(res).toHaveLength(2)
    // Los dos existen con ids diferentes; nombres pueden coincidir
    expect(new Set(res.map((m) => m.id)).size).toBe(2)
  })

  it('colisión de UUID → nuevo UUID (nunca sobrescribe existente)', () => {
    const inc = [mk('id1', 'Feldespato', { category: 'feldespato' })]
    const plan = planImport(inc, existing)
    const res = applyImportPlan(plan, existing, false)
    expect(res).toHaveLength(2)
    // El id1 original sigue con su nombre "Caolín"
    expect(res.find((m) => m.id === 'id1')?.name).toBe('Caolín')
    // Y el importado tiene un id nuevo
    const added = res.find((m) => m.name === 'Feldespato')!
    expect(added.id).not.toBe('id1')
  })

  it('identical se omite siempre', () => {
    const inc = [mk('id1', 'Caolín', { category: 'arcilla' })]
    const plan = planImport(inc, existing)
    const res = applyImportPlan(plan, existing, false)
    expect(res).toHaveLength(1)
  })
})

describe('preset México/CDMX', () => {
  it('tiene 33 materiales', () => {
    expect(PRESET_MEXICO_CDMX.materials).toHaveLength(33)
  })

  it('nombres normalizados únicos', () => {
    const norms = PRESET_MEXICO_CDMX.materials.map((m) => normalizeMaterialName(m.name))
    expect(new Set(norms).size).toBe(norms.length)
  })

  it('todas las categorías son válidas', () => {
    const allowed = new Set(['arcilla', 'feldespato', 'silice', 'fundente', 'carbonato', 'oxido', 'frita', 'pigmento', 'otro'])
    for (const m of PRESET_MEXICO_CDMX.materials) {
      expect(allowed.has(m.category)).toBe(true)
    }
  })

  it('fórmulas incluyen SiO2, Al2O3, CaCO3', () => {
    const byName = new Map(PRESET_MEXICO_CDMX.materials.map((m) => [m.name, m.formula]))
    expect(byName.get('Sílice')).toBe('SiO2')
    expect(byName.get('Alúmina calcinada')).toBe('Al2O3')
    expect(byName.get('Carbonato de calcio')).toBe('CaCO3')
  })

  it('feldespatos y arcillas comerciales sin fórmula', () => {
    const byName = new Map(PRESET_MEXICO_CDMX.materials.map((m) => [m.name, m.formula]))
    expect(byName.get('Feldespato potásico')).toBeUndefined()
    expect(byName.get('Arcilla bola')).toBeUndefined()
    expect(byName.get('Rutilo')).toBeUndefined()
    expect(byName.get('Borato Gerstley')).toBeUndefined()
  })

  it('instalación idempotente: segunda vez añade 0 nuevos', () => {
    // Simula install: mapea preset a LibraryMaterial con ids nuevos
    const nowIso = new Date().toISOString()
    const first = PRESET_MEXICO_CDMX.materials.map((p, i) => ({
      id: `first-${i}`, name: p.name, category: p.category, formula: p.formula,
      createdAt: nowIso, updatedAt: nowIso,
    }))
    // Segunda instalación con ids diferentes
    const second = PRESET_MEXICO_CDMX.materials.map((p, i) => ({
      id: `second-${i}`, name: p.name, category: p.category, formula: p.formula,
      createdAt: nowIso, updatedAt: nowIso,
    }))
    const plan = planImport(second, first)
    // Todos son duplicados por nombre
    expect(plan.duplicateCount).toBe(33)
    expect(plan.newCount).toBe(0)
    const res = applyImportPlan(plan, first, true)
    expect(res).toHaveLength(33) // sin cambios cuando onlyNew=true
  })
})
