import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { generateTips } from '../../lib/openai'
import { generateAndStoreGoalMessages } from '../../lib/influences'

type NamedItem = { id: string; title: string; text: string }

// One AI call: goal tips + which aspirations it drives + which shortcomings it fights (≤2 each)
async function generateGoalAI(
  title: string,
  description: string,
  aspirations: NamedItem[],
  shortcomings: NamedItem[]
) {
  const aspList = aspirations.length ? aspirations.map(a => `- ${a.title}: ${a.text}`).join('\n') : '(ninguna)'
  const shList = shortcomings.length ? shortcomings.map(s => `- ${s.title}: ${s.text}`).join('\n') : '(ninguna)'

  const prompt = `## Contexto: HeroPath
HeroPath es una app de growth personal.
- **Aspiraciones**: metas utópicas que guían la vida (brújula).
- **Falencias**: defectos o malos hábitos que el usuario quiere eliminar.
- **Metas**: objetivos alcanzables que acercan a las aspiraciones y/o combaten falencias.

## Nueva meta:
Título: "${title}"${description ? `\nDescripción: ${description}` : ''}

## Aspiraciones del usuario:
${aspList}

## Falencias del usuario:
${shList}

## Tarea:
Decide con tu criterio cuáles aspiraciones IMPULSA esta meta y cuáles falencias COMBATE. Elige como MÁXIMO 2 de cada una (solo las que de verdad apliquen; pueden ser 0 si ninguna encaja). Usa EXACTAMENTE los títulos dados.
Responde SOLO con un objeto JSON válido, sin texto adicional ni \`\`\`:
{
  "tips": "• consejo corto\\n• consejo corto (4-5 consejos accionables para lograr esta meta)",
  "aspirations": [{ "title": "<título exacto>", "reason": "por qué esta meta la impulsa" }],
  "shortcomings": [{ "title": "<título exacto>", "reason": "por qué esta meta la combate" }]
}`

  const raw = await generateTips(prompt)
  let parsed: any = {}
  try {
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    parsed = JSON.parse(start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean)
  } catch {
    return { aiAdvice: raw.trim() || null, aspirationIds: [], aspirationLink: null, shortcomingIds: [], shortcomingLink: null }
  }

  const matchByTitle = (items: NamedItem[], picks: any[]) => {
    const byTitle = new Map(items.map(i => [i.title.trim().toLowerCase(), i]))
    const out: { item: NamedItem; reason: string }[] = []
    for (const p of Array.isArray(picks) ? picks.slice(0, 2) : []) {
      const found = byTitle.get(String(p?.title || '').trim().toLowerCase())
      if (found && !out.some(o => o.item.id === found.id)) out.push({ item: found, reason: String(p?.reason || '') })
    }
    return out
  }

  const asp = matchByTitle(aspirations, parsed.aspirations)
  const sh = matchByTitle(shortcomings, parsed.shortcomings)

  return {
    aiAdvice: (parsed.tips && String(parsed.tips).trim()) || null,
    aspirationIds: asp.map(a => a.item.id),
    aspirationLink: asp.length ? asp.map(a => `Esta meta te acerca a tu aspiración «${a.item.title}»: ${a.reason}`).join('\n\n') : null,
    shortcomingIds: sh.map(s => s.item.id),
    shortcomingLink: sh.length ? sh.map(s => `Esta meta combate tu falencia «${s.item.title}»: ${s.reason}`).join('\n\n') : null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const list = await prisma.goal.findMany({ include: { category: true, aspirations: true, shortcomings: true } })
    return res.status(200).json(list)
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { title, description, startDate, endDate, userId, categoryId, strictness, weekdays, weeklyTarget } = body
    if (!title || !startDate || !endDate || !userId || !categoryId) {
      return res.status(400).json({ error: 'missing required fields (title, startDate, endDate, userId, categoryId)' })
    }

    const mode = strictness === 'rigorous' ? 'rigorous' : 'strict'
    const days = Array.isArray(weekdays) && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6]

    const aspirations = await prisma.aspiration.findMany({ where: { userId } })
    const shortcomings = await prisma.shortcoming.findMany({ where: { userId } })

    const ai = await generateGoalAI(title, description || '', aspirations as any, shortcomings as any)

    const g = await prisma.goal.create({
      data: {
        title,
        description,
        type: 'CalendarPath',
        strictness: mode,
        weekdays: days,
        weeklyTarget: mode === 'rigorous' ? Number(weeklyTarget) || 1 : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        userId,
        categoryId,
        aiAdvice: ai.aiAdvice,
        aspirationLink: ai.aspirationLink,
        shortcomingLink: ai.shortcomingLink,
        aspirations: { connect: ai.aspirationIds.map(id => ({ id })) },
        shortcomings: { connect: ai.shortcomingIds.map(id => ({ id })) }
      },
      include: { aspirations: true, shortcomings: true }
    })

    // Generate influence messages tied to this goal — never block goal creation on it
    try {
      await generateAndStoreGoalMessages(prisma, g)
    } catch (e) {
      console.error('[Goal create] influence message generation failed', e)
    }

    return res.status(201).json(g)
  }
  return res.status(405).end()
}
