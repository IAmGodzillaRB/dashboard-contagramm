import React from 'react'
import { CHANNELS, MONTHS } from '../constants.js'
import { Moon, Sun } from 'lucide-react'

export default function FilterBar({ year, years, month, channel, onChange, darkMode, onToggleDark }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-end md:justify-between">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Año</label>
          <select
            value={year}
            onChange={(e) => onChange({ year: Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Mes</label>
          <select
            value={month}
            onChange={(e) => onChange({ month: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="all">Todos</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Canal</label>
          <select
            value={channel}
            onChange={(e) => onChange({ channel: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="all">Todos</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <button
          type="button"
          onClick={onToggleDark}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          title="Modo oscuro"
        >
          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          {darkMode ? 'Oscuro' : 'Claro'}
        </button>
      </div>
    </div>
  )
}
