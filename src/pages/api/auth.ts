import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const password = typeof body?.password === 'string' ? body.password.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const master = (process.env.APP_PASSWORD || 'heropathpass').trim()

  if (!password) {
    return res.status(400).json({ ok: false, error: 'missing password' })
  }

  // Master password always works (recovery — avoids lockout).
  if (password === master) {
    return res.status(200).json({ ok: true })
  }

  // Otherwise accept the user's personal password.
  if (email) {
    try {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user?.password && (await bcrypt.compare(password, user.password))) {
        return res.status(200).json({ ok: true })
      }
    } catch (e) {
      console.error('[auth] error', e)
    }
  }

  return res.status(401).json({ ok: false, error: 'incorrect password' })
}
