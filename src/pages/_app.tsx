import '../styles/globals.css'
import type { AppProps } from 'next/app'
import NavBar from '../components/NavBar'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <NavBar />
      <main className="app-shell">
        <Component {...pageProps} />
      </main>
    </>
  )
}
