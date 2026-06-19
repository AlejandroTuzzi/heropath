import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { goals: true } } }
    })
    return res.status(200).json(categories)
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const name = (body.name || '').trim()
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    if (!name) return res.status(400).json({ error: 'missing name' })

    try {
      // find-or-create by name (also used when typing a new category while creating a goal)
      let category = await prisma.category.findUnique({ where: { name } })
      if (!category) {
        category = await prisma.category.create({ data: { name, description: description || null } })
      } else if (description !== undefined && description !== category.description) {
        category = await prisma.category.update({ where: { id: category.id }, data: { description } })
      }
      return res.status(200).json(category)
    } catch (e: any) {
      if (e.code === 'P2002') {
        const cat = await prisma.category.findUnique({ where: { name } })
        return res.status(200).json(cat)
      }
      console.error('[Categories POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
