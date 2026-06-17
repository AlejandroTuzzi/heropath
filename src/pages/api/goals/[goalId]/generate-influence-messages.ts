import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { generateAndStoreGoalMessages } from '../../../../lib/influences'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { goalId } = req.query
  if (!goalId || typeof goalId !== 'string') return res.status(400).json({ error: 'missing goalId' })

  try {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } })
    if (!goal) return res.status(404).json({ error: 'not found' })
    const created = await generateAndStoreGoalMessages(prisma, goal)
    return res.status(200).json({ created })
  } catch (e) {
    console.error('[generate-influence-messages] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
