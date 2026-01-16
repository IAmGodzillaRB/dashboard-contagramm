import React, { useMemo, useState } from 'react'
import KPICards from '../components/KPICards.jsx'
import TrendChart from '../components/TrendChart.jsx'
import ChannelROIChart from '../components/ChannelROIChart.jsx'
import DistributionPie from '../components/DistributionPie.jsx'
import ChannelRanking from '../components/ChannelRanking.jsx'
import Comparison from '../components/Comparison.jsx'
import { formatCurrencyMXN, safeNumber } from '../lib/numbers.js'

export default function DashboardPage({
  currentAgg,
  previousAgg,
  crmAggCurrent,
  crmAggPrevious,
  crmSeries,
  crmRoiBars,
  crmPieData,
  crmRankingRows,
  weeklySeries,
  roiBars,
  pieData,
  rankingRows,
  canCompare,
  year,
  rows,
  compare,
  onChangeCompare,
  onGoToRegistros,
}) {
  const [source, setSource] = useState('weekly')

  const resolvedAgg = useMemo(() => {
    if (source === 'crm') return { current: crmAggCurrent, previous: crmAggPrevious }
    return { current: currentAgg, previous: previousAgg }
  }, [source, currentAgg, previousAgg, crmAggCurrent, crmAggPrevious])

  const compareNumbers = useMemo(() => {
    const weeklyIngresos = safeNumber(currentAgg?.ingresos)
    const crmIngresos = safeNumber(crmAggCurrent?.ingresos)
    const crmReembolsos = safeNumber(crmAggCurrent?.reembolsos)
    return {
      diffIngresos: weeklyIngresos - crmIngresos,
      crmIngresos,
      crmReembolsos,
    }
  }, [currentAgg, crmAggCurrent])

  const resolvedCharts = useMemo(() => {
    const showCrm = source === 'crm' || source === 'compare'
    return {
      isCrm: showCrm,
      series: showCrm ? crmSeries : weeklySeries,
      roiBars: showCrm ? crmRoiBars : roiBars,
      pieData: showCrm ? crmPieData : pieData,
      ranking: showCrm ? crmRankingRows : rankingRows,
    }
  }, [source, crmSeries, weeklySeries, crmRoiBars, roiBars, crmPieData, pieData, crmRankingRows, rankingRows])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Resumen</div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fuente</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="weekly">Semanal</option>
            <option value="crm">CRM (Clientes)</option>
            <option value="compare">Comparativo</option>
          </select>
        </div>
      </div>

      <KPICards currentAgg={source === 'crm' ? crmAggCurrent : resolvedAgg.current} previousAgg={source === 'crm' ? crmAggPrevious : resolvedAgg.previous} />

      {source === 'crm' && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Reembolsos (confirmados)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {formatCurrencyMXN(safeNumber(crmAggCurrent?.reembolsos))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Ingresos brutos (ventas)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {formatCurrencyMXN(safeNumber(crmAggCurrent?.ingresosBruto))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Nota</div>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">Ingresos Totales = Neto (ventas - reembolsos)</div>
          </div>
        </div>
      )}

      {source === 'compare' && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Ingresos netos (CRM)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {formatCurrencyMXN(compareNumbers.crmIngresos)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Reembolsos (CRM)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {formatCurrencyMXN(compareNumbers.crmReembolsos)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Diferencia (Semanal - CRM neto)</div>
            <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {formatCurrencyMXN(compareNumbers.diffIngresos)}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TrendChart
          data={resolvedCharts.series}
          title={resolvedCharts.isCrm ? 'Tendencia' : 'Tendencia semanal'}
          right={resolvedCharts.isCrm ? 'Ingresos netos' : 'Ingresos vs Inversión'}
          ingresosLabel={resolvedCharts.isCrm ? 'Ingresos netos' : 'Ingresos'}
          inversionLabel="Inversión"
          showInversion={!resolvedCharts.isCrm}
        />
        <ChannelROIChart
          data={resolvedCharts.roiBars}
          title={resolvedCharts.isCrm ? 'Ingresos netos por canal' : 'ROI/ROAS por canal'}
          right={resolvedCharts.isCrm ? 'Ordenado por ingresos netos' : 'Ordenado por rentabilidad'}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DistributionPie
          data={resolvedCharts.pieData}
          title={resolvedCharts.isCrm ? 'Distribución de ingresos brutos por canal' : 'Distribución de inversión por canal'}
          right={resolvedCharts.isCrm ? '% de ingresos brutos' : '% de inversión'}
          valueLabel={resolvedCharts.isCrm ? 'Ingresos brutos' : 'Inversión'}
        />
        <ChannelRanking
          rows={resolvedCharts.ranking}
          title={resolvedCharts.isCrm ? 'Ranking de canales (CRM)' : 'Ranking de canales'}
          right={resolvedCharts.isCrm ? 'Ordenado por ingresos netos' : 'Mejor a peor (mes seleccionado)'}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onGoToRegistros}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          Ver registros con estos filtros
        </button>
      </div>

      {canCompare && (
        <div className="mt-4">
          <Comparison year={year} rows={rows} month1={compare.month1} month2={compare.month2} onChange={onChangeCompare} />
        </div>
      )}
    </>
  )
}
