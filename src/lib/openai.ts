import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (openai) return openai

  const cfgPath = process.env.OPENAI_CONFIG_FILE || path.resolve(process.cwd(), 'openai_config.json')
  let cfg: any = {}
  
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  } catch (e) {
    console.warn('openai_config.json not found or invalid', e)
  }

  const apiKey = cfg?.api_key || cfg?.apiKey || process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found in openai_config.json or OPENAI_API_KEY env var')
  }

  openai = new OpenAI({ apiKey })
  return openai
}

export async function generateTips(prompt: string, maxTokens: number = 300) {
  try {
    const client = getOpenAIClient()
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    })
    return res.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('[OpenAI] Error generating tips:', e)
    return 'Un consejo: sigue adelante, cada paso cuenta. 💪'
  }
}
