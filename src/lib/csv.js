function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function parseCsvRow(line) {
  const out = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1]
        if (next === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === ',') {
        out.push(cur)
        cur = ''
      } else if (ch === '"') {
        inQuotes = true
      } else {
        cur += ch
      }
    }
  }

  out.push(cur)
  return out
}

export function parseCsvText(text) {
  const normalized = String(text ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const rawLines = normalized.split('\n')
  const lines = rawLines.filter((l) => l.trim().length > 0)
  if (!lines.length) return { headers: [], rows: [] }

  const headers = parseCsvRow(lines[0]).map((h) => h.trim())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i])
    const row = {}
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]
      if (!key) continue
      row[key] = cells[c] ?? ''
    }
    rows.push(row)
  }

  return { headers, rows }
}

export function rowsToCsv(rows, headers) {
  const head = headers.map((h) => escapeCsv(h.label)).join(',')
  const lines = rows.map((row) => headers.map((h) => escapeCsv(row[h.key])).join(','))
  return [head, ...lines].join('\n')
}

export function downloadTextFile(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}
