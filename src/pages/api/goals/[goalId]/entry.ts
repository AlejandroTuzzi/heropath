import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { computeScore } from '../../../../lib/scoring'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { goalId } = req.query

  if (!goalId || typeof goalId !== 'string') {
    return res.status(400).json({ error: 'missing goalId' })
  }

  // POST: Create or update goal entry for today
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { date, note } = body
    const status = Number(body.status) // 1=done,2=half,3=fail,4=exception

    if (!status || ![1, 2, 3, 4].includes(status)) {
      return res.status(400).json({ error: 'invalid status' })
    }

    try {
      // Store the calendar date at UTC midnight (timezone-stable)
      const dstr = (date ? String(date) : new Date().toISOString()).slice(0, 10)
      const entryDate = new Date(dstr + 'T00:00:00.000Z')

      // Find or create entry
      let entry = await prisma.goalEntry.findFirst({
        where: {
          goalId,
          date: entryDate
        }
      })

      if (entry) {
        entry = await prisma.goalEntry.update({
          where: { id: entry.id },
          data: { status, note }
        })
      } else {
        entry = await prisma.goalEntry.create({
          data: {
            goalId,
            date: entryDate,
            status,
            note
          }
        })
      }

      // Recalculate goal score with the strict/rigorous engine
      const goal = await prisma.goal.findUnique({ where: { id: goalId } })
      const allEntries = await prisma.goalEntry.findMany({ where: { goalId } })
      const score = goal ? computeScore(goal as any, allEntries as any) : 100

      await prisma.goal.update({
        where: { id: goalId },
        data: { score }
      })

      return res.status(200).json({ entry, score })
    } catch (e) {
      console.error('[GoalEntry Error]', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  // GET: Retrieve entries for a goal
  if (req.method === 'GET') {
    try {
      const entries = await prisma.goalEntry.findMany({
        where: { goalId },
        orderBy: { date: 'asc' }
      })
      return res.status(200).json(entries)
    } catch (e) {
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
