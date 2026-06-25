import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { userId, subscription } = body
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!userId || !endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'missing userId or subscription' })
  }
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth }
    })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[push subscribe] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
