import type { Recipe } from '../../types/material'
import { normalizeRecipeTo100, recipeTotal } from '../../engine/expandRecipe'

interface RecipeEditorProps {
  recipe: Recipe
  onChange: (r: Recipe) => void
}

function newId(): string {
  return `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function RecipeEditor({ recipe, onChange }: RecipeEditorProps) {
  const total = recipeTotal(recipe)
  const diff = total - 100
  const status =
    Math.abs(diff) < 0.01 ? 'ok' : diff > 0 ? 'error' : 'warn'

  const updateIngredient = (index: number, patch: Partial<Recipe['ingredients'][number]>) => {
    const next = recipe.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing))
    onChange({ ...recipe, ingredients: next })
  }

  const removeIngredient = (index: number) => {
    onChange({ ...recipe, ingredients: recipe.ingredients.filter((_, i) => i !== index) })
  }

  const addIngredient = () => {
    onChange({
      ...recipe,
      ingredients: [...recipe.ingredients, { id: newId(), name: '', percentage: 0 }],
    })
  }

  const normalize = () => {
    if (total <= 0) return
    onChange(normalizeRecipeTo100(recipe))
  }

  const message =
    status === 'ok' ? 'Receta válida.' :
    status === 'warn' ? `Receta incompleta. Faltan ${(-diff).toFixed(2)} puntos porcentuales.` :
    `Receta excedida. Excede ${diff.toFixed(2)} puntos porcentuales.`

  return (
    <div className="recipe-editor">
      <div className="recipe-editor-head">
        <span className="mono-eyebrow">Ingredientes</span>
        <button type="button" onClick={addIngredient} className="btn-ghost">+ añadir</button>
      </div>

      {recipe.ingredients.length === 0 && (
        <p className="hint">Añade materias primas y sus porcentajes.</p>
      )}

      <div className="recipe-rows">
        {recipe.ingredients.map((ing, i) => (
          <div className="recipe-row" key={ing.id}>
            <input
              type="text"
              placeholder="Materia prima"
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={ing.percentage}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateIngredient(i, { percentage: Number.isFinite(v) ? v : 0 })
              }}
            />
            <span className="pct">%</span>
            <button
              type="button"
              onClick={() => removeIngredient(i)}
              className="btn-ghost btn-danger"
              aria-label="Eliminar ingrediente"
            >×</button>
          </div>
        ))}
      </div>

      <div className={`recipe-total recipe-total--${status}`}>
        <div className="recipe-total-line">
          <span>Total</span>
          <strong>{total.toFixed(2)}%</strong>
        </div>
        <p className="recipe-msg">{message}</p>
        {status !== 'ok' && total > 0 && (
          <button type="button" onClick={normalize} className="btn-ghost">Normalizar a 100 %</button>
        )}
      </div>
    </div>
  )
}
