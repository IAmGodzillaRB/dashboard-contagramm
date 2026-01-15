import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function ClientesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clientes, setClientes] = useState([])

  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [draft, setDraft] = useState(null)

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

      setClientes(data || [])
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) => String(c.nombre || '').toLowerCase().includes(q))
  }, [clientes, query])

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
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Plus size={16} />
              Agregar
            </button>
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                      Sin clientes.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
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
                        <div className="flex items-center justify-end">
                          <Link
                            to={`/clientes/${c.id}`}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
