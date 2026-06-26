import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { userId } = req.query
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })

  const list = await prisma.suplica.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    include: { goal: { select: { id: true, title: true } } }
  })
  return res.status(200).json(list)
}
