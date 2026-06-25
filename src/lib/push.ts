import webpush from 'web-push'
import { prisma } from './prisma'

let configured = false
function ensureConfigured() {
  if (configured) return
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@heropath.tuzzi.ai'
  if (!pub || !priv) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function getPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || ''
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

// Sends a push to all of the user's registered devices. Removes dead subscriptions.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0
  ensureConfigured()
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      )
      sent++
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      } else {
        console.error('[push] send error', e?.statusCode, e?.message)
      }
    }
  }
  return sent
}
