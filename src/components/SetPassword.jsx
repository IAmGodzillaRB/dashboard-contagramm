import React, { useEffect, useMemo, useState } from 'react'
import Card from './ui/Card.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function SetPassword({ type = 'invite', onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const title = useMemo(() => {
    if (type === 'recovery') return 'Restablecer contraseña'
    return 'Establecer contraseña'
  }, [type])

  useEffect(() => {
    let mounted = true

    async function ensureSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setReady(Boolean(data?.session))
      } catch {
        if (!mounted) return
        setReady(false)
      }
    }

    ensureSession()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      // UX esperado: después de reset/invite, forzar re-login.
      await supabase.auth.signOut()
      onDone?.()
    } catch {
      setError('No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card title={title}>
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {type === 'recovery'
            ? 'Escribe tu nueva contraseña para recuperar el acceso.'
            : 'Define una contraseña para activar tu cuenta.'}
        </div>

        {!ready && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            Este enlace no creó una sesión válida. Revisa que la URL de redirección en Supabase sea correcta y vuelve a abrir el link del correo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </Card>
    </div>
  )
}
