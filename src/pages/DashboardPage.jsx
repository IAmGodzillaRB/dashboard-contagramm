import React from 'react'
import KPICards from '../components/KPICards.jsx'
import TrendChart from '../components/TrendChart.jsx'
import ChannelROIChart from '../components/ChannelROIChart.jsx'
import DistributionPie from '../components/DistributionPie.jsx'
import ChannelRanking from '../components/ChannelRanking.jsx'
import Comparison from '../components/Comparison.jsx'

export default function DashboardPage({
  currentAgg,
  previousAgg,
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
  return (
    <>
      <KPICards currentAgg={currentAgg} previousAgg={previousAgg} />

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TrendChart data={weeklySeries} />
        <ChannelROIChart data={roiBars} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DistributionPie data={pieData} />
        <ChannelRanking rows={rankingRows} />
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
