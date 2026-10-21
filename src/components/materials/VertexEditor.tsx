import type { FormulaComponent, VertexMaterial } from '../../types/material'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import { FormulaComponentEditor } from './FormulaComponentEditor'

interface VertexEditorProps {
  vertex: VertexMaterial
  library: LibraryMaterial[]
  onChange: (v: VertexMaterial) => void
}

/**
 * Thin wrapper around `FormulaComponentEditor` that preserves the triaxial
 * A/B/C badge. The underlying editor is mode-neutral; this component just
 * keeps the id invariant on the way in and out so the triaxial code path
 * is byte-identical to V1.7.0.
 */
export function VertexEditor({ vertex, library, onChange }: VertexEditorProps) {
  const component: FormulaComponent = {
    id: vertex.id,
    name: vertex.name,
    type: vertex.type,
    color: vertex.color,
    chemicalFormula: vertex.chemicalFormula,
    notes: vertex.notes,
    recipe: vertex.recipe,
  }
  return (
    <FormulaComponentEditor
      component={component}
      library={library}
      badge={{ color: vertex.color, label: vertex.id }}
      onChange={(c) => onChange({
        id: vertex.id, // preserve 'A' | 'B' | 'C'
        name: c.name,
        type: c.type,
        color: c.color,
        chemicalFormula: c.chemicalFormula,
        notes: c.notes,
        recipe: c.recipe,
      })}
    />
  )
}
