import { NextApiRequest, NextApiResponse } from 'next'
import { generateTips } from '../../../lib/openai'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const { goalTitle, goalDescription, aspirations } = body

  if (!goalTitle || !aspirations?.length) {
    return res.status(400).json({ error: 'missing data' })
  }

  try {
    // Use OpenAI to find compatible aspiration
    const aspirationList = aspirations
      .map((a: any) => `- ${a.title}: ${a.text}`)
      .join('\n')

    const prompt = `## Contexto: HeroPath
HeroPath es una app de growth personal. Distingue entre:
- **Aspiraciones**: metas inalcanzables que sirven como brujula y dirección, guían tus decisiones
- **Metas**: objetivos alcanzables que contribuyen a aproximarse a la aspiración

## Aspiraciones disponibles:
${aspirationList}

## Nueva meta a vincular:
Título: "${goalTitle}"${goalDescription ? `\nDescripción: ${goalDescription}` : ''}

## Tarea:
Identifica cuál aspiración es la brujula más alineada con esta meta. Responde SOLO con el TÍTULO exacto de la aspiración (sin comillas, sin explicación) o "NINGUNA" si no encaja.`

    const response = await generateTips(prompt)
    const selectedTitle = response.trim()

    if (selectedTitle === 'NINGUNA' || !selectedTitle) {
      return res.status(200).json({ aspiration: null })
    }

    const compatible = aspirations.find((a: any) => a.title.toLowerCase() === selectedTitle.toLowerCase())
    return res.status(200).json({ aspiration: compatible || null })
  } catch (e) {
    console.error('[FindCompatibleAspiration Error]', e)
    return res.status(200).json({ aspiration: null })
  }
}
