import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { computeScore } from '../../../lib/scoring'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { goalId } = req.query

  if (!goalId || typeof goalId !== 'string') {
    return res.status(400).json({ error: 'missing goalId' })
  }

  if (req.method === 'GET') {
    try {
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: { category: true, aspirations: true, shortcomings: true, entries: { orderBy: { date: 'asc' } } }
      })
      if (!goal) return res.status(404).json({ error: 'not found' })
      const score = computeScore(goal as any, goal.entries as any)
      return res.status(200).json({ ...goal, score })
    } catch (e) {
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { title, description, startDate, endDate, categoryId, aspirationIds, shortcomingIds, strictness, weekdays, weeklyTarget } = body
    const mode = strictness === 'rigorous' ? 'rigorous' : strictness === 'strict' ? 'strict' : undefined
    try {
      const goal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          title: title || undefined,
          description: description !== undefined ? description : undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          categoryId: categoryId || undefined,
          strictness: mode,
          weekdays: Array.isArray(weekdays) && weekdays.length ? weekdays.map(Number) : undefined,
          weeklyTarget: weeklyTarget !== undefined ? (Number(weeklyTarget) || null) : undefined,
          aspirations: Array.isArray(aspirationIds)
            ? { set: aspirationIds.filter(Boolean).map((id: string) => ({ id })) }
            : undefined,
          shortcomings: Array.isArray(shortcomingIds)
            ? { set: shortcomingIds.filter(Boolean).map((id: string) => ({ id })) }
            : undefined
        },
        include: { category: true, aspirations: true, shortcomings: true }
      })
      return res.status(200).json(goal)
    } catch (e) {
      console.error('[Goal PUT] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Remove child entries + goal-scoped influence messages first
      await prisma.goalEntry.deleteMany({ where: { goalId } })
      await prisma.influenceMessage.deleteMany({ where: { goalId } })
      await prisma.goal.delete({ where: { id: goalId } })
      return res.status(200).json({ ok: true })
    } catch (e: any) {
      if (e?.code === 'P2025') return res.status(200).json({ ok: true })
      console.error('[Goal DELETE] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
