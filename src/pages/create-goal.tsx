import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

// value = JS getDay() (0=Sun..6=Sat); displayed Mon-first
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' },
  { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' }, { value: 0, label: 'D' }
]

export default function CreateGoal() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    categoryName: ''
  })
  const [strictness, setStrictness] = useState<'strict' | 'rigorous'>('strict')
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [weeklyTarget, setWeeklyTarget] = useState<number>(3)
  const [submitting, setSubmitting] = useState(false)

  function toggleWeekday(v: number) {
    setWeekdays(prev => (prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]))
  }

  const { data: aspirations } = useSWR(
    userId ? `/api/users/${userId}/aspirations` : null,
    fetcher
  )
  const { data: categories } = useSWR('/api/categories', fetcher)

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) {
      router.push('/')
      return
    }
    setUserId(id)
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!formData.title || !formData.startDate || !formData.endDate) {
      alert('Por favor completa título y fechas')
      return
    }
    if (!aspirations?.length) {
      alert('Necesitas al menos una aspiración antes de crear una meta.')
      return
    }
    if (weekdays.length === 0) {
      alert('Elige al menos un día de la semana para la meta.')
      return
    }

    setSubmitting(true)
    try {
      // Create or get category
      const categoryRes = await fetch('/api/categories', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: formData.categoryName.trim() || 'General' })
      })
      if (!categoryRes.ok) {
        alert('Error al crear/obtener la categoría')
        return
      }
      const category = await categoryRes.json()

      // Create goal
      const goalRes = await fetch('/api/goals', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          userId,
          title: formData.title,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          categoryId: category.id,
          strictness,
          weekdays,
          weeklyTarget: strictness === 'rigorous' ? weeklyTarget : null
        })
      })

      if (goalRes.ok) {
        const created = await goalRes.json()
        alert('¡Meta creada! La IA preparó tus consejos. 🎉')
        router.push(`/goal/${created.id}`)
      } else {
        const err = await goalRes.json().catch(() => ({}))
        alert(`Error al crear meta: ${err.error || 'desconocido'}`)
      }
    } catch (e) {
      console.error('Error creating goal', e)
      alert('Error al crear meta')
    } finally {
      setSubmitting(false)
    }
  }

  const noAspirations = aspirations && aspirations.length === 0

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">Crear Nueva Meta</h1>
        <p className="page-text">
          Las metas son objetivos alcanzables que te acercan a tus aspiraciones. Los horarios de los
          correos (motivación y cierre) se configuran de forma global en <strong>Setup</strong>.
        </p>

        {noAspirations && (
          <div className="alert" style={{ marginBottom: '20px' }}>
            Necesitas crear al menos una aspiración antes de poder crear una meta.{' '}
            <a href="/aspirations" style={{ color: '#36f3ff' }}>Crear una aspiración →</a>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Título de la meta *</label>
            <input
              type="text"
              placeholder="Ej: Escribir una idea de negocio por día"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Descripción</label>
            <textarea
              placeholder="Describe tu meta"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Categoría</label>
            <input
              type="text"
              placeholder="General"
              list="category-options"
              value={formData.categoryName}
              onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
            />
            <datalist id="category-options">
              {categories?.map((c: any) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <p style={{ fontSize: '12px', color: '#36f3ff', marginTop: '6px' }}>
              Escribe una nueva o elige una existente. Por defecto: General.{' '}
              <a href="/categories" style={{ color: '#d8ff36' }}>Gestionar categorías →</a>
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
            <div>
              <label className="input-label">Fecha de inicio *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Fecha de conclusión *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Tipo de meta</label>
            <div className="button-row">
              <button
                type="button"
                onClick={() => setStrictness('strict')}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'left',
                  border: strictness === 'strict' ? '2px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)',
                  background: strictness === 'strict' ? 'rgba(216,255,54,0.1)' : 'transparent', color: '#fff'
                }}
              >
                <strong>Estricta</strong><br />
                <small style={{ color: 'rgba(255,255,255,0.65)' }}>Día a día. Fallar penaliza más cuanto más avanzas.</small>
              </button>
              <button
                type="button"
                onClick={() => setStrictness('rigorous')}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'left',
                  border: strictness === 'rigorous' ? '2px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)',
                  background: strictness === 'rigorous' ? 'rgba(216,255,54,0.1)' : 'transparent', color: '#fff'
                }}
              >
                <strong>Rigurosa</strong><br />
                <small style={{ color: 'rgba(255,255,255,0.65)' }}>Promedio semanal. Cumple X veces por semana.</small>
              </button>
            </div>
          </div>

          {strictness === 'rigorous' && (
            <div style={{ marginBottom: '18px' }}>
              <label className="input-label">Veces por semana (objetivo)</label>
              <input
                type="number" min={1} max={7}
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Días de la semana</label>
            <div className="button-row" style={{ gap: '8px' }}>
              {WEEKDAY_OPTIONS.map(d => {
                const active = weekdays.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekday(d.value)}
                    style={{
                      flex: 1, minWidth: '40px', padding: '12px 0', borderRadius: '10px', fontWeight: 700,
                      border: active ? '2px solid #36f3ff' : '1px solid rgba(255,255,255,0.15)',
                      background: active ? '#36f3ff' : 'transparent', color: active ? '#040404' : '#fff'
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div
            style={{
              padding: '16px', borderRadius: '14px', marginBottom: '18px',
              background: 'rgba(54,243,255,0.08)', border: '1px solid rgba(54,243,255,0.2)'
            }}
          >
            <strong style={{ color: '#36f3ff' }}>🤖 Vínculos automáticos</strong>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '14px' }}>
              Al crear la meta, la IA elegirá (hasta 2 de cada una) qué <strong>ambiciones impulsa</strong> y qué{' '}
              <strong>falencias combate</strong>, y explicará por qué. Podrás ajustarlo luego desde la meta.
            </p>
          </div>

          <div className="button-row">
            <button className="button-primary" type="submit" disabled={submitting || noAspirations}>
              {submitting ? 'Creando y generando consejos…' : 'Crear Meta'}
            </button>
            <button className="button-secondary" type="button" onClick={() => router.push('/dashboard')}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
