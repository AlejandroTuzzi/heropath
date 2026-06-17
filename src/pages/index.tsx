import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const ok = sessionStorage.getItem('heropath_authed')
    if (ok) {
      setAuthed(true)
      router.push('/dashboard')
    }
  }, [])

  async function handleAuth(e: any) {
    e?.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // Check master password
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password.trim() })
        })
        if (res.ok) {
          // Find or create user
          const userRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email || 'default@heropath.local', password: password, name: email || 'User' })
          })
          if (userRes.ok) {
            const user = await userRes.json()
            sessionStorage.setItem('heropath_authed', '1')
            sessionStorage.setItem('userId', user.id)
            setAuthed(true)
            router.push('/dashboard')
          }
        } else {
          alert('Contraseña incorrecta')
        }
      } else {
        // Sign up: create new user
        if (!email || !password || !userName) {
          alert('Completa todos los campos')
          setLoading(false)
          return
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: userName })
        })
        if (res.ok) {
          const user = await res.json()
          sessionStorage.setItem('heropath_authed', '1')
          sessionStorage.setItem('userId', user.id)
          setAuthed(true)
          router.push('/dashboard')
        } else if (res.status === 409) {
          alert('Este email ya está registrado')
        } else {
          alert('Error al crear cuenta')
        }
      }
    } catch (e) {
      console.error(e)
      alert('Error al autenticar')
    } finally {
      setLoading(false)
    }
  }

  if (authed) return null

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>🏹 HeroPath</h1>

        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div style={{ marginBottom: '18px' }}>
              <label className="input-label">Nombre de usuario</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required={!isLogin}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">
              {isLogin ? 'Contraseña maestra' : 'Contraseña'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '22px' }}>
          <p style={{ color: 'rgba(255,255,255,0.72)', marginBottom: '10px' }}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="button-ghost"
            type="button"
          >
            {isLogin ? 'Crear una' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </main>
  )
}
