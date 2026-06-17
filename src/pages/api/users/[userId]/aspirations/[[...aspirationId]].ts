import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { generateTips } from '../../../../../lib/openai'

function parseBody(body: any) {
  return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {})
}

function buildAspirationPrompt(title: string, text: string) {
  return `## Contexto: HeroPath
HeroPath es una app de growth personal. Una **Aspiración** es una meta utópica e inalcanzable que funciona como brújula: bajo la idea de "si apuntas a la luna con una flecha nunca le darás, pero serás el mejor arquero de la Tierra". No se cumple del todo: orienta el esfuerzo de toda una vida.

## Aspiración del usuario:
Título: "${title}"
Descripción: ${text}

## Tarea:
Escribe una guía breve para acercarse a esta aspiración. Devuelve un máximo de 7 consejos (mejor 4-5), cada uno en una línea que empiece con "• ". Cada consejo debe ser corto (una frase), concreto y accionable, y mantener el tono utópico e inspirador. Responde SOLO con la lista, sin introducción ni cierre.`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, aspirationId } = req.query

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'missing userId' })
  }

  // GET: List user's aspirations
  if (req.method === 'GET') {
    try {
      const aspirations = await prisma.aspiration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      return res.status(200).json(aspirations)
    } catch (e) {
      return res.status(500).json({ error: 'server error' })
    }
  }

  // POST: Create new aspiration (+ AI-generated guidance)
  if (req.method === 'POST') {
    const { title, text } = parseBody(req.body)
    if (!title || !text) {
      return res.status(400).json({ error: 'missing title or text' })
    }
    try {
      // generateTips has its own internal fallback, so this won't throw
      const aiAdvice = await generateTips(buildAspirationPrompt(title, text))
      const aspiration = await prisma.aspiration.create({
        data: { title, text, aiAdvice: aiAdvice || null, userId }
      })
      return res.status(201).json(aspiration)
    } catch (e) {
      console.error('[Aspiration POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  // DELETE: Remove aspiration
  if (req.method === 'DELETE') {
    // Optional catch-all route: aspirationId arrives as an array (e.g. ['<id>'])
    const aspId = Array.isArray(aspirationId) ? aspirationId[0] : aspirationId
    if (!aspId) {
      return res.status(400).json({ error: 'missing aspirationId' })
    }
    try {
      // Implicit many-to-many: deleting the aspiration removes its goal join rows automatically
      await prisma.aspiration.delete({ where: { id: aspId } })
      return res.status(200).json({ ok: true })
    } catch (e: any) {
      // P2025 = record already gone; treat delete as idempotent success
      if (e?.code === 'P2025') return res.status(200).json({ ok: true })
      console.error('[Aspiration DELETE] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
