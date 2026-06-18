import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { generateTips } from '../../lib/openai'
import { STATUS_LABEL } from '../../lib/scoring'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: feedback history for the score / progress section
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'missing userId' })
    const history = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 60
    })
    return res.status(200).json(history)
  }

  // POST: generate + store one combined message for the day's report
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { userId, date } = body
    if (!userId || !date) return res.status(400).json({ error: 'missing userId or date' })

    try {
      const dstr = String(date).slice(0, 10)
      const day = new Date(dstr + 'T00:00:00.000Z') // UTC midnight (timezone-stable)
      const next = new Date(day)
      next.setUTCDate(next.getUTCDate() + 1)

      const entries = await prisma.goalEntry.findMany({
        where: { goal: { userId }, date: { gte: day, lt: next } },
        include: { goal: true }
      })

      if (entries.length === 0) {
        return res.status(200).json({ message: '' })
      }

      const summary = entries
        .map(e => `- ${e.goal.title}: ${STATUS_LABEL[e.status] || 'Sin registrar'}`)
        .join('\n')

      // Occasionally weave in an Influence (Shadow as challenge / Torch as support)
      let influenceBlock = ''
      const influences = await prisma.influence.findMany({ where: { userId } })
      if (influences.length && Math.random() < 0.6) {
        const struggling = entries.filter(e => e.status === 3 || e.status === 2).length >= entries.filter(e => e.status === 1).length
        const preferred = struggling ? 'shadow' : 'torch'
        const pool = influences.filter(i => i.type === preferred)
        const chosen = (pool.length ? pool : influences)[Math.floor(Math.random() * (pool.length ? pool.length : influences.length))]
        influenceBlock = `\n## Persona influyente a incorporar (con naturalidad, sin forzar)
${chosen.name} (${chosen.type === 'shadow' ? 'Sombra: su duda como reto, NUNCA odio/venganza' : 'Antorcha: su confianza como impulso, sin volverlo dependiente de aprobación'}), ${chosen.relationship}: ${chosen.description}
Teje UNA frase que conecte a esta persona con el día del usuario.`
      }

      const prompt = `## Contexto: HeroPath
HeroPath es una app de growth personal basada en metas que acercan a aspiraciones utópicas.

## Informe del día del usuario:
${summary}
${influenceBlock}

## Tarea:
Escribe UN mensaje breve y cálido (máximo 4 líneas) que reaccione a este informe: felicita por lo cumplido y anima con cariño y un consejo concreto donde falló o fue a medias. Tono cercano y motivador, en segunda persona, épico pero sobrio.${influenceBlock ? ' Incluye de forma natural la referencia a la persona influyente indicada.' : ''} Responde SOLO con el mensaje.`

      const message = await generateTips(prompt)

      // Upsert one feedback per user+day
      const existing = await prisma.feedback.findFirst({ where: { userId, date: day } })
      const saved = existing
        ? await prisma.feedback.update({ where: { id: existing.id }, data: { message } })
        : await prisma.feedback.create({ data: { userId, date: day, message } })

      return res.status(200).json({ message: saved.message })
    } catch (e) {
      console.error('[Feedback POST] error', e)
      return res.status(500).json({ error: 'server error' })
    }
  }

  return res.status(405).end()
}
