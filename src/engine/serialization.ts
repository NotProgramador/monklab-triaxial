import { PROJECT_VERSION, type ApplicationMethod, type ExperimentContext, type ExperimentProject, type TriaxialProject } from '../types/project'
import type { FormulaComponent, MaterialType, Recipe, RecipeIngredient, VertexMaterial } from '../types/material'
import type { FiringAtmosphere, FiringResult, Surface } from '../types/result'
import { ALLOWED_STEPS } from './generateTriaxial'
import { isBalancePrecision } from './weighingPrecision'
import { saveSampleImage } from '../storage/imageStorage'
import { isExperimentMode, type ExperimentMode } from '../types/experimentMode'
import { validateComponentStructure, verticesFromComponents } from './experimentAdapter'

const ALLOWED_TYPES: readonly MaterialType[] = [
  'material', 'compuesto', 'oxido', 'pigmento', 'engobe',
  'esmalte', 'pasta', 'frita', 'receta', 'otro',
]
const ALLOWED_ATMOS: readonly FiringAtmosphere[] = ['oxidacion', 'reduccion', 'neutra', 'otro']
const ALLOWED_SURF: readonly Surface[] = ['mate', 'satinada', 'brillante', 'variable']
const ALLOWED_APP_METHOD: readonly ApplicationMethod[] = ['brocha', 'inmersion', 'vertido', 'pistola', 'otro']

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

/**
 * Validate a V3 component. The id is required and kept as-is (used for
 * cross-project composition matching). Legacy triaxial projects carry
 * 'A' / 'B' / 'C' ids after V2→V3 migration.
 */
function validateComponent(v: unknown, index: number): FormulaComponent {
  assert(isObject(v), `Componente ${index} inválido`)
  const id = typeof v.id === 'string' && v.id ? v.id : `c${index}`
  const type = ALLOWED_TYPES.includes(v.type as MaterialType) ? (v.type as MaterialType) : 'material'
  return {
    id,
    name: typeof v.name === 'string' ? v.name : `Componente ${id}`,
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

function validateExperiment(v: Record<string, unknown>): ExperimentContext {
  const method = ALLOWED_APP_METHOD.includes(v.applicationMethod as ApplicationMethod)
    ? (v.applicationMethod as ApplicationMethod) : undefined
  const bisque = typeof v.bisqueTemperature === 'number' && Number.isFinite(v.bisqueTemperature) && v.bisqueTemperature >= 0
    ? v.bisqueTemperature : undefined
  const coats = typeof v.coats === 'number' && Number.isFinite(v.coats) && Number.isInteger(v.coats) && v.coats >= 1
    ? v.coats : undefined
  return {
    substrate: typeof v.substrate === 'string' ? v.substrate : undefined,
    bisqueTemperature: bisque,
    applicationMethod: method,
    coats,
    applicationNotes: typeof v.applicationNotes === 'string' ? v.applicationNotes : undefined,
  }
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

interface SchemaMigrationArtifact {
  project: ExperimentProject
  sourceVersion: number
  v1PhotoSideEffects: MigrationSideEffect[]
}

/**
 * Legacy V1 photo extraction. Only invoked when the raw project is V1 —
 * never for V2 or V3, which store `hasPhoto` and keep the binary in
 * IndexedDB untouched.
 */
function extractV1Base64Photos(
  rawResults: Record<string, unknown>,
  projectId: string,
): { cleaned: Record<number, FiringResult>; sideEffects: MigrationSideEffect[] } {
  const cleaned: Record<number, FiringResult> = {}
  const sideEffects: MigrationSideEffect[] = []
  for (const [k, raw] of Object.entries(rawResults)) {
    const id = Number(k)
    if (!Number.isFinite(id)) continue
    const r = validateResult(raw)
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

function parseResults(rawResults: unknown): Record<number, FiringResult> {
  const results: Record<number, FiringResult> = {}
  if (!isObject(rawResults)) return results
  for (const [k, v] of Object.entries(rawResults)) {
    const id = Number(k)
    if (!Number.isFinite(id)) continue
    results[id] = validateResult(v)
  }
  return results
}

function parseFiring(data: Record<string, unknown>): ExperimentProject['firing'] {
  if (!isObject(data.firing)) return undefined
  return {
    date: typeof data.firing.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.firing.date)
      ? data.firing.date : undefined,
    temperature: typeof data.firing.temperature === 'number' && Number.isFinite(data.firing.temperature) && data.firing.temperature >= 0
      ? data.firing.temperature : undefined,
    cone: typeof data.firing.cone === 'string' ? data.firing.cone : undefined,
    atmosphere: ALLOWED_ATMOS.includes(data.firing.atmosphere as FiringAtmosphere)
      ? (data.firing.atmosphere as FiringAtmosphere) : undefined,
    kiln: typeof data.firing.kiln === 'string' ? data.firing.kiln : undefined,
    notes: typeof data.firing.notes === 'string' ? data.firing.notes : undefined,
  }
}

function parseStepForMode(data: Record<string, unknown>, mode: ExperimentMode): number | undefined {
  if (mode === 'monoaxial') {
    // Monoaxial has no division — a lingering `step` from a bad export is
    // silently ignored so the file remains importable, but it is never
    // persisted or exposed.
    return undefined
  }
  const stepRaw = data.step
  assert(
    typeof stepRaw === 'number' && ALLOWED_STEPS.includes(stepRaw as 25 | 20 | 10 | 5),
    'División no válida. Valores permitidos: 5, 10, 20, 25.',
  )
  return stepRaw as number
}

function parseSampleWeight(data: Record<string, unknown>, mode: ExperimentMode): number {
  // Monoaxial calls it "cantidad base" in the UI but persists under the same
  // field so the storage schema stays single-shape. "Peso por muestra" is the
  // bi/tri reading.
  const label = mode === 'monoaxial' ? 'Cantidad base inválida.' : 'Peso por muestra inválido.'
  assert(
    typeof data.sampleWeight === 'number' && Number.isFinite(data.sampleWeight) && data.sampleWeight > 0,
    label,
  )
  return data.sampleWeight
}

function parseMargin(data: Record<string, unknown>): number {
  return typeof data.preparationMargin === 'number' && Number.isFinite(data.preparationMargin) && data.preparationMargin >= 0
    ? data.preparationMargin : 0
}

function parseMode(data: Record<string, unknown>): ExperimentMode {
  if (isExperimentMode(data.mode)) return data.mode
  return 'triaxial'
}

function makeId(data: Record<string, unknown>): string {
  if (typeof data.id === 'string' && data.id) return data.id
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Schema migration — the pure, synchronous half of the pipeline. Accepts
 * V1/V2/V3 raw data, returns a runtime V3 project plus a list of V1 photo
 * side effects (empty for V2 and V3). This function MUST NOT touch
 * IndexedDB.
 */
function migrateSchemaToV3(data: Record<string, unknown>): SchemaMigrationArtifact {
  const version = typeof data.version === 'number' ? data.version : 1
  assert(version <= PROJECT_VERSION, `Versión de proyecto no soportada: ${String(version)}`)

  const id = makeId(data)
  const name = typeof data.name === 'string' ? data.name : 'Sin nombre'
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()

  // Mode first — bi/tri step validation depends on it, monoaxial skips it.
  let components: FormulaComponent[]
  let mode: ExperimentMode

  if (version >= 3) {
    // V3 — components as source of truth.
    mode = parseMode(data)
    assert(Array.isArray(data.components), 'Proyecto V3 sin componentes')
    components = data.components.map((c, i) => validateComponent(c, i))
  } else {
    // V1 / V2 — vertices as source of truth → derive components in A/B/C order.
    mode = 'triaxial'
    assert(isObject(data.vertices), 'Proyecto sin vértices')
    const vertsIn = data.vertices as Record<string, unknown>
    assert(vertsIn.A && vertsIn.B && vertsIn.C, 'Vértices A/B/C requeridos')
    const A = validateVertex(vertsIn.A, 'A')
    const B = validateVertex(vertsIn.B, 'B')
    const C = validateVertex(vertsIn.C, 'C')
    components = [
      { id: 'A', name: A.name, type: A.type, color: A.color, chemicalFormula: A.chemicalFormula, notes: A.notes, recipe: A.recipe },
      { id: 'B', name: B.name, type: B.type, color: B.color, chemicalFormula: B.chemicalFormula, notes: B.notes, recipe: B.recipe },
      { id: 'C', name: C.name, type: C.type, color: C.color, chemicalFormula: C.chemicalFormula, notes: C.notes, recipe: C.recipe },
    ]
  }

  const structure = validateComponentStructure(mode, components)
  assert(structure.valid, `Estructura de componentes inválida para modo ${mode}`)

  const step = parseStepForMode(data, mode)
  const sampleWeight = parseSampleWeight(data, mode)
  const margin = parseMargin(data)
  const balancePrecision = isBalancePrecision(data.balancePrecision) ? data.balancePrecision : undefined

  // Photo side effects live ONLY on V1. V2 and V3 keep their IndexedDB blobs intact.
  let results: Record<number, FiringResult>
  const v1PhotoSideEffects: MigrationSideEffect[] = []
  if (version <= 1 && isObject(data.results)) {
    const { cleaned, sideEffects } = extractV1Base64Photos(data.results as Record<string, unknown>, id)
    results = cleaned
    v1PhotoSideEffects.push(...sideEffects)
  } else {
    results = parseResults(data.results)
  }

  const project: ExperimentProject = {
    version: PROJECT_VERSION,
    id,
    name,
    createdAt,
    updatedAt,
    mode,
    components,
    sampleWeight,
    preparationMargin: margin,
    balancePrecision,
    vertices: mode === 'triaxial'
      ? verticesFromComponents(components)
      : triaxialPlaceholderVertices(), // triaxial-only field; benign placeholder for other modes
    experiment: isObject(data.experiment) ? validateExperiment(data.experiment) : undefined,
    firing: parseFiring(data),
    results,
  }
  if (step !== undefined) project.step = step

  return { project, sourceVersion: version, v1PhotoSideEffects }
}

function triaxialPlaceholderVertices(): { A: VertexMaterial; B: VertexMaterial; C: VertexMaterial } {
  return {
    A: { id: 'A', name: '', type: 'material', color: '#cccccc' },
    B: { id: 'B', name: '', type: 'material', color: '#cccccc' },
    C: { id: 'C', name: '', type: 'material', color: '#cccccc' },
  }
}

export function serializeProject(project: TriaxialProject): string {
  // Strip the derived `vertices` view — V3 persists ONLY `components`.
  const { vertices: _vertices, step: stepIn, ...rest } = project
  void _vertices
  // Monoaxial never has a division; keep `step` out of its JSON so the export
  // can't suggest otherwise. Bi/tri always emit their step.
  const payload: Record<string, unknown> = {
    ...rest,
    ...(project.mode !== 'monoaxial' && typeof stepIn === 'number' ? { step: stepIn } : {}),
    version: PROJECT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'MonkLab',
  }
  return JSON.stringify(payload, null, 2)
}

export function deserializeProject(raw: string | unknown): TriaxialProject {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  assert(isObject(data), 'Proyecto inválido')
  const { project } = migrateSchemaToV3(data)
  return project
}

/**
 * Full load pipeline: schema migration first, then (and only then) V1 photo
 * side effects to IndexedDB. V2 and V3 projects never trigger photo writes
 * here — their blobs are already in IndexedDB and must not be touched.
 */
export async function migrateProjectPhotos(raw: string | unknown): Promise<TriaxialProject> {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  assert(isObject(data), 'Proyecto inválido')

  const { project, v1PhotoSideEffects } = migrateSchemaToV3(data)

  for (const eff of v1PhotoSideEffects) {
    const blob = dataUriToBlob(eff.dataUri)
    if (!blob) continue
    try {
      await saveSampleImage(eff.projectId, eff.sampleId, blob)
    } catch {
      // leave hasPhoto=true; the original JSON is still available until save
    }
  }

  return project
}
