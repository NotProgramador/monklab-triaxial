import { useEffect, useRef } from 'react'
import type { TriangleVertices } from '../../engine/barycentric'
import { hexToRgb, interpolateBarycentric } from '../../engine/interpolateColor'

interface Props {
  width: number
  height: number
  vertices: TriangleVertices
  colorA: string
  colorB: string
  colorC: string
}

function sign(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by)
}

export function GradientCanvas({ width, height, vertices, colorA, colorB, colorC }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ca = hexToRgb(colorA)
    const cb = hexToRgb(colorB)
    const cc = hexToRgb(colorC)

    const img = ctx.createImageData(width, height)
    const data = img.data

    const ax = vertices.A.x, ay = vertices.A.y
    const bx = vertices.B.x, by = vertices.B.y
    const cx = vertices.C.x, cy = vertices.C.y
    const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denom
        const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denom
        const l3 = 1 - l1 - l2
        const idx = (y * width + x) * 4
        if (l1 < 0 || l2 < 0 || l3 < 0) {
          data[idx + 3] = 0
          continue
        }
        const col = interpolateBarycentric(l1 * 100, l2 * 100, l3 * 100, ca, cb, cc)
        data[idx] = col.r
        data[idx + 1] = col.g
        data[idx + 2] = col.b
        data[idx + 3] = 230
      }
    }
    ctx.clearRect(0, 0, width, height)
    ctx.putImageData(img, 0, 0)
  }, [width, height, vertices, colorA, colorB, colorC])

  // sign is used implicitly for point-in-triangle via barycentric coords
  void sign

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="gradient-canvas"
    />
  )
}
