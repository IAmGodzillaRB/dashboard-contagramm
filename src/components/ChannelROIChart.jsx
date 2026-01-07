import React from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import Card from './ui/Card.jsx'
import { CHANNEL_COLORS, IS_META_ADS_CHANNEL } from '../constants.js'
import { formatNumber } from '../lib/numbers.js'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  const row = p.payload

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="font-semibold text-slate-800 dark:text-slate-100">{row.canal}</div>
      <div className="mt-2 text-slate-600 dark:text-slate-300">
        {row.metricLabel}: <span className="font-semibold">{formatNumber(row.metricValue, 2)}</span>
        {row.metricLabel === 'ROI' ? '%' : ''}
      </div>
    </div>
  )
}

export default function ChannelROIChart({ data }) {
  return (
    <Card title="ROI/ROAS por canal" right="Ordenado por rentabilidad">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 0, left: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => (v > 1000 ? `${Math.round(v)} ` : `${formatNumber(v, 0)}${v !== 0 ? '' : ''}`)}
            />
            <YAxis
              type="category"
              dataKey="canal"
              tick={{ fontSize: 12 }}
              width={160}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="metricValue" name="Rentabilidad" radius={[10, 10, 10, 10]}>
              {data.map((entry) => (
                <Cell
                  key={entry.canal}
                  fill={CHANNEL_COLORS[entry.canal] || (IS_META_ADS_CHANNEL(entry.canal) ? '#22c55e' : '#7c3aed')}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {/* Comentario clave: Para META ADS se muestra ROAS; en el resto, ROI */}
        META ADS: ROAS. Otros canales: ROI.
      </div>
    </Card>
  )
}
