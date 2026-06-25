import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const endpoint = body?.endpoint
  if (!endpoint) return res.status(400).json({ error: 'missing endpoint' })
  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[push unsubscribe] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
