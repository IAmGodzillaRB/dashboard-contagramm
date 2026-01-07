import { CHANNELS } from '../constants.js'
import { isValidDateString, compareDateStrings } from './dates.js'
import { safeNumber } from './numbers.js'

export function validateRow(row) {
  const errors = {}

  if (!Number.isInteger(Number(row.año)) || Number(row.año) < 2000) {
    errors.año = 'Año inválido.'
  }

  const mes = Number(row.mes)
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    errors.mes = 'Mes inválido (1-12).'
  }

  const semana = Number(row.semanaDelMes)
  if (!Number.isInteger(semana) || semana < 1 || semana > 5) {
    errors.semanaDelMes = 'Semana inválida (1-5).'
  }

  if (!CHANNELS.includes(row.canal)) {
    errors.canal = 'Canal debe ser uno de la lista.'
  }

  const inversion = safeNumber(row.inversion)
  const ingresos = safeNumber(row.ingresos)
  const leads = safeNumber(row.leads)
  const clientesNuevos = safeNumber(row.clientesNuevos)
  const numeroVentas = safeNumber(row.numeroVentas)

  if (inversion < 0) errors.inversion = 'La inversión no puede ser negativa.'
  if (ingresos < 0) errors.ingresos = 'Los ingresos no pueden ser negativos.'
  if (leads < 0) errors.leads = 'Leads no puede ser negativo.'
  if (clientesNuevos < 0) errors.clientesNuevos = 'Clientes nuevos no puede ser negativo.'
  if (numeroVentas < 0) errors.numeroVentas = 'Número de ventas no puede ser negativo.'

  if (row.fechaInicioSemana && !isValidDateString(row.fechaInicioSemana)) {
    errors.fechaInicioSemana = 'Fecha inicio inválida.'
  }
  if (row.fechaFinSemana && !isValidDateString(row.fechaFinSemana)) {
    errors.fechaFinSemana = 'Fecha fin inválida.'
  }

  if (
    row.fechaInicioSemana &&
    row.fechaFinSemana &&
    isValidDateString(row.fechaInicioSemana) &&
    isValidDateString(row.fechaFinSemana) &&
    compareDateStrings(row.fechaInicioSemana, row.fechaFinSemana) > 0
  ) {
    errors.fechaFinSemana = 'Fecha fin debe ser posterior a inicio.'
  }

  return errors
}

export function rowHasErrors(errors) {
  return Object.keys(errors).length > 0
}
