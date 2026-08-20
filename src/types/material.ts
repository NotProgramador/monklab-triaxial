export type MaterialType =
  | 'material'
  | 'compuesto'
  | 'oxido'
  | 'pigmento'
  | 'engobe'
  | 'esmalte'
  | 'pasta'
  | 'frita'
  | 'receta'
  | 'otro'

export interface RecipeIngredient {
  id: string
  /** Optional link to a LibraryMaterial. Snapshot `name` is still preserved for portability. */
  materialId?: string
  name: string
  percentage: number
}

export interface Recipe {
  ingredients: RecipeIngredient[]
  notes?: string
}

export interface VertexMaterial {
  id: 'A' | 'B' | 'C'
  name: string
  type: MaterialType
  color: string
  chemicalFormula?: string
  notes?: string
  recipe?: Recipe
}
