import { PROJECT_VERSION, type TriaxialProject } from '../types/project'
import type { MaterialType, Recipe, RecipeIngredient, VertexMaterial } from '../types/material'
import type { FiringAtmosphere, FiringResult, Surface } from '../types/result'
import { ALLOWED_STEPS } from './generateTriaxial'
import { isBalancePrecision } from './weighingPrecision'
import { saveSampleImage } from '../storage/imageStorage'

const ALLOWED_TYPES: readonly MaterialType[] = [
  'material', 'compuesto', 'oxido', 'pigmento', 'engobe',
  'esmalte', 'pasta', 'frita', 'receta', 'otro',
]
const ALLOWED_ATMOS: readonly FiringAtmosphere[] = ['oxidacion', 'reduccion', 'neutra', 'otro']
const ALLOWED_SURF: readonly Surface[] = ['mate', 'satinada', 'brillante', 'variable']

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function validateColor(v: unknown, fallback: string): string {
  if (typeof v === 'string' && HEX_COLOR.test(v)) return v
  return fallback
}

function validateIngredient(v: unknown, i: number): RecipeIngredient {
  assert(isObject(v), `Ingrediente ${i} inválido`)
  const id = typeof v.id === 'string' && v.id ? v.id : `ing_${Date.now()}_${i}`
  const name = typeof v.name === 'string' ? v.name : ''
  const pct = typeof v.percentage === 'number' && Number.isFinite(v.percentage) && v.percentage >= 0
    ? v.percentage : 0
  const materialId = typeof v.materialId === 'string' && v.materialId ? v.materialId : undefined
  return { id, materialId, name, percentage: pct }
}

function validateRecipe(v: unknown): Recipe | undefined {
  if (v === undefined || v === null) return undefined
  assert(isObject(v), 'Receta inválida')
  const ingredients = Array.isArray(v.ingredients) ? v.ingredients : []
  return {
    ingredients: ingredients.map((x, i) => validateIngredient(x, i)),
    notes: typeof v.notes === 'string' ? v.notes : undefined,
  }
}

function validateVertex(v: unknown, id: 'A' | 'B' | 'C'): VertexMaterial {
  assert(isObject(v), `Vértice ${id} inválido`)
  const type = ALLOWED_TYPES.includes(v.type as MaterialType) ? (v.type as MaterialType) : 'material'
  return {
    id,
    name: typeof v.name === 'string' ? v.name : `Material ${id}`,
    type,
    color: validateColor(v.color, '#cccccc'),
    chemicalFormula: typeof v.chemicalFormula === 'string' ? v.chemicalFormula : undefined,
    notes: typeof v.notes === 'string' ? v.notes : undefined,
    recipe: validateRecipe(v.recipe),
  }
}

function validateLevel(v: unknown): 1 | 2 | 3 | undefined {
  return v === 1 || v === 2 || v === 3 ? v : undefined
}

function validateResult(v: unknown): FiringResult {
  if (!isObject(v)) return {}
  const atm = ALLOWED_ATMOS.includes(v.atmosphere as FiringAtmosphere)
    ? (v.atmosphere as FiringAtmosphere) : undefined
  const surface = ALLOWED_SURF.includes(v.surface as Surface)
    ? (v.surface as Surface) : undefined
  const temp = typeof v.temperature === 'number' && Number.isFinite(v.temperature) ? v.temperature : undefined
  const color = typeof v.observedColor === 'string' && HEX_COLOR.test(v.observedColor) ? v.observedColor : undefined
  return {
    observedColor: color,
    temperature: temp,
    cone: typeof v.cone === 'string' ? v.cone : undefined,
    atmosphere: atm,
    surface,
    gloss: validateLevel(v.gloss),
    opacity: validateLevel(v.opacity),
    fluidity: validateLevel(v.fluidity),
    defects: typeof v.defects === 'string' ? v.defects : undefined,
    notes: typeof v.notes === 'string' ? v.notes : undefined,
    hasPhoto: typeof v.hasPhoto === 'boolean' ? v.hasPhoto : undefined,
  }
}

interface MigrationSideEffect {
  projectId: string
  sampleId: number
  dataUri: string
}

async function extractBase64Photos(
  results: Record<string, unknown>,
  projectId: string,
): Promise<{ cleaned: Record<number, FiringResult>; sideEffects: MigrationSideEffect[] }> {
  const cleaned: Record<number, FiringResult> = {}
  const sideEffects: MigrationSideEffect[] = []
  for (const [k, raw] of Object.entries(results)) {
    const id = Number(k)
    if (!Number.isFinite(id)) continue
    const r = validateResult(raw)
    // Legacy v1: raw.photo is a base64 data URI
    if (isObject(raw) && typeof raw.photo === 'string' && raw.photo.startsWith('data:')) {
      sideEffects.push({ projectId, sampleId: id, dataUri: raw.photo })
      r.hasPhoto = true
    }
    cleaned[id] = r
  }
  return { cleaned, sideEffects }
}

function dataUriToBlob(uri: string): Blob | null {
  try {
    const match = uri.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mime = match[1]
    const bin = atob(match[2])
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: mime })
  } catch {
    return null
  }
}

export function serializeProject(project: TriaxialProject): string {
  const payload = {
    ...project,
    exportedAt: new Date().toISOString(),
    app: 'MonkLab - Triaxial',
  }
  return JSON.stringify(payload, null, 2)
}

export function deserializeProject(raw: string | unknown): TriaxialProject {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  assert(isObject(data), 'Proyecto inválido')

  const version = typeof data.version === 'number' ? data.version : 1
  assert(version <= PROJECT_VERSION, `Versión de proyecto no soportada: ${String(version)}`)

  assert(isObject(data.vertices), 'Proyecto sin vértices')
  const vertsIn = data.vertices as Record<string, unknown>
  assert(vertsIn.A && vertsIn.B && vertsIn.C, 'Vértices A/B/C requeridos')

  const stepRaw = data.step
  assert(
    typeof stepRaw === 'number' && ALLOWED_STEPS.includes(stepRaw as 25 | 20 | 10 | 5),
    'División no válida. Valores permitidos: 5, 10, 20, 25.',
  )
  const step = stepRaw as number

  assert(
    typeof data.sampleWeight === 'number' && Number.isFinite(data.sampleWeight) && data.sampleWeight > 0,
    'Peso por muestra inválido.',
  )
  const sw = data.sampleWeight

  const margin = typeof data.preparationMargin === 'number' && Number.isFinite(data.preparationMargin) && data.preparationMargin >= 0
    ? data.preparationMargin : 0

  const balancePrecision = isBalancePrecision(data.balancePrecision) ? data.balancePrecision : undefined

  const results: Record<number, FiringResult> = {}
  if (isObject(data.results)) {
    for (const [k, v] of Object.entries(data.results)) {
      const id = Number(k)
      if (!Number.isFinite(id)) continue
      const r = validateResult(v)
      // strip legacy base64 photo silently on non-migrating load path
      results[id] = r
    }
  }

  return {
    version: PROJECT_VERSION,
    id: typeof data.id === 'string' && data.id ? data.id : crypto.randomUUID(),
    name: typeof data.name === 'string' ? data.name : 'Sin nombre',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    step,
    sampleWeight: sw,
    preparationMargin: margin,
    balancePrecision,
    vertices: {
      A: validateVertex(vertsIn.A, 'A'),
      B: validateVertex(vertsIn.B, 'B'),
      C: validateVertex(vertsIn.C, 'C'),
    },
    firing: isObject(data.firing) ? {
      date: typeof data.firing.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.firing.date)
        ? data.firing.date : undefined,
      temperature: typeof data.firing.temperature === 'number' && Number.isFinite(data.firing.temperature) && data.firing.temperature >= 0
        ? data.firing.temperature : undefined,
      cone: typeof data.firing.cone === 'string' ? data.firing.cone : undefined,
      atmosphere: ALLOWED_ATMOS.includes(data.firing.atmosphere as FiringAtmosphere)
        ? (data.firing.atmosphere as FiringAtmosphere) : undefined,
      kiln: typeof data.firing.kiln === 'string' ? data.firing.kiln : undefined,
      notes: typeof data.firing.notes === 'string' ? data.firing.notes : undefined,
    } : undefined,
    results,
  }
}

/**
 * Migración V1 -> V2: extrae fotos base64 embebidas y las mueve a IndexedDB.
 * Devuelve el proyecto ya migrado. Si la escritura de fotos falla, mantiene
 * hasPhoto=false pero no destruye la foto ya que el JSON crudo se preserva
 * hasta que el usuario guarde.
 */
export async function migrateProjectPhotos(raw: string | unknown): Promise<TriaxialProject> {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  assert(isObject(data), 'Proyecto inválido')

  const version = typeof data.version === 'number' ? data.version : 1
  const project = deserializeProject(data)

  if (version >= PROJECT_VERSION) return project
  if (!isObject(data.results)) return project

  const { cleaned, sideEffects } = await extractBase64Photos(
    data.results as Record<string, unknown>,
    project.id,
  )
  project.results = cleaned

  for (const eff of sideEffects) {
    const blob = dataUriToBlob(eff.dataUri)
    if (!blob) continue
    try {
      await saveSampleImage(eff.projectId, eff.sampleId, blob)
    } catch {
      // dejar hasPhoto=true; la foto original permanece en el JSON hasta guardar
    }
  }

  project.version = PROJECT_VERSION
  return project
}
