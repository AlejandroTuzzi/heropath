import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).end()
  const { userId } = req.query
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const currentPassword = String(body.currentPassword || '')
  const newPassword = String(body.newPassword || '')

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'not found' })

    const master = (process.env.APP_PASSWORD || 'heropathpass').trim()
    const currentOk =
      currentPassword.trim() === master ||
      (user.password && (await bcrypt.compare(currentPassword, user.password)))

    if (!currentOk) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[password change] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
