function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export interface RGB {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.trim().replace('#', '')
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return { r: 200, g: 200, b: 200 }
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function interpolateBarycentric(
  a: number,
  b: number,
  c: number,
  ca: RGB,
  cb: RGB,
  cc: RGB,
): RGB {
  const total = a + b + c
  if (total <= 0) return { r: 0, g: 0, b: 0 }
  const na = a / total
  const nb = b / total
  const nc = c / total
  return {
    r: na * ca.r + nb * cb.r + nc * cc.r,
    g: na * ca.g + nb * cb.g + nc * cc.g,
    b: na * ca.b + nb * cb.b + nc * cc.b,
  }
}
