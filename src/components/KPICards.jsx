import React from 'react'
import { ArrowDownRight, ArrowUpRight, DollarSign, Target, TrendingUp, Users, ShoppingCart } from 'lucide-react'
import { formatCurrencyMXN, formatNumber, pctChange, safeNumber } from '../lib/numbers.js'

function Delta({ current, previous, isPercent = true }) {
  const delta = pctChange(current, previous)
  const up = delta >= 0

  return (
    <div className={"mt-2 inline-flex items-center gap-1 text-xs font-medium " + (up ? 'text-emerald-600' : 'text-rose-600')}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {formatNumber(Math.abs(delta), 1)}{isPercent ? '%' : ''}
      <span className="font-normal text-slate-500 dark:text-slate-400">vs periodo anterior</span>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, deltaCurrent, deltaPrevious, valueClassName = '' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400" title={title}>
            {title}
          </div>
          <div
            className={
              'mt-2 whitespace-normal break-words text-xl font-semibold tabular-nums leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl ' +
              valueClassName
            }
            title={String(value ?? '')}
          >
            {value}
          </div>
          <Delta current={deltaCurrent} previous={deltaPrevious} />
        </div>
        <div className="shrink-0 rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-slate-950 dark:text-brand-300">
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function KPICards({ currentAgg, previousAgg }) {
  const inv = safeNumber(currentAgg.inversion)
  const ing = safeNumber(currentAgg.ingresos)
  const roi = safeNumber(currentAgg.roi)
  const cac = safeNumber(currentAgg.cac)
  const clientes = safeNumber(currentAgg.clientesNuevos)
  const ticket = safeNumber(currentAgg.ticketPromedio)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
      <KPICard
        title="Inversión Total"
        value={formatCurrencyMXN(inv)}
        icon={DollarSign}
        deltaCurrent={inv}
        deltaPrevious={previousAgg.inversion}
      />
      <KPICard
        title="Ingresos Totales"
        value={formatCurrencyMXN(ing)}
        icon={TrendingUp}
        deltaCurrent={ing}
        deltaPrevious={previousAgg.ingresos}
      />
      <KPICard
        title="ROI General"
        value={formatNumber(roi, 1) + '%'}
        icon={Target}
        deltaCurrent={roi}
        deltaPrevious={previousAgg.roi}
      />
      <KPICard
        title="CAC Promedio"
        value={formatCurrencyMXN(cac)}
        icon={Users}
        deltaCurrent={cac}
        deltaPrevious={previousAgg.cac}
      />
      <KPICard
        title="Clientes Nuevos"
        value={formatNumber(clientes, 0)}
        icon={Users}
        deltaCurrent={clientes}
        deltaPrevious={previousAgg.clientesNuevos}
      />
      <KPICard
        title="Ticket Promedio"
        value={formatCurrencyMXN(ticket)}
        icon={ShoppingCart}
        deltaCurrent={ticket}
        deltaPrevious={previousAgg.ticketPromedio}
      />
    </div>
  )
}
