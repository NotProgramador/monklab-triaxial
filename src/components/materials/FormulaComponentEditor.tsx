import type { FormulaComponent, MaterialType } from '../../types/material'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import { RecipeEditor } from '../recipes/RecipeEditor'

interface FormulaComponentEditorProps {
  component: FormulaComponent
  library: LibraryMaterial[]
  onChange: (c: FormulaComponent) => void
  /**
   * Optional "A"/"B"/"C" badge rendered above the fields; used by the
   * triaxial VertexEditor. Monoaxial callers omit it, so the editor shows
   * the fields with no vertex-id decoration.
   */
  badge?: {
    color: string
    label: string
  }
}

const FORMULA_TYPES: { value: MaterialType; label: string }[] = [
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

/**
 * Mode-neutral editor for a single formula component. The triaxial
 * `VertexEditor` is a thin wrapper around this one and the monoaxial
 * workspace reuses it as-is. CSS classes stay vertex-* so the triaxial
 * layout keeps its pixel-identical appearance.
 */
export function FormulaComponentEditor({ component, library, onChange, badge }: FormulaComponentEditorProps) {
  const hasRecipe = Boolean(component.recipe)

  return (
    <div className="vertex-editor">
      {badge && (
        <div className="vertex-editor-header">
          <span className="vertex-badge" style={{ background: badge.color }} aria-hidden />
          <span className="vertex-id">{badge.label}</span>
        </div>
      )}

      <label className="field">
        <span>Nombre</span>
        <input
          type="text"
          value={component.name}
          onChange={(e) => onChange({ ...component, name: e.target.value })}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Tipo</span>
          <select
            value={component.type}
            onChange={(e) => onChange({ ...component, type: e.target.value as MaterialType })}
          >
            {FORMULA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="field field-color">
          <span>Color</span>
          <input
            type="color"
            value={component.color}
            onChange={(e) => onChange({ ...component, color: e.target.value })}
          />
        </label>
      </div>

      <label className="field">
        <span>Fórmula química</span>
        <input
          type="text"
          value={component.chemicalFormula ?? ''}
          placeholder="Opcional (ej. Fe₂O₃)"
          onChange={(e) => onChange({ ...component, chemicalFormula: e.target.value || undefined })}
        />
      </label>

      <label className="field">
        <span>Notas</span>
        <textarea
          rows={2}
          value={component.notes ?? ''}
          onChange={(e) => onChange({ ...component, notes: e.target.value || undefined })}
        />
      </label>

      <div className="recipe-toggle">
        <label>
          <input
            type="checkbox"
            checked={hasRecipe}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ ...component, recipe: { ingredients: [] } })
              } else {
                const { recipe: _r, ...rest } = component
                void _r
                onChange({ ...rest, id: component.id })
              }
            }}
          />
          <span>Contiene receta</span>
        </label>
      </div>

      {hasRecipe && component.recipe && (
        <RecipeEditor
          recipe={component.recipe}
          library={library}
          onChange={(r) => onChange({ ...component, recipe: r })}
        />
      )}
    </div>
  )
}
