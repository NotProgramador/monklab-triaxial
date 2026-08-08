import { describe, expect, it } from 'vitest'
import { samplesToCsv } from '../exportCsv'
import { generateTriaxial } from '../generateTriaxial'
import type { VertexMaterial } from '../../types/material'
import type { FiringResult } from '../../types/result'

const V = {
  A: { id: 'A', name: 'A', type: 'material', color: '#ffffff' } as VertexMaterial,
  B: { id: 'B', name: 'B', type: 'material', color: '#000000' } as VertexMaterial,
  C: { id: 'C', name: 'C', type: 'material', color: '#888888' } as VertexMaterial,
}

describe('samplesToCsv gloss/opacity/fluidity', () => {
  it('incluye columnas Brillo/Opacidad/Fluidez', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {})
    const header = csv.split('\r\n')[0]
    expect(header).toContain('Brillo')
    expect(header).toContain('Opacidad')
    expect(header).toContain('Fluidez')
  })

  it('exporta valores semánticos para gloss/opacity/fluidity', () => {
    const results: Record<number, FiringResult> = {
      1: { gloss: 3, opacity: 1, fluidity: 2 },
    }
    const csv = samplesToCsv(generateTriaxial(20), V, 20, results)
    const rows = csv.split('\r\n')
    const row1 = rows.find((r) => r.startsWith('1;'))!
    expect(row1).toContain('Brillante')
    expect(row1).toContain('Transparente')
    expect(row1).toContain('Medio')
  })

  it('filas sin resultado dejan las columnas vacías', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {})
    const rows = csv.split('\r\n')
    const row2 = rows.find((r) => r.startsWith('2;'))!
    // Estado is "Sin resultado" y las nuevas 3 columnas quedan vacías (;;;)
    expect(row2).toContain('Sin resultado;;;;;;;;;')
  })

  it('un resultado {} NO se marca como Registrado en CSV', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, { 1: {} })
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    expect(row1).toContain('Sin resultado')
    expect(row1).not.toContain(';Registrado;')
  })

  it('un resultado con notes en blanco NO se marca como Registrado', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, { 1: { notes: '   ' } })
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    expect(row1).toContain('Sin resultado')
  })

  it('un resultado con gloss:1 sí se marca como Registrado', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, { 1: { gloss: 1 } })
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    expect(row1).toContain(';Registrado;')
  })
})

describe('samplesToCsv con firing efectivo (V1.2.1)', () => {
  const projectFiring = {
    date: '2026-08-08',
    temperature: 1040,
    cone: '06',
    atmosphere: 'oxidacion' as const,
    kiln: 'Horno eléctrico',
  }

  it('columnas Fecha cocción y Horno presentes', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {}, projectFiring)
    const header = csv.split('\r\n')[0]
    expect(header).toContain('Fecha cocción')
    expect(header).toContain('Horno')
    expect(header).toContain('Temperatura °C')
  })

  it('T01 sin override usa firing del proyecto', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {}, projectFiring)
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    expect(row1).toContain(';2026-08-08;')
    expect(row1).toContain(';1040;')
    expect(row1).toContain(';06;')
    expect(row1).toContain('Oxidación')
    expect(row1).toContain('Horno eléctrico')
  })

  it('T09 con override 1080 gana', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, { 9: { temperature: 1080 } }, projectFiring)
    const row9 = csv.split('\r\n').find((r) => r.startsWith('9;'))!
    expect(row9).toContain(';1080;')
    expect(row9).toContain('Oxidación') // no override → hereda
  })

  it('sin projectFiring y sin override → columnas vacías', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {})
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    // Estado (Sin resultado) seguido de Fecha/Temp/Cono/Atmósfera/Horno vacíos
    expect(row1).toContain('Sin resultado;;;;;;')
  })
})

describe('samplesToCsv con balancePrecision (V1.3.1)', () => {
  it('columnas prácticas presentes', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {}, undefined, 0.1)
    const header = csv.split('\r\n')[0]
    expect(header).toContain('A g práctica')
    expect(header).toContain('B g práctica')
    expect(header).toContain('C g práctica')
    expect(header).toContain('Balanza g')
  })

  it('columnas teóricas se preservan sin cambios', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {}, undefined, 0.1)
    const row9 = csv.split('\r\n').find((r) => r.startsWith('9;'))!
    // T09: 40/20/40 con 20g → 8/4/8 teóricos
    expect(row9).toContain(';8.000;')
    expect(row9).toContain(';4.000;')
  })

  it('columnas prácticas cuadran con la balanza', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {}, undefined, 0.1)
    const row9 = csv.split('\r\n').find((r) => r.startsWith('9;'))!
    // Después de teoricos (8.000/4.000/8.000) viene ";0.1;" y luego prácticas
    // formateadas a 1 decimal: 8.0/4.0/8.0
    expect(row9).toContain(';0.1;8.0;4.0;8.0;')
  })

  it('sin balancePrecision → columnas prácticas vacías', () => {
    const csv = samplesToCsv(generateTriaxial(20), V, 20, {})
    const header = csv.split('\r\n')[0]
    // Las columnas siguen existiendo (estructura estable)
    expect(header).toContain('A g práctica')
    const row1 = csv.split('\r\n').find((r) => r.startsWith('1;'))!
    // Balanza vacía + 3 prácticas vacías
    expect(row1).toMatch(/;20\.000;0\.000;0\.000;;;;;/)
  })
})
