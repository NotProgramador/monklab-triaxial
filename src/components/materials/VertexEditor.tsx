import type { MaterialType, VertexMaterial } from '../../types/material'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import { RecipeEditor } from '../recipes/RecipeEditor'

interface VertexEditorProps {
  vertex: VertexMaterial
  library: LibraryMaterial[]
  onChange: (v: VertexMaterial) => void
}

const TYPES: { value: MaterialType; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'compuesto', label: 'Compuesto' },
  { value: 'oxido', label: 'Óxido / colorante' },
  { value: 'pigmento', label: 'Pigmento' },
  { value: 'engobe', label: 'Engobe' },
  { value: 'esmalte', label: 'Esmalte' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'frita', label: 'Frita' },
  { value: 'receta', label: 'Receta' },
  { value: 'otro', label: 'Otro' },
]

export function VertexEditor({ vertex, library, onChange }: VertexEditorProps) {
  const hasRecipe = Boolean(vertex.recipe)

  return (
    <div className="vertex-editor">
      <div className="vertex-editor-header">
        <span className="vertex-badge" style={{ background: vertex.color }} aria-hidden />
        <span className="vertex-id">{vertex.id}</span>
      </div>

      <label className="field">
        <span>Nombre</span>
        <input
          type="text"
          value={vertex.name}
          onChange={(e) => onChange({ ...vertex, name: e.target.value })}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Tipo</span>
          <select
            value={vertex.type}
            onChange={(e) => onChange({ ...vertex, type: e.target.value as MaterialType })}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="field field-color">
          <span>Color</span>
          <input
            type="color"
            value={vertex.color}
            onChange={(e) => onChange({ ...vertex, color: e.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span>Fórmula química</span>
        <input
          type="text"
          value={vertex.chemicalFormula ?? ''}
          placeholder="Opcional (ej. Fe₂O₃)"
          onChange={(e) => onChange({ ...vertex, chemicalFormula: e.target.value || undefined })}
        />
      </label>

      <label className="field">
        <span>Notas</span>
        <textarea
          rows={2}
          value={vertex.notes ?? ''}
          onChange={(e) => onChange({ ...vertex, notes: e.target.value || undefined })}
        />
      </label>

      <div className="recipe-toggle">
        <label>
          <input
            type="checkbox"
            checked={hasRecipe}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ ...vertex, recipe: { ingredients: [] } })
              } else {
                const { recipe: _r, ...rest } = vertex
                void _r
                onChange({ ...rest, id: vertex.id })
              }
            }}
          />
          <span>Contiene receta</span>
        </label>
      </div>

      {hasRecipe && vertex.recipe && (
        <RecipeEditor
          recipe={vertex.recipe}
          library={library}
          onChange={(r) => onChange({ ...vertex, recipe: r })}
        />
      )}
    </div>
  )
}
