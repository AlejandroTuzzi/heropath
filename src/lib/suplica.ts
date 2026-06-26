import { generateTips } from './openai'

export interface SuplicaInput {
  goalTitle: string
  goalDescription?: string | null
  elapsedDays: number
  remainingDays: number
  failCount: number
  aspirations: string[]
  shortcomings: string[]
  influence?: { name: string; relationship: string; type: string; description: string } | null
  situation: string
}

export async function generateSuplicaResponse(i: SuplicaInput): Promise<string> {
  const aporta = [
    i.aspirations.length ? `te acerca a: ${i.aspirations.join(', ')}` : '',
    i.shortcomings.length ? `combate: ${i.shortcomings.join(', ')}` : ''
  ].filter(Boolean).join(' · ') || 'tu crecimiento personal'

  const infBlock = i.influence
    ? `\n## Persona que cree en ti (úsala para darle fuerza)\n${i.influence.name} (${i.influence.type === 'torch' ? 'Antorcha' : 'Sombra'}, ${i.influence.relationship}): ${i.influence.description}`
    : ''

  const prompt = `## Contexto: HeroPath
El usuario está A PUNTO DE FALLAR una meta y te pide auxilio (una "súplica"). Es un momento de debilidad/recaída — necesita que lo sostengas AHORA.

## La meta
"${i.goalTitle}"${i.goalDescription ? ` — ${i.goalDescription}` : ''}
- Lleva ${i.elapsedDays} día(s) en ella.
- Le faltan ${i.remainingDays} día(s) para completarla.
- Recaídas/fallos hasta ahora: ${i.failCount}.
- Cumplirla ${aporta}.${infBlock}

## El momento (lo que el usuario te dice):
"${i.situation || 'Estoy a punto de recaer y necesito ayuda.'}"

## Tarea:
Responde como su coach en este instante crítico, con calidez y FIRMEZA, en segunda persona y lenguaje simple (nada cursi):
1) Reconoce el momento y recuérdale lo que YA lleva (${i.elapsedDays} días) y lo POCO que falta (${i.remainingDays} días) — no tirar todo por la borda por un impulso.
2) Recuérdale en una frase qué gana si aguanta (lo que aporta / su ambición o falencia).
${i.influence ? `3) Menciona a ${i.influence.name} para darle un empujón emocional.\n` : ''}Luego cierra con EXACTAMENTE 5 consejos concretos y accionables para superar ESTE momento de recaída, cada uno en una línea que empiece con "• ".`

  return generateTips(prompt, 500)
}
