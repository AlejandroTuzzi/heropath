import dayjs from './day'
import type { Dayjs } from 'dayjs'

// All calendar dates are handled in UTC (see ./day). u() parses any stored
// date as a UTC-mode dayjs so weekday/format/compare are timezone-stable.
const u = (d: string | Date | Dayjs) => dayjs.utc(d as any)
const uNow = () => dayjs.utc()

// Daily report statuses
export const STATUS = {
  NONE: 0,
  DONE: 1,       // Cumplí        (green)
  HALF: 2,       // A medias      (yellow)
  FAIL: 3,       // Fallé         (red)
  EXCEPTION: 4   // Excepción 0%  (cyan)
} as const

export const STATUS_LABEL: Record<number, string> = {
  0: 'Sin registrar',
  1: 'Cumplido',
  2: 'A medias',
  3: 'Fallado',
  4: 'Excepción'
}

export const STATUS_COLOR: Record<number, string> = {
  0: 'rgba(255,255,255,0.10)',
  1: '#4CAF50',
  2: '#FFC107',
  3: '#F44336',
  4: '#36f3ff'
}

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export interface GoalLike {
  startDate: string | Date
  endDate: string | Date
  strictness?: string | null
  weekdays?: number[] | null
  weeklyTarget?: number | null
}
export interface EntryLike {
  date: string | Date
  status: number
}

function wd(goal: GoalLike): number[] {
  return goal.weekdays && goal.weekdays.length ? goal.weekdays : ALL_WEEKDAYS
}

export function isScheduled(date: Dayjs, weekdays: number[]): boolean {
  return weekdays.includes(date.day()) // dayjs day(): 0=Sun..6=Sat
}

// Count scheduled occurrences from start through `date` (inclusive)
export function occurrenceIndex(start: Dayjs, date: Dayjs, weekdays: number[]): number {
  let count = 0
  let d = start.startOf('day')
  const end = date.startOf('day')
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    if (weekdays.includes(d.day())) count++
    d = d.add(1, 'day')
  }
  return count
}

// Monday of the week for a given date (Mon–Sun weeks)
function weekStart(date: Dayjs): Dayjs {
  return date.startOf('day').subtract((date.day() + 6) % 7, 'day')
}

// Scheduled days the goal actually had in the Mon–Sun week starting at weekStartD
function scheduledDaysInWeek(weekStartD: Dayjs, goal: GoalLike): number {
  const days = wd(goal)
  const gStart = u(goal.startDate).startOf('day')
  const gEnd = u(goal.endDate).startOf('day')
  let count = 0
  for (let i = 0; i < 7; i++) {
    const d = weekStartD.add(i, 'day')
    if (!days.includes(d.day())) continue
    if (d.isBefore(gStart) || d.isAfter(gEnd)) continue
    count++
  }
  return count
}

// A week is only scored if the goal was active the FULL Mon–Sun and there were
// enough scheduled days to fairly meet the target. Partial weeks (the goal
// started/ended mid-week) are neutral — they neither add nor subtract.
function weekCounts(weekStartD: Dayjs, goal: GoalLike, target: number): boolean {
  const weekEnd = weekStartD.add(6, 'day')
  const gStart = u(goal.startDate).startOf('day')
  const gEnd = u(goal.endDate).startOf('day')
  if (weekStartD.isBefore(gStart) || weekEnd.isAfter(gEnd)) return false
  return scheduledDaysInWeek(weekStartD, goal) >= target
}

const round1 = (n: number) => Math.round(n * 10) / 10

// ---- STRICT: per scheduled day. Done +1, Half +0.5, Exception 0, Fail -(occurrence index) ----
export function strictScore(goal: GoalLike, entries: EntryLike[]): number {
  const start = u(goal.startDate)
  const days = wd(goal)
  let score = 100
  for (const e of entries) {
    const date = u(e.date)
    if (!days.includes(date.day())) continue
    if (e.status === STATUS.DONE) score += 1
    else if (e.status === STATUS.HALF) score += 0.5
    else if (e.status === STATUS.FAIL) score -= occurrenceIndex(start, date, days)
    // EXCEPTION / NONE => 0
  }
  return round1(score)
}

// ---- RIGOROUS: per fully-elapsed week. (Done + 0.5*Half) >= weeklyTarget => +1 else -1 ----
export function rigorousScore(goal: GoalLike, entries: EntryLike[], now: Dayjs = uNow()): number {
  const days = wd(goal)
  const target = goal.weeklyTarget || 1
  const currentWeek = weekStart(now).format('YYYY-MM-DD')

  const buckets = new Map<string, number>()
  for (const e of entries) {
    const date = u(e.date)
    if (!days.includes(date.day())) continue
    const key = weekStart(date).format('YYYY-MM-DD')
    if (key === currentWeek) continue // current week is provisional, not yet scored
    let credit = 0
    if (e.status === STATUS.DONE) credit = 1
    else if (e.status === STATUS.HALF) credit = 0.5
    buckets.set(key, (buckets.get(key) || 0) + credit)
  }

  let score = 100
  for (const [key, credit] of buckets.entries()) {
    if (!weekCounts(u(key), goal, target)) continue // partial week — neutral
    score += credit >= target ? 1 : -1
  }
  return round1(score)
}

export function computeScore(goal: GoalLike, entries: EntryLike[], now: Dayjs = uNow()): number {
  return goal.strictness === 'rigorous'
    ? rigorousScore(goal, entries, now)
    : strictScore(goal, entries)
}

// Past scheduled days (before today) without a report — "pendientes"
export function pendingDays(goal: GoalLike, entries: EntryLike[], now: Dayjs = uNow()): string[] {
  const days = wd(goal)
  const start = u(goal.startDate).startOf('day')
  const end = u(goal.endDate).startOf('day')
  const today = now.startOf('day')
  const reported = new Set(entries.filter(e => e.status !== STATUS.NONE).map(e => u(e.date).format('YYYY-MM-DD')))
  const pend: string[] = []
  let d = start
  while (d.isBefore(today) && (d.isBefore(end) || d.isSame(end, 'day'))) {
    const key = d.format('YYYY-MM-DD')
    if (days.includes(d.day()) && !reported.has(key)) pend.push(key)
    d = d.add(1, 'day')
  }
  return pend
}

// Cumulative score points for charts
export function scoreSeries(goal: GoalLike, entries: EntryLike[], now: Dayjs = uNow()): { label: string; score: number }[] {
  const series = [{ label: 'Inicio', score: 100 }]
  const byDate = new Map(entries.map(e => [u(e.date).format('YYYY-MM-DD'), e.status]))

  if (goal.strictness === 'rigorous') {
    const sub = rigorousSeries(goal, entries, now)
    return [series[0], ...sub]
  }

  const start = u(goal.startDate).startOf('day')
  const days = wd(goal)
  let score = 100
  let d = start
  const today = now.startOf('day')
  while (d.isBefore(today) || d.isSame(today, 'day')) {
    if (days.includes(d.day())) {
      const status = byDate.get(d.format('YYYY-MM-DD'))
      if (status === STATUS.DONE) score += 1
      else if (status === STATUS.HALF) score += 0.5
      else if (status === STATUS.FAIL) score -= occurrenceIndex(start, d, days)
      if (status !== undefined && status !== STATUS.NONE) {
        series.push({ label: d.format('DD/MM'), score: round1(score) })
      }
    }
    d = d.add(1, 'day')
  }
  return series
}

function rigorousSeries(goal: GoalLike, entries: EntryLike[], now: Dayjs): { label: string; score: number }[] {
  const days = wd(goal)
  const target = goal.weeklyTarget || 1
  const currentWeek = weekStart(now).format('YYYY-MM-DD')
  const buckets = new Map<string, number>()
  for (const e of entries) {
    const date = u(e.date)
    if (!days.includes(date.day())) continue
    const key = weekStart(date).format('YYYY-MM-DD')
    if (key === currentWeek) continue
    let credit = 0
    if (e.status === STATUS.DONE) credit = 1
    else if (e.status === STATUS.HALF) credit = 0.5
    buckets.set(key, (buckets.get(key) || 0) + credit)
  }
  const out: { label: string; score: number }[] = []
  let score = 100
  for (const key of Array.from(buckets.keys()).sort()) {
    if (!weekCounts(u(key), goal, target)) continue
    score += (buckets.get(key) || 0) >= target ? 1 : -1
    out.push({ label: 'Sem ' + u(key).format('DD/MM'), score: round1(score) })
  }
  return out
}
