import { NextApiRequest, NextApiResponse } from 'next'
import { isPushConfigured, sendPushToUser } from '../../../lib/push'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { userId } = body
  if (!userId) return res.status(400).json({ error: 'missing userId' })
  if (!isPushConfigured()) return res.status(400).json({ error: 'Push no está configurado (faltan claves VAPID)' })

  try {
    const sent = await sendPushToUser(userId, {
      title: '🏹 HeroPath',
      body: '¡Las notificaciones funcionan! Te avisaremos a tus horarios.',
      url: '/dashboard'
    })
    if (sent === 0) return res.status(400).json({ error: 'No hay dispositivos suscritos en esta cuenta' })
    return res.status(200).json({ ok: true, sent })
  } catch (e: any) {
    console.error('[push test] error', e)
    return res.status(500).json({ error: e?.message || 'No se pudo enviar' })
  }
}
