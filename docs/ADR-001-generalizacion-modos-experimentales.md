# ADR-001 — Generalización de MonkLab a modos experimentales

Fecha: 2026-10-20
Estado: aceptada
Fase de aplicación: Fase 1 (schema V3). La UI de monoaxial y biaxial llegará en fases posteriores.

## Contexto

MonkLab empezó como una herramienta exclusivamente triaxial: 3 vértices A/B/C, mezcla triangular, step 5/10/20/25. El dominio y la persistencia están atados a ese esquema:

```ts
TriaxialProject {
  version: 2
  vertices: { A: VertexMaterial, B: VertexMaterial, C: VertexMaterial }
  step, sampleWeight, preparationMargin, ...
  results: Record<number, FiringResult>
}
TriaxialSample { id, a, b, c }
VertexMaterial { id: 'A' | 'B' | 'C', ... }
```

La próxima evolución del producto necesita operar también:

- **Monoaxial** — una receta/formulación única.
- **Biaxial** — line blend entre A y B.
- **Triaxial** — comportamiento actual, preservado íntegramente.

El objetivo es que las tres modalidades sean ciudadanas de primera clase, no excepciones ocultas dentro del esquema triaxial.

## Alternativas consideradas

### Alternativa A — vértices opcionales según modo

Añadir `mode: ExperimentMode` y hacer `B`, `C` opcionales:

```ts
mode: 'monoaxial' | 'biaxial' | 'triaxial'
vertices: { A: V, B?: V, C?: V }
```

- Monoaxial → `{A}`.
- Biaxial → `{A, B}`, interpretar `composition = {A: 80, B: 20}` sobre A+B=100.
- Triaxial → como hoy.

**Rechazada** porque:

- Mantiene el dominio atado al triángulo: `vertices.A/B/C` sigue siendo la fuente de verdad.
- Introduce nullability artificial que no refleja la realidad del modo (en monoaxial no hay B ni C, no son "nulos").
- Representa mal mono/biaxial: terminan siendo "triaxial con `C=0` escondido", exactamente lo que el brief veta ("NO implementar biaxial como `C` siempre 0 si eso queda expuesto como modelo permanente").
- Complica exports y comparaciones futuros: CSV sigue hablando de `A/B/C`; la comparación cross-project seguiría clavada al triángulo.
- `serialization` tendría que relajar sus asserts `A/B/C requeridos` o cargar siempre tres vértices aunque dos sean `undefined`.

### Alternativa B — `components[]` + `composition` map (aceptada)

Reemplazar `vertices` por un arreglo genérico y usar un mapa como estructura de composición:

```ts
type ExperimentMode = 'monoaxial' | 'biaxial' | 'triaxial'

interface FormulaComponent {
  id: string         // 'A'|'B'|'C' en triaxial; libre en los demás modos
  name: string
  type: MaterialType
  color: string
  recipe?: Recipe
  // ...
}

interface CompositionSample {
  id: number
  composition: Record<string, number>  // keys = ids de componente, suma = 100
}

interface ExperimentProject {
  version: 3
  mode: ExperimentMode
  components: FormulaComponent[]       // 1 / 2 / 3 entradas según modo
  step?: number                        // sólo bi / tri
  sampleWeight, preparationMargin, balancePrecision?
  firing?, experiment?, results
}
```

**Aceptada** porque:

- Representa 1/2/3 componentes de forma natural (`components.length === expectedComponentCount(mode)`).
- Desacopla el dominio de la visualización: triángulo / barra 1D / ficha única son vistas, no reglas de dominio.
- Permite generadores por modo (`generateMonoaxial`, `generateBiaxial`, `generateTriaxial`) sin ramas escondidas.
- Mantiene `A`/`B`/`C` como ids legacy cuando corresponde: la migración V2→V3 preserva esos ids literalmente, no genera UUIDs.
- La comparación cross-project funciona por composición genérica (`compositionKeyFromMap`), siempre dentro del mismo modo.
- CSV, SVG, impresión y UI iteran sobre `components`: nada hardcodea `A/B/C`.
- `calculatePreparation` y `expandRecipe` ya agregan ingredientes por nombre normalizado; su firma generaliza a `Record<string, number>` sin cambiar el algoritmo.

## Decisión

Adoptar **Alternativa B**. En Fase 1:

- Introducir `ExperimentMode` + `FormulaComponent` + `CompositionSample` + `ExperimentProject`.
- Bump `PROJECT_VERSION = 3`.
- `components[]` es la fuente de verdad persistida; la UI triaxial sigue leyendo una vista derivada `vertices: {A,B,C}` que se mantiene en sincronía en un solo adaptador (`src/engine/experimentAdapter.ts`).
- La UI sólo opera `triaxial` todavía (`SUPPORTED_UI_MODES = ['triaxial']`). El schema conoce los tres modos.
- V1 y V2 migran automáticamente a V3 al cargar (`deserializeProject` + `migrateProjectPhotos`).
- `TriaxialProject` queda como alias de `ExperimentProject` para no romper imports; se retirará cuando mono y biaxial estén cableados en UI.

## Consecuencias

### Para el usuario

Ninguna visible en Fase 1. La aplicación se ve y funciona idéntica a V1.6.2. Un proyecto V2 cargado se migra silenciosamente y, al guardar, pasa a formato V3.

### Para el dominio

- `components[]` es la única fuente de verdad persistida (JSON y `localStorage`).
- `vertices: {A,B,C}` existe en runtime como vista derivada triaxial (nunca se serializa).
- Un único adaptador (`withVertex`, `verticesFromComponents`, `componentsFromVertices`) encapsula la traducción.
- Los invariantes triaxiales se preservan bit-a-bit: `generateTriaxial(20)` sigue dando 21 muestras, T09 = 40/20/40, pesada 20g = A8/B4/C8, recetas expandidas idénticas.

### Para la persistencia

- `localStorage` sigue usando las claves `monklab.triaxial.*` (NO renombrar en esta fase).
- IndexedDB sigue usando la DB `monklab-triaxial` v3 con stores `images`, `materials`, `series`. `DB_VERSION` no cambia.
- V2 → V3 **no toca IndexedDB**: las fotos ya están allí y no se tocan. Sólo V1 (base64 embebido) sigue migrando a IndexedDB.
- Schema migration y photo migration están separadas en el pipeline (`migrateSchemaToV3` + `migrateProjectPhotos`).

### Para los tests

- Suite de regresión (242) sigue pasando sin relajar assertions.
- Nuevos tests cubren adapter, migración V2→V3, invariantes matemáticos, idempotencia V3, V1 photo migration, V2 no-photo-side-effect.

### Costos aceptados

- Migración V2→V3 obligatoria al cargar: coste despreciable, roundtrip verificado.
- Un alias temporal `TriaxialProject = ExperimentProject`: se elimina en una fase futura.
- Pequeña duplicación transitoria entre `VertexMaterial` (triaxial legacy) y `FormulaComponent` (V3 genérico): necesaria mientras `calculatePreparation`, `expandRecipe` y la UI triaxial sigan hablando `A/B/C`.

## Compatibilidad

- **V1 → V3**: pasa por el extracto de fotos base64 (`extractV1Base64Photos`) y luego por la migración de schema. Las fotos se escriben en IndexedDB como blobs; `hasPhoto` queda en `true`.
- **V2 → V3**: `vertices` se traducen a `components` en orden `[A, B, C]`. **No** se tocan fotos ni IndexedDB. `materialId`, `firing`, `experiment`, `balancePrecision`, `step`, `sampleWeight`, `preparationMargin`, `results` y los `sampleId` keys se preservan exactamente.
- **V3 → V3**: idempotente. `serializeProject` emite siempre V3 sin `vertices`; `deserializeProject` acepta ambas formas.
- **Series experimentales**: los `projectIds` no cambian, por lo que las series existentes siguen funcionando sin migración.
- **Material Library**: schema invariante. `materialId` en ingredientes se preserva.
- **Export / Import JSON**: salida V3 (`version: 3`, `mode: "triaxial"`, `components: [...]`, sin `vertices`). Importar un V2 produce V3 al guardar.
- **Versiones futuras (> 3)**: siguen rechazándose con el mismo mensaje humano ("Versión de proyecto no soportada").

## No incluido en Fase 1

- UI monoaxial, UI biaxial, selector de modo, cambio de header.
- `generateMonoaxial`, `generateBiaxial`, diagrama lineal.
- Generalización de CSV / SVG / informe comparativo (siguen hablando `A/B/C`).
- Rename cosmético de storage (`monklab.triaxial.*`, DB `monklab-triaxial`).
- Comparación cross-mode.
- Actualización del README (se hará cuando mono y biaxial estén en UI).
