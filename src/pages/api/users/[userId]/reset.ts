import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'

// Wipes all of the user's content (keeps the account + profile/setup).
// With no goals left, the global percentage returns to 100%.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { userId } = req.query
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })

  try {
    await prisma.$transaction([
      // entries first (FK to goal)
      prisma.goalEntry.deleteMany({ where: { goal: { userId } } }),
      // influences cascade-delete their messages (general + goal-specific)
      prisma.influence.deleteMany({ where: { userId } }),
      // daily coach history
      prisma.feedback.deleteMany({ where: { userId } }),
      // goals (implicit m2m join rows to aspirations/shortcomings are auto-removed)
      prisma.goal.deleteMany({ where: { userId } }),
      prisma.aspiration.deleteMany({ where: { userId } }),
      prisma.shortcoming.deleteMany({ where: { userId } })
    ])
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[Reset] error', e)
    return res.status(500).json({ error: 'server error' })
  }
}
