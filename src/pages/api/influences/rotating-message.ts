import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

// Returns one influence message to display, preferring the least-shown ones
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { userId } = req.query
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })

  try {
    // Least-shown first; pick randomly within the lowest bucket to rotate
    const candidates = await prisma.influenceMessage.findMany({
      where: { influence: { userId } },
      orderBy: [{ timesShown: 'asc' }, { createdAt: 'asc' }],
      take: 12,
      include: { influence: { select: { name: true, gender: true, type: true, relationship: true } } }
    })

    if (candidates.length === 0) return res.status(200).json({ message: null })

    const minShown = candidates[0].timesShown
    const pool = candidates.filter(c => c.timesShown === minShown)
    const picked = pool[Math.floor(Math.random() * pool.length)]

    await prisma.influenceMessage.update({
      where: { id: picked.id },
      data: { timesShown: { increment: 1 }, usedAt: new Date() }
    })

    return res.status(200).json({
      message: picked.message,
      influence: picked.influence
    })
  } catch (e) {
    console.error('[rotating-message] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
