import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Login from './components/Login.jsx'
import SetPassword from './components/SetPassword.jsx'
import AppLayout from './layout/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import PapeleraPage from './pages/PapeleraPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import ClienteDetailPage from './pages/ClienteDetailPage.jsx'
import RegistrosPage from './pages/RegistrosPage.jsx'
import UsuariosPage from './pages/UsuariosPage.jsx'

import { STORAGE_KEY, CHANNELS, IS_META_ADS_CHANNEL } from './constants.js'
import { storageGet, storageSet } from './lib/storage.js'
import { aggregate, computeRowMetrics } from './lib/metrics.js'
import { safeNumber } from './lib/numbers.js'
import { rowsToCsv, downloadTextFile } from './lib/csv.js'
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

function formatMonthLabel(month) {
  const m = Number(month)
  if (!Number.isFinite(m) || m < 1 || m > 12) return ''
  return `M${m}`
}

function monthFromDate(yyyyMmDd) {
  if (!yyyyMmDd) return null
  const s = String(yyyyMmDd).slice(0, 10)
  const m = Number(s.slice(5, 7))
  return Number.isFinite(m) ? m : null
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
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [postLoginInfo, setPostLoginInfo] = useState('')
  const [rows, setRows] = useState([])
  const [crmMovs, setCrmMovs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [authFlow, setAuthFlow] = useState(null)

  const [filters, setFilters] = useState({ year: 2025, month: 'all', channel: 'all' })
  const [compare, setCompare] = useState({ month1: 7, month2: 8 })
  const [darkMode, setDarkMode] = useState(false)

  const saveTimersById = useRef({})

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
        if (flowType) {
          setAuthFlow(flowType)
          navigate('/establecer-contraseña', { replace: true })
        }

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

      try {
        const [weeklyRes, crmRes] = await Promise.all([
          supabase.from('weekly_rows').select('id,row').order('created_at', { ascending: false }),
          supabase
            .from('movimientos_cliente')
            .select('id,cliente_id,fecha,tipo_movimiento,estado,monto,canal_atribucion,created_at')
            .order('fecha', { ascending: false })
            .order('created_at', { ascending: false }),
        ])

        if (weeklyRes.error) throw weeklyRes.error
        if (crmRes.error) throw crmRes.error
        if (!mounted) return

        const fetchedRows = (weeklyRes.data || []).map((r) => r.row).filter(Boolean)
        setRows(sortRows(fetchedRows))
        setCrmMovs((crmRes.data || []).filter((m) => !m?.deletedAt))
      } catch {
        if (!mounted) return
        setRows([])
        setCrmMovs([])
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

  const activeRows = useMemo(() => {
    return rows.filter((r) => !r?.deletedAt)
  }, [rows])

  const trashedRows = useMemo(() => {
    return rows.filter((r) => Boolean(r?.deletedAt))
  }, [rows])

  useEffect(() => {
    if (!years.includes(filters.year)) {
      setFilters((f) => ({ ...f, year: years[years.length - 1] }))
    }
  }, [years, filters.year])

  const filteredRows = useMemo(() => {
    return activeRows.filter((r) => {
      if (Number(r.año) !== Number(filters.year)) return false
      if (filters.month !== 'all' && Number(r.mes) !== Number(filters.month)) return false
      if (filters.channel !== 'all' && r.canal !== filters.channel) return false
      return true
    })
  }, [activeRows, filters])

  const previousPeriod = useMemo(() => computePreviousPeriod(filters.year, filters.month), [filters.year, filters.month])

  function getDateRange(year, month) {
    const y = Number(year)
    if (month === 'all') {
      const start = new Date(Date.UTC(y, 0, 1))
      const end = new Date(Date.UTC(y, 11, 31))
      return { start, end }
    }

    const m = Number(month)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0))
    return { start, end }
  }

  function isDateInRange(yyyyMmDd, range) {
    if (!yyyyMmDd) return false
    const d = new Date(`${String(yyyyMmDd).slice(0, 10)}T00:00:00.000Z`)
    return d >= range.start && d <= range.end
  }

  const previousRows = useMemo(() => {
    return activeRows.filter((r) => {
      if (Number(r.año) !== Number(previousPeriod.year)) return false
      if (previousPeriod.month !== 'all' && Number(r.mes) !== Number(previousPeriod.month)) return false
      if (filters.channel !== 'all' && r.canal !== filters.channel) return false
      return true
    })
  }, [activeRows, previousPeriod, filters.channel])

  const currentAgg = useMemo(() => aggregate(filteredRows), [filteredRows])
  const previousAgg = useMemo(() => aggregate(previousRows), [previousRows])

  const weeklySeries = useMemo(() => groupWeekly(filteredRows), [filteredRows])

  const crmAggCurrent = useMemo(() => {
    const range = getDateRange(filters.year, filters.month)

    const confirmed = crmMovs.filter((m) => m.estado === 'confirmado')
    const ventas = confirmed.filter((m) => m.tipo_movimiento === 'venta')
    const reembolsos = confirmed.filter((m) => m.tipo_movimiento === 'reembolso')

    const ventasInRange = ventas.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })
    const reembolsosInRange = reembolsos.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })

    const ingresosBruto = ventasInRange.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const totalReembolsos = reembolsosInRange.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const ingresosNetos = ingresosBruto - totalReembolsos

    const numVentas = ventasInRange.length

    const firstVentaByCliente = new Map()
    for (const v of ventas) {
      if (!v.cliente_id || !v.fecha) continue
      const key = v.cliente_id
      const existing = firstVentaByCliente.get(key)
      if (!existing) {
        firstVentaByCliente.set(key, v)
        continue
      }
      const cmp = String(v.fecha).localeCompare(String(existing.fecha))
      if (cmp < 0) {
        firstVentaByCliente.set(key, v)
      } else if (cmp === 0) {
        const c2 = String(v.created_at || '').localeCompare(String(existing.created_at || ''))
        if (c2 < 0) firstVentaByCliente.set(key, v)
      }
    }

    let clientesNuevos = 0
    for (const first of firstVentaByCliente.values()) {
      if (!isDateInRange(first.fecha, range)) continue
      if (filters.channel !== 'all' && first.canal_atribucion !== filters.channel) continue
      clientesNuevos += 1
    }

    const ticketPromedio = numVentas > 0 ? ingresosBruto / numVentas : 0

    return {
      inversion: 0,
      ingresos: ingresosNetos,
      ingresosBruto,
      reembolsos: totalReembolsos,
      leads: 0,
      clientesNuevos,
      numeroVentas: numVentas,
      roi: 0,
      cac: 0,
      ticketPromedio,
    }
  }, [crmMovs, filters.year, filters.month, filters.channel])

  const crmAggPrevious = useMemo(() => {
    const range = getDateRange(previousPeriod.year, previousPeriod.month)

    const confirmed = crmMovs.filter((m) => m.estado === 'confirmado')
    const ventas = confirmed.filter((m) => m.tipo_movimiento === 'venta')
    const reembolsos = confirmed.filter((m) => m.tipo_movimiento === 'reembolso')

    const ventasInRange = ventas.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })
    const reembolsosInRange = reembolsos.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })

    const ingresosBruto = ventasInRange.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const totalReembolsos = reembolsosInRange.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const ingresosNetos = ingresosBruto - totalReembolsos

    const numVentas = ventasInRange.length

    const firstVentaByCliente = new Map()
    for (const v of ventas) {
      if (!v.cliente_id || !v.fecha) continue
      const key = v.cliente_id
      const existing = firstVentaByCliente.get(key)
      if (!existing) {
        firstVentaByCliente.set(key, v)
        continue
      }
      const cmp = String(v.fecha).localeCompare(String(existing.fecha))
      if (cmp < 0) {
        firstVentaByCliente.set(key, v)
      } else if (cmp === 0) {
        const c2 = String(v.created_at || '').localeCompare(String(existing.created_at || ''))
        if (c2 < 0) firstVentaByCliente.set(key, v)
      }
    }

    let clientesNuevos = 0
    for (const first of firstVentaByCliente.values()) {
      if (!isDateInRange(first.fecha, range)) continue
      if (filters.channel !== 'all' && first.canal_atribucion !== filters.channel) continue
      clientesNuevos += 1
    }

    const ticketPromedio = numVentas > 0 ? ingresosBruto / numVentas : 0

    return {
      inversion: 0,
      ingresos: ingresosNetos,
      ingresosBruto,
      reembolsos: totalReembolsos,
      leads: 0,
      clientesNuevos,
      numeroVentas: numVentas,
      roi: 0,
      cac: 0,
      ticketPromedio,
    }
  }, [crmMovs, previousPeriod.year, previousPeriod.month, filters.channel])

  const crmSeries = useMemo(() => {
    const confirmed = crmMovs.filter((m) => m.estado === 'confirmado')
    const ventas = confirmed.filter((m) => m.tipo_movimiento === 'venta')
    const reembolsos = confirmed.filter((m) => m.tipo_movimiento === 'reembolso')

    const range = getDateRange(filters.year, filters.month)

    const byKey = new Map()
    const useDaily = filters.month !== 'all'

    const add = (key, label, field, amount) => {
      if (!byKey.has(key)) byKey.set(key, { key, label, inversion: 0, ingresos: 0 })
      const row = byKey.get(key)
      row[field] += amount
    }

    for (const v of ventas) {
      if (!isDateInRange(v.fecha, range)) continue
      if (filters.channel !== 'all' && v.canal_atribucion !== filters.channel) continue

      const k = useDaily ? String(v.fecha).slice(0, 10) : String(monthFromDate(v.fecha) || '')
      const label = useDaily ? String(v.fecha).slice(8, 10) : formatMonthLabel(monthFromDate(v.fecha))
      add(k, label, 'ingresos', safeNumber(v.monto))
    }

    for (const r of reembolsos) {
      if (!isDateInRange(r.fecha, range)) continue
      if (filters.channel !== 'all' && r.canal_atribucion !== filters.channel) continue

      const k = useDaily ? String(r.fecha).slice(0, 10) : String(monthFromDate(r.fecha) || '')
      const label = useDaily ? String(r.fecha).slice(8, 10) : formatMonthLabel(monthFromDate(r.fecha))
      add(k, label, 'ingresos', -safeNumber(r.monto))
    }

    return [...byKey.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)))
  }, [crmMovs, filters.year, filters.month, filters.channel])

  const crmChannelAgg = useMemo(() => {
    const range = getDateRange(filters.year, filters.month)

    const confirmed = crmMovs.filter((m) => m.estado === 'confirmado')
    const ventasAll = confirmed.filter((m) => m.tipo_movimiento === 'venta')
    const reembolsosAll = confirmed.filter((m) => m.tipo_movimiento === 'reembolso')

    const ventas = ventasAll.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })
    const reembolsos = reembolsosAll.filter((m) => {
      if (!isDateInRange(m.fecha, range)) return false
      if (filters.channel !== 'all' && m.canal_atribucion !== filters.channel) return false
      return true
    })

    const byChannel = new Map()
    const ensure = (c) => {
      if (!byChannel.has(c)) {
        byChannel.set(c, {
          canal: c,
          inversion: 0,
          ingresos: 0,
          ingresosBruto: 0,
          reembolsos: 0,
          leads: 0,
          clientesNuevos: 0,
          numeroVentas: 0,
          roi: 0,
          roas: 0,
          rentabilidad: 0,
        })
      }
      return byChannel.get(c)
    }

    for (const v of ventas) {
      const c = v.canal_atribucion
      const agg = ensure(c)
      agg.ingresosBruto += safeNumber(v.monto)
      agg.ingresos += safeNumber(v.monto)
      agg.numeroVentas += 1
    }

    for (const r of reembolsos) {
      const c = r.canal_atribucion
      const agg = ensure(c)
      agg.reembolsos += safeNumber(r.monto)
      agg.ingresos -= safeNumber(r.monto)
    }

    const firstVentaByCliente = new Map()
    for (const v of ventasAll) {
      if (!v.cliente_id || !v.fecha) continue
      const key = v.cliente_id
      const existing = firstVentaByCliente.get(key)
      if (!existing) {
        firstVentaByCliente.set(key, v)
        continue
      }
      const cmp = String(v.fecha).localeCompare(String(existing.fecha))
      if (cmp < 0) {
        firstVentaByCliente.set(key, v)
      } else if (cmp === 0) {
        const c2 = String(v.created_at || '').localeCompare(String(existing.created_at || ''))
        if (c2 < 0) firstVentaByCliente.set(key, v)
      }
    }

    for (const first of firstVentaByCliente.values()) {
      if (!isDateInRange(first.fecha, range)) continue
      if (filters.channel !== 'all' && first.canal_atribucion !== filters.channel) continue
      const agg = ensure(first.canal_atribucion)
      agg.clientesNuevos += 1
    }

    return CHANNELS.map((c) => byChannel.get(c) || {
      canal: c,
      inversion: 0,
      ingresos: 0,
      ingresosBruto: 0,
      reembolsos: 0,
      leads: 0,
      clientesNuevos: 0,
      numeroVentas: 0,
      roi: 0,
      roas: 0,
      rentabilidad: 0,
    })
  }, [crmMovs, filters.year, filters.month, filters.channel])

  const crmRoiBars = useMemo(() => {
    return [...crmChannelAgg]
      .map((r) => ({
        ...r,
        metricLabel: 'Ingresos netos',
        metricValue: safeNumber(r.ingresos),
      }))
      .sort((a, b) => safeNumber(b.metricValue) - safeNumber(a.metricValue))
  }, [crmChannelAgg])

  const crmPieData = useMemo(() => {
    const total = crmChannelAgg.reduce((acc, r) => acc + safeNumber(r.ingresosBruto), 0)
    return crmChannelAgg
      .filter((r) => safeNumber(r.ingresosBruto) > 0)
      .map((r) => ({ ...r, inversion: safeNumber(r.ingresosBruto), pct: total > 0 ? (safeNumber(r.ingresosBruto) / total) * 100 : 0 }))
      .sort((a, b) => safeNumber(b.inversion) - safeNumber(a.inversion))
  }, [crmChannelAgg])

  const crmRankingRows = useMemo(() => {
    return [...crmChannelAgg].sort((a, b) => safeNumber(b.ingresos) - safeNumber(a.ingresos))
  }, [crmChannelAgg])

  const channelAgg = useMemo(() => {
    const all = groupByChannel(filteredRows)
    const withEmpty = CHANNELS.map(
      (c) =>
        all.find((x) => x.canal === c) || {
          canal: c,
          inversion: 0,
          ingresos: 0,
          clientesNuevos: 0,
          leads: 0,
          numeroVentas: 0,
          roi: 0,
          roas: 0,
          rentabilidad: 0,
        },
    )
    return withEmpty
  }, [filteredRows])

  const roiBars = useMemo(() => {
    return [...channelAgg]
      .map((r) => {
        return {
          ...r,
          metricLabel: IS_META_ADS_CHANNEL(r.canal) ? 'ROAS' : 'ROI',
          metricValue: r.rentabilidad,
        }
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

  function handleCreateRow(draft) {
    const id = makeId()
    const newRow = {
      id,
      ...(draft && typeof draft === 'object' ? draft : {}),
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

  function handlePatchRow(id, patch) {
    const next = rows.map((r) => {
      if (r.id !== id) return r
      if (patch && typeof patch === 'object') {
        return { ...r, ...patch, id: r.id }
      }
      return r
    })
    const sorted = sortRows(next)
    setRows(sorted)

    const updatedRow = sorted.find((r) => r.id === id)
    if (updatedRow) scheduleSaveRow(updatedRow)
  }

  function handleTrashRow(id) {
    const now = new Date().toISOString()
    const next = rows.map((r) => (r.id === id ? { ...r, deletedAt: now } : r))
    const sorted = sortRows(next)
    setRows(sorted)

    const updatedRow = sorted.find((r) => r.id === id)
    if (updatedRow) scheduleSaveRow(updatedRow)
  }

  function handleRestoreRow(id) {
    const next = rows.map((r) => {
      if (r.id !== id) return r
      const { deletedAt: _deletedAt, ...rest } = r
      return rest
    })
    const sorted = sortRows(next)
    setRows(sorted)

    const updatedRow = sorted.find((r) => r.id === id)
    if (updatedRow) scheduleSaveRow(updatedRow)
  }

  function handleDeleteRowPermanent(id) {
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

  function handlePrint() {
    window.print()
  }

  const canCompare = useMemo(() => {
    const mset = new Set(rows.filter((r) => Number(r.año) === Number(filters.year)).map((r) => Number(r.mes)))
    return mset.size >= 2
  }, [rows, filters.year])

  const newRowDefaults = useMemo(() => {
    return {
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
  }, [filters.year, filters.month, filters.channel])

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

  const isAuthed = Boolean(session)

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          isAuthed ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login
              initialInfo={postLoginInfo}
              onLoggedIn={(s) => {
                setPostLoginInfo('')
                setSession(s)
                navigate('/dashboard', { replace: true })
              }}
            />
          )
        }
      />

      <Route
        path="/establecer-contraseña"
        element={
          authFlow ? (
            <SetPassword
              type={authFlow}
              onDone={() => {
                setAuthFlow(null)
                setSession(null)
                setPostLoginInfo('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
                navigate('/login', { replace: true })
              }}
            />
          ) : (
            <Navigate to={isAuthed ? '/dashboard' : '/login'} replace />
          )
        }
      />

      <Route
        element={
          isAuthed ? (
            <AppLayout
              session={session}
              onLogout={handleLogout}
              filters={filters}
              years={years}
              onChangeFilters={(patch) => setFilters((f) => ({ ...f, ...patch }))}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
              headerRight={null}
              error={error}
              loading={loading}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route
          path="/dashboard"
          element={
            <DashboardPage
              currentAgg={currentAgg}
              previousAgg={previousAgg}
              crmAggCurrent={crmAggCurrent}
              crmAggPrevious={crmAggPrevious}
              weeklySeries={weeklySeries}
              crmSeries={crmSeries}
              roiBars={roiBars}
              crmRoiBars={crmRoiBars}
              pieData={pieData}
              crmPieData={crmPieData}
              rankingRows={rankingRows}
              crmRankingRows={crmRankingRows}
              canCompare={canCompare}
              year={filters.year}
              rows={rows}
              compare={compare}
              onChangeCompare={(patch) => setCompare((c) => ({ ...c, ...patch }))}
              onGoToRegistros={() => navigate('/registros')}
            />
          }
        />

        <Route
          path="/registros"
          element={
            <RegistrosPage
              rows={filteredRows}
              newRowDefaults={newRowDefaults}
              onCreate={handleCreateRow}
              onPatchRow={handlePatchRow}
              onTrash={handleTrashRow}
              onExportCsv={handleExportCsv}
              onPrint={handlePrint}
            />
          }
        />

        <Route
          path="/papelera"
          element={
            <PapeleraPage
              rows={trashedRows}
              onRestore={handleRestoreRow}
              onDeletePermanent={handleDeleteRowPermanent}
            />
          }
        />

        <Route path="/clientes" element={<ClientesPage />} />

        <Route path="/clientes/:id" element={<ClienteDetailPage />} />

        <Route path="/usuarios" element={<UsuariosPage accessToken={session?.access_token || ''} />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
