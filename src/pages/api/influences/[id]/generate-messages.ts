import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { generateGeneralMessages } from '../../../../lib/influences'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })

  try {
    const influence = await prisma.influence.findUnique({ where: { id } })
    if (!influence) return res.status(404).json({ error: 'not found' })

    const [aspirations, shortcomings, goals] = await Promise.all([
      prisma.aspiration.findMany({ where: { userId: influence.userId }, select: { title: true } }),
      prisma.shortcoming.findMany({ where: { userId: influence.userId }, select: { title: true } }),
      prisma.goal.findMany({ where: { userId: influence.userId }, select: { title: true } })
    ])

    const messages = await generateGeneralMessages(influence, { aspirations, shortcomings, goals })
    if (messages.length) {
      await prisma.influenceMessage.createMany({
        data: messages.map(m => ({ influenceId: influence.id, message: m, context: 'general' }))
      })
    }
    return res.status(200).json({ created: messages.length, messages })
  } catch (e) {
    console.error('[Influence generate-messages] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
