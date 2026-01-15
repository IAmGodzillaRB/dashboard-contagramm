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

  const [isMovModalOpen, setIsMovModalOpen] = useState(false)
  const [movDraft, setMovDraft] = useState(null)

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
      setMovs(m || [])
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [id])

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

    const { data, error: insErr } = await supabase.from('movimientos_cliente').insert(payload).select('*').maybeSingle()
    if (insErr) {
      setError('No se pudo guardar el movimiento.')
      return
    }

    setMovs((prev) => [data, ...prev])
    closeMovModal()
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

        <button
          type="button"
          onClick={openMovModal}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus size={16} />
          Agregar movimiento
        </button>
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
          <Link to="/clientes" className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Ver todos los clientes
          </Link>
        }
      >
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
              </tr>
            </thead>
            <tbody>
              {movs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-sm text-slate-600 dark:text-slate-300">
                    Sin movimientos aún.
                  </td>
                </tr>
              ) : (
                movs.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3">{String(m.fecha ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.tipo_movimiento ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.estado ?? '')}</td>
                    <td className="py-2 pr-3">${safeNumber(m.monto).toLocaleString('es-MX')}</td>
                    <td className="py-2 pr-3">{String(m.canal_atribucion ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.producto ?? '')}</td>
                    <td className="py-2 pr-3">{String(m.referencia ?? '')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isMovModalOpen && movDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Agregar movimiento</div>
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
    </div>
  )
}
