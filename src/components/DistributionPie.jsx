import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Card from './ui/Card.jsx'
import { CHANNEL_COLORS } from '../constants.js'
import { formatCurrencyMXN, formatNumber } from '../lib/numbers.js'

function CustomTooltip({ active, payload, valueLabel }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  const row = p.payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="font-semibold text-slate-800 dark:text-slate-100">{row.canal}</div>
      <div className="mt-2 text-slate-600 dark:text-slate-300">
        {valueLabel}: {formatCurrencyMXN(row.inversion)}
      </div>
      <div className="text-slate-500 dark:text-slate-400">{formatNumber(row.pct, 1)}%</div>
    </div>
  )
}

export default function DistributionPie({
  data,
  title = 'Distribución de inversión por canal',
  right = '% de inversión',
  valueLabel = 'Inversión',
}) {
  return (
    <Card title={title} right={right}>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip valueLabel={valueLabel} />} />
            <Pie data={data} dataKey="inversion" nameKey="canal" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.canal} fill={CHANNEL_COLORS[entry.canal] || '#7c3aed'} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
