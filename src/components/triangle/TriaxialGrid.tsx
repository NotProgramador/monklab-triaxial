import {
  barycentricToCartesian,
  type TriangleVertices,
} from '../../engine/barycentric'

interface TriaxialGridProps {
  step: number
  vertices: TriangleVertices
}

export function TriaxialGrid({
  step,
  vertices,
}: TriaxialGridProps) {
  const levels: number[] = []

  for (let value = step; value < 100; value += step) {
    levels.push(value)
  }

  return (
    <g className="triaxial-grid">
      {/* Líneas de A constante */}
      {levels.map((a) => {
        const start = barycentricToCartesian(
          a,
          100 - a,
          0,
          vertices,
        )

        const end = barycentricToCartesian(
          a,
          0,
          100 - a,
          vertices,
        )

        return (
          <line
            key={`a-${a}`}
            className="grid-line"
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        )
      })}

      {/* Líneas de B constante */}
      {levels.map((b) => {
        const start = barycentricToCartesian(
          100 - b,
          b,
          0,
          vertices,
        )

        const end = barycentricToCartesian(
          0,
          b,
          100 - b,
          vertices,
        )

        return (
          <line
            key={`b-${b}`}
            className="grid-line"
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        )
      })}

      {/* Líneas de C constante */}
      {levels.map((c) => {
        const start = barycentricToCartesian(
          100 - c,
          0,
          c,
          vertices,
        )

        const end = barycentricToCartesian(
          0,
          100 - c,
          c,
          vertices,
        )

        return (
          <line
            key={`c-${c}`}
            className="grid-line"
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        )
      })}
    </g>
  )
}