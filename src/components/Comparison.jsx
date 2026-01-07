import React, { useMemo } from 'react'
import Card from './ui/Card.jsx'
import { MONTHS, MONTH_LABEL_BY_VALUE } from '../constants.js'
import { aggregate } from '../lib/metrics.js'
import { formatCurrencyMXN, formatNumber, pctChange } from '../lib/numbers.js'

function deltaClass(delta) {
  if (delta > 0) return 'text-emerald-600'
  if (delta < 0) return 'text-rose-600'
  return 'text-slate-500'
}

function buildNarrative(metricLabel, deltaPct, m1, m2) {
  const abs = Math.abs(deltaPct)
  if (abs < 0.1) return `${m1} y ${m2} estuvieron prácticamente iguales en ${metricLabel.toLowerCase()}.`
  const more = deltaPct > 0 ? 'más' : 'menos'
  return `${m1} tuvo ${formatNumber(abs, 1)}% ${more} ${metricLabel.toLowerCase()} que ${m2}.`
}

export default function Comparison({ year, rows, month1, month2, onChange }) {
  const monthsAvailable = useMemo(() => {
    const set = new Set(rows.map((r) => Number(r.mes)))
    return MONTHS.filter((m) => set.has(m.value))
  }, [rows])

  const { a1, a2, table, narrative } = useMemo(() => {
    const r1 = rows.filter((r) => Number(r.año) === Number(year) && Number(r.mes) === Number(month1))
    const r2 = rows.filter((r) => Number(r.año) === Number(year) && Number(r.mes) === Number(month2))

    const a1 = aggregate(r1)
    const a2 = aggregate(r2)

    const metrics = [
      { key: 'clientesNuevos', label: 'Clientes nuevos', fmt: (v) => formatNumber(v, 0) },
      { key: 'ingresos', label: 'Ingresos', fmt: (v) => formatCurrencyMXN(v) },
      { key: 'inversion', label: 'Inversión', fmt: (v) => formatCurrencyMXN(v) },
      { key: 'cac', label: 'CAC', fmt: (v) => formatCurrencyMXN(v) },
      { key: 'roi', label: 'ROI', fmt: (v) => formatNumber(v, 1) + '%' },
    ]

    const table = metrics.map((m) => {
      const v1 = a1[m.key]
      const v2 = a2[m.key]
      const diff = v1 - v2
      const pct = pctChange(v1, v2)
      return { ...m, v1, v2, diff, pct }
    })

    const m1Label = MONTH_LABEL_BY_VALUE[month1] || `Mes ${month1}`
    const m2Label = MONTH_LABEL_BY_VALUE[month2] || `Mes ${month2}`

    const narrative = buildNarrative('clientes', pctChange(a1.clientesNuevos, a2.clientesNuevos), m1Label, m2Label)

    return { a1, a2, table, narrative }
  }, [rows, year, month1, month2])

  return (
    <Card title="Comparativas mes vs mes" right={narrative}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="grid w-full grid-cols-2 gap-3 md:max-w-lg">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Mes 1</label>
            <select
              value={month1}
              onChange={(e) => onChange({ month1: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
            >
              {monthsAvailable.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Mes 2</label>
            <select
              value={month2}
              onChange={(e) => onChange({ month2: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
            >
              {monthsAvailable.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs font-medium text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-2">Métrica</th>
              <th className="py-2">{MONTH_LABEL_BY_VALUE[month1]}</th>
              <th className="py-2">{MONTH_LABEL_BY_VALUE[month2]}</th>
              <th className="py-2">Diferencia</th>
              <th className="py-2">% Cambio</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-3 font-medium text-slate-800 dark:text-slate-100">{row.label}</td>
                <td className="py-3">{row.fmt(row.v1)}</td>
                <td className="py-3">{row.fmt(row.v2)}</td>
                <td className={"py-3 " + deltaClass(row.diff)}>{row.fmt(row.diff)}</td>
                <td className={"py-3 " + deltaClass(row.pct)}>{formatNumber(row.pct, 1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {/* Comentario clave: La diferencia se calcula como Mes1 - Mes2 */}
        Diferencia = Mes 1 - Mes 2.
      </div>
    </Card>
  )
}
