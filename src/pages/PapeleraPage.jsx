import React from 'react'
import Card from '../components/ui/Card.jsx'

export default function PapeleraPage({ rows, onRestore, onDeletePermanent }) {
  return (
    <Card
      title="Papelera"
      right={<div className="text-xs text-slate-500 dark:text-slate-400">{rows.length} elemento(s)</div>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Año</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Mes</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Semana</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Canal</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Eliminado</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                  No hay elementos en la papelera.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3">{String(r.año ?? '')}</td>
                  <td className="py-2 pr-3">{String(r.mes ?? '')}</td>
                  <td className="py-2 pr-3">{String(r.semanaDelMes ?? '')}</td>
                  <td className="py-2 pr-3">{String(r.canal ?? '')}</td>
                  <td className="py-2 pr-3">{String(r.deletedAt ?? '')}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRestore(r.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')
                          if (!ok) return
                          onDeletePermanent(r.id)
                        }}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                      >
                        Eliminar definitivo
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
