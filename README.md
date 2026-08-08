# MonkLab · Triaxial

Herramienta digital para diseñar, calcular, visualizar, documentar y reproducir
ensayos triaxiales cerámicos.

Responde a la pregunta real de taller:

> *"¿Qué tengo que mezclar, cuánto tengo que pesar, qué muestra corresponde a
> cada combinación y qué ocurrió después de cocerla?"*

## Stack

- React 19 + TypeScript
- Vite 8
- Vitest para pruebas del engine
- Oxlint

## Uso

```bash
npm install
npm run dev
```

Compilar:

```bash
npm run build
```

Ejecutar pruebas:

```bash
npm test
```

## Concepto

Un ensayo triaxial parte de tres componentes: **A**, **B** y **C**. Cada uno
puede ser un material, un compuesto, un colorante o una **receta** (mezcla de
materias primas con sus porcentajes).

- Cada muestra combina los tres de modo que `A + B + C = 100`.
- La *división* (`step`) controla la resolución del triángulo:

| Step | Muestras |
|------|----------|
| 25 % | 15       |
| 20 % | 21       |
| 10 % | 66       |
|  5 % | 231      |

- Cada muestra se pesa a partir de un peso global configurable (por ejemplo 20 g).
- Si A/B/C son recetas, la aplicación descompone cada pesada en materias primas
  y agrega los ingredientes comunes en una única hoja de preparación.

## Degradado teórico

El diagrama muestra un degradado que **interpola visualmente** los colores de
referencia asignados a A/B/C. Es una guía visual matemática; **no** predice el
color real después de la cocción.

## Modos

- **Formulación**: composición teórica, colores y pesadas.
- **Resultados**: cada nodo se pinta con el color real observado tras la cocción,
  registrado por muestra.

## Arquitectura

```
src/
  engine/                Matemática pura, sin React
    generateTriaxial.ts  Enumeración de muestras
    barycentric.ts       Coordenadas triangulares
    calculateSampleWeights.ts
    expandRecipe.ts      Descomposición en ingredientes
    calculatePreparation.ts
    interpolateColor.ts
    serialization.ts     JSON versionado
    exportCsv.ts
    defaults.ts
    format.ts
  storage/               localStorage (proyectos)
  types/                 material, project, result, triaxial
  components/
    materials/           editor A/B/C
    recipes/             editor de receta
    triangle/            SVG + Canvas de degradado
    samples/             inspector, tabla, hoja de preparación
    results/             registro de cocción (foto opcional)
    project/             cabecera y menú
  App.tsx                Contenedor de estado
  App.css / index.css    Sistema de diseño (tokens CSS)
```

## Persistencia

- Los proyectos se guardan en `localStorage` bajo la clave
  `monklab.triaxial.project.<id>`.
- Cada proyecto se serializa como JSON con un campo `version` para permitir
  migraciones futuras.
- **Importar / exportar** desde el menú *Proyecto ▾* usa el formato
  `.monklab.json`.
- Al recargar, la aplicación restaura el último proyecto abierto.

## Exportaciones

- **CSV** (`;` como separador, UTF-8 con BOM) con composición y pesada por
  muestra + resultado registrado.
- **SVG** del diagrama actual.
- **Imprimir / PDF** vía `window.print()` con hoja preparada (`@media print`).

## Notas

- La matemática vive fuera de React: cada engine es una función pura testable.
- El editor de recetas valida el 100 % con estados *ok / advertencia / error* y
  ofrece **Normalizar a 100 %** — nunca normaliza silenciosamente.
- El margen de preparación multiplica las cantidades finales pero **no** altera
  las composiciones A/B/C.
- Fotos de resultado se guardan como data URI dentro del proyecto (para
  cantidades moderadas; en caso de proyectos muy grandes conviene reemplazar
  por IndexedDB).
