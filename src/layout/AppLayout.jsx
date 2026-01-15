import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import FilterBar from '../components/FilterBar.jsx'
import { BarChart3, Table2, Users, UserRound, Trash2 } from 'lucide-react'

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        (
          'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ' +
          (isActive
            ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800')
        ).trim()
      }
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{children}</span>
    </NavLink>
  )
}

export default function AppLayout({
  session,
  onLogout,
  filters,
  years,
  onChangeFilters,
  darkMode,
  onToggleDark,
  headerRight,
  error,
  loading,
}) {
  const location = useLocation()
  const showFilters = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/registros')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="sticky top-4 z-30 mb-4 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard de Ventas y ROI</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rentabilidad por canal y mes con captura semanal.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
              {session?.user?.email ? session.user.email : 'Sesión activa'}
            </div>
            {headerRight}
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex flex-wrap gap-2">
            <NavItem to="/dashboard" icon={BarChart3}>
              Dashboard
            </NavItem>
            <NavItem to="/registros" icon={Table2}>
              Registros
            </NavItem>
            <NavItem to="/papelera" icon={Trash2}>
              Papelera
            </NavItem>
            <NavItem to="/clientes" icon={UserRound}>
              Clientes
            </NavItem>
            <NavItem to="/usuarios" icon={Users}>
              Usuarios
            </NavItem>
          </nav>
        </div>
      </header>

      <main>
        {showFilters && (
          <div className="mb-4">
            <FilterBar
              year={filters.year}
              years={years}
              month={filters.month}
              channel={filters.channel}
              onChange={onChangeFilters}
              darkMode={darkMode}
              onToggleDark={onToggleDark}
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Cargando datos...
          </div>
        ) : (
          <div className={error ? 'mt-4' : ''}>
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
