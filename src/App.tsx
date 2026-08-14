import { useMemo, useState } from 'react'
import { useApp } from './lib/store'
import Auth from './screens/Auth'
import Hoy from './screens/Hoy'
import Historial from './screens/Historial'
import Archivo from './screens/Archivo'
import Medicinas from './screens/Medicinas'
import Resumen from './screens/Resumen'
import { buildNudges, pendingReminders } from './lib/nudges'

type Tab = 'hoy' | 'historial' | 'archivo' | 'medicinas' | 'resumen'

const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'hoy', label: 'Hoy', ico: '🏠' },
  { id: 'historial', label: 'Historial', ico: '📖' },
  { id: 'archivo', label: 'Archivo', ico: '📁' },
  { id: 'medicinas', label: 'Medicinas', ico: '💊' },
  { id: 'resumen', label: 'Resumen', ico: '📋' },
]

export default function App() {
  const { session, authReady, toast, data } = useApp()
  const [tab, setTab] = useState<Tab>('hoy')

  const alertas = useMemo(() => {
    if (!session) return 0
    return pendingReminders(data).filter((p) => !p.doneToday).length + buildNudges(data).length
  }, [data, session])

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
        {tab === 'hoy' && <Hoy goResumen={() => setTab('resumen')} goMedicinas={() => setTab('medicinas')} />}
        {tab === 'historial' && <Historial />}
        {tab === 'archivo' && <Archivo />}
        {tab === 'medicinas' && <Medicinas />}
        {tab === 'resumen' && <Resumen />}
      </div>

      <nav className="nav no-print">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="ico" aria-hidden style={{ position: 'relative' }}>
              {t.ico}
              {t.id === 'hoy' && alertas > 0 && tab !== 'hoy' && <span className="dot">{alertas > 9 ? '9+' : alertas}</span>}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
