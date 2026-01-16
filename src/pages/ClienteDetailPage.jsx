import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import { CHANNELS } from '../constants.js'
import { safeNumber } from '../lib/numbers.js'
import { supabase } from '../lib/supabaseClient.js'

const MOV_TYPES = [
  { value: 'venta', label: 'Venta' },
  { value: 'reembolso', label: 'Reembolso' },
]

const MOV_STATUS = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'cancelado', label: 'Cancelado' },
]

function toInputDate(value) {
  if (!value) return ''
  const s = String(value)
  return s.slice(0, 10)
}

export default function ClienteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cliente, setCliente] = useState(null)
  const [movs, setMovs] = useState([])
  const [trashedMovs, setTrashedMovs] = useState([])

  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false)
  const [clienteDraft, setClienteDraft] = useState(null)

  const [isMovModalOpen, setIsMovModalOpen] = useState(false)
  const [movDraft, setMovDraft] = useState(null)

  const [showTrash, setShowTrash] = useState(false)

  const [movQuery, setMovQuery] = useState('')
  const [movTipo, setMovTipo] = useState('')
  const [movEstado, setMovEstado] = useState('')
  const [movCanal, setMovCanal] = useState('')
  const [movPage, setMovPage] = useState(1)
  const [movPageSize, setMovPageSize] = useState(20)

  const [confirmState, setConfirmState] = useState(null)

  function closeConfirm() {
    setConfirmState(null)
  }

  function openConfirm(ev, next) {
    const rect = ev?.currentTarget?.getBoundingClientRect?.()
    const safeRect = rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : { top: 0, left: 0, width: 0, height: 0 }
    setConfirmState({ ...next, rect: safeRect })
  }

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      const { data: c, error: cErr } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle()
      if (!active) return
      if (cErr) {
        setError('No se pudo cargar el cliente.')
        setLoading(false)
        return
      }

      const { data: m, error: mErr } = await supabase
        .from('movimientos_cliente')
        .select('*')
        .eq('cliente_id', id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (!active) return
      if (mErr) {
        setError('No se pudieron cargar los movimientos.')
        setCliente(c)
        setMovs([])
        setLoading(false)
        return
      }

      setCliente(c)
      const allMovs = m || []
      setMovs(allMovs.filter((row) => !row?.deletedAt))
      setTrashedMovs(allMovs.filter((row) => row?.deletedAt))
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [id])

  function openEditClienteModal() {
    if (!cliente) return
    setClienteDraft({
      nombre: String(cliente.nombre || ''),
      telefono: String(cliente.telefono || ''),
      email: String(cliente.email || ''),
      estado: String(cliente.estado || 'prospecto'),
      notas: String(cliente.notas || ''),
    })
    setIsClienteModalOpen(true)
  }

  function closeClienteModal() {
    setIsClienteModalOpen(false)
    setClienteDraft(null)
  }

  async function saveCliente() {
    if (!cliente || !clienteDraft) return
    setError('')

    const payload = {
      nombre: String(clienteDraft.nombre || '').trim(),
      telefono: String(clienteDraft.telefono || '').trim() || null,
      email: String(clienteDraft.email || '').trim() || null,
      estado: String(clienteDraft.estado || 'prospecto'),
      notas: String(clienteDraft.notas || '').trim() || null,
    }

    if (!payload.nombre) {
      setError('El nombre es obligatorio.')
      return
    }

    const { data, error: updErr } = await supabase.from('clientes').update(payload).eq('id', id).select('*').maybeSingle()
    if (updErr) {
      setError('No se pudo guardar el cliente.')
      return
    }

    setCliente(data)
    closeClienteModal()
  }

  async function trashCliente() {
    if (!cliente) return
    setError('')
    const now = new Date().toISOString()

    setCliente((prev) => (prev ? { ...prev, deletedAt: now } : prev))
    const { error: updErr } = await supabase.from('clientes').update({ deletedAt: now }).eq('id', id)
    if (!updErr) return

    setError('No se pudo enviar a papelera.')
    setCliente((prev) => (prev ? { ...prev, deletedAt: null } : prev))
  }

  async function restoreCliente() {
    if (!cliente) return
    setError('')
    setCliente((prev) => (prev ? { ...prev, deletedAt: null } : prev))

    const { error: updErr } = await supabase.from('clientes').update({ deletedAt: null }).eq('id', id)
    if (!updErr) return

    setError('No se pudo restaurar el cliente.')
    setCliente((prev) => (prev ? { ...prev, deletedAt: cliente.deletedAt } : prev))
  }

  async function deleteClientePermanente() {
    if (!cliente) return
    setError('')

    const { error: delErr } = await supabase.from('clientes').delete().eq('id', id)
    if (delErr) {
      setError('No se pudo eliminar permanentemente el cliente.')
      return
    }

    navigate('/clientes')
  }

  const kpis = useMemo(() => {
    const confirmed = movs.filter((m) => m.estado === 'confirmado')
    const ventas = confirmed.filter((m) => m.tipo_movimiento === 'venta')
    const reembolsos = confirmed.filter((m) => m.tipo_movimiento === 'reembolso')

    const ingresosBrutos = ventas.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const totalReembolsos = reembolsos.reduce((acc, m) => acc + safeNumber(m.monto), 0)
    const ingresosNetos = ingresosBrutos - totalReembolsos

    const numVentas = ventas.length
    const ticketProm = numVentas ? ingresosBrutos / numVentas : 0

    const firstVenta = [...ventas].sort((a, b) => {
      const d = String(a.fecha || '').localeCompare(String(b.fecha || ''))
      if (d !== 0) return d
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })[0]

    const lastVenta = [...ventas].sort((a, b) => {
      const d = String(b.fecha || '').localeCompare(String(a.fecha || ''))
      if (d !== 0) return d
      return String(b.created_at || '').localeCompare(String(a.created_at || ''))
    })[0]

    return {
      ingresosBrutos,
      totalReembolsos,
      ingresosNetos,
      numVentas,
      ticketProm,
      firstCompra: firstVenta?.fecha || null,
      lastCompra: lastVenta?.fecha || null,
    }
  }, [movs])

  useEffect(() => {
    setMovPage(1)
  }, [showTrash, movQuery, movTipo, movEstado, movCanal, movPageSize])

  const filteredMovs = useMemo(() => {
    const base = showTrash ? trashedMovs : movs
    const q = movQuery.trim().toLowerCase()

    return base.filter((m) => {
      if (movTipo && String(m.tipo_movimiento || '') !== movTipo) return false
      if (movEstado && String(m.estado || '') !== movEstado) return false
      if (movCanal && String(m.canal_atribucion || '') !== movCanal) return false

      if (q) {
        const hay = [
          m.producto,
          m.referencia,
          m.notas,
          m.metodo_pago,
          m.tipo_venta,
          m.canal_atribucion,
        ]
          .map((x) => String(x || '').toLowerCase())
          .join(' ')
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [movCanal, movEstado, movQuery, movTipo, movs, showTrash, trashedMovs])

  const movTotalPages = useMemo(() => {
    const n = Math.ceil(filteredMovs.length / Math.max(1, movPageSize))
    return n || 1
  }, [filteredMovs.length, movPageSize])

  const movPageRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, movPage), movTotalPages)
    const start = (safePage - 1) * movPageSize
    return filteredMovs.slice(start, start + movPageSize)
  }, [filteredMovs, movPage, movPageSize, movTotalPages])

  function openMovModal() {
    setMovDraft({
      fecha: toInputDate(new Date().toISOString()),
      tipo_movimiento: 'venta',
      estado: 'confirmado',
      monto: '',
      canal_atribucion: CHANNELS[0] || '',
      tipo_venta: '',
      producto: '',
      metodo_pago: '',
      referencia: '',
      notas: '',
    })
    setIsMovModalOpen(true)
  }

  function openEditMovModal(m) {
    if (!m) return
    setMovDraft({
      id: m.id,
      fecha: toInputDate(m.fecha),
      tipo_movimiento: m.tipo_movimiento || 'venta',
      estado: m.estado || 'confirmado',
      monto: String(m.monto ?? ''),
      canal_atribucion: m.canal_atribucion || (CHANNELS[0] || ''),
      tipo_venta: m.tipo_venta || '',
      producto: m.producto || '',
      metodo_pago: m.metodo_pago || '',
      referencia: m.referencia || '',
      notas: m.notas || '',
    })
    setIsMovModalOpen(true)
  }

  function closeMovModal() {
    setIsMovModalOpen(false)
    setMovDraft(null)
  }

  async function saveMovimiento() {
    if (!movDraft) return
    setError('')

    const payload = {
      cliente_id: id,
      fecha: movDraft.fecha,
      tipo_movimiento: movDraft.tipo_movimiento,
      estado: movDraft.estado,
      monto: safeNumber(movDraft.monto),
      canal_atribucion: movDraft.canal_atribucion,
      tipo_venta: movDraft.tipo_venta || null,
      producto: movDraft.producto || null,
      metodo_pago: movDraft.metodo_pago || null,
      referencia: movDraft.referencia || null,
      notas: movDraft.notas || null,
    }

    if (movDraft.id) {
      const { data, error: updErr } = await supabase
        .from('movimientos_cliente')
        .update(payload)
        .eq('id', movDraft.id)
        .select('*')
        .maybeSingle()

      if (updErr) {
        setError('No se pudo guardar el movimiento.')
        return
      }

      setMovs((prev) => {
        const next = prev.map((row) => (row.id === data.id ? data : row))
        return [...next].sort((a, b) => {
          const d = String(b.fecha || '').localeCompare(String(a.fecha || ''))
          if (d !== 0) return d
          return String(b.created_at || '').localeCompare(String(a.created_at || ''))
        })
      })
      closeMovModal()
      return
    }

    const { data, error: insErr } = await supabase.from('movimientos_cliente').insert(payload).select('*').maybeSingle()
    if (insErr) {
      setError('No se pudo guardar el movimiento.')
      return
    }

    setMovs((prev) => [data, ...prev])
    closeMovModal()
  }

  async function trashMovimiento(movId) {
    const target = movs.find((m) => m.id === movId)
    if (!target) return

    setError('')
    setMovs((prev) => prev.filter((m) => m.id !== movId))
    setTrashedMovs((prev) => [{ ...target, deletedAt: new Date().toISOString() }, ...prev])

    const now = new Date().toISOString()
    const { error: updErr } = await supabase.from('movimientos_cliente').update({ deletedAt: now }).eq('id', movId)
    if (!updErr) return

    const msg = String(updErr.message || '')
    if (msg.toLowerCase().includes('deletedat') && msg.toLowerCase().includes('does not exist')) {
      const { error: delErr } = await supabase.from('movimientos_cliente').delete().eq('id', movId)
      if (delErr) {
        setError('No se pudo eliminar el movimiento.')
        setMovs((prev) => [target, ...prev])
        setTrashedMovs((prev) => prev.filter((m) => m.id !== movId))
      }
      return
    }

    setError('No se pudo enviar a papelera.')
    setMovs((prev) => [target, ...prev])
    setTrashedMovs((prev) => prev.filter((m) => m.id !== movId))
  }

  async function restoreMovimiento(movId) {
    const target = trashedMovs.find((m) => m.id === movId)
    if (!target) return

    setError('')
    setTrashedMovs((prev) => prev.filter((m) => m.id !== movId))
    setMovs((prev) => {
      const next = [
        { ...target, deletedAt: null },
        ...prev,
      ]
      return [...next].sort((a, b) => {
        const d = String(b.fecha || '').localeCompare(String(a.fecha || ''))
        if (d !== 0) return d
        return String(b.created_at || '').localeCompare(String(a.created_at || ''))
      })
    })

    const { error: updErr } = await supabase.from('movimientos_cliente').update({ deletedAt: null }).eq('id', movId)
    if (!updErr) return

    setError('No se pudo restaurar el movimiento.')
    setMovs((prev) => prev.filter((m) => m.id !== movId))
    setTrashedMovs((prev) => [target, ...prev])
  }

  async function deleteMovimientoPermanente(movId) {
    const target = trashedMovs.find((m) => m.id === movId)
    if (!target) return

    setError('')
    setTrashedMovs((prev) => prev.filter((m) => m.id !== movId))

    const { error: delErr } = await supabase.from('movimientos_cliente').delete().eq('id', movId)
    if (!delErr) return

    setError('No se pudo eliminar permanentemente el movimiento.')
    setTrashedMovs((prev) => [target, ...prev])
  }

  if (loading) {
    return (
      <Card title="Cliente">
        <div className="text-sm text-slate-600 dark:text-slate-300">Cargando...</div>
      </Card>
    )
  }

  if (!cliente) {
    return (
      <Card title="Cliente">
        <div className="text-sm text-slate-600 dark:text-slate-300">Cliente no encontrado.</div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cliente.nombre}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{cliente.estado}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditClienteModal}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Editar cliente
          </button>

          {!cliente?.deletedAt ? (
            <button
              type="button"
              onClick={(ev) =>
                openConfirm(ev, {
                  title: 'Enviar a papelera',
                  message: '¿Enviar este cliente a la papelera?',
                  confirmLabel: 'Enviar',
                  tone: 'danger',
                  onConfirm: trashCliente,
                })
              }
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
            >
              A papelera
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={(ev) =>
                  openConfirm(ev, {
                    title: 'Restaurar',
                    message: '¿Restaurar este cliente?',
                    confirmLabel: 'Restaurar',
                    tone: 'ok',
                    onConfirm: restoreCliente,
                  })
                }
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/35"
              >
                Restaurar
              </button>
              <button
                type="button"
                onClick={(ev) =>
                  openConfirm(ev, {
                    title: 'Eliminar definitivo',
                    message: 'Esto eliminará el cliente permanentemente. ¿Continuar?',
                    confirmLabel: 'Borrar',
                    tone: 'danger',
                    onConfirm: deleteClientePermanente,
                  })
                }
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
              >
                Eliminar definitivo
              </button>
            </>
          )}

          {!cliente?.deletedAt ? (
            <button
              type="button"
              onClick={openMovModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Plus size={16} />
              Agregar movimiento
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Ingresos netos">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">${kpis.ingresosNetos.toLocaleString('es-MX')}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Bruto: ${kpis.ingresosBrutos.toLocaleString('es-MX')} · Reembolsos: ${kpis.totalReembolsos.toLocaleString('es-MX')}
          </div>
        </Card>
        <Card title="Ventas">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{kpis.numVentas}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ticket prom: ${kpis.ticketProm.toLocaleString('es-MX')}</div>
        </Card>
        <Card title="Primera compra">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{kpis.firstCompra || '-'}</div>
        </Card>
        <Card title="Última compra">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{kpis.lastCompra || '-'}</div>
        </Card>
      </div>

      <Card
        title="Movimientos"
        right={
          <div className="flex items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setShowTrash(false)}
                className={
                  showTrash
                    ? 'px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    : 'px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-900'
                }
              >
                Activos ({movs.length})
              </button>
              <button
                type="button"
                onClick={() => setShowTrash(true)}
                className={
                  showTrash
                    ? 'px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-100 dark:text-white dark:bg-slate-900'
                    : 'px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                }
              >
                Papelera ({trashedMovs.length})
              </button>
            </div>
            <Link to="/clientes" className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Ver todos los clientes
            </Link>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input
            value={movQuery}
            onChange={(e) => setMovQuery(e.target.value)}
            placeholder="Buscar (producto, referencia, notas...)"
            className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />

          <select
            value={movTipo}
            onChange={(e) => setMovTipo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Tipo (todos)</option>
            {MOV_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={movEstado}
            onChange={(e) => setMovEstado(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Estado (todos)</option>
            {MOV_STATUS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={movCanal}
            onChange={(e) => setMovCanal(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Canal (todos)</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <tr>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Fecha</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Tipo</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Estado</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Monto</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Canal</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Producto</th>
                <th className="border-b border-slate-100 py-2 pr-3 dark:border-slate-800">Referencia</th>
                <th className="border-b border-slate-100 py-2 pr-3 text-right dark:border-slate-800">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!showTrash ? (
                movPageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                      Sin movimientos aún.
                    </td>
                  </tr>
                ) : (
                  movPageRows.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">{String(m.fecha ?? '')}</td>
                      <td className="py-2 pr-3">{String(m.tipo_movimiento ?? '')}</td>
                      <td className="py-2 pr-3">{String(m.estado ?? '')}</td>
                      <td className="py-2 pr-3">${safeNumber(m.monto).toLocaleString('es-MX')}</td>
                      <td className="py-2 pr-3">{String(m.canal_atribucion ?? '')}</td>
                      <td className="py-2 pr-3">{String(m.producto ?? '')}</td>
                      <td className="py-2 pr-3">{String(m.referencia ?? '')}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditMovModal(m)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={(ev) =>
                              openConfirm(ev, {
                                title: 'Enviar a papelera',
                                message: '¿Enviar este movimiento a la papelera?',
                                confirmLabel: 'Enviar',
                                tone: 'danger',
                                onConfirm: () => trashMovimiento(m.id),
                              })
                            }
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
                          >
                            A papelera
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : movPageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                    Papelera vacía.
                  </td>
                </tr>
              ) : (
                movPageRows.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3">{String(m.fecha ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.tipo_movimiento ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.estado ?? '')}</td>
                    <td className="py-2 pr-3">${safeNumber(m.monto).toLocaleString('es-MX')}</td>
                    <td className="py-2 pr-3">{String(m.canal_atribucion ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.producto ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.referencia ?? '')}</td>
                    <td className="py-2 pr-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(ev) =>
                            openConfirm(ev, {
                              title: 'Restaurar',
                              message: '¿Restaurar este movimiento?',
                              confirmLabel: 'Restaurar',
                              tone: 'ok',
                              onConfirm: () => restoreMovimiento(m.id),
                            })
                          }
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/35"
                        >
                          Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={(ev) =>
                            openConfirm(ev, {
                              title: 'Borrar definitivo',
                              message: 'Esto eliminará el movimiento permanentemente. ¿Continuar?',
                              confirmLabel: 'Borrar',
                              tone: 'danger',
                              onConfirm: () => deleteMovimientoPermanente(m.id),
                            })
                          }
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35"
                        >
                          Eliminar definitivo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Página {Math.min(movPage, movTotalPages)} de {movTotalPages} · {filteredMovs.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <select
                value={movPageSize}
                onChange={(e) => setMovPageSize(Number(e.target.value) || 20)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                disabled={movPage <= 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setMovPage((p) => Math.min(movTotalPages, p + 1))}
                disabled={movPage >= movTotalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Card>

      {isMovModalOpen && movDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {movDraft?.id ? 'Editar movimiento' : 'Agregar movimiento'}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Venta o reembolso</div>
              </div>
              <button
                type="button"
                onClick={closeMovModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fecha</span>
                  <input
                    type="date"
                    value={movDraft.fecha}
                    onChange={(e) => setMovDraft((d) => ({ ...d, fecha: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo</span>
                  <select
                    value={movDraft.tipo_movimiento}
                    onChange={(e) => setMovDraft((d) => ({ ...d, tipo_movimiento: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {MOV_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</span>
                  <select
                    value={movDraft.estado}
                    onChange={(e) => setMovDraft((d) => ({ ...d, estado: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {MOV_STATUS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Monto</span>
                  <input
                    inputMode="decimal"
                    value={movDraft.monto}
                    onChange={(e) => setMovDraft((d) => ({ ...d, monto: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="0"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Canal atribución</span>
                  <select
                    value={movDraft.canal_atribucion}
                    onChange={(e) => setMovDraft((d) => ({ ...d, canal_atribucion: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo venta</span>
                  <input
                    value={movDraft.tipo_venta}
                    onChange={(e) => setMovDraft((d) => ({ ...d, tipo_venta: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Ej. producto, mensualidad"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Método de pago</span>
                  <input
                    value={movDraft.metodo_pago}
                    onChange={(e) => setMovDraft((d) => ({ ...d, metodo_pago: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Ej. transferencia"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Producto</span>
                  <input
                    value={movDraft.producto}
                    onChange={(e) => setMovDraft((d) => ({ ...d, producto: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Ej. Plan Premium"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Referencia</span>
                  <input
                    value={movDraft.referencia}
                    onChange={(e) => setMovDraft((d) => ({ ...d, referencia: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Folio/recibo"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Notas</span>
                  <textarea
                    value={movDraft.notas}
                    onChange={(e) => setMovDraft((d) => ({ ...d, notas: e.target.value }))}
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeMovModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveMovimiento}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isClienteModalOpen && clienteDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Editar cliente</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Datos generales</div>
              </div>
              <button
                type="button"
                onClick={closeClienteModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nombre</span>
                  <input
                    value={clienteDraft.nombre}
                    onChange={(e) => setClienteDraft((d) => ({ ...d, nombre: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</span>
                  <select
                    value={clienteDraft.estado}
                    onChange={(e) => setClienteDraft((d) => ({ ...d, estado: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="prospecto">Prospecto</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Teléfono</span>
                  <input
                    value={clienteDraft.telefono}
                    onChange={(e) => setClienteDraft((d) => ({ ...d, telefono: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</span>
                  <input
                    value={clienteDraft.email}
                    onChange={(e) => setClienteDraft((d) => ({ ...d, email: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Notas</span>
                  <textarea
                    value={clienteDraft.notas}
                    onChange={(e) => setClienteDraft((d) => ({ ...d, notas: e.target.value }))}
                    rows={3}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeClienteModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveCliente}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            onClick={closeConfirm}
            className="absolute inset-0 h-full w-full cursor-default bg-transparent"
          />
          <div
            className="fixed"
            style={{
              top: (confirmState.rect?.top ?? 0) + (confirmState.rect?.height ?? 0) + 8,
              left: Math.max(12, (confirmState.rect?.left ?? 0) - 140),
              width: 280,
            }}
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-soft dark:border-slate-800 dark:bg-slate-950">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{confirmState.title}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300">{confirmState.message}</div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fn = confirmState.onConfirm
                    closeConfirm()
                    if (typeof fn === 'function') fn()
                  }}
                  className={
                    confirmState.tone === 'ok'
                      ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/35'
                      : 'rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35'
                  }
                >
                  {confirmState.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
