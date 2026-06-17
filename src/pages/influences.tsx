import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const GENDER_ICON: Record<string, string> = { hombre: '👨', mujer: '👩', otro: '🧑', neutral: '🧑' }
const GENDERS = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'neutral', label: 'Neutral' }
]
const empty = { name: '', gender: 'neutral', relationship: '', type: 'shadow', description: '' }

export default function Influences() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [form, setForm] = useState<any>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: influences, mutate } = useSWR(userId ? `/api/influences?userId=${userId}` : null, fetcher)

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) { router.push('/'); return }
    setUserId(id)
  }, [router])

  function resetForm() { setForm(empty); setEditingId(null); setError('') }

  async function save() {
    if (!form.name || !form.relationship || !form.description) {
      setError('Completa nombre, relación y descripción')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const url = editingId ? `/api/influences/${editingId}` : '/api/influences'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify({ ...form, userId }) })
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b?.error || 'No se pudo guardar'); return }
      resetForm()
      await mutate()
      if (!editingId) alert('¡Influencia registrada! La IA generó mensajes asociados.')
    } catch (e) {
      console.error(e); setError('Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  function editInfluence(inf: any) {
    setForm({ name: inf.name, gender: inf.gender, relationship: inf.relationship, type: inf.type, description: inf.description })
    setEditingId(inf.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta influencia y sus mensajes?')) return
    const res = await fetch(`/api/influences/${id}`, { method: 'DELETE' })
    if (res.ok) await mutate()
  }

  async function regenerate(id: string) {
    const res = await fetch(`/api/influences/${id}/generate-messages`, { method: 'POST' })
    if (res.ok) await mutate()
  }

  const isShadow = form.type === 'shadow'

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">{editingId ? 'Editar Influencia' : 'Mis Influencias'}</h1>
        <p className="page-text">
          Las personas cercanas que afectan tu camino. Las <strong>Sombras</strong> dudan o critican (su duda se vuelve tu disciplina);
          las <strong>Antorchas</strong> creen en ti (su confianza se vuelve impulso).
        </p>

        <label className="input-label">Nombre</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Cristóbal" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
          <div>
            <label className="input-label">Género (icono)</label>
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{GENDER_ICON[g.value]} {g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Relación</label>
            <input value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} placeholder="mi mejor amigo, mi madre…" />
          </div>
        </div>

        <label className="input-label" style={{ marginTop: '14px' }}>Tipo</label>
        <div className="button-row">
          <button type="button" onClick={() => setForm({ ...form, type: 'shadow' })}
            style={{ flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'left', color: '#fff',
              border: isShadow ? '2px solid #9b8cff' : '1px solid rgba(255,255,255,0.15)', background: isShadow ? 'rgba(120,100,200,0.15)' : 'transparent' }}>
            🌑 <strong>Sombra</strong><br /><small style={{ color: 'rgba(255,255,255,0.65)' }}>Duda, critica o recuerda fracasos</small>
          </button>
          <button type="button" onClick={() => setForm({ ...form, type: 'torch' })}
            style={{ flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'left', color: '#fff',
              border: !isShadow ? '2px solid #ffb347' : '1px solid rgba(255,255,255,0.15)', background: !isShadow ? 'rgba(255,170,60,0.15)' : 'transparent' }}>
            🔥 <strong>Antorcha</strong><br /><small style={{ color: 'rgba(255,255,255,0.65)' }}>Cree, impulsa y ve tu potencial</small>
          </button>
        </div>

        <label className="input-label" style={{ marginTop: '14px' }}>Descripción</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="¿Cómo se manifiesta esta influencia? Ej: cada vez que le cuento un intento de mejora, bromea con las veces que ya fallé." />

        {error && <div className="alert" style={{ marginTop: '14px' }}>{error}</div>}

        <div className="button-row" style={{ marginTop: '16px' }}>
          <button className="button-primary" onClick={save} disabled={submitting}>
            {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear Influencia'}
          </button>
          <button className="button-secondary" type="button" onClick={resetForm}>
            {editingId ? 'Cancelar edición' : 'Limpiar'}
          </button>
        </div>
      </section>

      <section className="page-card">
        <h2 className="page-heading">Tus Influencias ({influences?.length || 0})</h2>
        {!influences?.length ? (
          <div className="alert">Aún no registras influencias.</div>
        ) : (
          <div className="card-grid">
            {influences.map((inf: any) => {
              const shadow = inf.type === 'shadow'
              return (
                <div key={inf.id} className="card" style={{ borderColor: shadow ? 'rgba(155,140,255,0.3)' : 'rgba(255,179,71,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '26px' }}>{GENDER_ICON[inf.gender] || '🧑'}</span>
                    <div>
                      <h3 style={{ margin: 0 }}>{inf.name}</h3>
                      <small style={{ color: shadow ? '#9b8cff' : '#ffb347' }}>{shadow ? '🌑 Sombra' : '🔥 Antorcha'} · {inf.relationship}</small>
                    </div>
                  </div>
                  <p style={{ marginTop: '10px' }}>{inf.description}</p>

                  {inf.messages?.length > 0 && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', color: '#36f3ff' }}>Mensajes generados ({inf.messages.length})</summary>
                      <ul style={{ margin: '10px 0 0', paddingLeft: '18px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                        {inf.messages.slice(0, 8).map((m: any) => <li key={m.id}>{m.message}</li>)}
                      </ul>
                    </details>
                  )}

                  <div className="button-row" style={{ marginTop: '16px' }}>
                    <button className="button-ghost" type="button" onClick={() => editInfluence(inf)}>Editar</button>
                    <button className="button-ghost" type="button" onClick={() => regenerate(inf.id)}>Regenerar mensajes</button>
                    <button className="button-danger" type="button" onClick={() => remove(inf.id)}>Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
