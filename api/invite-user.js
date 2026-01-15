export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' })

    const { email } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const inviteEmail = String(email || '').trim().toLowerCase()
    if (!inviteEmail) return res.status(400).json({ error: 'Missing email' })

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

    const baseUrl = process.env.APP_BASE_URL || req.headers.origin || ''
    const redirectTo = baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/?type=invite` : undefined

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(inviteEmail, {
      redirectTo,
    })

    if (error) return res.status(400).json({ error: error.message })

    return res.status(200).json({ ok: true, invitedUserId: data?.user?.id || null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
}
