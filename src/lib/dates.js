export function isValidDateString(value) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

export function compareDateStrings(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getTime() - db.getTime()
}

export function toISODate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function weekLabel(row) {
  const month = row.mes
  const week = row.semanaDelMes
  return `M${month} · S${week}`
}
