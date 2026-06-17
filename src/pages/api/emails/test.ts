import { NextApiRequest, NextApiResponse } from 'next'
import { isEmailConfigured } from '../../../lib/email'
import { sendTestEmail } from '../../../lib/notifications'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { userId } = body
  if (!userId) return res.status(400).json({ error: 'missing userId' })

  if (!isEmailConfigured()) {
    return res.status(400).json({ error: 'SendGrid no está configurado. Añade SENDGRID_API_KEY y SENDGRID_FROM_EMAIL en .env.' })
  }

  try {
    const result = await sendTestEmail(userId)
    if (result === 'no-email') return res.status(400).json({ error: 'El usuario no tiene email' })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error('[Email test] error', e)
    return res.status(500).json({ error: e?.message || 'No se pudo enviar' })
  }
}
