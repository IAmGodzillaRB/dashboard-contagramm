import React, { useEffect, useMemo, useState } from 'react'
import UserInvite from '../components/UserInvite.jsx'
import Card from '../components/ui/Card.jsx'

function formatDate(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString()
  } catch {
    return ''
  }
}

export default function UsuariosPage({ accessToken }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])

  async function loadUsers() {
    if (!accessToken) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/list-users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'No se pudieron cargar los usuarios.')
        setUsers([])
        return
      }
      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch {
      setError('No se pudieron cargar los usuarios.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const stats = useMemo(() => {
    let activos = 0
    let pendientes = 0
    for (const u of users) {
      const isActive = Boolean(u?.last_sign_in_at)
      if (isActive) activos++
      else pendientes++
    }
    return { activos, pendientes, total: users.length }
  }, [users])

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <UserInvite accessToken={accessToken} />

      <Card
        title="Listado de usuarios"
        right={
          <div className="text-xs text-slate-500 dark:text-slate-300">
            Total: <span className="font-semibold text-slate-700 dark:text-slate-100">{stats.total}</span> · Activos:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-100">{stats.activos}</span> · Pendientes:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-100">{stats.pendientes}</span>
          </div>
        }
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                <th className="border-b border-slate-100 px-2 py-2 font-medium dark:border-slate-800">Email</th>
                <th className="border-b border-slate-100 px-2 py-2 font-medium dark:border-slate-800">Estado</th>
                <th className="border-b border-slate-100 px-2 py-2 font-medium dark:border-slate-800">Último inicio</th>
                <th className="border-b border-slate-100 px-2 py-2 font-medium dark:border-slate-800">Creado</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-sm text-slate-600 dark:text-slate-300">
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const active = Boolean(u?.last_sign_in_at)
                  const statusLabel = active ? 'Activo' : u?.invited_at ? 'Invitado (pendiente)' : 'Pendiente'
                  return (
                    <tr key={u.id} className="text-sm">
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-800 dark:border-slate-800 dark:text-slate-100">
                        {u.email || '—'}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 dark:border-slate-800">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ' +
                            (active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200')
                          }
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {formatDate(u.last_sign_in_at) || '—'}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {formatDate(u.created_at) || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Recomendación: mantén pocos admins, y usa invitaciones para controlar el acceso.
        </div>
      </Card>
    </div>
  )
}
