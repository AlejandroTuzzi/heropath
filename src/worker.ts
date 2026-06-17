// HeroPath notifications worker.
// Run alongside the app:  npm run worker
// It polls every few minutes and sends each user's 2 daily emails (motivation /
// results request) when their local hour matches their global Setup hours.
import 'dotenv/config'
import { processTick } from './lib/notifications'

const INTERVAL_MS = 5 * 60 * 1000 // every 5 minutes

async function tick() {
  try {
    await processTick()
  } catch (e: any) {
    console.error('[Worker] tick error:', e?.message)
  }
}

console.log('[Worker] HeroPath notifications worker iniciado — revisando cada 5 min.')
console.log('[Worker] Redis:', process.env.REDIS_URL || 'redis://localhost:6379')
tick() // run once on startup (catch up within the current hour)
setInterval(tick, INTERVAL_MS)
