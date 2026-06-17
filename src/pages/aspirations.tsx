import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Aspirations() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [newAspiration, setNewAspiration] = useState({ title: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: aspirations, mutate } = useSWR(
    userId ? `/api/users/${userId}/aspirations` : null,
    fetcher
  )

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) {
      router.push('/')
      return
    }
    setUserId(id)
  }, [router])

  async function createAspiration() {
    if (!newAspiration.title || !newAspiration.text) {
      setError('Por favor completa todos los campos')
      return
    }
    if (!userId) {
      setError('No se encontró usuario. Vuelve a iniciar sesión.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${userId}/aspirations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newAspiration.title, text: newAspiration.text })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || 'No se pudo crear la aspiración')
        return
      }
      setNewAspiration({ title: '', text: '' })
      await mutate()
      setError('')
      alert('¡Aspiración creada!')
    } catch (e) {
      console.error(e)
      setError('Error al crear aspiración. Revisa la consola.')
    } finally {
      setSubmitting(false)
    }
  }

  function cancelCreation() {
    setNewAspiration({ title: '', text: '' })
    setError('')
  }

  async function deleteAspiration(id: string) {
    if (!confirm('¿Eliminar esta aspiración?')) return
    try {
      const res = await fetch(`/api/users/${userId}/aspirations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await mutate()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="page-shell">
      <section className="page-card">
        <h1 className="page-heading">Mis Aspiraciones</h1>
        <p className="page-text">
          Las aspiraciones son tus metas utópicas: ese norte que te inspira cada día. Aquí puedes crear, cancelar y gestionar tus ambiciones más grandes.
        </p>

        <div className="page-card">
          <h3>Nueva Aspiración</h3>
          <p className="page-text">Describe una ambición que te motive a avanzar: algo grande, atractivo y con significado.</p>

          <input
            type="text"
            placeholder="Título (ej: Ser el mejor arquero del mundo)"
            value={newAspiration.title}
            onChange={(e) => setNewAspiration({ ...newAspiration, title: e.target.value })}
          />
          <textarea
            placeholder="Descripción utópica (ej: Desarrollar habilidades de tiro precisas y mentales)"
            value={newAspiration.text}
            onChange={(e) => setNewAspiration({ ...newAspiration, text: e.target.value })}
          />

          {error && <div className="alert">{error}</div>}

          <div className="button-row" style={{ marginTop: '16px' }}>
            <button
              className="button-primary"
              onClick={createAspiration}
              disabled={submitting}
            >
              {submitting ? 'Creando...' : 'Crear Aspiración'}
            </button>
            <button
              className="button-secondary"
              onClick={cancelCreation}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </section>

      <section className="page-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-heading">Tus Aspiraciones ({aspirations?.length || 0})</h2>
          <button className="button-secondary" type="button" onClick={() => router.push('/dashboard')}>
            Volver a Metas
          </button>
        </div>

        {!aspirations?.length ? (
          <div className="alert" style={{ marginTop: '16px' }}>
            Aún no tienes aspiraciones. Empieza creando la primera.
          </div>
        ) : (
          <div className="card-grid" style={{ marginTop: '20px' }}>
            {aspirations.map((asp: any) => (
              <div key={asp.id} className="card">
                <h3>{asp.title}</h3>
                <p>{asp.text}</p>
                {asp.aiAdvice && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'rgba(54,243,255,0.08)',
                      border: '1px solid rgba(54,243,255,0.2)'
                    }}
                  >
                    <strong style={{ color: '#36f3ff', display: 'block', marginBottom: '8px' }}>
                      🏹 Guía hacia tu aspiración
                    </strong>
                    <span style={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                      {asp.aiAdvice}
                    </span>
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '14px' }}>
                  Creada el {new Date(asp.createdAt).toLocaleDateString()}
                </small>
                <div className="button-row" style={{ marginTop: '18px' }}>
                  <button className="button-danger" type="button" onClick={() => deleteAspiration(asp.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
