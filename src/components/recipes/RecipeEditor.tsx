import { useMemo, useState } from 'react'
import type { Recipe } from '../../types/material'
import type { LibraryMaterial } from '../../types/libraryMaterial'
import { normalizeRecipeTo100, recipeTotal } from '../../engine/expandRecipe'
import { normalizeMaterialName } from '../../engine/materialIdentity'

interface RecipeEditorProps {
  recipe: Recipe
  library: LibraryMaterial[]
  onChange: (r: Recipe) => void
}

function newId(): string {
  return `ing_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function RecipeEditor({ recipe, library, onChange }: RecipeEditorProps) {
  const total = recipeTotal(recipe)
  const diff = total - 100
  const status =
    Math.abs(diff) < 0.01 ? 'ok' : diff > 0 ? 'error' : 'warn'

  const libraryById = useMemo(() => {
    const m = new Map<string, LibraryMaterial>()
    for (const lm of library) m.set(lm.id, lm)
    return m
  }, [library])

  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [query, setQuery] = useState('')

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

  const filteredLibrary = useMemo(() => {
    const q = normalizeMaterialName(query)
    if (!q) return library.slice(0, 8)
    return library
      .filter((lm) => normalizeMaterialName(lm.name).includes(q))
      .slice(0, 12)
  }, [library, query])

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
        {recipe.ingredients.map((ing, i) => {
          const linked = ing.materialId ? libraryById.get(ing.materialId) : undefined
          const brokenLink = Boolean(ing.materialId) && !linked
          const isPickerOpen = openPicker === ing.id
          return (
            <div className="recipe-row-wrap" key={ing.id}>
              <div className="recipe-row">
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
              <div className="recipe-link-row">
                {linked && (
                  <span className="material-chip material-chip--linked" title={`Vinculado a ${linked.name}`}>
                    <span aria-hidden>⚭</span> {linked.name}
                  </span>
                )}
                {brokenLink && (
                  <span className="material-chip material-chip--broken" title="Material no disponible en biblioteca">
                    <span aria-hidden>⚠</span> Vínculo no disponible
                  </span>
                )}
                <div className="recipe-link-actions">
                  <button
                    type="button"
                    className="btn-ghost btn-tiny"
                    aria-expanded={isPickerOpen}
                    onClick={() => {
                      setOpenPicker(isPickerOpen ? null : ing.id)
                      setQuery('')
                    }}
                  >
                    {linked ? 'Cambiar' : brokenLink ? 'Volver a vincular' : 'Vincular…'}
                  </button>
                  {(linked || brokenLink) && (
                    <button
                      type="button"
                      className="btn-ghost btn-tiny"
                      onClick={() => updateIngredient(i, { materialId: undefined })}
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              </div>
              {isPickerOpen && (
                <div className="material-picker">
                  <input
                    type="text"
                    placeholder="Buscar material…"
                    value={query}
                    autoFocus
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {filteredLibrary.length === 0 ? (
                    <p className="hint">Sin resultados. Guarda uno desde Materiales.</p>
                  ) : (
                    <ul className="material-picker-list">
                      {filteredLibrary.map((lm) => (
                        <li key={lm.id}>
                          <button
                            type="button"
                            className="material-picker-item"
                            onClick={() => {
                              updateIngredient(i, { materialId: lm.id, name: lm.name })
                              setOpenPicker(null)
                            }}
                          >
                            <span className="mp-name">{lm.name}</span>
                            <span className="mp-cat">{lm.category}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className="btn-ghost btn-tiny"
                    onClick={() => {
                      updateIngredient(i, { materialId: undefined })
                      setOpenPicker(null)
                    }}
                  >
                    Usar como ingrediente libre
                  </button>
                </div>
              )}
            </div>
          )
        })}
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
