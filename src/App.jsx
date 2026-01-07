import React, { useEffect, useMemo, useRef, useState } from 'react'
import FilterBar from './components/FilterBar.jsx'
import KPICards from './components/KPICards.jsx'
import TrendChart from './components/TrendChart.jsx'
import ChannelROIChart from './components/ChannelROIChart.jsx'
import DataTable from './components/DataTable.jsx'
import Comparison from './components/Comparison.jsx'
import ChannelRanking from './components/ChannelRanking.jsx'
import DistributionPie from './components/DistributionPie.jsx'
import Login from './components/Login.jsx'
import SetPassword from './components/SetPassword.jsx'

import { STORAGE_KEY, CHANNELS, IS_META_ADS_CHANNEL } from './constants.js'
import { storageGet, storageSet } from './lib/storage.js'
import { aggregate, computeRowMetrics } from './lib/metrics.js'
import { safeNumber } from './lib/numbers.js'
import { rowsToCsv, downloadTextFile, parseCsvText } from './lib/csv.js'
import { supabase } from './lib/supabaseClient.js'

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `r_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const ay = Number(a.año) - Number(b.año)
    if (ay !== 0) return ay
    const am = Number(a.mes) - Number(b.mes)
    if (am !== 0) return am
    const aw = Number(a.semanaDelMes) - Number(b.semanaDelMes)
    if (aw !== 0) return aw
    return String(a.fechaInicioSemana || '').localeCompare(String(b.fechaInicioSemana || ''))
  })
}

function uniqueYears(rows) {
  const ys = [...new Set(rows.map((r) => Number(r.año)).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b)
  return ys.length ? ys : [new Date().getFullYear()]
}

function computePreviousPeriod(year, month) {
  if (month === 'all') return { year: year - 1, month: 'all' }
  const m = Number(month)
  if (m > 1) return { year, month: m - 1 }
  return { year: year - 1, month: 12 }
}

function groupWeekly(rows) {
  const map = new Map()
  for (const r of rows) {
    const key = `${r.año}-${r.mes}-${r.semanaDelMes}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `M${r.mes} · S${r.semanaDelMes}`,
        inversion: 0,
        ingresos: 0,
      })
    }
    const agg = map.get(key)
    agg.inversion += safeNumber(r.inversion)
    agg.ingresos += safeNumber(r.ingresos)
  }

  return [...map.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)))
}

function groupByChannel(rows) {
  const map = new Map()
  for (const r of rows) {
    const c = r.canal
    if (!map.has(c)) {
      map.set(c, { canal: c, inversion: 0, ingresos: 0, clientesNuevos: 0, leads: 0, numeroVentas: 0 })
    }
    const agg = map.get(c)
    agg.inversion += safeNumber(r.inversion)
    agg.ingresos += safeNumber(r.ingresos)
    agg.clientesNuevos += safeNumber(r.clientesNuevos)
    agg.leads += safeNumber(r.leads)
    agg.numeroVentas += safeNumber(r.numeroVentas)
  }

  return [...map.values()].map((r) => {
    const tempRow = { canal: r.canal, inversion: r.inversion, ingresos: r.ingresos, leads: r.leads, clientesNuevos: r.clientesNuevos, numeroVentas: r.numeroVentas }
    const m = computeRowMetrics(tempRow)
    return { ...r, roi: m.roi, roas: m.roas, rentabilidad: m.rentabilidadPrincipal }
  })
}

export default function App() {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [postLoginInfo, setPostLoginInfo] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingImport, setPendingImport] = useState(null)

  const [authFlow, setAuthFlow] = useState(null)

  const [view, setView] = useState('dashboard')

  const [filters, setFilters] = useState({ year: 2025, month: 'all', channel: 'all' })
  const [compare, setCompare] = useState({ month1: 7, month2: 8 })
  const [darkMode, setDarkMode] = useState(false)

  const saveTimersById = useRef({})
  const csvFileInputRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function handleAuthRedirect() {
      try {
        const url = new URL(window.location.href)
        const type = url.searchParams.get('type') || url.hash.match(/type=([^&]+)/)?.[1] || ''
        const code = url.searchParams.get('code') || url.hash.match(/code=([^&]+)/)?.[1] || ''
        const hashHasAccessToken = /access_token=/.test(url.hash)
        const hashHasRefreshToken = /refresh_token=/.test(url.hash)

        const flowType =
          type === 'recovery'
            ? 'recovery'
            : type === 'invite'
              ? 'invite'
              : hashHasAccessToken || hashHasRefreshToken
                ? 'recovery'
                : null
        if (flowType) setAuthFlow(flowType)

        // Links de Supabase pueden venir como:
        // - ?code=...&type=recovery (PKCE)
        // - #access_token=...&refresh_token=...&type=recovery (implícito)
        if (!code && !(hashHasAccessToken || hashHasRefreshToken)) return

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          if (!mounted) return
          if (data?.session) setSession(data.session)
        } else {
          const { data, error: fromUrlError } = await supabase.auth.getSessionFromUrl({ storeSession: true })
          if (fromUrlError) throw fromUrlError
          if (!mounted) return
          if (data?.session) setSession(data.session)
        }

        // Limpia URL para que no se queden tokens/codes
        url.searchParams.delete('code')
        url.searchParams.delete('type')
        window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
      } catch {
        // Si falla el intercambio del link pero ya hay sesión persistida,
        // mantenemos la pantalla de SetPassword para evitar brincar al dashboard.
        setError('El enlace no se pudo procesar (posiblemente ya se usó o expiró). Si necesitas cambiar contraseña, solicita un nuevo correo de recuperación.')
      }
    }

    async function initSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(data?.session ?? null)
      } catch {
        if (!mounted) return
        setSession(null)
      }
    }

    async function initAuth() {
      setSessionLoading(true)
      try {
        if (typeof window !== 'undefined') await handleAuthRedirect()
        await initSession()
      } finally {
        if (!mounted) return
        setSessionLoading(false)
      }
    }

    initAuth()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Persistencia compartida en Supabase: se carga después de iniciar sesión.
    let mounted = true

    async function loadFromSupabase() {
      setLoading(true)
      setError('')
      setPendingImport(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('weekly_rows')
          .select('id,row')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        if (!mounted) return

        const fetchedRows = (data || []).map((r) => r.row).filter(Boolean)

        // Si la BD está vacía, el dashboard queda vacío (sin datos de prueba).
        setRows(sortRows(fetchedRows))
      } catch {
        if (!mounted) return
        setRows([])
        setError('No se pudo cargar Supabase. Verifica conexión/permisos.')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    if (session) loadFromSupabase()

    return () => {
      mounted = false
    }
  }, [session])

  async function handleLogout() {
    setError('')
    try {
      await supabase.auth.signOut()
    } catch {
      setError('No se pudo cerrar sesión.')
    }
  }

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [darkMode])

  const years = useMemo(() => uniqueYears(rows), [rows])

  useEffect(() => {
    if (!years.includes(filters.year)) {
      setFilters((f) => ({ ...f, year: years[years.length - 1] }))
    }
  }, [years, filters.year])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (Number(r.año) !== Number(filters.year)) return false
      if (filters.month !== 'all' && Number(r.mes) !== Number(filters.month)) return false
      if (filters.channel !== 'all' && r.canal !== filters.channel) return false
      return true
    })
  }, [rows, filters])

  const previousPeriod = useMemo(() => computePreviousPeriod(filters.year, filters.month), [filters.year, filters.month])

  const previousRows = useMemo(() => {
    return rows.filter((r) => {
      if (Number(r.año) !== Number(previousPeriod.year)) return false
      if (previousPeriod.month !== 'all' && Number(r.mes) !== Number(previousPeriod.month)) return false
      if (filters.channel !== 'all' && r.canal !== filters.channel) return false
      return true
    })
  }, [rows, previousPeriod, filters.channel])

  const currentAgg = useMemo(() => aggregate(filteredRows), [filteredRows])
  const previousAgg = useMemo(() => aggregate(previousRows), [previousRows])

  const weeklySeries = useMemo(() => groupWeekly(filteredRows), [filteredRows])

  const channelAgg = useMemo(() => {
    const all = groupByChannel(filteredRows)
    const withEmpty = CHANNELS.map((c) => all.find((x) => x.canal === c) || { canal: c, inversion: 0, ingresos: 0, clientesNuevos: 0, leads: 0, numeroVentas: 0, roi: 0, roas: 0, rentabilidad: 0 })
    return withEmpty
  }, [filteredRows])

  const roiBars = useMemo(() => {
    return [...channelAgg]
      .map((r) => {
        const metricLabel = IS_META_ADS_CHANNEL(r.canal) ? 'ROAS' : 'ROI'
        const metricValue = IS_META_ADS_CHANNEL(r.canal) ? r.roas : r.roi
        return { canal: r.canal, metricLabel, metricValue }
      })
      .sort((a, b) => safeNumber(b.metricValue) - safeNumber(a.metricValue))
  }, [channelAgg])

  const rankingRows = useMemo(() => {
    return [...channelAgg]
      .map((r) => ({
        canal: r.canal,
        inversion: r.inversion,
        ingresos: r.ingresos,
        rentabilidad: r.rentabilidad,
        clientesNuevos: r.clientesNuevos,
      }))
      .sort((a, b) => safeNumber(b.rentabilidad) - safeNumber(a.rentabilidad))
  }, [channelAgg])

  const pieData = useMemo(() => {
    const total = channelAgg.reduce((acc, r) => acc + safeNumber(r.inversion), 0)
    return channelAgg
      .filter((r) => safeNumber(r.inversion) > 0)
      .map((r) => ({ ...r, pct: total > 0 ? (safeNumber(r.inversion) / total) * 100 : 0 }))
      .sort((a, b) => safeNumber(b.inversion) - safeNumber(a.inversion))
  }, [channelAgg])

  function scheduleSaveRow(nextRow) {
    const id = nextRow.id
    if (!id) return

    const existing = saveTimersById.current[id]
    if (existing) clearTimeout(existing)

    saveTimersById.current[id] = setTimeout(async () => {
      try {
        const { error: upsertError } = await supabase
          .from('weekly_rows')
          .upsert({ id: nextRow.id, row: nextRow }, { onConflict: 'id' })

        if (upsertError) throw upsertError
      } catch {
        setError('No se pudo guardar en Supabase. Verifica conexión/permisos.')
      }
    }, 250)
  }

  function handleAddRow() {
    setPendingImport(null)
    const newRow = {
      id: makeId(),
      año: filters.year,
      mes: filters.month === 'all' ? 1 : Number(filters.month),
      semanaDelMes: 1,
      fechaInicioSemana: '',
      fechaFinSemana: '',
      canal: filters.channel === 'all' ? CHANNELS[0] : filters.channel,
      inversion: 0,
      leads: '',
      clientesNuevos: 0,
      numeroVentas: 0,
      ingresos: 0,
      notas: '',
    }

    const next = sortRows([newRow, ...rows])
    setRows(next)

    supabase
      .from('weekly_rows')
      .insert({ id: newRow.id, row: newRow })
      .then(({ error: insertError }) => {
        if (insertError) setError('No se pudo guardar la nueva fila en Supabase.')
      })
  }

  function handleUpdateRow(id, key, value) {
    setPendingImport(null)
    const next = rows.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    const sorted = sortRows(next)
    setRows(sorted)

    const updatedRow = sorted.find((r) => r.id === id)
    if (updatedRow) scheduleSaveRow(updatedRow)
  }

  function handleDeleteRow(id) {
    setPendingImport(null)
    const next = rows.filter((r) => r.id !== id)
    setRows(next)

    supabase
      .from('weekly_rows')
      .delete()
      .eq('id', id)
      .then(({ error: delError }) => {
        if (delError) setError('No se pudo eliminar la fila en Supabase.')
      })
  }

  function handleExportCsv() {
    const headers = [
      { key: 'año', label: 'Año' },
      { key: 'mes', label: 'Mes' },
      { key: 'semanaDelMes', label: 'Semana del mes' },
      { key: 'fechaInicioSemana', label: 'Fecha inicio semana' },
      { key: 'fechaFinSemana', label: 'Fecha fin semana' },
      { key: 'canal', label: 'Canal' },
      { key: 'inversion', label: 'Inversión ($)' },
      { key: 'leads', label: 'Leads' },
      { key: 'clientesNuevos', label: 'Clientes nuevos' },
      { key: 'numeroVentas', label: 'Número de ventas' },
      { key: 'ingresos', label: 'Ingresos ($)' },
      { key: 'notas', label: 'Notas' },
    ]

    const csv = rowsToCsv(rows, headers)
    downloadTextFile('sales-data-2025.csv', csv, 'text/csv;charset=utf-8')
  }

  function normalizeImportNumber(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return 0
    const cleaned = s.replaceAll('$', '').replaceAll(' ', '').replaceAll(',', '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }

  function normalizeImportOptionalNumber(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return ''
    const cleaned = s.replaceAll('$', '').replaceAll(' ', '').replaceAll(',', '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : ''
  }

  function normalizeImportInt(raw, fallback = 0) {
    const s = String(raw ?? '').trim()
    const n = Number(s)
    if (!Number.isFinite(n)) return fallback
    return Math.trunc(n)
  }

  function normalizeImportDate(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return ''
    // Esperamos YYYY-MM-DD (como el export). Si viene con tiempo, nos quedamos con la parte de fecha.
    const m = s.match(/^\d{4}-\d{2}-\d{2}/)
    if (m) return m[0]
    return s
  }

  function normalizeImportChannel(raw) {
    const s = String(raw ?? '').trim()
    if (CHANNELS.includes(s)) return s
    const upper = s.toUpperCase()
    const found = CHANNELS.find((c) => c.toUpperCase() === upper)
    return found || s
  }

  async function handleImportCsvFile(file) {
    setError('')
    if (!file) return

    try {
      const text = await file.text()
      const parsed = parseCsvText(text)
      const recs = parsed.rows

      if (!recs.length) {
        setError('El CSV está vacío o no tiene filas de datos.')
        return
      }

      const importedRows = recs.map((r) => {
        const año = normalizeImportInt(r['Año'], filters.year)
        const mes = normalizeImportInt(r['Mes'], filters.month === 'all' ? 1 : Number(filters.month))
        const semanaDelMes = normalizeImportInt(r['Semana del mes'], 1)

        return {
          id: makeId(),
          año,
          mes,
          semanaDelMes,
          fechaInicioSemana: normalizeImportDate(r['Fecha inicio semana']),
          fechaFinSemana: normalizeImportDate(r['Fecha fin semana']),
          canal: normalizeImportChannel(r['Canal'] || (filters.channel === 'all' ? CHANNELS[0] : filters.channel)),
          inversion: normalizeImportNumber(r['Inversión ($)']),
          leads: normalizeImportOptionalNumber(r['Leads']),
          clientesNuevos: normalizeImportNumber(r['Clientes nuevos']),
          numeroVentas: normalizeImportNumber(r['Número de ventas']),
          ingresos: normalizeImportNumber(r['Ingresos ($)']),
          notas: String(r['Notas'] ?? '').trim(),
        }
      })

      // Merge: si ya existe una fila con (año, mes, semanaDelMes, canal) la actualizamos con lo importado.
      const keyOf = (r) => `${Number(r.año)}-${Number(r.mes)}-${Number(r.semanaDelMes)}-${String(r.canal)}`
      const existingByKey = new Map(rows.map((r) => [keyOf(r), r]))

      const merged = [...rows]
      let updated = 0
      let added = 0
      const changed = []

      for (const ir of importedRows) {
        const k = keyOf(ir)
        const existing = existingByKey.get(k)
        if (existing) {
          const nextExisting = {
            ...existing,
            ...ir,
            id: existing.id,
          }
          const idx = merged.findIndex((x) => x.id === existing.id)
          if (idx >= 0) merged[idx] = nextExisting
          existingByKey.set(k, nextExisting)
          updated++
          changed.push(nextExisting)
        } else {
          merged.push(ir)
          existingByKey.set(k, ir)
          added++
          changed.push(ir)
        }
      }

      const sorted = sortRows(merged)
      setRows(sorted)

      // Preview-only: NO guardamos aún. Se habilita botón "Guardar en base de datos".
      setPendingImport({ changedRows: changed, added, updated })
      setError(`CSV cargado. Agregadas: ${added}. Actualizadas: ${updated}. Revisa la tabla y luego guarda.`)
    } catch {
      setError('No se pudo importar el CSV. Verifica el formato (usa el CSV exportado por la app).')
    } finally {
      // permite re-importar el mismo archivo
      if (csvFileInputRef.current) csvFileInputRef.current.value = ''
    }
  }

  async function handleSaveImportToDb() {
    if (!pendingImport || !pendingImport.changedRows || pendingImport.changedRows.length === 0) {
      setError('No hay cambios importados pendientes para guardar.')
      return
    }

    setError('')
    try {
      const payload = pendingImport.changedRows.map((r) => ({ id: r.id, row: r }))
      const { error: upsertError } = await supabase.from('weekly_rows').upsert(payload, { onConflict: 'id' })
      if (upsertError) throw upsertError
      setPendingImport(null)
      setError('Cambios guardados en la base de datos.')
    } catch {
      setError('No se pudieron guardar los cambios en Supabase.')
    }
  }

  function handlePrint() {
    window.print()
  }

  const canCompare = useMemo(() => {
    const mset = new Set(rows.filter((r) => Number(r.año) === Number(filters.year)).map((r) => Number(r.mes)))
    return mset.size >= 2
  }, [rows, filters.year])

  useEffect(() => {
    // Comentario clave: Ajuste automático de meses comparativos si no existen en el dataset
    const months = [...new Set(rows.filter((r) => Number(r.año) === Number(filters.year)).map((r) => Number(r.mes)))].sort(
      (a, b) => a - b,
    )
    if (months.length >= 2) {
      setCompare((c) => ({
        month1: months.includes(c.month1) ? c.month1 : months[0],
        month2: months.includes(c.month2) ? c.month2 : months[1],
      }))
    }
  }, [rows, filters.year])

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Cargando sesión...
        </div>
      </div>
    )
  }

  if (authFlow) {
    return (
      <SetPassword
        type={authFlow}
        onDone={() => {
          setAuthFlow(null)
          setSession(null)
          setPostLoginInfo('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
        }}
      />
    )
  }

  if (!session) {
    return (
      <Login
        initialInfo={postLoginInfo}
        onLoggedIn={(s) => {
          setPostLoginInfo('')
          setSession(s)
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard de Ventas y ROI</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rentabilidad por canal y mes con captura semanal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
            {session?.user?.email ? session.user.email : 'Sesión activa'}
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className={
                'rounded-lg px-3 py-2 text-sm font-medium ' +
                (view === 'dashboard'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900')
              }
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setView('records')}
              className={
                'rounded-lg px-3 py-2 text-sm font-medium ' +
                (view === 'records'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900')
              }
            >
              Registros
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Salir
          </button>

          {view === 'records' && (
            <>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleImportCsvFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Importar CSV
              </button>
              <button
                type="button"
                onClick={handleSaveImportToDb}
                disabled={!pendingImport || !pendingImport.changedRows || pendingImport.changedRows.length === 0}
                className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
              >
                Guardar en base de datos
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Imprimir
              </button>
            </>
          )}
        </div>
      </div>

      <FilterBar
        year={filters.year}
        years={years}
        month={filters.month}
        channel={filters.channel}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          {error}
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Cargando datos...
          </div>
        ) : (
          <>
            {view === 'dashboard' && (
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
                    onClick={() => setView('records')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Ver registros con estos filtros
                  </button>
                </div>

                {canCompare && (
                  <div className="mt-4">
                    <Comparison
                      year={filters.year}
                      rows={rows}
                      month1={compare.month1}
                      month2={compare.month2}
                      onChange={(patch) => setCompare((c) => ({ ...c, ...patch }))}
                    />
                  </div>
                )}
              </>
            )}

            {view === 'records' && (
              <div className="mt-4">
                <DataTable rows={filteredRows} onAdd={handleAddRow} onUpdate={handleUpdateRow} onDelete={handleDeleteRow} />
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {/* Comentario clave: La tabla se edita con el dataset completo, pero se muestra filtrada */}
                  Nota: La edición se guarda en el dataset global; la tabla muestra las filas según filtros.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-8 text-xs text-slate-500 dark:text-slate-400">
        Persistencia: <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">window.storage</code> · Key:{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-900">{STORAGE_KEY}</code>
      </footer>
    </div>
  )
}
