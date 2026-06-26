import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import dayjs from '../lib/day'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Suplicas() {
  const router = useRouter()
  const [userId, setUserId] = useState('')

  const { data } = useSWR(userId ? `/api/suplicas?userId=${userId}` : null, fetcher)
  const list = Array.isArray(data) ? data : []

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) { router.push('/'); return }
    setUserId(id)
  }, [router])

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">🙏 Súplicas</h1>
        <p className="page-text">
          Tus pedidos de auxilio en los momentos de flaqueza, y la respuesta de tu coach. Una súplica se hace
          desde cada meta, cuando estás a punto de recaer.
        </p>

        {list.length === 0 ? (
          <div className="alert">
            Aún no has hecho ninguna súplica. Cuando estés a punto de fallar una meta, entra a ella y pulsa <strong>"Pedir ayuda"</strong>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {list.map((s: any) => (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <button
                    type="button"
                    onClick={() => s.goal && router.push(`/goal/${s.goal.id}`)}
                    style={{ width: 'auto', border: 'none', background: 'transparent', color: '#d8ff36', fontWeight: 700, fontSize: '16px', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {s.goal?.title || 'Meta'}
                  </button>
                  <small style={{ color: '#36f3ff' }}>{dayjs.utc(s.date).format('DD/MM/YYYY')}</small>
                </div>
                {s.situation && (
                  <p style={{ margin: '10px 0 0', fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>“{s.situation}”</p>
                )}
                <div style={{ marginTop: '12px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(216,255,54,0.06)', border: '1px solid rgba(216,255,54,0.18)' }}>
                  <span style={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7 }}>{s.response}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
