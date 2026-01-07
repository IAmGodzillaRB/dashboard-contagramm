export function safeNumber(value) {
  if (value === '' || value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function safeDiv(numerator, denominator) {
  const num = safeNumber(numerator)
  const den = safeNumber(denominator)
  if (den === 0) return 0
  return num / den
}

export function pctChange(current, previous) {
  const c = safeNumber(current)
  const p = safeNumber(previous)
  if (p === 0) return c === 0 ? 0 : 100
  return ((c - p) / p) * 100
}

export function formatCurrencyMXN(value) {
  const n = safeNumber(value)
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export function formatNumber(value, decimals = 0) {
  const n = safeNumber(value)
  try {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)
  } catch {
    return n.toFixed(decimals)
  }
}
