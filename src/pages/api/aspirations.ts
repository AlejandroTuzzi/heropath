import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const list = await prisma.aspiration.findMany({ take: 50 })
    return res.status(200).json(list)
  }
  if (req.method === 'POST') {
    const { title, text, userId } = req.body
    if (!title || !text || !userId) return res.status(400).json({ error: 'missing' })
    const a = await prisma.aspiration.create({ data: { title, text, userId } })
    return res.status(201).json(a)
  }
  return res.status(405).end()
}
