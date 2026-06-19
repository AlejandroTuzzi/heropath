import { prisma } from './prisma'
import { generateTips } from './openai'
import { sendDailyMotivationEmail, sendEndOfDayEmail, sendEmail } from './email'
import { getRedis } from './redis'

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Current hour / date / weekday in a given IANA timezone (falls back to UTC)
export function localInfo(tz?: string | null) {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false, weekday: 'short'
    }).formatToParts(new Date())
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hour12: false, weekday: 'short'
    }).formatToParts(new Date())
  }
  const get = (t: string) => parts.find(p => p.type === t)?.value || ''
  return {
    hour: parseInt(get('hour')) % 24,
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WD[get('weekday')] ?? new Date().getDay()
  }
}

function goalsScheduledToday(goals: any[], weekday: number) {
  const now = new Date()
  return goals.filter(g => {
    const inRange = new Date(g.startDate) <= now && now <= new Date(g.endDate)
    const days = g.weekdays && g.weekdays.length ? g.weekdays : [0, 1, 2, 3, 4, 5, 6]
    return inRange && days.includes(weekday)
  })
}

// Morning: motivation email with today's goals + an AI tip
export async function sendMotivationEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { goals: true } })
  if (!user?.email) return 'no-email'
  const { weekday } = localInfo(user.timezone)
  const goals = goalsScheduledToday(user.goals, weekday)
  if (goals.length === 0) return 'no-goals-today'

  const prompt = `## HeroPath — coach de growth personal
Metas del usuario para HOY:
${goals.map((g: any) => `- ${g.title}`).join('\n')}

Escribe un consejo motivador breve (3-4 líneas, máx 7), específico a estas metas, con una acción concreta para hoy. Positivo pero realista, en segunda persona. Responde SOLO con el consejo.`
  const tips = await generateTips(prompt)

  await sendDailyMotivationEmail(user.name || user.email, user.email, goals, tips)
  return 'sent'
}

// Evening: email asking the user to log today's results (link to /update-results)
export async function sendResultsRequestEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { goals: true } })
  if (!user?.email) return 'no-email'
  const info = localInfo(user.timezone)
  const goals = goalsScheduledToday(user.goals, info.weekday)
  if (goals.length === 0) return 'no-goals-today'

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const link = `${base}/update-results?userId=${userId}&date=${info.date}`
  await sendEndOfDayEmail(user.name || user.email, user.email, goals.map((g: any) => g.id), link)
  return 'sent'
}

// Immediate test email to verify SendGrid configuration
export async function sendTestEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.email) return 'no-email'
  await sendEmail({
    to: user.email,
    subject: '✅ HeroPath — correo de prueba',
    html: `<h2>¡Tu correo de HeroPath funciona! 🏹</h2>
      <p>Hola ${user.name || ''}, este es un envío de prueba. Si lo recibes, SendGrid está bien configurado y empezarás a recibir tus correos de motivación (mañana) y de cierre (noche) en tus horarios.</p>`
  })
  return 'sent'
}

// Hourly tick: for each user, send according to their local hour (deduped per day via Redis)
export async function processTick() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, timezone: true, dayStartHour: true, dayEndHour: true }
  })
  const r = getRedis()

  for (const u of users) {
    if (!u.email) continue
    const { hour, date } = localInfo(u.timezone)

    // Only mark "sent" once an email actually goes out, so a goal created
    // during the trigger hour still gets its email on the next tick.
    if (hour === u.dayStartHour) {
      const key = `sent:mot:${u.id}:${date}`
      if (!(await r.get(key))) {
        try {
          if (await sendMotivationEmail(u.id) === 'sent') await r.set(key, '1', 'EX', 93600)
        } catch (e) { console.error('[tick motivation]', e) }
      }
    }
    if (hour === u.dayEndHour) {
      const key = `sent:eod:${u.id}:${date}`
      if (!(await r.get(key))) {
        try {
          if (await sendResultsRequestEmail(u.id) === 'sent') await r.set(key, '1', 'EX', 93600)
        } catch (e) { console.error('[tick results]', e) }
      }
    }
  }
}
