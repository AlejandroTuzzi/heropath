import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import dayjs from '../../../../lib/day'
import { STATUS } from '../../../../lib/scoring'
import { generateSuplicaResponse } from '../../../../lib/suplica'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { goalId } = req.query
  if (!goalId || typeof goalId !== 'string') return res.status(400).json({ error: 'missing goalId' })

  // GET: list this goal's súplicas (most recent first)
  if (req.method === 'GET') {
    const list = await prisma.suplica.findMany({ where: { goalId }, orderBy: { date: 'desc' } })
    return res.status(200).json(list)
  }

  // POST: create a súplica — AI replies with context-aware support
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const situation = typeof body.situation === 'string' ? body.situation.trim() : ''

    try {
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
        include: { entries: true, aspirations: true, shortcomings: true }
      })
      if (!goal) return res.status(404).json({ error: 'not found' })

      const now = dayjs.utc()
      const elapsedDays = Math.max(0, now.startOf('day').diff(dayjs.utc(goal.startDate).startOf('day'), 'day'))
      const remainingDays = Math.max(0, dayjs.utc(goal.endDate).startOf('day').diff(now.startOf('day'), 'day'))
      const failCount = goal.entries.filter((e: any) => e.status === STATUS.FAIL).length

      // pick an influence to lean on (prefer an Antorcha / torch)
      const influences = await prisma.influence.findMany({ where: { userId: goal.userId } })
      const chosen = influences.find(i => i.type === 'torch') || influences[0] || null

      const response = await generateSuplicaResponse({
        goalTitle: goal.title,
        goalDescription: goal.description,
        elapsedDays,
        remainingDays,
        failCount,
        aspirations: goal.aspirations.map((a: any) => a.title),
        shortcomings: goal.shortcomings.map((s: any) => s.title),
        influence: chosen ? { name: chosen.name, relationship: chosen.relationship, type: chosen.type, description: chosen.description } : null,
        situation
      })

      const suplica = await prisma.suplica.create({
        data: { userId: goal.userId, goalId, situation: situation || null, response }
      })
      return res.status(201).json(suplica)
    } catch (e) {
      console.error('[Suplica POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
