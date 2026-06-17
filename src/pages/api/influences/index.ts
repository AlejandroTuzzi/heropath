import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { generateGeneralMessages } from '../../../lib/influences'

async function loadCtx(userId: string) {
  const [aspirations, shortcomings, goals] = await Promise.all([
    prisma.aspiration.findMany({ where: { userId }, select: { title: true } }),
    prisma.shortcoming.findMany({ where: { userId }, select: { title: true } }),
    prisma.goal.findMany({ where: { userId }, select: { title: true } })
  ])
  return { aspirations, shortcomings, goals }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })
    const influences = await prisma.influence.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'desc' } } }
    })
    return res.status(200).json(influences)
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { userId, name, gender, relationship, type, description } = body
    if (!userId || !name || !relationship || !description) {
      return res.status(400).json({ error: 'missing required fields (userId, name, relationship, description)' })
    }
    const kind = type === 'torch' ? 'torch' : 'shadow'
    const g = ['hombre', 'mujer', 'otro', 'neutral'].includes(gender) ? gender : 'neutral'

    try {
      const influence = await prisma.influence.create({
        data: { userId, name, gender: g, relationship, type: kind, description }
      })

      // Generate initial general messages (tolerate failure — influence is already created)
      try {
        const ctx = await loadCtx(userId)
        const messages = await generateGeneralMessages(influence, ctx)
        if (messages.length) {
          await prisma.influenceMessage.createMany({
            data: messages.map(m => ({ influenceId: influence.id, message: m, context: 'general' }))
          })
        }
      } catch (e) {
        console.error('[Influence create] message generation failed', e)
      }

      const full = await prisma.influence.findUnique({ where: { id: influence.id }, include: { messages: true } })
      return res.status(201).json(full)
    } catch (e) {
      console.error('[Influence POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
