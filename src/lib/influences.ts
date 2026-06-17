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
- Escribe SIEMPRE en TERCERA PERSONA, como un narrador épico que describe la escena. PROHIBIDO usar segunda persona ("tú", "te", "ti", "vas", "haz", "dale", "tu/tus") y PROHIBIDO primera persona ("yo", "mi/mis", "haré", "enciendo").
- Refiérete a la persona influyente por su nombre. Al usuario menciónalo en tercera persona o, mejor, de forma implícita haciendo que la ACCIÓN sea el sujeto (ej: "Cada meta cumplida hoy apaga esa burla").
- Las relaciones van en tercera persona: "su mejor amigo", "su madre" (NUNCA "tu madre").
- Frases breves, lenguaje épico pero sobrio (nada cursi ni autoayuda genérica). Conecta con sus metas/ambiciones/falencias.
- Para SOMBRAS: transforma la crítica en combustible; demostrar con hechos, no vengarse. Prohibido odio, resentimiento, violencia o frases tóxicas ("destrúyelo", "humíllalo").
- Para ANTORCHAS: refuerza gratitud, confianza y continuidad; alguien cree en él, pero el trabajo lo hace él (sin volverlo dependiente de aprobación externa).

## Ejemplos del estilo correcto (tercera persona narrada)
- Sombra: "Cristóbal duda de su constancia. Cada entrenamiento cumplido apaga un poco esa burla."
- Antorcha: "Su madre nunca dejó de creer en él. Hoy es un día para convertir esa fe en evidencia."`

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
Genera 5 mensajes breves y emocionales, EN TERCERA PERSONA NARRADA (sin "tú" ni "yo"), que conecten a ${influence.name} con el camino del usuario, según su tipo (${isShadow ? 'Sombra: convertir su duda en disciplina' : 'Antorcha: convertir su confianza en impulso'}). Cada mensaje en una línea que empiece con "• ". Responde SOLO con la lista.`

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
Para las personas que GENUINAMENTE conecten con esta meta, escribe 1-2 mensajes EN TERCERA PERSONA NARRADA (sin "tú" ni "yo") que aten a esa persona con esta meta concreta (Sombra = su duda como reto; Antorcha = su confianza como impulso). Omite las que no apliquen.
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
