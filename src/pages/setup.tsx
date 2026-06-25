import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SetupPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({ dayStartHour: 8, dayEndHour: 20 })
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const id = sessionStorage.getItem('userId')
    if (!id) {
      router.push('/')
      return
    }
    setUserId(id)
    loadUser(id)
  }, [router])

  async function loadUser(id: string) {
    try {
      const res = await fetch(`/api/users?id=${id}`)
      if (!res.ok) {
        router.push('/')
        return
      }
      const data = await res.json()
      setUser(data)
      setFormData({
        dayStartHour: data.dayStartHour || 8,
        dayEndHour: data.dayEndHour || 20
      })
    } catch (e) {
      console.error('Failed to load user', e)
      router.push('/')
    }
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (formData.dayStartHour >= formData.dayEndHour) {
      alert('La hora de inicio debe ser anterior a la hora de fin')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          dayStartHour: parseInt(formData.dayStartHour.toString()),
          dayEndHour: parseInt(formData.dayEndHour.toString())
        })
      })
      if (res.ok) {
        alert('Configuración guardada 🎉')
        loadUser(userId)
      } else {
        const error = await res.json().catch(() => ({}))
        alert(`Error: ${error.error || 'No se pudo guardar'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error al guardar configuración')
    } finally {
      setLoading(false)
    }
  }

  const [resetting, setResetting] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  async function changePassword(e: any) {
    e.preventDefault()
    if (pwForm.newPassword.length < 6) { alert('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (pwForm.newPassword !== pwForm.confirm) { alert('Las contraseñas nuevas no coinciden'); return }
    setPwLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        alert('Contraseña actualizada ✅')
        setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      } else {
        alert(`Error: ${data.error || 'No se pudo cambiar'}`)
      }
    } catch (e) {
      console.error(e); alert('Error al cambiar la contraseña')
    } finally {
      setPwLoading(false)
    }
  }

  async function sendTestEmail() {
    setTestingEmail(true)
    try {
      const res = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) alert('Correo de prueba enviado ✅. Revisa tu bandeja (y spam).')
      else alert(`No se pudo enviar: ${data.error || 'error'}`)
    } catch (e) {
      console.error(e); alert('Error al enviar el correo de prueba')
    } finally {
      setTestingEmail(false)
    }
  }

  // ---- Push notifications ----
  const [pushState, setPushState] = useState<'unsupported' | 'off' | 'on' | 'busy'>('off')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushState('unsupported'); return }
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { setPushState('off'); return }
      reg.pushManager.getSubscription().then(sub => setPushState(sub ? 'on' : 'off'))
    }).catch(() => setPushState('off'))
  }, [])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    return arr
  }

  async function enablePush() {
    setPushState('busy')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { alert('Permiso de notificaciones denegado'); setPushState('off'); return }
      const { publicKey } = await fetch('/api/push/public-key').then(r => r.json())
      if (!publicKey) { alert('Push no está configurado en el servidor (faltan claves VAPID)'); setPushState('off'); return }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub.toJSON() })
      })
      if (res.ok) { setPushState('on'); alert('Notificaciones activadas ✅') }
      else { setPushState('off'); alert('No se pudo activar') }
    } catch (e) {
      console.error(e); alert('Error al activar notificaciones'); setPushState('off')
    }
  }

  async function disablePush() {
    setPushState('busy')
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        await sub.unsubscribe()
      }
      setPushState('off')
    } catch (e) {
      console.error(e); setPushState('on')
    }
  }

  async function testPush() {
    const res = await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    const d = await res.json().catch(() => ({}))
    alert(res.ok ? 'Push de prueba enviado 🔔' : (d.error || 'No se pudo enviar'))
  }

  async function resetApp() {
    if (!confirm('⚠️ Esto eliminará TODAS tus metas, ambiciones, falencias, influencias, registros e historial. Tu cuenta y configuración se mantienen. ¿Continuar?')) return
    if (!confirm('Esta acción NO se puede deshacer. ¿Reiniciar la app de verdad?')) return
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${userId}/reset`, { method: 'POST' })
      if (res.ok) {
        alert('App reiniciada. Tu progreso vuelve a 100%. ✨')
        router.push('/dashboard')
      } else {
        alert('No se pudo reiniciar la app')
      }
    } catch (e) {
      console.error(e)
      alert('Error al reiniciar la app')
    } finally {
      setResetting(false)
    }
  }

  if (!user) return <div className="page-shell" style={{ color: '#d8ff36', padding: '40px' }}>Cargando...</div>

  return (
    <div className="page-shell">
      <div className="page-card">
        <h1 className="page-heading">Configuración Global</h1>
        <p className="page-text">Personaliza los horarios de tus notificaciones de motivación y cierre de día.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
            <div>
              <label className="input-label">🌅 Hora de inicio del día</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.dayStartHour}
                onChange={(e) => setFormData({ ...formData, dayStartHour: parseInt(e.target.value) })}
              />
              <p style={{ fontSize: '12px', color: '#36f3ff', marginTop: '6px' }}>
                Notificación de motivación diaria
              </p>
            </div>

            <div>
              <label className="input-label">🌙 Hora de fin del día</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.dayEndHour}
                onChange={(e) => setFormData({ ...formData, dayEndHour: parseInt(e.target.value) })}
              />
              <p style={{ fontSize: '12px', color: '#36f3ff', marginTop: '6px' }}>
                Notificación de cierre de día
              </p>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(54,243,255,0.08)', border: '1px solid rgba(54,243,255,0.2)', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 8px 0', color: '#36f3ff', fontSize: '14px' }}>
              ⏰ <strong>Resumen de horarios</strong>
            </p>
            <p style={{ margin: '6px 0', color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
              • Motivación: {formData.dayStartHour.toString().padStart(2, '0')}:00
            </p>
            <p style={{ margin: '6px 0', color: 'rgba(255,255,255,0.75)', fontSize: '13px' }}>
              • Cierre de día: {formData.dayEndHour.toString().padStart(2, '0')}:00
            </p>
          </div>

          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </div>

      <div className="page-card">
        <h2 className="page-heading">ℹ️ Cómo funciona</h2>
        <p className="page-text">
          <strong>Hora de inicio del día:</strong> Recibirás una notificación por email a esta hora con una motivación personalizada basada en tus aspiraciones y metas.
        </p>
        <p className="page-text">
          <strong>Hora de fin del día:</strong> Recibirás un email solicitando que registres los resultados del día (completado ✅, parcial ⚠️, o no iniciado ❌).
        </p>
        <p className="page-text">
          Estos horarios se aplican a <strong>todos tus objetivos</strong> y se respetan según tu zona horaria configurada en el Perfil.
        </p>
      </div>

      <div className="page-card">
        <h2 className="page-heading">🔒 Contraseña</h2>
        <p className="page-text">Cambia tu contraseña de acceso.</p>
        <form onSubmit={changePassword}>
          <label className="input-label">Contraseña actual</label>
          <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} autoComplete="current-password" />
          <label className="input-label" style={{ marginTop: '14px' }}>Nueva contraseña</label>
          <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} autoComplete="new-password" />
          <label className="input-label" style={{ marginTop: '14px' }}>Repite la nueva contraseña</label>
          <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} autoComplete="new-password" />
          <button className="button-primary" type="submit" disabled={pwLoading} style={{ marginTop: '18px' }}>
            {pwLoading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      <div className="page-card">
        <h2 className="page-heading">📧 Correos</h2>
        <p className="page-text">
          Recibirás <strong>dos correos al día</strong>: motivación a tu hora de inicio y solicitud de resultados a tu hora de cierre.
          Envíate uno de prueba para confirmar que la entrega funciona.
        </p>
        <button className="button-secondary" type="button" onClick={sendTestEmail} disabled={testingEmail} style={{ width: 'auto' }}>
          {testingEmail ? 'Enviando…' : 'Enviar correo de prueba'}
        </button>
      </div>

      <div className="page-card">
        <h2 className="page-heading">🔔 Notificaciones push</h2>
        <p className="page-text">
          Recibe avisos en <strong>este dispositivo</strong> a tus horarios (mañana y noche), además del correo.
        </p>
        {pushState === 'unsupported' ? (
          <div className="alert">Este navegador no soporta notificaciones push. En iPhone, primero añade HeroPath a la pantalla de inicio.</div>
        ) : pushState === 'on' ? (
          <div className="button-row">
            <button className="button-secondary" type="button" onClick={disablePush} style={{ width: 'auto' }}>Desactivar</button>
            <button className="button-ghost" type="button" onClick={testPush}>Enviar prueba 🔔</button>
          </div>
        ) : (
          <button className="button-primary" type="button" disabled={pushState === 'busy'} onClick={enablePush} style={{ width: 'auto' }}>
            {pushState === 'busy' ? 'Activando…' : 'Activar notificaciones'}
          </button>
        )}
      </div>

      <div className="page-card" style={{ borderColor: 'rgba(244,67,54,0.35)' }}>
        <h2 className="page-heading" style={{ color: '#F44336' }}>⚠️ Zona de peligro</h2>
        <p className="page-text">
          <strong>Reiniciar la app</strong> elimina todas tus metas, ambiciones, falencias, influencias, registros e historial.
          Tu cuenta, perfil y configuración se mantienen, y tu porcentaje personal vuelve a <strong>100%</strong>. Esta acción no se puede deshacer.
        </p>
        <button
          type="button"
          onClick={resetApp}
          disabled={resetting}
          style={{ width: 'auto', border: 'none', color: '#fff', background: '#F44336', padding: '14px 22px', borderRadius: '14px', fontWeight: 700 }}
        >
          {resetting ? 'Reiniciando…' : 'Reiniciar app (borrar todo)'}
        </button>
      </div>
    </div>
  )
}
