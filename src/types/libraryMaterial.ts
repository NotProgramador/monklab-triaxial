export type LibraryCategory =
  | 'arcilla'
  | 'feldespato'
  | 'silice'
  | 'fundente'
  | 'carbonato'
  | 'oxido'
  | 'frita'
  | 'pigmento'
  | 'otro'

export interface LibraryMaterial {
  id: string
  name: string
  category: LibraryCategory
  formula?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = [
  'arcilla',
  'feldespato',
  'silice',
  'fundente',
  'carbonato',
  'oxido',
  'frita',
  'pigmento',
  'otro',
]

export const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  arcilla: 'Arcilla',
  feldespato: 'Feldespato',
  silice: 'Sílice',
  fundente: 'Fundente',
  carbonato: 'Carbonato',
  oxido: 'Óxido',
  frita: 'Frita',
  pigmento: 'Pigmento',
  otro: 'Otro',
}

export function isLibraryCategory(v: unknown): v is LibraryCategory {
  return typeof v === 'string' && (LIBRARY_CATEGORIES as readonly string[]).includes(v)
}
