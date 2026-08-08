export interface Point {
  x: number
  y: number
}

export interface TriangleVertices {
  A: Point
  B: Point
  C: Point
}

export function barycentricToCartesian(
  a: number,
  b: number,
  c: number,
  vertices: TriangleVertices,
): Point {
  const total = a + b + c

  if (total === 0) {
    throw new Error('La suma de A, B y C no puede ser 0.')
  }

  const normalizedA = a / total
  const normalizedB = b / total
  const normalizedC = c / total

  return {
    x:
      normalizedA * vertices.A.x +
      normalizedB * vertices.B.x +
      normalizedC * vertices.C.x,

    y:
      normalizedA * vertices.A.y +
      normalizedB * vertices.B.y +
      normalizedC * vertices.C.y,
  }
}