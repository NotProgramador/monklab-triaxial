# MonkLab — Auditoría de retoma

Fecha: 2026-10-20
Alcance: estado del proyecto previo a generalizar MonkLab de herramienta exclusivamente triaxial a herramienta con modos monoaxial / biaxial / triaxial.
Modo: READ-ONLY sobre el código; este documento es la única salida.

> Nota histórica: la auditoría se produjo inicialmente con el trabajo de V1.6.2 pendiente de commit. Tras la auditoría se ejecutó el cierre: V1.6.2 quedó committeado como `e631070 MonkLab Triaxial v1.6.2 comparative PDF report` y pusheado a `origin/main`. Este documento refleja el estado **después** de ese cierre.

---

## A. Estado Git

- **Branch**: `main`
- **HEAD local**: `e631070 MonkLab Triaxial v1.6.2 comparative PDF report`
- **origin/main**: `e631070` (0 ahead / 0 behind).
- **Working tree**: limpio.
- **Remote**: `https://github.com/NotProgramador/monklab-triaxial.git`
- **Autor configurado**: `NotProgramador`.
- **Advertencia Git recurrente**: LF↔CRLF al tocar `.tsx/.css` en Windows (cosmético, sin impacto).

Commits recientes:

```
e631070 MonkLab Triaxial v1.6.2 comparative PDF report
6b163e7 MonkLab Triaxial v1.6.1 experimental series
61b8429 MonkLab Triaxial v1.5.2 cross-project comparison
0844257 MonkLab Triaxial v1.5.1 sample comparison
8e4bc49 MonkLab Triaxial v1.4.2 material presets and library JSON
```

---

## B. Estado del pipeline

Ejecutado sobre el estado post-V1.6.2:

| Pipeline       | Resultado                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm test`     | ✅ **242 / 242** pruebas en 14 suites (≈ 1.9 s).                                                               |
| `npm run build`| ✅ `tsc -b && vite build`. Bundle: `333.07 kB JS` (97.33 kB gzip), `38.81 kB CSS` (7.20 kB gzip), `0.46 kB HTML`. 72 módulos. |
| `npm run lint` | ✅ Oxlint limpio (0 findings).                                                                                 |

Todo verde. No hay deuda abierta de pipeline.

---

## C. Historial / versiones existentes

Historia por mensajes de commit (interpretada):

- **V1.4.1** — Experimental context and application.
- **V1.4.2** — Material presets and library JSON.
- **V1.5.1** — Sample comparison (intra-proyecto, hasta 4 muestras).
- **V1.5.2** — Cross-project comparison (`projectComparison`, matriz de condiciones, estados de recetas).
- **V1.6.1** — Experimental series (grupos ordenados de proyectos).
- **V1.6.2** — **Comparative PDF report** (ya committeado como `e631070`). Reporte imprimible A4 landscape con fotos, estado de recetas, matriz de condiciones y diferencias por composición.

A partir de V1.6.2 arranca el trabajo de **generalización** mono/bi/triaxial, que es lo que esta auditoría prepara.

---

## D. Arquitectura actual

### Stack (package.json)

- **Runtime**: React 19.2.8, react-dom 19.2.8 (sin dependencias extra).
- **Dev**: TypeScript 6.0.2 (versión suspicious; el resolver la acepta y compila), Vite 8.2.0, Vitest 3.2.7, Oxlint 1.75.0, `@vitejs/plugin-react` 6.0.4, `@types/node` 24.
- **Scripts**: `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`, `test`.
- **Sin librería PDF externa**: el reporte comparativo imprimible usa `window.print()` sobre un `<iframe>` oculto con HTML inline.

### Configuración

- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `.oxlintrc.json` presentes.

### Árbol funcional de `src/`

- `types/`: `project.ts`, `triaxial.ts`, `material.ts`, `result.ts`, `libraryMaterial.ts`, `experimentSeries.ts`.
- `engine/` (matemática pura, 19 módulos): `generateTriaxial`, `barycentric`, `calculateSampleWeights`, `calculatePreparation`, `expandRecipe`, `comparison` (intra), `projectComparison` (cross), `serialization`, `exportCsv`, `exportSvg`, `defaults`, `effectiveFiring`, `experimentContext`, `format`, `interpolateColor`, `materialIdentity`, `materialLibraryIO`, `resultStatus`, `seriesOrder`, `weighingPrecision`.
- `storage/`: `projectStorage` (localStorage), `indexedDb` (DB compartida), `imageStorage`, `materialLibraryStorage`, `seriesStorage`.
- `data/`: `materialPresets.ts`.
- `components/`: carpetas por dominio: `comparison`, `experiment`, `firing`, `library`, `materials`, `print`, `project`, `recipes`, `results`, `samples`, `series`, `triangle`.
- `print/`: `printLabelsDocument.ts`, `projectComparisonReport.ts`.

---

## E. Funcionalidad terminada

Confirmada por tests + build:

- Generación triaxial determinística (step 5/10/20/25) + barycentric.
- Pesada por muestra + hoja de preparación con margen.
- Expansión de recetas y agregación de ingredientes por nombre normalizado.
- Precisión de balanza con cuantización preservando el total.
- Material library: CRUD, categorías, import/export JSON, presets México/CDMX en `materialPresets.ts`.
- Resultados por muestra con foto en IndexedDB (migración V1 base64 → V2 blob implementada).
- Serialización versionada (`PROJECT_VERSION = 2`) con migración automática al cargar.
- Contexto experimental (soporte, bizcocho, método, capas).
- Cocción por proyecto + override por muestra (`effectiveFiring`).
- Comparación intra-proyecto (hasta 4 muestras).
- Comparación cross-project por composición: `compositionKey`, `findCommonCompositions`, `sampleByComposition`, `compareVertexRecipes` con estados `identical | compatible_legacy | ambiguous | different`, matriz de condiciones.
- Series experimentales (grupos ordenados de proyectos; no modifican los proyectos).
- Exports: CSV (`;` + BOM UTF-8), SVG standalone, impresión HTML.
- Etiquetas de muestras imprimibles (`printLabelsDocument.ts`).
- **V1.6.2** reporte comparativo imprimible A4 landscape con fotos, estado de recetas, matriz de condiciones y diferencias (`print/projectComparisonReport.ts`).

---

## F. Deuda técnica y documentación obsoleta

- **README.md desactualizado**:
  - Afirma que las fotos se guardan como data URI dentro del proyecto. **Falso desde V2**: hoy están en IndexedDB (`storage/imageStorage.ts`), con migración V1→V2.
  - No menciona: material library, series experimentales, comparación cross-project, contexto experimental, precisión de balanza, etiquetas imprimibles, reporte comparativo.
  - El árbol de carpetas listado en README no incluye `library/`, `experiment/`, `firing/`, `comparison/`, `series/`, `print/`.
- **`package.json "version": "0.1.0"`** desincronizada respecto a las V1.x del historial de commits (cosmético).
- **TypeScript 6.0.2** en devDependencies: versión suspicious; el instalador resuelve algo que compila, pero conviene fijar a una versión real pública.
- **Comentario legacy** en `engine/projectComparison.ts:97` (`const b = r1[i] // placeholder` + `void b`) — ruido muerto.
- **Nombre de serie en comparación**: V1.6.2 lo propaga al reporte, pero no se visibiliza en el header del panel.

Nada bloquea avanzar. Toda la deuda es de higiene y documentación.

---

## G. Acoplamientos específicos a Triaxial

| Archivo                                              | Acoplamiento                                                | Reutilizable            | Refactor para generalizar                   |
| ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| `types/triaxial.ts` (`TriaxialSample {a,b,c}`)       | **Alto**                                                    | No                      | Alto                                        |
| `types/project.ts` (`vertices: {A,B,C}`)             | **Alto**                                                    | No                      | Alto                                        |
| `types/material.ts` (`VertexMaterial.id: 'A'|'B'|'C'`)| **Alto**                                                   | Parcial                 | Alto                                        |
| `engine/generateTriaxial.ts`                         | **Alto** (doble loop A×B×C=100)                             | No                      | Reemplazo por generadores por modo          |
| `engine/barycentric.ts` (triángulo 2D)               | **Alto**                                                    | No                      | Convive sólo en modo triaxial               |
| `engine/calculateSampleWeights.ts`                   | **Alto** (campos `a,b,c`)                                   | Lógica reutilizable     | Medio (generalizar a `Record<id,number>`)   |
| `engine/calculatePreparation.ts`                     | **Alto** (`{A,B,C}` + `grossPerVertex a/b/c`)               | Lógica reutilizable     | Medio                                       |
| `engine/expandRecipe.ts`                             | **Alto** (asume 3 vértices)                                 | Lógica reutilizable     | Medio                                       |
| `engine/serialization.ts`                            | **Alto** (asserts `A/B/C` + `ALLOWED_STEPS` triaxial)       | Parcial                 | Alto (migración V2→V3)                      |
| `engine/comparison.ts` (intra)                       | **Alto** (`compositionDelta a,b,c`)                         | No                      | Medio                                       |
| `engine/projectComparison.ts`                        | **Alto** (`compositionKey = a|b|c`, matriz A/B/C)           | Mecánica reutilizable   | Alto                                        |
| `engine/exportCsv.ts`                                | **Alto** (columnas A%,B%,C%, g por vértice)                 | No                      | Alto (columnas dinámicas)                   |
| `engine/exportSvg.ts`                                | **Alto** (triángulo fijo)                                   | Sólo modo triaxial      | Convive                                     |
| `engine/interpolateColor.ts`                         | Alto (3 vértices)                                           | Sólo triaxial           | —                                           |
| `print/projectComparisonReport.ts`                   | **Alto** (vértices A/B/C hardcoded, composición "a / b / c")| Mecánica reutilizable   | Alto                                        |
| `print/printLabelsDocument.ts`                       | Medio (depende de samples)                                  | Reutilizable con etiqueta genérica | Bajo                                 |
| `components/triangle/*`                              | **Alto**                                                    | Sólo modo triaxial      | Convive                                     |
| `components/materials/VertexCards.tsx`, `VertexEditor.tsx` | Alto (3 vértices)                                     | Patrón reutilizable     | Medio (→ `ComponentCards` / `ComponentEditor`) |
| `components/samples/FormulationInspector.tsx`        | Alto                                                        | Reutilizable con mapa   | Medio                                       |
| `components/samples/PreparationSheet.tsx`            | Alto                                                        | Reutilizable con mapa   | Medio                                       |
| `components/samples/ResultsInspector.tsx`            | **Bajo**                                                    | Reutilizable            | Bajo                                        |
| `components/samples/SampleInspector.tsx`, `SamplesTable.tsx` | Medio                                               | Parcialmente reutilizable | Medio                                     |
| `components/comparison/ProjectComparisonView.tsx`    | Alto                                                        | Reutilizable con mapa   | Alto                                        |
| `components/comparison/SampleComparisonView.tsx`     | Alto                                                        | Reutilizable            | Medio                                       |
| `components/firing/`, `experiment/`, `library/`, `series/` | **Bajo**                                              | Totalmente reutilizable | Ninguno                                     |
| `storage/projectStorage.ts`                          | Medio (serializa `TriaxialProject`)                         | Infraestructura reutilizable | Medio                                   |
| `storage/indexedDb.ts`, `imageStorage.ts`, `materialLibraryStorage.ts`, `seriesStorage.ts` | **Bajo**            | Totalmente reutilizable | Ninguno                                     |

---

## H. Módulos reutilizables para Mono / Biaxial

**Totalmente reutilizable sin cambios**:

- `types/libraryMaterial.ts`, `types/experimentSeries.ts`, `types/result.ts`.
- `engine/weighingPrecision.ts`, `effectiveFiring.ts`, `experimentContext.ts`, `format.ts`, `resultStatus.ts`, `materialIdentity.ts`, `materialLibraryIO.ts`, `seriesOrder.ts`.
- Todo `storage/` excepto `projectStorage` (que requiere soportar el nuevo tipo de proyecto).
- Toda la UI de `firing/`, `experiment/`, `library/`, `series/`, `results/`.
- Componentes de resultado (`ResultsInspector`), cocción, foto.
- Mecánica de recetas (`expandRecipe`, `Recipe`, `RecipeIngredient`) — en mono es casi lo único que necesitas.
- Algoritmo de comparación cross-project por *composición*, con `compositionKey` generalizado.

**Reutilizable con generalización menor** (`a/b/c` → `Record<axisId, number>`):

- `calculateSampleWeights`, `calculatePreparation` (la agregación ya es por nombre, no por vértice).
- `exportCsv` (columnas dinámicas desde `components`).
- `print/projectComparisonReport.ts` (grid, foto y tabla ya aceptan N columnas por diseño).

**No reutilizable** (específico de triaxial):

- `barycentric`, triángulo SVG, `TriaxialDiagram`, `GradientCanvas`, `interpolateColor` (3 vértices).

---

## I. Alternativas de modelo general

Modelo actual (recordatorio):

```ts
// PROJECT_VERSION = 2
TriaxialProject {
  version, id, name, createdAt, updatedAt,
  step, sampleWeight, preparationMargin, balancePrecision?,
  vertices: { A: VertexMaterial, B, C },
  firing?, experiment?, results: Record<number, FiringResult>
}
TriaxialSample { id, a, b, c }
VertexMaterial { id: 'A'|'B'|'C', name, type, color, chemicalFormula?, notes?, recipe? }
```

### Alternativa A — vértices opcionales según modo

```ts
mode: 'monoaxial' | 'biaxial' | 'triaxial'
vertices: { A: V, B?: V, C?: V }
```

- Pros: cambio mínimo; migración trivial; UI puede ocultar B/C.
- Contras: miente — `biaxial` termina siendo "triaxial con `C=0` escondido". `serialization` sigue asertando B y C. Mono con un único material es antinatural como "vértice A". Contradice la regla del brief ("no implementar biaxial como C siempre 0 si eso queda expuesto como modelo permanente").

### Alternativa B — `components[]` + `composition` map (recomendada)

```ts
type ExperimentMode = 'monoaxial' | 'biaxial' | 'triaxial'

interface ComponentMaterial {
  id: string               // 'A' | 'B' | 'C' en triaxial; libre en mono (p. ej. 'main')
  name: string
  type: MaterialType
  color: string
  recipe?: Recipe
  // chemicalFormula, notes...
}

interface Sample {
  id: number
  composition: Record<string, number>  // keys = ids de componente, suma = 100
}

interface Experiment {
  version: 3
  id, name, createdAt, updatedAt
  mode: ExperimentMode
  components: ComponentMaterial[]      // 1 / 2 / 3 entradas según modo
  step?: number                        // sólo bi / tri
  sampleWeight, preparationMargin, balancePrecision?
  firing?, experiment?: ExperimentContext
  results: Record<number, FiringResult>
}
```

- Pros:
  - Semántica real: mono = `components.length === 1`, bi = 2, tri = 3.
  - `generate{Mode}(mode, step, components)` por modo.
  - `calculateSampleWeights(sample, totalWeight) → Record<string, number>` — natural para N componentes.
  - `expandRecipe` ya agrega por nombre normalizado, independiente del número de vértices.
  - `compositionKey` → ordena entries alfabéticamente: `"A:40|B:20|C:40"` (triaxial) o `"A:80|B:20"` (biaxial). Permite comparación cross-project **dentro del mismo modo** y bloquea comparación cruzada entre modos (correcto).
  - `exportCsv` genera columnas desde `components`.
  - UI, impresión, comparación: iteran sobre `components` en lugar de hardcodear A/B/C.
- Contras: migración V2→V3 obligatoria; refactor amplio en engine y UI.

---

## J. Modelo recomendado

**Recomendación: Alternativa B** — `Experiment` con `mode`, `components[]` como fuente de verdad y `Sample.composition` como estructura genérica.

### Núcleo

- `Experiment.mode: 'monoaxial' | 'biaxial' | 'triaxial'` — fuente única de verdad del tipo.
- `components: ComponentMaterial[]` — **fuente de verdad** del número y la identidad de las materias/vértices que participan: 1 para mono, 2 para bi, 3 para tri.
- `Sample.composition: Record<string, number>` — estructura genérica, keyada por `component.id`; suma = 100 en bi/tri; en mono la muestra única es `{ main: 100 }` (o la keyada por el id del componente único).

### Por qué B, no A

1. **Type safety honesto**. En A, los asserts actuales de `serialization` (`vertices.A/B/C requeridos`) o bien se relajan (perdiendo garantías) o bien exigen cargar siempre B y C aunque sean `null`. En B, el tipo describe exactamente la realidad del modo.
2. **UI expresable sin ramas escondidas**. Un `components.length === 1` da naturalmente un formulario de receta única; `=== 2` da la línea A/B; `=== 3` da el triángulo. En A, el componente biaxial seguiría recibiendo un `C` y teniendo que ignorarlo.
3. **Regla del brief**: *"NO implementar biaxial como C siempre 0 si eso queda expuesto como modelo permanente"*. B la cumple por diseño; A la viola por diseño.
4. **CSV y comparación generalizan natural**. `compositionKey` ordenado por id funciona para N componentes; CSV genera columnas desde `components`; `projectComparisonReport` ya acepta número variable de columnas.
5. **Aísla triaxial a lo que realmente es triaxial**. Triángulo, barycentric, gradient canvas, `interpolateColor` quedan como piezas opcionales activadas sólo cuando `mode === 'triaxial'`.
6. **Pragmatismo preservado**. Internamente `calculatePreparation` ya agrega por nombre normalizado y es N-ario de facto; migrar su firma a `Record<string, number>` no cambia el algoritmo. B no es más caro que A en el motor.

### Reserva

La alternativa A sólo tendría sentido si quisiéramos un cambio puramente cosmético que no toque serialización. Como el objetivo declarado es tener semánticas reales distintas para mono/bi/tri, A es un atajo que se paga más adelante.

---

## K. Migración V2 → V3

### Objetivo

Migrar la persistencia actual al nuevo modelo generalizado **sin alterar un bit** del comportamiento triaxial existente.

```
Entrada V2 (TriaxialProject):
  version: 2
  vertices: { A, B, C }
  step
  samples implícitas por generateTriaxial(step)
  results: Record<sampleId, FiringResult>

Salida V3 (Experiment):
  version: 3
  mode: 'triaxial'
  components: [
    { id: 'A', ...vertices.A },
    { id: 'B', ...vertices.B },
    { id: 'C', ...vertices.C },
  ]
  step (idéntico)
  samples NO se persisten (siguen siendo derivadas: generateTriaxial(step))
  results se mantienen bajo el mismo sampleId
```

### Invariantes a preservar (criterio de no-regresión)

- **20 % → 21 muestras** exactamente.
- **T09 → 40/20/40** exactamente.
- IDs de muestra preservados (`generateTriaxial(step)` sigue siendo determinista con el mismo iterador).
- Resultados existentes (`FiringResult` por `sampleId`) accesibles sin pérdida.
- Fotos (`storage/imageStorage.ts`, keyadas por `projectId + sampleId`) accesibles sin pérdida.
- Series (`seriesStorage`) accesibles; `projectIds` continúa apuntando a los mismos proyectos.
- `materialId` y la vinculación con la Material Library preservadas en cada `ComponentMaterial`.
- `firing` (por proyecto y override por muestra) idéntico.
- `experiment` (contexto experimental) idéntico.
- CSV, SVG, impresión y comparación triaxial deben producir **salida bit-a-bit igual** para proyectos V2 migrados.

### Esquema de serialización V3

- `PROJECT_VERSION = 3`.
- `assert(version <= PROJECT_VERSION)`.
- Si V2 → `migrateV2ToV3(data)` construye `components` desde `vertices` (en orden A, B, C) y setea `mode = 'triaxial'`.
- Si V1 → V1→V2 (como hoy) → V2→V3.
- Mantener en Fase 1 un adaptador `experimentToTriaxialProject` para que la UI siga consumiendo el shape V2 mientras el motor ya habla V3 — así los tests actuales siguen siendo regresión 1:1.

### Compatibilidad con la Material Library

- `ComponentMaterial` conserva `materialId` cuando el componente proviene de la library (igual que `VertexMaterial` hoy). Los estados `identical | compatible_legacy | ambiguous | different` siguen aplicando sin cambios en su definición.

---

## L. Persistencia / storage

### Estado actual

- **localStorage keys** (literales):
  - `monklab.triaxial.index` — lista `ProjectSummary[]`.
  - `monklab.triaxial.project.<id>` — JSON del proyecto.
  - `monklab.triaxial.lastOpened` — id del último abierto.
- **IndexedDB**: DB `monklab-triaxial`, `DB_VERSION = 3`.
  - Store `images` (v1, keyPath `key`, index `projectId`).
  - Store `materials` (v2, keyPath `id`).
  - Store `series` (v3, keyPath `id`).
- Upgrades idempotentes.

### Regla dura: NO renombrar todavía

Para preservar instalaciones existentes de los usuarios, **no se renombran**:

- `localStorage`:
  - `monklab.triaxial.index`
  - `monklab.triaxial.project.<id>`
  - `monklab.triaxial.lastOpened`
- `IndexedDB`:
  - DB `monklab-triaxial`
  - stores `images`, `materials`, `series`

Son datos persistentes existentes. Un rename cosmético (p. ej. `monklab.experiment.*` o DB `monklab`) queda explícitamente aplazado a una Fase 6 opcional, con una migración de keys/stores propia, y sólo si decidimos pagar ese coste. Mientras tanto, el modelo V3 convive bajo las mismas keys sin romper nada.

---

## M. Riesgos

### Crítico

- *Previo a esta auditoría*: V1.6.2 estaba sin commit. **Mitigado**: committeado como `e631070` y pusheado antes de arrancar la generalización.

### Alto

- **Migración V2→V3**: un bug en `migrateV2ToV3` puede corromper proyectos guardados. Mitigaciones:
  - Tests de migración con fixtures reales (JSON exportado de proyectos existentes).
  - El `localStorage` conserva el JSON crudo hasta que haya `saveProject` explícito (comportamiento actual), permitiendo rollback simple.
  - Shim `experimentToTriaxialProject` en Fase 1 para que la UI no toque V3 hasta que la migración esté validada.
- **IDs de muestras**: en V3 las muestras siguen siendo derivadas (`generateTriaxial(step)`). Si cualquier cambio altera el orden del iterador, `results` (keyados por `number`) y las fotos en IndexedDB (keyadas por `projectId + sampleId`) se desalinean. **Preservar el iterador exacto** para `mode === 'triaxial'`.
- **`compositionKey`**: hoy es `"a|b|c"`. Al generalizar a `"A:40|B:20|C:40"` cambia el formato. Como se recomputa en memoria y no se persiste (no vive en IndexedDB ni en el JSON del proyecto), es seguro — pero hay que **verificar explícitamente** que no se persista en ningún camino.

### Medio

- **Precisión de balanza**: `quantizeWeights(values, bp, total)` ya es N-ario; funciona igual para mono/bi/tri. Verificar en tests que sigue preservando el total.
- **Series y modos mezclados**: `projectIds` puede apuntar a proyectos de distintos modos. Decisión recomendada: permitirlo en la serie, pero `ProjectComparisonView` sólo activa comparación cross-project cuando todos los proyectos seleccionados comparten `mode`.
- **Fotos** (`imageStorage`): keyadas por `(projectId, sampleId)`, independientes del modo. OK.
- **Exports**: CSV con columnas dinámicas; SVG triaxial sigue sólo-triaxial; biaxial necesita un nuevo generador (barra 1D); mono no requiere visualización.

### Bajo

- README obsoleto (fotos base64 → IndexedDB).
- `TypeScript 6.0.2` en devDependencies (versión suspicious; compila).
- `package.json "version": "0.1.0"` desincronizada con V1.6.x.

---

## N. Netlify / deploy

- **No existe** `netlify.toml` ni `_redirects` en el repo.
- `netlify status` **no se ejecutó** (fuera del alcance READ-ONLY de la auditoría, y no se asume la CLI instalada).
- No se puede determinar desde los archivos si el repo está conectado a un sitio Netlify. Hipótesis razonable: deploy manual o conexión por panel directamente al repo de GitHub.
- Como la app es SPA sin router (todo el estado dentro de `App.tsx`), **no se requiere `_redirects`** hoy.
- Si en el futuro se adopta `react-router`, agregar `/* /index.html 200` será necesario.

---

## O. Flujo futuro de creación de proyecto

Separación propuesta de branding:

- **Marca**: `MonkLab` (fija).
- **Modo / herramienta**: `Monoaxial` | `Biaxial` | `Triaxial`.
- Header: `MONKLAB · <MODO>`. El `· Triaxial` que hoy aparece en el SVG export y en el `brand` de `projectComparisonReport.ts` pasa a derivar de `experiment.mode`.

Flujo "Nuevo proyecto" (conceptual, sin implementar):

```
[+ Nuevo proyecto] → modal de selección
  ┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
  │ Formulación única           │  │ Mezcla lineal A/B           │  │ Mezcla triangular A/B/C     │
  │ Monoaxial                   │  │ Biaxial                     │  │ Triaxial                    │
  │ — una receta a preparar     │  │ — line blend step 5/10/20/25│  │ — triaxial 5/10/20/25       │
  └─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
```

### Conceptos por modo

- **Monoaxial**: 1 componente. No hay step, no hay grid: 1 muestra. UI reutilizable: `FormulationInspector`, editor de receta, hoja de preparación con `grossPerComponent`, precisión de balanza, contexto, cocción, resultado, foto. Casos: esmalte único, engobe, pasta, receta de prueba, mezcla de materias primas.
- **Biaxial**: 2 componentes, `A+B=100`. `ALLOWED_STEPS_LINE = [5, 10, 20, 25]`. `generateBiaxial(step)` emite N+1 muestras en línea. Visualización: barra 1D (línea de muestras) o tabla; no triángulo. Semántica real: `composition = {A: 80, B: 20}`, **nunca** `{A, B, C=0}`.
- **Triaxial**: comportamiento actual **preservado idéntico**. 21 muestras @20%, T09 = 40/20/40. Los tests actuales son el candado de regresión.

---

## P. Plan por fases

**Fase 0 — Reconciliación**
- V1.6.2 ya committeado (`e631070`). ✅
- Siguiente paso de higiene: actualizar README (quitar afirmación falsa de base64; documentar library/series/comparison/report).
- No cambia comportamiento.

**Fase 1 — Modelo genérico + migración V2→V3 sin cambiar UI visible**
- Nuevo `types/experiment.ts` con `Experiment`, `ComponentMaterial`, `Sample` generalizada.
- `engine/generate.ts` con `generateTriaxial`, `generateBiaxial`, `generateMonoaxial`.
- `engine/compositionKey.ts` generalizado (triaxial retrocompatible vía adaptador interno).
- `migrateV2ToV3` en `serialization.ts`.
- Adaptador `experimentToTriaxialProject` para no tocar la UI todavía.
- Mantener tests actuales como regresión + añadir tests de migración.
- UI, CSV, SVG, print **sin cambios externos**.

**Fase 2 — Motor monoaxial**
- `generateMonoaxial()`, `calculatePreparation` acepta N componentes, `expandRecipe` ya es N-ario.
- Tests específicos de mono.

**Fase 3 — Motor biaxial + visualización en línea**
- `generateBiaxial(step)` + componente `LinearDiagram` (barra 1D).
- Tests biaxial.

**Fase 4 — UI selector de modo + flujo de creación**
- Modal "Nuevo proyecto" con 3 tipos.
- Header `MONKLAB · <MODO>`.
- UI condicional por `mode`: oculta triángulo si no triaxial, muestra barra si biaxial, muestra ficha única si monoaxial.
- `VertexCards` / `VertexEditor` → `ComponentCards` / `ComponentEditor`.

**Fase 5 — Exports / print / comparison genéricos**
- CSV con columnas dinámicas desde `components`.
- `exportSvg` sólo triaxial; añadir `exportLinear` para biaxial, `exportMonoSheet` para mono (opcional).
- `projectComparisonReport.ts`: tabla de componentes dinámica, composición formateada por modo.
- Comparación cross-project sólo entre proyectos del **mismo modo**.

**Fase 6 — QA + deploy**
- Pruebas manuales mono/bi/tri + fixtures de migración + validación con proyectos reales guardados.
- Deploy Netlify.
- *Opcional*: rename cosmético de `monklab.triaxial.*` y DB `monklab-triaxial`, con migración de keys/stores propia.

---

## Q. Criterios de no-regresión

Deben seguir siendo verdad tras cada fase:

- `npm test` pasa 242/242 (o más, con los nuevos tests). Ningún test actual se *elimina* durante la generalización; se marcan como regresión triaxial.
- `npm run build` compila sin errores TS.
- `npm run lint` sin findings.
- Para cualquier proyecto triaxial V2 cargado:
  - 20 % → 21 muestras.
  - T09 → 40/20/40.
  - IDs de muestras preservados.
  - `FiringResult` por `sampleId` accesible sin pérdida.
  - Fotos accesibles sin pérdida.
  - `firing` y `experiment` idénticos.
  - CSV export bit-a-bit igual.
  - SVG export bit-a-bit igual.
  - Reporte comparativo imprimible visualmente igual.
- `materialId` y los estados `identical | compatible_legacy | ambiguous | different` de la comparación cross-project no cambian.
- `monklab.triaxial.*` y `monklab-triaxial` DB intactos: una instalación existente abierta tras el upgrade carga sin pedir nada al usuario.

---

## R. Primer bloque recomendado

**Pre-Fase 0** — ya ejecutado:

```
git commit  →  e631070 "MonkLab Triaxial v1.6.2 comparative PDF report"
git push    →  origin/main en e631070
```

**Siguiente bloque pequeño sugerido** (opcional, higiene antes de arrancar Fase 1):

1. Actualizar `README.md`:
   - Corregir la mención a fotos base64 → IndexedDB desde V2.
   - Mencionar material library, series, comparación cross-project, contexto experimental, precisión de balanza, etiquetas imprimibles, reporte comparativo.
   - Añadir en el árbol las carpetas que faltan (`library/`, `experiment/`, `firing/`, `comparison/`, `series/`, `print/`).
2. Limpiar el comentario placeholder en `engine/projectComparison.ts:97`.
3. (Opcional) Alinear `package.json "version"` con el tag funcional actual.

Después de eso: entrar a Fase 1 (modelo genérico + migración V2→V3 oculta).

---

## S. Conclusión

El proyecto llega a la ventana de generalización en un estado **sólido**:

- Rama `main` sincronizada con remoto, working tree limpio.
- V1.6.2 (Comparative PDF Report) committeada y pusheada.
- Pipeline 100 % verde (242/242 tests, build, lint).
- Toda la infraestructura transversal (storage, library, series, resultados, cocción, contexto, precisión de balanza, recetas) es **ya reutilizable** sin tocar.
- El acoplamiento triaxial está concentrado en pocos puntos bien identificados (`types/project`, `types/triaxial`, `types/material`, `generateTriaxial`, `barycentric`, `exportCsv`, `exportSvg`, `projectComparison`, `serialization`, `print/projectComparisonReport.ts`, `components/triangle/*`, `VertexCards/Editor`).
- El modelo recomendado (Alternativa B: `Experiment.mode` + `components[]` + `Sample.composition`) permite representar los tres modos **sin trucos ni `C=0` escondido**, respetando el espíritu del brief.
- La migración V2→V3 queda definida con invariantes duros (21 muestras @20%, T09 40/20/40, IDs, fotos, resultados, series, `materialId`, `firing`, `experiment` idénticos) y bajo **las mismas keys** de `localStorage` e IndexedDB para no afectar instalaciones existentes.
- Los riesgos están identificados y mitigados por diseño; los únicos realmente altos son migración y preservación de IDs, ambos cubiertos por tests y por el adaptador de Fase 1.

Siguiente movimiento natural: Fase 0 (README) → Fase 1 (modelo + migración oculta).
