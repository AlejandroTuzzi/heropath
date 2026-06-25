import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { computeScore } from '../../../../lib/scoring'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { userId } = req.query
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'missing userId' })
  }

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { category: true, aspirations: true, shortcomings: true, entries: { orderBy: { date: 'asc' } } }
    })
    // Recompute the score from entries so it always reflects the current scoring rules
    const withScores = goals.map(g => ({ ...g, score: computeScore(g as any, g.entries as any) }))
    return res.status(200).json(withScores)
  } catch (e) {
    return res.status(500).json({ error: 'server error' })
  }
}
