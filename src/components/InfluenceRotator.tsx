import { useState, useEffect, useCallback } from 'react'

const GENDER_ICON: Record<string, string> = { hombre: '👨', mujer: '👩', otro: '🧑', neutral: '🧑' }

interface RotatingMessage {
  message: string | null
  influence?: { name: string; gender: string; type: string; relationship: string }
}

export default function InfluenceRotator({ userId }: { userId: string }) {
  const [data, setData] = useState<RotatingMessage | null>(null)

  const fetchOne = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/influences/rotating-message?userId=${userId}`)
      const json = await res.json()
      if (json?.message) setData(json)
    } catch {
      /* ignore — non-critical */
    }
  }, [userId])

  useEffect(() => {
    fetchOne()
    const t = setInterval(fetchOne, 22000) // rotate every ~22s
    return () => clearInterval(t)
  }, [fetchOne])

  if (!data?.message || !data.influence) return null

  const shadow = data.influence.type === 'shadow'
  const accent = shadow ? '#9b8cff' : '#ffb347'
  const bg = shadow ? 'rgba(120,100,200,0.10)' : 'rgba(255,170,60,0.10)'

  return (
    <div
      onClick={fetchOne}
      title="Toca para otra"
      style={{
        borderRadius: '20px',
        border: `1px solid ${accent}55`,
        background: bg,
        padding: '18px 22px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        cursor: 'pointer'
      }}
    >
      <span style={{ fontSize: '34px', lineHeight: 1 }}>{GENDER_ICON[data.influence.gender] || '🧑'}</span>
      <div>
        <div style={{ fontSize: '13px', color: accent, fontWeight: 700, marginBottom: '4px' }}>
          {data.influence.name} · {shadow ? '🌑 Sombra' : '🔥 Antorcha'}
        </div>
        <div style={{ color: '#fff', fontSize: '15px', lineHeight: 1.5 }}>{data.message}</div>
      </div>
    </div>
  )
}
