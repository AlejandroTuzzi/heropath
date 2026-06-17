import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatarUrl: true, age: true, birthDate: true, country: true, timezone: true, dayStartHour: true, dayEndHour: true, createdAt: true }
    })
    if (!user) return res.status(404).json({ error: 'not found' })
    return res.status(200).json(user)
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email, password, name } = body
    if (!email || !password) return res.status(400).json({ error: 'missing email or password' })
    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return res.status(200).json({ id: existing.id, email: existing.email, name: existing.name })
      }

      const hashed = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: { email, password: hashed, name: name || email }
      })
      return res.status(201).json({ id: user.id, email: user.email, name: user.name })
    } catch (e: any) {
      console.error('[Users POST] error:', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'PUT') {
    const { id, name, birthDate, country, timezone, avatarUrl, dayStartHour, dayEndHour } = req.body
    if (!id) return res.status(400).json({ error: 'missing id' })
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: name || undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        country: country || undefined,
        timezone: timezone || undefined,
        avatarUrl: avatarUrl || undefined,
        dayStartHour: dayStartHour !== undefined ? parseInt(dayStartHour) : undefined,
        dayEndHour: dayEndHour !== undefined ? parseInt(dayEndHour) : undefined
      }
    })
    return res.status(200).json({ id: user.id, email: user.email, name: user.name })
  }

  return res.status(405).end()
}
