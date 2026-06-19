import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export default function Categories() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: categories, mutate } = useSWR('/api/categories', fetcher)

  useEffect(() => {
    if (!sessionStorage.getItem('userId')) router.push('/')
  }, [router])

  function reset() { setForm({ name: '', description: '' }); setEditingId(null); setError('') }

  async function save() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSubmitting(true)
    setError('')
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: JSON_HEADERS, body: JSON.stringify(form) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'No se pudo guardar'); return }
      reset()
      await mutate()
    } catch (e) {
      console.error(e); setError('Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  function edit(cat: any) {
    setForm({ name: cat.name, description: cat.description || '' })
    setEditingId(cat.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(cat: any) {
    if (cat.name === 'General') { alert('No puedes eliminar la categoría General'); return }
    if (!confirm(`¿Eliminar "${cat.name}"? Sus metas pasarán a General.`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) await mutate()
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'No se pudo eliminar') }
  }

  const list = Array.isArray(categories) ? categories : []

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">{editingId ? 'Editar categoría' : 'Categorías'}</h1>
        <p className="page-text">Crea categorías para organizar tus metas y luego filtrarlas.</p>

        <label className="input-label">Nombre</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Salud, Negocios, Hábitos" />
        <label className="input-label" style={{ marginTop: '14px' }}>Descripción</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="¿Qué agrupa esta categoría?" />

        {error && <div className="alert" style={{ marginTop: '14px' }}>{error}</div>}

        <div className="button-row" style={{ marginTop: '16px' }}>
          <button className="button-primary" onClick={save} disabled={submitting}>
            {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear categoría'}
          </button>
          <button className="button-secondary" type="button" onClick={reset}>{editingId ? 'Cancelar edición' : 'Limpiar'}</button>
        </div>
      </section>

      <section className="page-card">
        <h2 className="page-heading">Tus categorías ({list.length})</h2>
        {list.length === 0 ? (
          <div className="alert">Aún no hay categorías.</div>
        ) : (
          <div className="card-grid">
            {list.map((cat: any) => (
              <div key={cat.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <h3 style={{ marginBottom: 0 }}>{cat.name}</h3>
                  <span style={{ fontSize: '12px', color: '#36f3ff', whiteSpace: 'nowrap' }}>{cat._count?.goals || 0} meta(s)</span>
                </div>
                {cat.description && <p style={{ marginTop: '8px' }}>{cat.description}</p>}
                <div className="button-row" style={{ marginTop: '16px' }}>
                  <button className="button-ghost" type="button" onClick={() => edit(cat)}>Editar</button>
                  {cat.name !== 'General' && <button className="button-danger" type="button" onClick={() => remove(cat)}>Eliminar</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
