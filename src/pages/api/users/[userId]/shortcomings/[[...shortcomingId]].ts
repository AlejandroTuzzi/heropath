import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { generateTips } from '../../../../../lib/openai'

function parseBody(body: any) {
  return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {})
}

function buildShortcomingPrompt(title: string, text: string) {
  return `## Contexto: HeroPath
HeroPath es una app de growth personal. Una **Falencia** es un defecto, mal hábito o debilidad que el usuario quiere eliminar de su vida (ej: "Desordenado", "Malos hábitos de sueño").

## Falencia del usuario:
Título: "${title}"
Descripción: ${text}

## Tarea:
Escribe una guía breve para combatir y superar esta falencia. Devuelve un máximo de 7 consejos (mejor 4-5), cada uno en una línea que empiece con "• ". Cada consejo debe ser corto (una frase), concreto y accionable, con tono firme pero motivador. Responde SOLO con la lista, sin introducción ni cierre.`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, shortcomingId } = req.query

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'missing userId' })
  }

  if (req.method === 'GET') {
    try {
      const shortcomings = await prisma.shortcoming.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      return res.status(200).json(shortcomings)
    } catch (e) {
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'POST') {
    const { title, text } = parseBody(req.body)
    if (!title || !text) {
      return res.status(400).json({ error: 'missing title or text' })
    }
    try {
      const aiAdvice = await generateTips(buildShortcomingPrompt(title, text))
      const shortcoming = await prisma.shortcoming.create({
        data: { title, text, aiAdvice: aiAdvice || null, userId }
      })
      return res.status(201).json(shortcoming)
    } catch (e) {
      console.error('[Shortcoming POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  if (req.method === 'DELETE') {
    const id = Array.isArray(shortcomingId) ? shortcomingId[0] : shortcomingId
    if (!id) return res.status(400).json({ error: 'missing shortcomingId' })
    try {
      await prisma.shortcoming.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    } catch (e: any) {
      if (e?.code === 'P2025') return res.status(200).json({ ok: true })
      console.error('[Shortcoming DELETE] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
