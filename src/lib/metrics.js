import { IS_META_ADS_CHANNEL } from '../constants.js'
import { safeDiv, safeNumber } from './numbers.js'

export function computeRowMetrics(row) {
  const inversion = safeNumber(row.inversion)
  const ingresos = safeNumber(row.ingresos)
  const leads = safeNumber(row.leads)
  const clientesNuevos = safeNumber(row.clientesNuevos)
  const numeroVentas = safeNumber(row.numeroVentas)

  const roi = inversion > 0 ? ((ingresos - inversion) / inversion) * 100 : 0
  const roas = inversion > 0 ? ingresos / inversion : 0
  const cac = safeDiv(inversion, clientesNuevos)
  const ticketPromedio = safeDiv(ingresos, numeroVentas)
  const tasaConversion = leads > 0 ? (clientesNuevos / leads) * 100 : 0

  return {
    roi,
    roas,
    cac,
    ticketPromedio,
    tasaConversion,
    rentabilidadPrincipal: IS_META_ADS_CHANNEL(row.canal) ? roas : roi,
  }
}

export function aggregate(rows) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.inversion += safeNumber(r.inversion)
      acc.ingresos += safeNumber(r.ingresos)
      acc.leads += safeNumber(r.leads)
      acc.clientesNuevos += safeNumber(r.clientesNuevos)
      acc.numeroVentas += safeNumber(r.numeroVentas)
      return acc
    },
    { inversion: 0, ingresos: 0, leads: 0, clientesNuevos: 0, numeroVentas: 0 },
  )

  const roi = totals.inversion > 0 ? ((totals.ingresos - totals.inversion) / totals.inversion) * 100 : 0
  const cac = safeDiv(totals.inversion, totals.clientesNuevos)
  const ticketPromedio = safeDiv(totals.ingresos, totals.numeroVentas)

  return { ...totals, roi, cac, ticketPromedio }
}
