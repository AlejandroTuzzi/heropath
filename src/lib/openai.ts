import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'

// Provider-agnostic LLM client. Works with any OpenAI-compatible API (OpenAI,
// DeepSeek, etc.) via env vars:
//   LLM_API_KEY   - the provider API key
//   LLM_BASE_URL  - e.g. https://api.deepseek.com  (omit for OpenAI)
//   LLM_MODEL     - e.g. deepseek-v4-flash | gpt-4o-mini
// Falls back to the OpenAI key in openai_config.json / OPENAI_API_KEY.

let client: OpenAI | null = null

function readConfigKey(): string | undefined {
  try {
    const cfgPath = process.env.OPENAI_CONFIG_FILE || path.resolve(process.cwd(), 'openai_config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    return cfg?.api_key || cfg?.apiKey
  } catch {
    return undefined
  }
}

function getClient(): OpenAI {
  if (client) return client

  const apiKey = process.env.LLM_API_KEY || readConfigKey() || process.env.OPENAI_API_KEY
  const baseURL = process.env.LLM_BASE_URL || undefined // undefined => OpenAI default

  if (!apiKey) {
    throw new Error('No LLM API key found (set LLM_API_KEY, or OPENAI_API_KEY / openai_config.json)')
  }

  client = new OpenAI({ apiKey, baseURL })
  return client
}

const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

export async function generateTips(prompt: string, maxTokens: number = 300) {
  try {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens
    })
    return res.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('[LLM] Error generating tips:', e)
    return 'Un consejo: sigue adelante, cada paso cuenta. 💪'
  }
}
