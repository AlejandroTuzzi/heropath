import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/aspirations', label: 'Ambiciones' },
  { href: '/shortcomings', label: 'Falencias' },
  { href: '/influences', label: 'Influencias' },
  { href: '/dashboard', label: 'Metas' },
  { href: '/categories', label: 'Categorías' },
  { href: '/suplicas', label: 'Súplicas' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/progreso', label: 'Progreso' },
  { href: '/profile', label: 'Perfil' },
  { href: '/setup', label: 'Setup' }
]

export default function NavBar() {
  const { pathname } = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <header className="app-nav">
      <Link href="/dashboard" className="app-brand" aria-label="HeroPath" onClick={() => setOpen(false)}>
        <img src="/heropath-logo.png" alt="HeroPath" style={{ height: '34px', width: 'auto', display: 'block' }} />
      </Link>

      <button className="nav-toggle" type="button" aria-label="Menú" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '☰'}
      </button>

      <nav className={`nav-links ${open ? 'open' : ''}`}>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
