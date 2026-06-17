import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Shortcomings() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [form, setForm] = useState({ title: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: shortcomings, mutate } = useSWR(
    userId ? `/api/users/${userId}/shortcomings` : null,
    fetcher
  )

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) { router.push('/'); return }
    setUserId(id)
  }, [router])

  async function createShortcoming() {
    if (!form.title || !form.text) { setError('Por favor completa todos los campos'); return }
    if (!userId) { setError('No se encontró usuario. Vuelve a iniciar sesión.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}/shortcomings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || 'No se pudo crear la falencia')
        return
      }
      setForm({ title: '', text: '' })
      await mutate()
      alert('¡Falencia registrada! La IA preparó tu guía.')
    } catch (e) {
      console.error(e)
      setError('Error al crear la falencia. Revisa la consola.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteShortcoming(id: string) {
    if (!confirm('¿Eliminar esta falencia?')) return
    try {
      const res = await fetch(`/api/users/${userId}/shortcomings/${id}`, { method: 'DELETE' })
      if (res.ok) await mutate()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">Mis Falencias</h1>
        <p className="page-text">
          Las falencias son defectos o malos hábitos que quieres eliminar. Al crear una meta, la IA decidirá qué falencias combate.
        </p>

        <h3>Nueva Falencia</h3>
        <p className="page-text">Nombra algo que quieras dejar atrás y descríbelo con honestidad.</p>

        <label className="input-label">Título</label>
        <input
          type="text"
          placeholder="Ej: Desordenado, Malos hábitos de sueño"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <label className="input-label" style={{ marginTop: '14px' }}>Descripción</label>
        <textarea
          placeholder="¿Cómo se manifiesta y por qué quieres eliminarla?"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />

        {error && <div className="alert" style={{ marginTop: '14px' }}>{error}</div>}

        <div className="button-row" style={{ marginTop: '16px' }}>
          <button className="button-primary" onClick={createShortcoming} disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear Falencia'}
          </button>
          <button className="button-secondary" type="button" onClick={() => { setForm({ title: '', text: '' }); setError('') }}>
            Cancelar
          </button>
        </div>
      </section>

      <section className="page-card">
        <h2 className="page-heading">Tus Falencias ({shortcomings?.length || 0})</h2>
        {!shortcomings?.length ? (
          <div className="alert">Aún no registras falencias.</div>
        ) : (
          <div className="card-grid">
            {shortcomings.map((s: any) => (
              <div key={s.id} className="card">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {s.aiAdvice && (
                  <div style={{ marginTop: '14px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,54,196,0.08)', border: '1px solid rgba(255,54,196,0.2)' }}>
                    <strong style={{ color: '#ff36c4', display: 'block', marginBottom: '8px' }}>💢 Cómo combatirla</strong>
                    <span style={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{s.aiAdvice}</span>
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '14px' }}>Creada el {new Date(s.createdAt).toLocaleDateString()}</small>
                <div className="button-row" style={{ marginTop: '18px' }}>
                  <button className="button-danger" type="button" onClick={() => deleteShortcoming(s.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
