import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL)
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  fromEmail?: string
}

export async function sendEmail({ to, subject, html, fromEmail }: EmailPayload) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY no está configurada (.env)')
  }
  try {
    const from = fromEmail || process.env.SENDGRID_FROM_EMAIL || 'noreply@heropath.tuzzi.ai'
    await sgMail.send({ to, from, subject, html })
    console.log(`[Email] Sent to ${to}: ${subject}`)
  } catch (error: any) {
    const detail = error?.response?.body?.errors?.[0]?.message || error?.message
    console.error(`[Email Error] Failed to send to ${to}:`, detail)
    throw new Error(detail || 'Email send failed')
  }
}

export async function sendDailyMotivationEmail(userName: string, email: string, goals: any[], tips: string) {
  const goalsList = goals.map((g: any) => `<li><strong>${g.title}</strong>: ${g.description || ''}</li>`).join('')
  const html = `
    <h2>¡Buenos días, ${userName}!</h2>
    <p>Te escribo para recordarte tus metas de hoy. ¡Vamos a hacerlo!</p>
    <h3>Tus metas:</h3>
    <ul>${goalsList}</ul>
    <h3>Consejo del día:</h3>
    <p>${tips}</p>
    <p>¡Adelante! 💪</p>
  `
  await sendEmail({ to: email, subject: `🚀 ¡Buenos días! - Recuerda tus metas`, html })
}

export async function sendEndOfDayEmail(userName: string, email: string, goalIds: string[], updateLink: string) {
  const html = `
    <h2>¿Cómo te ha ido hoy, ${userName}?</h2>
    <p>Es hora de actualizar tu progreso. ¿Cómo te salió?</p>
    <p><a href="${updateLink}" style="background:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block">Actualizar resultados</a></p>
    <p>Recuerda que cada pequeño paso cuenta. ¡Sigue adelante! 🌟</p>
  `
  await sendEmail({ to: email, subject: `⏰ Actualiza tu progreso de hoy`, html })
}

export async function sendFailureEncouragement(userName: string, email: string, goalTitle: string, advice: string) {
  const html = `
    <h2>No te desanimes, ${userName}</h2>
    <p>Hemos visto que no cumpliste <strong>"${goalTitle}"</strong> hoy. Pero eso está bien, lo importante es volver a intentarlo.</p>
    <h3>Un consejo para ti:</h3>
    <p>${advice}</p>
    <p>¡Mañana es una nueva oportunidad! 💪</p>
  `
  await sendEmail({ to: email, subject: `💙 No te desanimes - Consejo para mejorar`, html })
}
