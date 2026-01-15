import React from 'react'
import DataTable from '../components/DataTable.jsx'

export default function RegistrosPage({
  rows,
  newRowDefaults,
  onCreate,
  onPatchRow,
  onTrash,
  onExportCsv,
  onPrint,
}) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Imprimir
        </button>
      </div>

      <DataTable rows={rows} newRowDefaults={newRowDefaults} onCreate={onCreate} onPatchRow={onPatchRow} onTrash={onTrash} />
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Nota: La edición se guarda en el dataset global; la tabla muestra las filas según filtros.</div>
    </>
  )
}
