import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const password = typeof body?.password === 'string' ? body.password.trim() : ''
  const pass = (process.env.APP_PASSWORD || 'heropathpass').trim()

  if (!password) {
    return res.status(400).json({ ok: false, error: 'missing password' })
  }

  if (password === pass) {
    return res.status(200).json({ ok: true })
  }

  return res.status(401).json({ ok: false, error: 'incorrect password' })
}
