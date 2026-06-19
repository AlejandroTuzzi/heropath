import { useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import dayjs from '../../lib/day'
import type { Dayjs } from 'dayjs'
import { STATUS_COLOR, STATUS_LABEL, pendingDays, isScheduled } from '../../lib/scoring'

const fetcher = (url: string) => fetch(url).then(res => res.json())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'L' }, { value: 2, label: 'M' }, { value: 3, label: 'X' },
  { value: 4, label: 'J' }, { value: 5, label: 'V' }, { value: 6, label: 'S' }, { value: 0, label: 'D' }
]
const WEEK_HEADER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const weekdayNames = (wd: number[]) =>
  WEEKDAY_OPTIONS.filter(o => wd.includes(o.value)).map(o => ({ L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom' }[o.label])).join(', ')

export default function GoalDetail() {
  const router = useRouter()
  const { id } = router.query

  const { data: goal, mutate } = useSWR(id ? `/api/goals/${id}` : null, fetcher)
  const { data: entriesData } = useSWR(id ? `/api/goals/${id}/entry` : null, fetcher)
  const { data: aspirationsData } = useSWR(goal?.userId ? `/api/users/${goal.userId}/aspirations` : null, fetcher)
  const { data: shortcomingsData } = useSWR(goal?.userId ? `/api/users/${goal.userId}/shortcomings` : null, fetcher)
  const entries = Array.isArray(entriesData) ? entriesData : []
  const allAspirations = Array.isArray(aspirationsData) ? aspirationsData : []
  const allShortcomings = Array.isArray(shortcomingsData) ? shortcomingsData : []

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({ title: '', description: '', startDate: '', endDate: '', strictness: 'strict', weekdays: [] as number[], weeklyTarget: 3, aspirationIds: [] as string[], shortcomingIds: [] as string[] })
  const [saving, setSaving] = useState(false)

  if (!goal || goal.error) {
    return <div className="page-shell" style={{ color: '#d8ff36', padding: '40px' }}>Cargando...</div>
  }

  const weekdays: number[] = goal.weekdays && goal.weekdays.length ? goal.weekdays : [0, 1, 2, 3, 4, 5, 6]
  const startDate = dayjs.utc(goal.startDate)
  const endDate = dayjs.utc(goal.endDate)
  const pending = pendingDays(goal, entries)
  const delta = Math.round((goal.score - 100) * 10) / 10
  const linkedAspirations = goal.aspirations || []
  const linkedShortcomings = goal.shortcomings || []
  // user's local "today" (browser timezone) as YYYY-MM-DD, to disable future days
  const todayStr = new Date().toLocaleDateString('en-CA')

  function startEdit() {
    setForm({
      title: goal.title,
      description: goal.description || '',
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      strictness: goal.strictness || 'strict',
      weekdays,
      weeklyTarget: goal.weeklyTarget || 3,
      aspirationIds: linkedAspirations.map((a: any) => a.id),
      shortcomingIds: linkedShortcomings.map((s: any) => s.id)
    })
    setEditing(true)
  }

  const toggle = (key: 'weekdays' | 'aspirationIds' | 'shortcomingIds', v: any) =>
    setForm((f: any) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x: any) => x !== v) : [...f[key], v] }))

  async function saveEdit() {
    if (!form.title || !form.startDate || !form.endDate || form.weekdays.length === 0) {
      alert('Título, fechas y al menos un día son obligatorios')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...form, weeklyTarget: form.strictness === 'rigorous' ? form.weeklyTarget : null })
      })
      if (res.ok) { await mutate(); setEditing(false) }
      else alert('No se pudo guardar la meta')
    } finally {
      setSaving(false)
    }
  }

  async function deleteGoal() {
    if (!confirm('¿Eliminar esta meta? Se borrarán también sus registros.')) return
    const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard')
    else alert('No se pudo eliminar la meta')
  }

  // Build month-by-month grids across the goal's range
  const months: { key: string; first: Dayjs }[] = []
  let m = startDate.startOf('month')
  const lastMonth = endDate.startOf('month')
  while (m.isBefore(lastMonth) || m.isSame(lastMonth, 'month')) {
    months.push({ key: m.format('YYYY-MM'), first: m })
    m = m.add(1, 'month')
  }
  const totalScheduled = months.reduce((acc, mm) => {
    let c = 0
    for (let d = 0; d < mm.first.daysInMonth(); d++) {
      const day = mm.first.date(d + 1)
      if ((day.isAfter(startDate) || day.isSame(startDate, 'day')) && (day.isBefore(endDate) || day.isSame(endDate, 'day')) && isScheduled(day, weekdays)) c++
    }
    return acc + c
  }, 0)

  return (
    <div className="page-shell">
      <section className="page-card">
        <button className="button-ghost" type="button" onClick={() => router.back()} style={{ marginBottom: '18px' }}>← Atrás</button>

        {!editing ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <h1 className="page-heading" style={{ marginBottom: '6px' }}>{goal.title}</h1>
              <p className="page-text" style={{ marginBottom: '8px' }}>{goal.description}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(216,255,54,0.12)', color: '#d8ff36' }}>
                  {goal.strictness === 'rigorous' ? `Rigurosa · ${goal.weeklyTarget || 1}x/sem` : 'Estricta'}
                </span>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(54,243,255,0.12)', color: '#36f3ff' }}>
                  {weekdayNames(weekdays)}
                </span>
              </div>
            </div>
            <div className="button-row" style={{ width: 'auto' }}>
              <button className="button-ghost" type="button" onClick={startEdit}>Editar</button>
              <button className="button-danger" type="button" onClick={deleteGoal}>Eliminar</button>
            </div>
          </div>
        ) : (
          <div>
            <label className="input-label">Título *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <label className="input-label" style={{ marginTop: '14px' }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <label className="input-label" style={{ marginTop: '14px' }}>Tipo</label>
            <div className="button-row">
              <button type="button" onClick={() => setForm({ ...form, strictness: 'strict' })}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: form.strictness === 'strict' ? '2px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff' }}>Estricta</button>
              <button type="button" onClick={() => setForm({ ...form, strictness: 'rigorous' })}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: form.strictness === 'rigorous' ? '2px solid #d8ff36' : '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff' }}>Rigurosa</button>
            </div>

            {form.strictness === 'rigorous' && (
              <>
                <label className="input-label" style={{ marginTop: '14px' }}>Veces por semana</label>
                <input type="number" min={1} max={7} value={form.weeklyTarget} onChange={e => setForm({ ...form, weeklyTarget: parseInt(e.target.value) || 1 })} />
              </>
            )}

            <label className="input-label" style={{ marginTop: '14px' }}>Días de la semana</label>
            <div className="button-row" style={{ gap: '8px' }}>
              {WEEKDAY_OPTIONS.map(d => {
                const active = form.weekdays.includes(d.value)
                return (
                  <button key={d.value} type="button" onClick={() => toggle('weekdays', d.value)}
                    style={{ flex: 1, minWidth: '40px', padding: '12px 0', borderRadius: '10px', fontWeight: 700, border: active ? '2px solid #36f3ff' : '1px solid rgba(255,255,255,0.15)', background: active ? '#36f3ff' : 'transparent', color: active ? '#040404' : '#fff' }}>
                    {d.label}
                  </button>
                )
              })}
            </div>

            <label className="input-label" style={{ marginTop: '14px' }}>Ambiciones vinculadas</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allAspirations.map((asp: any) => {
                const active = form.aspirationIds.includes(asp.id)
                return (
                  <button key={asp.id} type="button" onClick={() => toggle('aspirationIds', asp.id)}
                    style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', border: active ? '2px solid #36f3ff' : '1px solid rgba(255,255,255,0.15)', background: active ? 'rgba(54,243,255,0.12)' : 'transparent', color: '#fff' }}>
                    {active ? '✓ ' : ''}{asp.title}
                  </button>
                )
              })}
            </div>

            <label className="input-label" style={{ marginTop: '14px' }}>Falencias que combate</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allShortcomings.length === 0 && <small style={{ color: 'rgba(255,255,255,0.5)' }}>No tienes falencias registradas.</small>}
              {allShortcomings.map((s: any) => {
                const active = form.shortcomingIds.includes(s.id)
                return (
                  <button key={s.id} type="button" onClick={() => toggle('shortcomingIds', s.id)}
                    style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', border: active ? '2px solid #ff36c4' : '1px solid rgba(255,255,255,0.15)', background: active ? 'rgba(255,54,196,0.12)' : 'transparent', color: '#fff' }}>
                    {active ? '✓ ' : ''}{s.title}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
              <div>
                <label className="input-label">Inicio *</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Conclusión *</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="button-row" style={{ marginTop: '18px' }}>
              <button className="button-primary" type="button" onClick={saveEdit} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              <button className="button-secondary" type="button" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </section>

      <section className="card-grid">
        <div className="card">
          <h3>⭐ Score</h3>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#d8ff36', margin: '4px 0' }}>{goal.score}%</p>
          <small style={{ color: delta >= 0 ? '#4CAF50' : '#F44336' }}>{delta >= 0 ? `+${delta}` : delta} desde 100</small>
        </div>
        <div className="card"><h3>📅 Días programados</h3><p style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{totalScheduled}</p></div>
        <div className="card"><h3>🎯 Categoría</h3><p style={{ fontSize: '16px', color: '#fff' }}>{goal.category?.name || 'General'}</p></div>
      </section>

      {/* AI: link to aspirations */}
      {(linkedAspirations.length > 0 || goal.aspirationLink) && (
        <section className="page-card" style={{ borderColor: 'rgba(54,243,255,0.25)' }}>
          <strong style={{ color: '#36f3ff' }}>🚀 Esta meta te acerca a:</strong>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '10px 0' }}>
            {linkedAspirations.map((a: any) => (
              <span key={a.id} style={{ fontSize: '13px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(54,243,255,0.12)', color: '#36f3ff' }}>{a.title}</span>
            ))}
          </div>
          {goal.aspirationLink && <p className="page-text" style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{goal.aspirationLink}</p>}
        </section>
      )}

      {/* AI: shortcomings this goal fights */}
      {(linkedShortcomings.length > 0 || goal.shortcomingLink) && (
        <section className="page-card" style={{ borderColor: 'rgba(255,54,196,0.25)' }}>
          <strong style={{ color: '#ff36c4' }}>💢 Esta meta combate:</strong>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '10px 0' }}>
            {linkedShortcomings.map((s: any) => (
              <span key={s.id} style={{ fontSize: '13px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(255,54,196,0.12)', color: '#ff36c4' }}>{s.title}</span>
            ))}
          </div>
          {goal.shortcomingLink && <p className="page-text" style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{goal.shortcomingLink}</p>}
        </section>
      )}

      {/* AI: goal tips */}
      {goal.aiAdvice && (
        <section className="page-card">
          <strong style={{ color: '#d8ff36' }}>💡 Consejos para esta meta</strong>
          <p className="page-text" style={{ marginTop: '10px', marginBottom: 0, whiteSpace: 'pre-line', lineHeight: 1.8 }}>{goal.aiAdvice}</p>
        </section>
      )}

      {pending.length > 0 && (
        <section className="page-card" style={{ borderColor: 'rgba(255,193,7,0.3)' }}>
          <h2 className="page-heading" style={{ color: '#FFC107' }}>⏳ Pendientes de informar ({pending.length})</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {pending.map(d => (
              <button key={d} type="button" className="button-ghost"
                onClick={() => router.push(`/update-results?userId=${goal.userId}&date=${d}&goalId=${goal.id}`)}>
                {dayjs.utc(d).format('DD/MM')}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="page-card">
        <h2 className="page-heading">Calendario de progreso</h2>
        {months.map(mm => (
          <div key={mm.key} style={{ marginTop: '18px' }}>
            <h3 style={{ textTransform: 'capitalize', color: '#fff', marginBottom: '10px' }}>{mm.first.format('MMMM YYYY')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {WEEK_HEADER.map((w, i) => (
                <div key={i} style={{ textAlign: 'center', color: '#d8ff36', fontWeight: 700, fontSize: '12px' }}>{w}</div>
              ))}
              {Array.from({ length: (mm.first.day() + 6) % 7 }).map((_, i) => <div key={'b' + i} />)}
              {Array.from({ length: mm.first.daysInMonth() }).map((_, i) => {
                const day = mm.first.date(i + 1)
                const inRange = (day.isAfter(startDate) || day.isSame(startDate, 'day')) && (day.isBefore(endDate) || day.isSame(endDate, 'day'))
                const scheduled = inRange && isScheduled(day, weekdays)
                const isFuture = day.format('YYYY-MM-DD') > todayStr
                if (!scheduled || isFuture) {
                  // non-scheduled OR future days: shown but not clickable
                  return <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{day.format('D')}</div>
                }
                const entry = entries.find((e: any) => dayjs.utc(e.date).isSame(day, 'day'))
                const status = entry?.status || 0
                return (
                  <div key={i}
                    onClick={() => router.push(`/update-results?userId=${goal.userId}&date=${day.format('YYYY-MM-DD')}&goalId=${goal.id}`)}
                    title={`${day.format('DD/MM')}: ${STATUS_LABEL[status]}`}
                    style={{ aspectRatio: '1', background: STATUS_COLOR[status], borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: status === 0 ? 'rgba(255,255,255,0.65)' : '#040404', fontSize: '11px', fontWeight: 600, userSelect: 'none' }}>
                    {day.format('D')}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '18px' }}>
          {[1, 2, 3, 4, 0].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
