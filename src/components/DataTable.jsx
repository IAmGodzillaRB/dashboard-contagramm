import React, { useMemo } from 'react'
import Card from './ui/Card.jsx'
import { CHANNELS, IS_META_ADS_CHANNEL } from '../constants.js'
import { computeRowMetrics } from '../lib/metrics.js'
import { formatCurrencyMXN, formatNumber, safeNumber } from '../lib/numbers.js'
import { validateRow, rowHasErrors } from '../lib/validation.js'
import { Plus, Trash2 } from 'lucide-react'

const HEADERS = [
  { key: 'año', label: 'Año', type: 'number', className: 'min-w-[80px]' },
  { key: 'mes', label: 'Mes', type: 'number', className: 'min-w-[70px]' },
  { key: 'semanaDelMes', label: 'Semana', type: 'number', className: 'min-w-[90px]' },
  { key: 'fechaInicioSemana', label: 'Inicio', type: 'date', className: 'min-w-[140px]' },
  { key: 'fechaFinSemana', label: 'Fin', type: 'date', className: 'min-w-[140px]' },
  { key: 'canal', label: 'Canal', type: 'select', className: 'min-w-[220px]' },
  { key: 'inversion', label: 'Inversión ($)', type: 'currency', className: 'min-w-[130px]' },
  { key: 'leads', label: 'Leads', type: 'numberOptional', className: 'min-w-[110px]' },
  { key: 'clientesNuevos', label: 'Clientes nuevos', type: 'number', className: 'min-w-[140px]' },
  { key: 'numeroVentas', label: 'Núm. ventas', type: 'number', className: 'min-w-[130px]' },
  { key: 'ingresos', label: 'Ingresos ($)', type: 'currency', className: 'min-w-[140px]' },
  { key: 'notas', label: 'Notas', type: 'textOptional', className: 'min-w-[220px]' },
]

function inputBaseClass(hasError) {
  return (
    'w-full rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-950 ' +
    (hasError
      ? 'border-rose-400 bg-rose-50 dark:border-rose-500'
      : 'border-slate-200 bg-white dark:border-slate-800')
  )
}

function normalizeValue(type, raw) {
  if (type === 'number' || type === 'currency') return raw === '' ? '' : Number(raw)
  if (type === 'numberOptional') return raw === '' ? '' : Number(raw)
  return raw
}

export default function DataTable({ rows, onAdd, onUpdate, onDelete }) {
  const computed = useMemo(() => {
    const byId = {}
    const errorsById = {}

    for (const r of rows) {
      byId[r.id] = computeRowMetrics(r)
      const errors = validateRow(r)
      errorsById[r.id] = errors
    }

    return { byId, errorsById }
  }, [rows])

  const invalidCount = useMemo(() => {
    return rows.reduce((acc, r) => acc + (rowHasErrors(computed.errorsById[r.id]) ? 1 : 0), 0)
  }, [rows, computed.errorsById])

  return (
    <Card
      title="Tabla de datos semanales (editable)"
      right={
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {invalidCount > 0 ? `${invalidCount} fila(s) con errores` : 'Sin errores'}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={14} />
            Agregar semana
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1550px] text-left text-sm">
          <thead className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <tr>
              {HEADERS.map((h) => (
                <th key={h.key} className={"py-2 pr-3 whitespace-nowrap " + (h.className || '')}>
                  {h.label}
                </th>
              ))}
              <th className="py-2 pr-3">ROI/ROAS</th>
              <th className="py-2 pr-3">CAC</th>
              <th className="py-2 pr-3">Ticket</th>
              <th className="py-2 pr-3">Conv.%</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = computed.byId[r.id]
              const errors = computed.errorsById[r.id]
              const isInvalid = rowHasErrors(errors)

              return (
                <tr key={r.id} className={"border-t border-slate-100 align-top dark:border-slate-800 " + (isInvalid ? 'bg-rose-50/40 dark:bg-rose-950/10' : '')}>
                  {HEADERS.map((h) => {
                    const hasError = Boolean(errors?.[h.key])

                    if (h.type === 'select') {
                      return (
                        <td key={h.key} className={"py-2 pr-3 " + (h.className || '')}>
                          <select
                            value={r[h.key]}
                            onChange={(e) => onUpdate(r.id, h.key, e.target.value)}
                            className={inputBaseClass(hasError)}
                            title={errors?.[h.key] || ''}
                          >
                            {CHANNELS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                      )
                    }

                    if (h.type === 'textOptional') {
                      return (
                        <td key={h.key} className={"py-2 pr-3 " + (h.className || '')}>
                          <input
                            value={r[h.key] ?? ''}
                            onChange={(e) => onUpdate(r.id, h.key, e.target.value)}
                            className={inputBaseClass(hasError)}
                            placeholder="(opcional)"
                            title={errors?.[h.key] || ''}
                          />
                        </td>
                      )
                    }

                    const inputType = h.type === 'date' ? 'date' : 'number'
                    const step = h.type === 'currency' ? '0.01' : '1'

                    return (
                      <td key={h.key} className={"py-2 pr-3 " + (h.className || '')}>
                        <input
                          type={inputType}
                          step={step}
                          value={r[h.key] ?? ''}
                          onChange={(e) => onUpdate(r.id, h.key, normalizeValue(h.type, e.target.value))}
                          className={inputBaseClass(hasError)}
                          placeholder={h.type === 'numberOptional' ? '(opcional)' : ''}
                          title={errors?.[h.key] || ''}
                        />
                        {hasError && <div className="mt-1 text-xs text-rose-600">{errors[h.key]}</div>}
                      </td>
                    )
                  })}

                  <td className="py-2 pr-3">
                    <div className="font-semibold">
                      {IS_META_ADS_CHANNEL(r.canal) ? formatNumber(m.roas, 2) : formatNumber(m.roi, 1) + '%'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{IS_META_ADS_CHANNEL(r.canal) ? 'ROAS' : 'ROI'}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{formatCurrencyMXN(m.cac)}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{formatCurrencyMXN(m.ticketPromedio)}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{formatNumber(m.tasaConversion, 1)}%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Leads: {formatNumber(safeNumber(r.leads), 0)}</div>
                  </td>

                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      title="Eliminar fila"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {/* Comentario clave: Las métricas se recalculan en tiempo real al editar */}
        Las métricas (ROI/ROAS, CAC, ticket y conversión) se recalculan automáticamente al editar.
      </div>
    </Card>
  )
}
