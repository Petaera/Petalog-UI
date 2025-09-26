// Netlify/Vercel serverless function to update Supabase Auth user (email/password)
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE in environment

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { userId, email, password } = req.body || {}
    if (!userId || (!email && !password)) {
      return res.status(400).json({ error: 'Missing parameters' })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE)

    // Build updates
    const updates = {}
    if (email) updates.email = email
    if (password) updates.password = password

    // Ensure email change applies immediately without confirmation email
    updates.email_confirm = true

    const { data, error } = await supabase.auth.admin.updateUserById(userId, updates)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true, data })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal error' })
  }
}

