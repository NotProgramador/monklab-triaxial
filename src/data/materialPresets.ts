import type { LibraryCategory } from '../types/libraryMaterial'

/**
 * Static preset templates. Never installed automatically.
 * At install time each entry is assigned a fresh UUID and skipped if a
 * material with the same normalized name already exists.
 *
 * Formulas are included only where they are inequivocal for the mineral
 * (SiO2, Al2O3, carbonates, single oxides). Commercial products with
 * variable composition (feldspars, ball clays, frits, rutile, Gerstley)
 * are left without a formula.
 */

export interface PresetMaterial {
  name: string
  category: LibraryCategory
  formula?: string
}

export interface MaterialPreset {
  id: string
  label: string
  description: string
  materials: readonly PresetMaterial[]
}

export const PRESET_MEXICO_CDMX: MaterialPreset = {
  id: 'mexico-cdmx-v1',
  label: 'Materiales comunes — México/CDMX',
  description:
    'Selección inicial de materias primas de uso común en cerámica y habitualmente comercializadas por proveedores especializados en México.',
  materials: [
    // Arcilla
    { name: 'Caolín', category: 'arcilla' },
    { name: 'Arcilla bola', category: 'arcilla' },
    { name: 'Bentonita', category: 'arcilla' },
    // Sílice / otros
    { name: 'Sílice', category: 'silice', formula: 'SiO2' },
    { name: 'Alúmina calcinada', category: 'otro', formula: 'Al2O3' },
    { name: 'Alúmina hidratada', category: 'otro' },
    // Feldespato / fundente
    { name: 'Feldespato potásico', category: 'feldespato' },
    { name: 'Feldespato sódico', category: 'feldespato' },
    { name: 'Sienita nefelina', category: 'feldespato' },
    { name: 'Wollastonita', category: 'fundente' },
    { name: 'Talco', category: 'fundente' },
    { name: 'Dolomita', category: 'fundente' },
    // Carbonato
    { name: 'Carbonato de calcio', category: 'carbonato', formula: 'CaCO3' },
    { name: 'Carbonato de magnesio', category: 'carbonato', formula: 'MgCO3' },
    { name: 'Carbonato de bario', category: 'carbonato', formula: 'BaCO3' },
    { name: 'Carbonato de estroncio', category: 'carbonato', formula: 'SrCO3' },
    { name: 'Carbonato de litio', category: 'carbonato', formula: 'Li2CO3' },
    // Frita / fundente
    { name: 'Frita 3134', category: 'frita' },
    { name: 'Frita 3110', category: 'frita' },
    { name: 'Borato Gerstley', category: 'fundente' },
    // Otro / opacificantes
    { name: 'Óxido de zinc', category: 'otro', formula: 'ZnO' },
    { name: 'Dióxido de titanio', category: 'otro', formula: 'TiO2' },
    { name: 'Rutilo', category: 'otro' },
    { name: 'Óxido de estaño', category: 'otro', formula: 'SnO2' },
    { name: 'Silicato de zirconio', category: 'otro' },
    // Óxido / pigmento
    { name: 'Óxido de hierro rojo', category: 'oxido', formula: 'Fe2O3' },
    { name: 'Óxido de cobalto', category: 'oxido', formula: 'CoO' },
    { name: 'Carbonato de cobalto', category: 'carbonato', formula: 'CoCO3' },
    { name: 'Óxido de cobre', category: 'oxido', formula: 'CuO' },
    { name: 'Carbonato de cobre', category: 'carbonato', formula: 'CuCO3' },
    { name: 'Óxido de cromo', category: 'oxido', formula: 'Cr2O3' },
    { name: 'Dióxido de manganeso', category: 'oxido', formula: 'MnO2' },
    { name: 'Óxido de níquel', category: 'oxido', formula: 'NiO' },
  ],
}
