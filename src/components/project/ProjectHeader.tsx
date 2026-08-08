import { useState } from 'react'
import type { ProjectSummary, TriaxialProject } from '../../types/project'

interface Props {
  project: TriaxialProject
  savedProjects: ProjectSummary[]
  dirty: boolean
  onRename: (name: string) => void
  onNew: () => void
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onOpen: (id: string) => void
  onImport: (file: File) => void
  onExport: () => void
  onPrintReport: () => void
  onPrintLabels: () => void
}

export function ProjectHeader({
  project, savedProjects, dirty,
  onRename, onNew, onSave, onDuplicate, onDelete, onOpen,
  onImport, onExport, onPrintReport, onPrintLabels,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="app-header no-print">
      <div className="brand">
        <p className="eyebrow">MONKLAB</p>
        <h1>Triaxial</h1>
      </div>

      <div className="project-title">
        <input
          className="project-name-input"
          type="text"
          value={project.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Nombre del proyecto"
        />
        <span className={`save-state ${dirty ? 'is-dirty' : 'is-clean'}`}>
          {dirty ? 'Cambios sin guardar' : 'Guardado'}
        </span>
      </div>

      <div className="header-actions">
        <button className="btn" type="button" onClick={onSave}>Guardar</button>
        <button className="btn-ghost" type="button" onClick={() => setMenuOpen(!menuOpen)}>
          Proyecto ▾
        </button>
        {menuOpen && (
          <div className="menu" role="menu" onMouseLeave={closeMenu}>
            <button type="button" onClick={() => { onNew(); closeMenu() }}>Nuevo</button>
            <button type="button" onClick={() => { onDuplicate(); closeMenu() }}>Duplicar</button>
            <button type="button" onClick={() => { onDelete(); closeMenu() }}>Eliminar</button>
            <hr />
            <button type="button" onClick={() => { onExport(); closeMenu() }}>Exportar JSON</button>
            <label className="menu-file">
              Importar JSON
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onImport(f)
                  closeMenu()
                }}
              />
            </label>
            <hr />
            <button type="button" onClick={() => { onPrintReport(); closeMenu() }}>Imprimir informe</button>
            <button type="button" onClick={() => { onPrintLabels(); closeMenu() }}>Imprimir etiquetas</button>
            {savedProjects.length > 0 && (
              <>
                <hr />
                <div className="menu-label">Proyectos guardados</div>
                {savedProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === project.id ? 'is-active' : ''}
                    onClick={() => { onOpen(p.id); closeMenu() }}
                  >
                    {p.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
