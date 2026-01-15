import React, { useState } from 'react'
import Card from './ui/Card.jsx'

export default function UserInvite({ accessToken }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleInvite(e) {
    e.preventDefault()
    const trimmed = String(email || '').trim()
    if (!trimmed) return

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const res = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: trimmed }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'No se pudo invitar al usuario.')
        return
      }

      setInfo('Invitación enviada. La persona recibirá un correo para establecer su contraseña.')
      setEmail('')
    } catch {
      setError('No se pudo invitar al usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Usuarios" right="Invitar por correo">
      <form onSubmit={handleInvite} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email del usuario</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
            placeholder="usuario@correo.com"
            autoComplete="email"
            required
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Enviando…' : 'Enviar invitación'}
        </button>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          El usuario recibirá un correo con un enlace para establecer su contraseña.
        </div>
      </form>
    </Card>
  )
}
