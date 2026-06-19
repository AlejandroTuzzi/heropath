import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import dayjs from '../lib/day'
import type { Dayjs } from 'dayjs'

const fetcher = (url: string) => fetch(url).then(res => res.json())

const STATUS_COLOR: Record<number, string> = {
  1: '#4CAF50', // cumplido
  2: '#FFC107', // a medias
  3: '#F44336', // fallado
  4: '#36f3ff'  // excepción
}
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarPage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [month, setMonth] = useState<Dayjs>(dayjs.utc().startOf('month'))

  const { data: goalsData } = useSWR(userId ? `/api/users/${userId}/goals` : null, fetcher)
  const goals = Array.isArray(goalsData) ? goalsData : []

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) {
      router.push('/')
      return
    }
    setUserId(id)
  }, [])

  // Build the grid: weeks starting Monday
  const startOfMonth = month.startOf('month')
  const daysInMonth = month.daysInMonth()
  // dayjs: Sunday=0..Saturday=6 -> convert to Monday-based offset
  const leadingBlanks = (startOfMonth.day() + 6) % 7

  const cells: (Dayjs | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(startOfMonth.date(d))
  while (cells.length % 7 !== 0) cells.push(null)

  // For a given day, return the active goals + their status that day
  function goalsForDay(day: Dayjs) {
    return goals
      .filter((g: any) => {
        const start = dayjs.utc(g.startDate).startOf('day')
        const end = dayjs.utc(g.endDate).endOf('day')
        const days = g.weekdays && g.weekdays.length ? g.weekdays : [0, 1, 2, 3, 4, 5, 6]
        const inRange = (day.isAfter(start) || day.isSame(start, 'day')) && (day.isBefore(end) || day.isSame(end, 'day'))
        return inRange && days.includes(day.day())
      })
      .map((g: any) => {
        const entry = (g.entries || []).find((e: any) => dayjs.utc(e.date).isSame(day, 'day'))
        return { goal: g, status: entry?.status || 0 }
      })
  }

  const today = dayjs.utc()
  const todayStr = new Date().toLocaleDateString('en-CA') // user's local today (YYYY-MM-DD)

  return (
    <div className="page-shell">
      <section className="page-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="page-heading" style={{ marginBottom: 0 }}>Calendario</h1>
          <div className="button-row" style={{ width: 'auto' }}>
            <button className="button-ghost" type="button" onClick={() => setMonth(month.subtract(1, 'month'))}>← Mes anterior</button>
            <button className="button-ghost" type="button" onClick={() => setMonth(dayjs.utc().startOf('month'))}>Hoy</button>
            <button className="button-ghost" type="button" onClick={() => setMonth(month.add(1, 'month'))}>Mes siguiente →</button>
          </div>
        </div>
        <p className="page-text" style={{ marginTop: '12px', textTransform: 'capitalize' }}>
          {month.format('MMMM YYYY')}
        </p>

        {goals.length === 0 ? (
          <div className="alert">Aún no tienes metas. Crea una para verla reflejada en el calendario.</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {WEEKDAYS.map(w => (
                <div key={w} style={{ textAlign: 'center', color: '#d8ff36', fontWeight: 700, fontSize: '13px', padding: '6px 0' }}>{w}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dayGoals = goalsForDay(day)
                const isToday = day.isSame(today, 'day')
                const isFuture = day.format('YYYY-MM-DD') > todayStr
                const clickable = dayGoals.length > 0 && !isFuture
                return (
                  <div
                    key={i}
                    onClick={() => clickable && router.push(`/update-results?userId=${userId}&date=${day.format('YYYY-MM-DD')}`)}
                    style={{
                      minHeight: '78px',
                      borderRadius: '12px',
                      border: isToday ? '1px solid #36f3ff' : '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '8px',
                      cursor: clickable ? 'pointer' : 'default',
                      opacity: isFuture ? 0.4 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                    title={isFuture ? 'Día futuro' : (dayGoals.length ? `${dayGoals.length} meta(s) — clic para registrar` : '')}
                  >
                    <span style={{ fontSize: '12px', color: isToday ? '#36f3ff' : 'rgba(255,255,255,0.6)', fontWeight: isToday ? 700 : 400 }}>
                      {day.format('D')}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {dayGoals.map(({ goal, status }: any) => (
                        <span
                          key={goal.id}
                          title={`${goal.title}: ${['Sin registrar', 'Cumplido', 'A medias', 'Fallado', 'Excepción'][status]}`}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: status === 0 ? 'transparent' : STATUS_COLOR[status],
                            border: status === 0 ? '1px solid rgba(255,255,255,0.35)' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '20px' }}>
              {[
                { c: STATUS_COLOR[1], l: 'Cumplido' },
                { c: STATUS_COLOR[2], l: 'A medias' },
                { c: STATUS_COLOR[3], l: 'Fallado' },
                { c: STATUS_COLOR[4], l: 'Excepción' },
                { c: 'transparent', l: 'Sin registrar', border: true }
              ].map(item => (
                <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.c, border: item.border ? '1px solid rgba(255,255,255,0.35)' : 'none' }} />
                  {item.l}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
