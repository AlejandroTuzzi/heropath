import { NextApiRequest, NextApiResponse } from 'next'
import { getPublicKey } from '../../../lib/push'

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ publicKey: getPublicKey() })
}
