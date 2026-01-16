import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import Card from './ui/Card.jsx'
import { formatCurrencyMXN } from '../lib/numbers.js'

function CustomTooltip({ active, payload, label, ingresosLabel, inversionLabel, showInversion }) {
  if (!active || !payload || payload.length === 0) return null

  const inv = payload.find((p) => p.dataKey === 'inversion')?.value ?? 0
  const ing = payload.find((p) => p.dataKey === 'ingresos')?.value ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="font-semibold text-slate-800 dark:text-slate-100">{label}</div>
      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500 dark:text-slate-300">{ingresosLabel}</span>
          <span className="font-medium text-emerald-600">{formatCurrencyMXN(ing)}</span>
        </div>
        {showInversion ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-300">{inversionLabel}</span>
            <span className="font-medium text-rose-600">{formatCurrencyMXN(inv)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function TrendChart({
  data,
  title = 'Tendencia semanal',
  right = 'Ingresos vs Inversión',
  ingresosLabel = 'Ingresos',
  inversionLabel = 'Inversión',
  showInversion = true,
}) {
  return (
    <Card title={title} right={right}>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip content={<CustomTooltip ingresosLabel={ingresosLabel} inversionLabel={inversionLabel} showInversion={showInversion} />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="ingresos"
              name={ingresosLabel}
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            {showInversion ? (
              <Line
                type="monotone"
                dataKey="inversion"
                name={inversionLabel}
                stroke="#fb7185"
                strokeWidth={2}
                dot={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
