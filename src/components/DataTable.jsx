import React, { useMemo, useState } from 'react'
import Card from './ui/Card.jsx'
import { CHANNELS, IS_META_ADS_CHANNEL } from '../constants.js'
import { computeRowMetrics } from '../lib/metrics.js'
import { formatCurrencyMXN, formatNumber, safeNumber } from '../lib/numbers.js'
import { validateRow, rowHasErrors } from '../lib/validation.js'
import { Pencil, Plus, Trash2 } from 'lucide-react'

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

function formatCellValue(row, header) {
  const v = row?.[header.key]
  if (header.type === 'currency') return formatCurrencyMXN(safeNumber(v))
  if (header.type === 'number' || header.type === 'numberOptional') return v === '' || v === null || v === undefined ? '' : formatNumber(safeNumber(v), 0)
  return v ?? ''
}

export default function DataTable({ rows, newRowDefaults, onCreate, onPatchRow, onTrash }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)

  const [confirmTrash, setConfirmTrash] = useState(null)

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

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const pageRows = rows.slice(startIndex, startIndex + pageSize)

  const isCreateMode = editingId === '__create__'

  function openCreateModal() {
    setEditingId('__create__')
    setDraft({ ...(newRowDefaults && typeof newRowDefaults === 'object' ? newRowDefaults : {}) })
    setIsEditOpen(true)
  }

  function openEditModal(row) {
    setEditingId(row.id)
    setDraft({ ...row })
    setIsEditOpen(true)
  }

  function closeEditModal() {
    setIsEditOpen(false)
    setEditingId(null)
    setDraft(null)
  }

  function closeTrashConfirm() {
    setConfirmTrash(null)
  }

  const draftErrors = useMemo(() => {
    if (!draft) return {}
    return validateRow(draft)
  }, [draft])

  const canSaveDraft = draft && !rowHasErrors(draftErrors)

  return (
    <Card
      title="Tabla de datos semanales"
      right={
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {invalidCount > 0 ? `${invalidCount} fila(s) con errores` : 'Sin errores'}
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={14} />
            Agregar semana
          </button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando {totalRows === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalRows)} de {totalRows}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Filas:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Anterior
          </button>
          <div className="min-w-[80px] text-center text-xs text-slate-500 dark:text-slate-400">
            {safePage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1550px] table-fixed text-left text-sm">
          <thead className="bg-white text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {HEADERS.map((h) => (
                <th key={h.key} className={"border-b border-slate-100 py-2 pr-3 whitespace-nowrap dark:border-slate-800 " + (h.className || '')}>
                  {h.label}
                </th>
              ))}
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">ROI/ROAS</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">CAC</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Ticket</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Conv.%</th>
              <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, idx) => {
              const m = computed.byId[r.id]
              const errors = computed.errorsById[r.id]
              const isInvalid = rowHasErrors(errors)

              return (
                <tr
                  key={r.id}
                  className={
                    'align-top ' +
                    (idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-950/40 ' : '') +
                    'hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ' +
                    (isInvalid ? 'bg-rose-50/40 dark:bg-rose-950/10' : '')
                  }
                >
                  {HEADERS.map((h) => {
                    const hasError = Boolean(errors?.[h.key])
                    const value = formatCellValue(r, h)

                    return (
                      <td
                        key={h.key}
                        className={
                          'border-b border-slate-100 py-1.5 pr-3 text-slate-800 dark:border-slate-800 dark:text-slate-200 ' +
                          (h.className || '')
                        }
                        title={hasError ? errors?.[h.key] || '' : String(value || '')}
                      >
                        <div className={"truncate " + (hasError ? 'text-rose-700 dark:text-rose-300 underline decoration-rose-300/80 underline-offset-4' : '')}>
                          {h.type === 'select' ? String(r[h.key] ?? '') : value}
                        </div>
                      </td>
                    )
                  })}

                  <td className="border-b border-slate-100 py-1.5 pr-3 dark:border-slate-800">
                    <div className="font-semibold">
                      {IS_META_ADS_CHANNEL(r.canal) ? formatNumber(m.roas, 2) : formatNumber(m.roi, 1) + '%'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{IS_META_ADS_CHANNEL(r.canal) ? 'ROAS' : 'ROI'}</div>
                  </td>
                  <td className="border-b border-slate-100 py-1.5 pr-3 dark:border-slate-800">
                    <div className="font-semibold">{formatCurrencyMXN(m.cac)}</div>
                  </td>
                  <td className="border-b border-slate-100 py-1.5 pr-3 dark:border-slate-800">
                    <div className="font-semibold">{formatCurrencyMXN(m.ticketPromedio)}</div>
                  </td>
                  <td className="border-b border-slate-100 py-1.5 pr-3 dark:border-slate-800">
                    <div className="font-semibold">{formatNumber(m.tasaConversion, 1)}%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Leads: {formatNumber(safeNumber(r.leads), 0)}</div>
                  </td>

                  <td className="border-b border-slate-100 py-1.5 pr-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                        title="Editar fila"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setConfirmTrash((curr) => {
                              if (curr?.id === r.id) return null
                              return {
                                id: r.id,
                                top: rect.top,
                                left: rect.left,
                                right: rect.right,
                                bottom: rect.bottom,
                              }
                            })
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          title="Enviar a papelera"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {confirmTrash && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={closeTrashConfirm} />
          <div
            className="fixed z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-950"
            style={{ top: confirmTrash.bottom + 8, left: Math.max(8, confirmTrash.right - 256) }}
          >
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">¿Enviar a papelera?</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Podrás restaurarlo desde Papelera.</div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTrashConfirm}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof onTrash === 'function') onTrash(confirmTrash.id)
                  closeTrashConfirm()
                }}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {isEditOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{isCreateMode ? 'Agregar semana' : 'Editar semana'}</div>
                {!isCreateMode && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">ID: {editingId}</div>}
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
              {HEADERS.map((h) => {
                const hasError = Boolean(draftErrors?.[h.key])
                if (h.type === 'select') {
                  return (
                    <div key={h.key} className="min-w-0">
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{h.label}</label>
                      <select
                        value={draft[h.key]}
                        onChange={(e) => setDraft((d) => ({ ...d, [h.key]: e.target.value }))}
                        className={inputBaseClass(hasError)}
                        title={draftErrors?.[h.key] || ''}
                      >
                        {CHANNELS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {hasError && <div className="mt-1 text-xs text-rose-600">{draftErrors[h.key]}</div>}
                    </div>
                  )
                }

                if (h.type === 'textOptional') {
                  return (
                    <div key={h.key} className="min-w-0 sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{h.label}</label>
                      <input
                        value={draft[h.key] ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [h.key]: e.target.value }))}
                        className={inputBaseClass(hasError)}
                        placeholder="(opcional)"
                        title={draftErrors?.[h.key] || ''}
                      />
                      {hasError && <div className="mt-1 text-xs text-rose-600">{draftErrors[h.key]}</div>}
                    </div>
                  )
                }

                const inputType = h.type === 'date' ? 'date' : 'number'
                const step = h.type === 'currency' ? '0.01' : '1'

                return (
                  <div key={h.key} className="min-w-0">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{h.label}</label>
                    <input
                      type={inputType}
                      step={step}
                      value={draft[h.key] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [h.key]: normalizeValue(h.type, e.target.value) }))}
                      className={inputBaseClass(hasError)}
                      placeholder={h.type === 'numberOptional' ? '(opcional)' : ''}
                      title={draftErrors?.[h.key] || ''}
                    />
                    {hasError && <div className="mt-1 text-xs text-rose-600">{draftErrors[h.key]}</div>}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canSaveDraft}
                onClick={() => {
                  if (!editingId || !draft) return
                  if (!canSaveDraft) return
                  if (isCreateMode) {
                    if (typeof onCreate === 'function') onCreate(draft)
                  } else {
                    if (typeof onPatchRow === 'function') onPatchRow(editingId, draft)
                  }
                  closeEditModal()
                }}
                className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
              >
                {isCreateMode ? 'Guardar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {/* Comentario clave: Las métricas se recalculan en tiempo real al editar */}
        Las métricas (ROI/ROAS, CAC, ticket y conversión) se recalculan automáticamente al editar.
      </div>
    </Card>
  )
}
