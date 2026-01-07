import React, { useEffect, useState } from 'react'
import Card from './ui/Card.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function Login({ onLoggedIn, initialInfo = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (initialInfo) setInfo(initialInfo)
  }, [initialInfo])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || ''),
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data?.session) onLoggedIn?.(data.session)
    } catch {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    const trimmed = String(email || '').trim()
    if (!trimmed) {
      setError('Escribe tu email para enviarte el enlace de recuperación.')
      return
    }

    setLoading(true)
    setError('')
    setInfo('')

    try {
      const redirectTo = `${window.location.origin}/?type=recovery`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
      if (resetError) {
        setError(resetError.message)
        return
      }

      setInfo('Listo. Revisa tu correo para restablecer la contraseña (puede tardar 1-2 min).')
    } catch {
      setError('No se pudo enviar el correo de recuperación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card title="Iniciar sesión">
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
              placeholder="••••••••"
              autoComplete="current-password"
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
            className="w-full rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Olvidé mi contraseña
          </button>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Si no tienes usuario, pídele al administrador que te cree acceso.
          </div>
        </form>
      </Card>
    </div>
  )
}
