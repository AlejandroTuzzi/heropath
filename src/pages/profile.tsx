import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const countries: { [key: string]: string } = {
  AR: 'Argentina',
  BO: 'Bolivia',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  DO: 'República Dominicana',
  EC: 'Ecuador',
  SV: 'El Salvador',
  GT: 'Guatemala',
  HN: 'Honduras',
  MX: 'México',
  NI: 'Nicaragua',
  PA: 'Panamá',
  PY: 'Paraguay',
  PE: 'Perú',
  PR: 'Puerto Rico',
  UY: 'Uruguay',
  VE: 'Venezuela',
  US: 'Estados Unidos',
  CA: 'Canadá',
  GB: 'Reino Unido',
  ES: 'España',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  RU: 'Rusia',
  JP: 'Japón',
  CN: 'China',
  IN: 'India',
  AU: 'Australia',
  ZA: 'Sudáfrica',
  EG: 'Egipto',
}

const countryTimezones: { [key: string]: string } = {
  AR: 'America/Argentina/Buenos_Aires',
  BO: 'America/La_Paz',
  BR: 'America/Sao_Paulo',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  CR: 'America/Costa_Rica',
  CU: 'America/Havana',
  DO: 'America/Santo_Domingo',
  EC: 'America/Guayaquil',
  SV: 'America/El_Salvador',
  GT: 'America/Guatemala',
  HN: 'America/Tegucigalpa',
  MX: 'America/Mexico_City',
  NI: 'America/Managua',
  PA: 'America/Panama',
  PY: 'America/Asuncion',
  PE: 'America/Lima',
  PR: 'America/Puerto_Rico',
  UY: 'America/Montevideo',
  VE: 'America/Caracas',
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  ES: 'Europe/Madrid',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  IT: 'Europe/Rome',
  PT: 'Europe/Lisbon',
  RU: 'Europe/Moscow',
  JP: 'Asia/Tokyo',
  CN: 'Asia/Shanghai',
  IN: 'Asia/Kolkata',
  AU: 'Australia/Sydney',
  ZA: 'Africa/Johannesburg',
  EG: 'Africa/Cairo',
}

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
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
      setFormData(data)
    } catch (e) {
      console.error('Failed to load user', e)
      router.push('/')
    }
  }

  function calculateAge(birthDate: string) {
    if (!birthDate) return ''
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  }

  function handleBirthDateChange(e: any) {
    const birthDate = e.target.value
    setFormData({
      ...formData,
      birthDate,
      age: parseInt(calculateAge(birthDate)) || undefined
    })
  }

  function handleCountryChange(e: any) {
    const country = e.target.value
    const countryCode = Object.keys(countries).find(k => countries[k] === country)
    const timezone = countryTimezones[countryCode || ''] || ''
    setFormData({
      ...formData,
      country,
      timezone
    })
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          ...formData
        })
      })
      if (res.ok) {
        alert('Perfil actualizado 🎉')
        const data = await res.json()
        setUser(data)
      } else {
        const error = await res.json().catch(() => ({}))
        alert(`Error: ${error.error || 'No se pudo actualizar'}`)
      }
    } catch (e) {
      console.error(e)
      alert('Error al actualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="page-shell" style={{ color: '#d8ff36', padding: '40px' }}>Cargando...</div>

  return (
    <div className="page-shell">
      <div className="page-card">
        <h1 className="page-heading">Mi Perfil</h1>
        <p className="page-text">Actualiza tu información personal y preferencias de notificación.</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Nombre de usuario</label>
            <input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              type="text"
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Fecha de nacimiento</label>
            <input
              value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
              onChange={handleBirthDateChange}
              type="date"
            />
          </div>

          {formData.birthDate && (
            <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '12px', background: 'rgba(216,255,54,0.08)', border: '1px solid rgba(216,255,54,0.2)' }}>
              <p style={{ margin: 0, color: '#d8ff36' }}>📅 Edad calculada: <strong>{calculateAge(formData.birthDate)}</strong> años</p>
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">País</label>
            <select
              value={formData.country || ''}
              onChange={handleCountryChange}
              style={{
                width: '100%',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                color: '#fff',
                outline: 'none',
                padding: '14px',
                transition: 'border-color 150ms ease, box-shadow 150ms ease'
              }}
            >
              <option value="">Selecciona un país</option>
              {Object.values(countries).sort().map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Zona horaria</label>
            <input
              value={formData.timezone || ''}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              type="text"
              placeholder="Se configura según el país"
              readOnly
              style={{ opacity: 0.7 }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label className="input-label">Avatar URL (opcional)</label>
            <input
              value={formData.avatarUrl || ''}
              onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
              type="text"
              placeholder="https://..."
            />
          </div>

          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="page-card">
        <h2 className="page-heading">Información de cuenta</h2>
        <p className="page-text">Email: <span style={{ color: '#36f3ff' }}>{user.email}</span></p>
        <p className="page-text">Miembro desde: {new Date(user.createdAt).toLocaleDateString()}</p>
        
        <button
          onClick={() => {
            sessionStorage.removeItem('userId')
            sessionStorage.removeItem('heropath_authed')
            router.push('/')
          }}
          className="button-danger"
          type="button"
          style={{ marginTop: '16px' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
