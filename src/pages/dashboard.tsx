import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import InfluenceRotator from '../components/InfluenceRotator'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Dashboard() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const { data: goalsData } = useSWR(userId ? `/api/users/${userId}/goals` : null, fetcher)
  const { data: aspirationsData } = useSWR(userId ? `/api/users/${userId}/aspirations` : null, fetcher)

  // Normalize: SWR data is undefined while loading and may be an error object on failure
  const goals = Array.isArray(goalsData) ? goalsData : []
  const aspirations = Array.isArray(aspirationsData) ? aspirationsData : []

  // Categories present in the user's goals, for the filter
  const goalCategories = Array.from(new Set(goals.map((g: any) => g.category?.name).filter(Boolean))).sort()
  const filteredGoals = categoryFilter === 'all' ? goals : goals.filter((g: any) => g.category?.name === categoryFilter)

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) {
      router.push('/')
      return
    }
    setUserId(id)
    loadUser(id)
  }, [])

  async function loadUser(id: string) {
    try {
      const res = await fetch(`/api/users?id=${id}`)
      if (!res.ok) {
        router.push('/')
        return
      }
      setUser(await res.json())
    } catch (e) {
      console.error('Failed to load user', e)
      router.push('/')
    }
  }

  if (!user) return <div style={{ padding: '20px', color: '#d8ff36' }}>Cargando...</div>

  return (
    <div className="page-shell">
      <div className="hero-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <img src="/heropath-logo.png" alt="HeroPath" style={{ height: '52px', width: 'auto', display: 'block', marginBottom: '10px' }} />
            <p className="page-text" style={{ marginBottom: 0 }}>Bienvenido al camino del héroe</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#36f3ff' }}>👋 {user.name && !user.name.includes('@') ? user.name : 'Héroe'}</span>
            <button
              className="button-ghost"
              type="button"
              onClick={() => router.push('/profile')}
            >
              Perfil
            </button>
            <button
              className="button-ghost"
              type="button"
              onClick={() => {
                sessionStorage.clear()
                router.push('/')
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <InfluenceRotator userId={userId} />

      <div className="card-grid">
        <div className="card">
          <h2>Mis Aspiraciones</h2>
          <p>{aspirations?.length || 0} aspiración(es) creada(s)</p>
          <p className="page-text">
            {aspirations?.length === 0
              ? '⚠️ Necesitas crear al menos una aspiración antes de crear metas'
              : '✓ Tienes aspiraciones vinculadas a tus metas'}
          </p>
          <button className="button-primary" type="button" onClick={() => router.push('/aspirations')}>
            Ir a Aspiraciones
          </button>
        </div>

        <div className="card">
          <h2>Acciones Rápidas</h2>
          <div className="button-row" style={{ marginTop: '18px' }}>
            <button
              className="button-primary"
              type="button"
              onClick={() => {
                if (!aspirations?.length) {
                  alert('Debes crear al menos una aspiración primero')
                  router.push('/aspirations')
                } else {
                  router.push('/create-goal')
                }
              }}
            >
              + Crear Nueva Meta
            </button>
            <button className="button-ghost" type="button" onClick={() => router.push('/profile')}>
              Editar Perfil
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Mis Hero Goals ({goals.length})</h2>
          <button className="button-ghost" type="button" onClick={() => router.push('/progreso')}>
            ⭐ Score global: {goals.length ? Math.round((goals.reduce((s: number, g: any) => s + (g.score || 100), 0) / goals.length) * 10) / 10 : 100}% · Ver progreso →
          </button>
        </div>
        {goalCategories.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              style={{ width: 'auto', padding: '7px 14px', borderRadius: '999px', fontSize: '13px',
                border: categoryFilter === 'all' ? '1px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)',
                background: categoryFilter === 'all' ? 'rgba(216,255,54,0.15)' : 'transparent', color: '#fff' }}>
              Todas
            </button>
            {goalCategories.map((c: any) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                style={{ width: 'auto', padding: '7px 14px', borderRadius: '999px', fontSize: '13px',
                  border: categoryFilter === c ? '1px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)',
                  background: categoryFilter === c ? 'rgba(216,255,54,0.15)' : 'transparent', color: '#fff' }}>
                {c}
              </button>
            ))}
          </div>
        )}
        {goals.length === 0 ? (
          <p className="page-text">No tienes metas creadas aún. ¡Crea una para empezar!</p>
        ) : (
          <div className="card-grid" style={{ marginTop: '18px' }}>
            {filteredGoals.map((goal: any) => {
              const now = new Date()
              const isActive = new Date(goal.startDate) <= now && now <= new Date(goal.endDate)
              return (
                <div
                  key={goal.id}
                  className="card"
                  style={{ boxShadow: `inset 4px 0 0 0 ${isActive ? '#d8ff36' : 'rgba(255,255,255,0.16)'}`, display: 'flex', flexDirection: 'column', minWidth: 0 }}
                >
                  <h3>{goal.title}</h3>
                  <p>{goal.description}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(216,255,54,0.12)', color: '#d8ff36' }}>
                      {goal.strictness === 'rigorous' ? `Rigurosa · ${goal.weeklyTarget || 1}x/sem` : 'Estricta'}
                    </span>
                    {(goal.aspirations || []).map((a: any) => (
                      <span key={a.id} style={{ fontSize: '12px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(54,243,255,0.12)', color: '#36f3ff' }}>🎯 {a.title}</span>
                    ))}
                    {(goal.shortcomings || []).map((s: any) => (
                      <span key={s.id} style={{ fontSize: '12px', padding: '3px 9px', borderRadius: '999px', background: 'rgba(255,54,196,0.12)', color: '#ff36c4' }}>💢 {s.title}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', margin: '14px 0', color: 'rgba(255,255,255,0.72)', fontSize: '13px' }}>
                    <span>📅 {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}</span>
                    <span>⭐ {goal.score}%</span>
                  </div>
                  <button
                    className="button-primary"
                    type="button"
                    style={{ marginTop: 'auto' }}
                    onClick={() => router.push(`/goal/${goal.id}`)}
                  >
                    Abrir meta →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
