export const STORAGE_KEY = 'sales-data-2025'

export const CHANNELS = [
  'BNI GUELAGUETZA',
  'BNI ANTEQUERA',
  'BOCA EN BOCA',
  'REDES SOCIALES (META ADS)',
  'EMAIL-MKT',
  'WHATSAPP',
  'PATROCINIO EVENTOS',
  'OTROS (PLATICAS, PARTICIPACIÓN EN EVENTOS EXTRAS)',
]

export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export const MONTH_LABEL_BY_VALUE = Object.fromEntries(MONTHS.map((m) => [m.value, m.label]))

export const CHANNEL_COLORS = {
  'BNI GUELAGUETZA': '#7c3aed',
  'BNI ANTEQUERA': '#4f46e5',
  'BOCA EN BOCA': '#0ea5e9',
  'REDES SOCIALES (META ADS)': '#22c55e',
  'EMAIL-MKT': '#14b8a6',
  'WHATSAPP': '#f59e0b',
  'PATROCINIO EVENTOS': '#ef4444',
  'OTROS (PLATICAS, PARTICIPACIÓN EN EVENTOS EXTRAS)': '#a855f7',
}

export const IS_META_ADS_CHANNEL = (channel) => channel === 'REDES SOCIALES (META ADS)'
