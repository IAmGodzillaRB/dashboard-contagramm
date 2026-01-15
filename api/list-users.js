export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' })

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
    }

    const adminEmails = String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const { createClient } = await import('@supabase/supabase-js')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userData, error: userError } = await adminClient.auth.getUser(token)
    if (userError) return res.status(401).json({ error: `Invalid token: ${userError.message}` })

    const requesterEmail = String(userData?.user?.email || '').toLowerCase()
    if (!requesterEmail) return res.status(403).json({ error: 'Forbidden' })

    if (adminEmails.length > 0 && !adminEmails.includes(requesterEmail)) {
      return res.status(403).json({ error: 'Forbidden: not an admin' })
    }

    const page = Math.max(1, Number(req.query?.page || 1) || 1)
    const perPage = Math.min(100, Math.max(1, Number(req.query?.per_page || 50) || 50))

    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) return res.status(400).json({ error: error.message })

    const users = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      invited_at: u.invited_at,
      banned_until: u.banned_until,
    }))

    return res.status(200).json({ ok: true, users })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
}
