import { useState } from 'react'
import { useApp } from './lib/store'
import Auth from './screens/Auth'
import Registrar from './screens/Registrar'
import Historial from './screens/Historial'
import Medicinas from './screens/Medicinas'
import Resumen from './screens/Resumen'

type Tab = 'registrar' | 'historial' | 'medicinas' | 'resumen'

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'registrar', label: 'Registrar', ico: '➕' },
  { id: 'historial', label: 'Historial', ico: '📖' },
  { id: 'medicinas', label: 'Medicinas', ico: '💊' },
  { id: 'resumen', label: 'Resumen', ico: '📋' },
]

export default function App() {
  const { session, authReady, toast } = useApp()
  const [tab, setTab] = useState<Tab>('registrar')

  if (!authReady) {
    return (
      <div className="app center" style={{ paddingTop: 120 }}>
        <p className="muted">Abriendo…</p>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <>
      <div className="app">
        {tab === 'registrar' && <Registrar goResumen={() => setTab('resumen')} />}
        {tab === 'historial' && <Historial />}
        {tab === 'medicinas' && <Medicinas />}
        {tab === 'resumen' && <Resumen />}
      </div>

      <nav className="nav no-print">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="ico" aria-hidden>
              {t.ico}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
