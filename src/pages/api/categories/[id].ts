import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const name = (body.name || '').trim()
    const description = typeof body.description === 'string' ? body.description.trim() : undefined
    if (!name) return res.status(400).json({ error: 'missing name' })
    try {
      const category = await prisma.category.update({
        where: { id },
        data: { name, description: description ?? null }
      })
      return res.status(200).json(category)
    } catch (e: any) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' })
      console.error('[Category PUT] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const category = await prisma.category.findUnique({ where: { id } })
      if (!category) return res.status(200).json({ ok: true })
      if (category.name === 'General') {
        return res.status(400).json({ error: 'No puedes eliminar la categoría General' })
      }
      // Reassign this category's goals to "General" before deleting
      const general = await prisma.category.upsert({
        where: { name: 'General' },
        update: {},
        create: { name: 'General' }
      })
      await prisma.goal.updateMany({ where: { categoryId: id }, data: { categoryId: general.id } })
      await prisma.category.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    } catch (e: any) {
      if (e?.code === 'P2025') return res.status(200).json({ ok: true })
      console.error('[Category DELETE] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
