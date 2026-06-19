import Link from 'next/link'
import { useRouter } from 'next/router'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/aspirations', label: 'Ambiciones' },
  { href: '/shortcomings', label: 'Falencias' },
  { href: '/influences', label: 'Influencias' },
  { href: '/dashboard', label: 'Metas' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/progreso', label: 'Progreso' },
  { href: '/profile', label: 'Perfil' },
  { href: '/setup', label: 'Setup' }
]

export default function NavBar() {
  const { pathname } = useRouter()

  return (
    <header className="app-nav">
      <Link href="/dashboard" className="app-brand" aria-label="HeroPath">
        <img src="/heropath-logo.png" alt="HeroPath" style={{ height: '34px', width: 'auto', display: 'block' }} />
      </Link>

      <nav className="nav-links">
        {links.map(link => (
          <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? 'active' : ''}`}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
