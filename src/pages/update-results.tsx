import { useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import dayjs from 'dayjs'

const fetcher = (url: string) => fetch(url).then(res => res.json())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const OPTIONS = [
  { value: 1, label: '✓ Cumplí', color: '#4CAF50' },
  { value: 2, label: '◐ A medias', color: '#FFC107' },
  { value: 3, label: '✗ Fallé', color: '#F44336' },
  { value: 4, label: '⊘ Excepción', color: '#36f3ff' }
]

export default function UpdateResults() {
  const router = useRouter()
  const { userId, date, goalId } = router.query

  const { data: goalsData, isLoading } = useSWR(
    userId ? `/api/users/${userId}/goals` : null,
    fetcher
  )

  const [results, setResults] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')

  const allGoals = Array.isArray(goalsData) ? goalsData : []
  const dayObj = typeof date === 'string' ? dayjs(date) : dayjs()
  const weekday = dayObj.day() // 0=Sun..6=Sat
  // Only goals scheduled this weekday and active on this date
  const scheduled = allGoals.filter((g: any) => {
    const days = g.weekdays && g.weekdays.length ? g.weekdays : [0, 1, 2, 3, 4, 5, 6]
    const inRange = (dayObj.isAfter(dayjs(g.startDate)) || dayObj.isSame(dayjs(g.startDate), 'day')) &&
      (dayObj.isBefore(dayjs(g.endDate)) || dayObj.isSame(dayjs(g.endDate), 'day'))
    return days.includes(weekday) && inRange
  })
  // If a single goalId is passed (clicked a calendar cell), focus only that goal
  const goals = goalId ? scheduled.filter((g: any) => g.id === goalId) : scheduled
  const dayLabel = dayObj.format('DD/MM/YYYY')

  async function handleSubmit() {
    const chosen = Object.entries(results)
    if (chosen.length === 0) {
      alert('Selecciona al menos un resultado')
      return
    }
    setSubmitting(true)
    try {
      const responses = await Promise.all(
        chosen.map(([gId, status]) =>
          fetch(`/api/goals/${gId}/entry`, {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ date, status })
          })
        )
      )
      if (responses.some(r => !r.ok)) {
        alert('Algunos resultados no se pudieron guardar. Intenta de nuevo.')
        return
      }
      // Ask the AI for one combined message (congrats / encouragement) for the day
      try {
        const fb = await fetch('/api/feedback', {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ userId, date })
        })
        const fbData = await fb.json()
        setFeedback(fbData.message || '')
      } catch {
        setFeedback('')
      }
    } catch (e) {
      console.error(e)
      alert('Error al actualizar resultados')
    } finally {
      setSubmitting(false)
    }
  }

  if (!userId) return <div className="page-shell" style={{ color: '#d8ff36', padding: '40px' }}>Cargando...</div>
  if (isLoading) return <div className="page-shell" style={{ color: '#d8ff36', padding: '40px' }}>Cargando tus metas...</div>

  if (feedback) {
    return (
      <div className="page-shell">
        <section className="page-card">
          <h1 className="page-heading">¡Resultados guardados! 🎉</h1>
          <div
            style={{
              padding: '18px',
              borderRadius: '14px',
              background: 'rgba(216,255,54,0.08)',
              border: '1px solid rgba(216,255,54,0.25)',
              marginBottom: '20px'
            }}
          >
            <strong style={{ color: '#d8ff36', display: 'block', marginBottom: '8px' }}>Tu coach dice:</strong>
            <span style={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>{feedback}</span>
          </div>
          <div className="button-row">
            <button className="button-primary" type="button" onClick={() => router.push('/progreso')}>Ver mi progreso</button>
            <button className="button-secondary" type="button" onClick={() => router.push('/dashboard')}>Ir a Metas</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">¿Cómo te ha ido?</h1>
        <p className="page-text">
          Recuerda actualizar tu resultado de <strong>{dayLabel}</strong>. Marca cómo te fue en cada meta.
        </p>

        {goals.length === 0 ? (
          <div className="alert">No hay metas activas para registrar.</div>
        ) : (
          goals.map((goal: any) => (
            <div key={goal.id} className="card" style={{ marginBottom: '18px' }}>
              <h3>{goal.title}</h3>
              {goal.description && <p>{goal.description}</p>}
              <div className="button-row" style={{ marginTop: '14px' }}>
                {OPTIONS.map(opt => {
                  const active = results[goal.id] === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResults({ ...results, [goal.id]: opt.value })}
                      style={{
                        flex: 1,
                        minWidth: '120px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: active ? `2px solid ${opt.color}` : '1px solid rgba(255,255,255,0.15)',
                        background: active ? opt.color : 'transparent',
                        color: active ? '#040404' : '#fff',
                        fontWeight: active ? 700 : 400
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {goals.length > 0 && (
          <button className="button-primary" type="button" onClick={handleSubmit} disabled={submitting} style={{ marginTop: '8px' }}>
            {submitting ? 'Guardando...' : 'Guardar resultados'}
          </button>
        )}
      </section>
    </div>
  )
}
