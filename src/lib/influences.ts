import { generateTips } from './openai'

export const GENDER_ICON: Record<string, string> = {
  hombre: '👨',
  mujer: '👩',
  otro: '🧑',
  neutral: '🧑'
}

export const TYPE_LABEL: Record<string, string> = { shadow: 'Sombra', torch: 'Antorcha' }

// Tone rules shared by every influence prompt
const TONE = `## Tono de los mensajes
- HÁBLALE DIRECTAMENTE AL USUARIO, en SEGUNDA PERSONA ("tú", "te", "puedes", "tu meta"). Menciona a la persona influyente por su NOMBRE, en tercera persona. NUNCA llames al usuario "el héroe", "él" o "ella" — háblale de "tú".
- Lenguaje SIMPLE, cotidiano y directo, como te hablaría un amigo. PROHIBIDO lo rebuscado, poético o abstracto ("forjada en la perseverancia", "disipando sus dudas", "la fuerza interna", "la luz", "el eco del pasado"). Nada de metáforas ni autoayuda genérica.
- 1 o 2 frases cortas como máximo. Concreto y claro.
- Para SOMBRAS: di qué duda/critica esa persona y termina con que TÚ puedes demostrarle lo contrario cumpliendo. Sin odio ni venganza.
- Para ANTORCHAS: recuerda que esa persona cree en ti, y termina invitándote a honrar esa confianza con una acción concreta. Sin volverte dependiente de su aprobación.

## Ejemplos del estilo correcto (simple, en segunda persona)
- Sombra: "Cristóbal se ríe cuando te planteas una meta nueva, cree que no vas a poder. Hoy puedes demostrarle lo contrario."
- Sombra: "A Cristóbal le encanta recordarte las veces que lo dejaste. Cumple hoy y dale algo nuevo de qué hablar."
- Antorcha: "Tu madre siempre creyó que llegarías lejos. Hoy puedes darle una razón más para estar orgullosa."
- Antorcha: "Cristina apuesta por ti aunque tú dudes. Devuélvele esa confianza cumpliendo lo de hoy."`

interface Ctx {
  aspirations: { title: string }[]
  shortcomings: { title: string }[]
  goals: { title: string }[]
}

interface InfluenceLike {
  id?: string
  name: string
  gender?: string
  relationship: string
  type: string // shadow | torch
  description: string
}

function ctxBlock(ctx: Ctx) {
  const a = ctx.aspirations.map(x => x.title).join(', ') || '—'
  const s = ctx.shortcomings.map(x => x.title).join(', ') || '—'
  const g = ctx.goals.map(x => x.title).join(', ') || '—'
  return `Ambiciones: ${a}\nFalencias: ${s}\nMetas: ${g}`
}

// Parse a bullet/line list into clean message strings
export function parseList(raw: string, cap = 6): string[] {
  return raw
    .split('\n')
    .map(l => l.replace(/^[\s]*[-•*\d.)]+\s*/, '').trim())
    .filter(l => l.length > 3)
    .slice(0, cap)
}

// General messages tied to the influence (not a specific goal)
export async function generateGeneralMessages(influence: InfluenceLike, ctx: Ctx): Promise<string[]> {
  const isShadow = influence.type === 'shadow'
  const role = isShadow
    ? 'una SOMBRA: alguien que duda, critica, minimiza o recuerda fracasos pasados del usuario.'
    : 'una ANTORCHA: alguien que cree, impulsa y ve el potencial del usuario incluso sin resultados visibles.'

  const prompt = `## Contexto: HeroPath (app de growth personal)
El usuario registró una persona que influye emocionalmente en su camino.

## Persona (${role})
Nombre: ${influence.name}
Relación: ${influence.relationship}
Descripción: ${influence.description}

## Camino actual del usuario
${ctxBlock(ctx)}

${TONE}

## Tarea
Genera 5 mensajes breves y SIMPLES, hablándole al usuario en SEGUNDA PERSONA ("tú/te/puedes") y nombrando a ${influence.name} en tercera persona, según su tipo (${isShadow ? 'Sombra: su duda como reto que tú puedes desmentir cumpliendo' : 'Antorcha: su confianza como impulso que tú honras cumpliendo'}). Lenguaje cotidiano, nada rebuscado. Cada mensaje en una línea que empiece con "• ". Responde SOLO con la lista.`

  const raw = await generateTips(prompt, 400)
  return parseList(raw)
}

// Goal-specific messages for the relevant influences (one call). Returns [{ influenceId, message }]
export async function generateGoalMessages(
  goal: { title: string; description?: string | null },
  influences: { id: string; name: string; relationship: string; type: string; description: string }[],
  ctx: Ctx
): Promise<{ influenceId: string; message: string }[]> {
  if (influences.length === 0) return []
  const list = influences
    .map(i => `- ${i.name} (${i.type === 'shadow' ? 'Sombra' : 'Antorcha'}, ${i.relationship}): ${i.description}`)
    .join('\n')

  const prompt = `## Contexto: HeroPath (app de growth personal)
El usuario creó una nueva meta. Conecta sus personas influyentes con esta meta concreta.

## Nueva meta
Título: "${goal.title}"${goal.description ? `\nDescripción: ${goal.description}` : ''}

## Camino del usuario
${ctxBlock(ctx)}

## Personas influyentes
${list}

${TONE}

## Tarea
Para las personas que GENUINAMENTE conecten con esta meta, escribe 1-2 mensajes SIMPLES, hablándole al usuario en SEGUNDA PERSONA ("tú/te/puedes") y nombrando a la persona en tercera persona, atándola con esta meta concreta (Sombra = su duda que tú puedes desmentir; Antorcha = su confianza que tú honras). Lenguaje cotidiano, nada rebuscado. Omite las que no apliquen.
Responde SOLO con JSON válido, sin texto extra ni \`\`\`:
[{ "name": "<nombre exacto>", "messages": ["mensaje corto", "mensaje corto"] }]`

  const raw = await generateTips(prompt, 600)
  let parsed: any[] = []
  try {
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')
    parsed = JSON.parse(start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean)
  } catch {
    return []
  }

  const byName = new Map(influences.map(i => [i.name.trim().toLowerCase(), i]))
  const out: { influenceId: string; message: string }[] = []
  for (const item of Array.isArray(parsed) ? parsed : []) {
    const inf = byName.get(String(item?.name || '').trim().toLowerCase())
    if (!inf) continue
    for (const msg of (Array.isArray(item?.messages) ? item.messages : []).slice(0, 2)) {
      const m = String(msg || '').trim()
      if (m.length > 3) out.push({ influenceId: inf.id, message: m })
    }
  }
  return out
}

// Server-side orchestration: generate + store goal-specific influence messages.
// `prisma` is passed in to keep this module free of client-only imports at call sites.
export async function generateAndStoreGoalMessages(
  prisma: any,
  goal: { id: string; title: string; description?: string | null; userId: string }
): Promise<number> {
  const [influences, aspirations, shortcomings, goals] = await Promise.all([
    prisma.influence.findMany({ where: { userId: goal.userId } }),
    prisma.aspiration.findMany({ where: { userId: goal.userId }, select: { title: true } }),
    prisma.shortcoming.findMany({ where: { userId: goal.userId }, select: { title: true } }),
    prisma.goal.findMany({ where: { userId: goal.userId }, select: { title: true } })
  ])
  if (!influences.length) return 0
  const msgs = await generateGoalMessages(goal, influences.slice(0, 8), { aspirations, shortcomings, goals })
  if (!msgs.length) return 0
  await prisma.influenceMessage.createMany({
    data: msgs.map(m => ({ influenceId: m.influenceId, goalId: goal.id, message: m.message, context: 'goal_created' }))
  })
  return msgs.length
}
