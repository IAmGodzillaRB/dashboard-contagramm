import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function ClientesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])
  const [trashedClientes, setTrashedClientes] = useState([])

  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draft, setDraft] = useState(null)

  const [showTrash, setShowTrash] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  function closeConfirm() {
    setConfirmState(null)
  }

  function openConfirm(ev, next) {
    const rect = ev?.currentTarget?.getBoundingClientRect?.()
    const safeRect = rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : { top: 0, left: 0, width: 0, height: 0 }
    setConfirmState({ ...next, rect: safeRect })
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      const { data, error: e } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
      if (!active) return
      if (e) {
        setError('No se pudieron cargar los clientes.')
        setClientes([])
        setLoading(false)
        return
      }

      const all = data || []
      setClientes(all.filter((c) => !c?.deletedAt))
      setTrashedClientes(all.filter((c) => c?.deletedAt))
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = showTrash ? trashedClientes : clientes
    if (!q) return base
    return base.filter((c) => String(c.nombre || '').toLowerCase().includes(q))
  }, [clientes, trashedClientes, query, showTrash])

  useEffect(() => {
    setPage(1)
  }, [query, showTrash, pageSize])

  const totalPages = useMemo(() => {
    const n = Math.ceil(filtered.length / Math.max(1, pageSize))
    return n || 1
  }, [filtered.length, pageSize])

  const pageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize, totalPages])

  async function trashCliente(clienteId) {
    const target = clientes.find((c) => c.id === clienteId)
    if (!target) return

    setError('')
    setClientes((prev) => prev.filter((c) => c.id !== clienteId))
    setTrashedClientes((prev) => [{ ...target, deletedAt: new Date().toISOString() }, ...prev])

    const now = new Date().toISOString()
    const { error: updErr } = await supabase.from('clientes').update({ deletedAt: now }).eq('id', clienteId)
    if (!updErr) return

    const msg = String(updErr.message || '')
    if (msg.toLowerCase().includes('deletedat') && msg.toLowerCase().includes('does not exist')) {
      const { error: delErr } = await supabase.from('clientes').delete().eq('id', clienteId)
      if (delErr) {
        setError('No se pudo eliminar el cliente.')
        setClientes((prev) => [target, ...prev])
        setTrashedClientes((prev) => prev.filter((c) => c.id !== clienteId))
      }
      return
    }

    setError('No se pudo enviar a papelera.')
    setClientes((prev) => [target, ...prev])
    setTrashedClientes((prev) => prev.filter((c) => c.id !== clienteId))
  }

  async function restoreCliente(clienteId) {
    const target = trashedClientes.find((c) => c.id === clienteId)
    if (!target) return

    setError('')
    setTrashedClientes((prev) => prev.filter((c) => c.id !== clienteId))
    setClientes((prev) => [{ ...target, deletedAt: null }, ...prev])

    const { error: updErr } = await supabase.from('clientes').update({ deletedAt: null }).eq('id', clienteId)
    if (!updErr) return

    setError('No se pudo restaurar el cliente.')
    setClientes((prev) => prev.filter((c) => c.id !== clienteId))
    setTrashedClientes((prev) => [target, ...prev])
  }

  async function deleteClientePermanente(clienteId) {
    const target = trashedClientes.find((c) => c.id === clienteId)
    if (!target) return

    setError('')
    setTrashedClientes((prev) => prev.filter((c) => c.id !== clienteId))

    const { error: delErr } = await supabase.from('clientes').delete().eq('id', clienteId)
    if (!delErr) return

    setError('No se pudo eliminar permanentemente el cliente.')
    setTrashedClientes((prev) => [target, ...prev])
  }

  function openCreate() {
    setDraft({ nombre: '', telefono: '', email: '', estado: 'prospecto', notas: '' })
    setIsCreateOpen(true)
  }

  function closeCreate() {
    setIsCreateOpen(false)
    setDraft(null)
  }

  async function saveCliente() {
    if (!draft) return
    setError('')

    const payload = {
      nombre: String(draft.nombre || '').trim(),
      telefono: String(draft.telefono || '').trim() || null,
      email: String(draft.email || '').trim() || null,
      estado: draft.estado || 'prospecto',
      notas: String(draft.notas || '').trim() || null,
    }

    if (!payload.nombre) {
      setError('El nombre es obligatorio.')
      return
    }

    const { data, error: insErr } = await supabase.from('clientes').insert(payload).select('*').maybeSingle()
    if (insErr) {
      setError('No se pudo guardar el cliente.')
      return
    }

    setClientes((prev) => [data, ...prev])
    closeCreate()
  }

  return (
    <div className="space-y-4">
      <Card
        title="Clientes"
        right={
          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setShowTrash(false)}
                className={
                  showTrash
                    ? 'px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    : 'px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-900'
                }
              >
                Activos ({clientes.length})
              </button>
              <button
                type="button"
                onClick={() => setShowTrash(true)}
                className={
                  showTrash
                    ? 'px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-900'
                    : 'px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                }
              >
                Papelera ({trashedClientes.length})
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            {!showTrash ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus size={16} />
                Agregar
              </button>
            ) : null}
          </div>
        }
      >
        {error ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Nombre</th>
                  <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Estado</th>
                  <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Teléfono</th>
                  <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Email</th>
                  <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                      {showTrash ? 'Papelera vacía.' : 'Sin clientes.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/clientes/${c.id}`}
                          className="font-semibold text-slate-900 hover:underline dark:text-slate-100"
                        >
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{String(c.estado ?? '')}</td>
                      <td className="py-2 pr-3">{String(c.telefono ?? '')}</td>
                      <td className="py-2 pr-3">{String(c.email ?? '')}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/clientes/${c.id}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            Ver
                          </Link>
                          {!showTrash ? (
                            <button
                              type="button"
                              onClick={(ev) =>
                                openConfirm(ev, {
                                  title: 'Enviar a papelera',
                                  message: '¿Enviar este cliente a la papelera?',
                                  confirmLabel: 'Enviar',
                                  tone: 'danger',
                                  onConfirm: () => trashCliente(c.id),
                                })
                              }
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
                            >
                              A papelera
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(ev) =>
                                  openConfirm(ev, {
                                    title: 'Restaurar',
                                    message: '¿Restaurar este cliente?',
                                    confirmLabel: 'Restaurar',
                                    tone: 'ok',
                                    onConfirm: () => restoreCliente(c.id),
                                  })
                                }
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/35"
                              >
                                Restaurar
                              </button>
                              <button
                                type="button"
                                onClick={(ev) =>
                                  openConfirm(ev, {
                                    title: 'Eliminar definitivo',
                                    message: 'Esto eliminará el cliente permanentemente. ¿Continuar?',
                                    confirmLabel: 'Borrar',
                                    tone: 'danger',
                                    onConfirm: () => deleteClientePermanente(c.id),
                                  })
                                }
                                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
                              >
                                Eliminar definitivo
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Página {Math.min(page, totalPages)} de {totalPages} · {filtered.length} resultados
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) || 20)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {confirmState ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            onClick={closeConfirm}
            className="absolute inset-0 h-full w-full cursor-default bg-transparent"
          />
          <div
            className="fixed"
            style={{
              top: (confirmState.rect?.top ?? 0) + (confirmState.rect?.height ?? 0) + 8,
              left: Math.max(12, (confirmState.rect?.left ?? 0) - 140),
              width: 280,
            }}
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-soft dark:border-slate-800 dark:bg-slate-950">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{confirmState.title}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300">{confirmState.message}</div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fn = confirmState.onConfirm
                    closeConfirm()
                    if (typeof fn === 'function') fn()
                  }}
                  className={
                    confirmState.tone === 'ok'
                      ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/35'
                      : 'rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35'
                  }
                >
                  {confirmState.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateOpen && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agregar cliente</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cartera y seguimiento</div>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre</span>
                  <input
                    value={draft.nombre}
                    onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</span>
                  <select
                    value={draft.estado}
                    onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="prospecto">Prospecto</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Teléfono</span>
                  <input
                    value={draft.telefono}
                    onChange={(e) => setDraft((d) => ({ ...d, telefono: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</span>
                  <input
                    value={draft.email}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Notas</span>
                  <textarea
                    value={draft.notas}
                    onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreate}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveCliente}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
