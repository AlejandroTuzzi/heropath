import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })

  if (req.method === 'GET') {
    const influence = await prisma.influence.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'desc' } } }
    })
    if (!influence) return res.status(404).json({ error: 'not found' })
    return res.status(200).json(influence)
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { name, gender, relationship, type, description } = body
    try {
      const influence = await prisma.influence.update({
        where: { id },
        data: {
          name: name || undefined,
          gender: ['hombre', 'mujer', 'otro', 'neutral'].includes(gender) ? gender : undefined,
          relationship: relationship || undefined,
          type: type === 'torch' || type === 'shadow' ? type : undefined,
          description: description !== undefined ? description : undefined
        }
      })
      return res.status(200).json(influence)
    } catch (e: any) {
      if (e?.code === 'P2025') return res.status(404).json({ error: 'not found' })
      console.error('[Influence PUT] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.influence.delete({ where: { id } }) // messages cascade
      return res.status(200).json({ ok: true })
    } catch (e: any) {
      if (e?.code === 'P2025') return res.status(200).json({ ok: true })
      console.error('[Influence DELETE] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
