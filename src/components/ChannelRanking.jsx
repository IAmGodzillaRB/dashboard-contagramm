import React from 'react'
import Card from './ui/Card.jsx'
import { formatCurrencyMXN, formatNumber, safeNumber } from '../lib/numbers.js'
import { IS_META_ADS_CHANNEL } from '../constants.js'

function scoreClass(value) {
  const v = safeNumber(value)
  if (v >= 2) return 'text-emerald-600'
  if (v >= 1) return 'text-amber-600'
  return 'text-rose-600'
}

export default function ChannelRanking({ rows }) {
  return (
    <Card title="Ranking de canales" right="Mejor a peor (mes seleccionado)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="px-3">Canal</th>
              <th className="px-3">Inversión</th>
              <th className="px-3">Ingresos</th>
              <th className="px-3">ROI/ROAS</th>
              <th className="px-3">Clientes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.canal} className="rounded-xl bg-slate-50 text-sm dark:bg-slate-950">
                <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-100">{r.canal}</td>
                <td className="px-3 py-3">{formatCurrencyMXN(r.inversion)}</td>
                <td className="px-3 py-3">{formatCurrencyMXN(r.ingresos)}</td>
                <td className={"px-3 py-3 font-semibold " + scoreClass(r.rentabilidad)}>
                  {IS_META_ADS_CHANNEL(r.canal)
                    ? formatNumber(r.rentabilidad, 2)
                    : formatNumber(r.rentabilidad, 1) + '%'}
                </td>
                <td className="px-3 py-3">{formatNumber(r.clientesNuevos, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
