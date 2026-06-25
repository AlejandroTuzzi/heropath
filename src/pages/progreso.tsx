import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import dayjs from '../lib/day'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ReferenceLine, Cell
} from 'recharts'
import { scoreSeries, pendingDays } from '../lib/scoring'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const tooltipStyle = {
  background: '#0c0c0c',
  border: '1px solid rgba(216,255,54,0.25)',
  borderRadius: '10px',
  color: '#fff'
}

// Monday of the week for a UTC date
const weekStart = (d: any) => d.subtract((d.day() + 6) % 7, 'day')

function BreakdownRow({ label, value, signed, color, widthPct }: { label: string; value: number; signed: boolean; color: string; widthPct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '38%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{label}</div>
      <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: '6px' }} />
      </div>
      <div style={{ width: '60px', textAlign: 'right', color, fontWeight: 700 }}>
        {signed && value >= 0 ? `+${value}` : value}%
      </div>
    </div>
  )
}

export default function Progreso() {
  const router = useRouter()
  const [userId, setUserId] = useState('')

  const { data: goalsData } = useSWR(userId ? `/api/users/${userId}/goals` : null, fetcher)
  const { data: feedbackData } = useSWR(userId ? `/api/feedback?userId=${userId}` : null, fetcher)
  const goals = Array.isArray(goalsData) ? goalsData : []
  const history = Array.isArray(feedbackData) ? feedbackData : []

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) { router.push('/'); return }
    setUserId(id)
  }, [])

  // Global score = base 100% + the accumulated progress of every goal (additive, can exceed 100%)
  const contributions = goals.map((g: any) => ({
    id: g.id,
    title: g.title,
    delta: Math.round(((g.score || 100) - 100) * 10) / 10
  }))
  const globalScore = Math.round((100 + contributions.reduce((s: number, c: any) => s + c.delta, 0)) * 10) / 10
  const maxAbs = Math.max(1, ...contributions.map((c: any) => Math.abs(c.delta)))

  const barData = goals.map((g: any) => ({ name: g.title.length > 14 ? g.title.slice(0, 13) + '…' : g.title, score: g.score, fill: g.score >= 100 ? '#4CAF50' : '#F44336' }))

  const allPending = goals.flatMap((g: any) =>
    pendingDays(g, g.entries || []).map(d => ({ goalId: g.id, title: g.title, date: d, userId: g.userId }))
  ).sort((a, b) => (a.date < b.date ? 1 : -1))

  // Group the history by week (most recent first); the latest week starts expanded
  const weekGroups = (() => {
    const groups = new Map<string, any[]>()
    for (const f of history) {
      const key = weekStart(dayjs.utc(f.date)).format('YYYY-MM-DD')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, msgs]) => ({ key, start: dayjs.utc(key), msgs }))
  })()

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">Mi Progreso</h1>
        <p className="page-text">Tu evolución global y el detalle por meta. Todo arranca en 100% y crece con tu constancia.</p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ fontSize: '52px', fontWeight: 800, color: globalScore >= 100 ? '#d8ff36' : '#ff36c4', lineHeight: 1 }}>
              {globalScore}%
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>Score global (suma)</div>
          </div>

          <div style={{ flex: 1, minWidth: '300px', height: '220px' }}>
            {goals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <ReferenceLine y={100} stroke="#36f3ff" strokeDasharray="4 4" />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="alert">Crea metas para ver tu progreso aquí.</div>
            )}
          </div>
        </div>
      </section>

      {goals.length > 0 && (
        <section className="page-card">
          <h2 className="page-heading">Desglose del score</h2>
          <p className="page-text">Tu score global es la <strong>suma</strong> de la base (100%) más el avance acumulado de cada meta.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <BreakdownRow label="Base" value={100} signed={false} color="#36f3ff" widthPct={100} />
            {contributions.map((c: any) => (
              <BreakdownRow
                key={c.id}
                label={c.title}
                value={c.delta}
                signed
                color={c.delta >= 0 ? '#4CAF50' : '#F44336'}
                widthPct={Math.max(4, (Math.abs(c.delta) / maxAbs) * 100)}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '16px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ color: '#fff' }}>Total</strong>
            <strong style={{ color: globalScore >= 100 ? '#d8ff36' : '#ff36c4', fontSize: '20px' }}>{globalScore}%</strong>
          </div>
        </section>
      )}

      {allPending.length > 0 && (
        <section className="page-card" style={{ borderColor: 'rgba(255,193,7,0.3)' }}>
          <h2 className="page-heading" style={{ color: '#FFC107' }}>⏳ Pendientes de informar ({allPending.length})</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allPending.slice(0, 30).map((p, i) => (
              <button key={i} type="button" className="button-ghost"
                onClick={() => router.push(`/update-results?userId=${p.userId}&date=${p.date}&goalId=${p.goalId}`)}>
                {dayjs.utc(p.date).format('DD/MM')} · {p.title.length > 16 ? p.title.slice(0, 15) + '…' : p.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {goals.length > 0 && (
        <section className="page-card">
          <h2 className="page-heading">Evolución por meta</h2>
          <div className="card-grid">
            {goals.map((g: any) => {
              const series = scoreSeries(g, g.entries || [])
              return (
                <div key={g.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <h3 style={{ marginBottom: 0 }}>{g.title}</h3>
                    <span style={{ color: g.score >= 100 ? '#4CAF50' : '#F44336', fontWeight: 700 }}>{g.score}%</span>
                  </div>
                  <small style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {g.strictness === 'rigorous' ? `Rigurosa · ${g.weeklyTarget || 1}x/sem` : 'Estricta'}
                  </small>
                  <div style={{ height: '160px', marginTop: '12px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} domain={['dataMin - 3', 'dataMax + 3']} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <ReferenceLine y={100} stroke="#36f3ff" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="score" stroke="#d8ff36" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="page-card">
        <h2 className="page-heading">Registro histórico</h2>
        {history.length === 0 ? (
          <p className="page-text" style={{ marginBottom: 0 }}>Aún no hay mensajes. Aparecerán aquí cada vez que registres tus resultados del día.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {weekGroups.map((wk, idx) => (
              <details key={wk.key} open={idx === 0} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
                <summary style={{ cursor: 'pointer', color: '#d8ff36', fontWeight: 700, listStyle: 'none' }}>
                  Semana del {wk.start.format('DD/MM')} – {wk.start.add(6, 'day').format('DD/MM/YYYY')} · {wk.msgs.length} mensaje(s)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {wk.msgs.map((f: any) => (
                    <div key={f.id} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <small style={{ color: '#36f3ff' }}>{dayjs.utc(f.date).format('DD/MM/YYYY')}</small>
                      <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{f.message}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
