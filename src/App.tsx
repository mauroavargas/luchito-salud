import { useMemo, useState } from 'react'
import { useApp } from './lib/store'
import Icon from './components/Icon'
import type { IconName } from './components/Icon'
import Auth from './screens/Auth'
import Hoy from './screens/Hoy'
import Historial from './screens/Historial'
import Archivo from './screens/Archivo'
import Medicinas from './screens/Medicinas'
import Resumen from './screens/Resumen'
import { buildNudges, pendingReminders } from './lib/nudges'

type Tab = 'hoy' | 'historial' | 'archivo' | 'medicinas' | 'resumen'

const TABS: { id: Tab; label: string; ico: IconName }[] = [
  { id: 'hoy', label: 'Hoy', ico: 'hoy' },
  { id: 'historial', label: 'Historial', ico: 'historial' },
  { id: 'archivo', label: 'Archivo', ico: 'archivo' },
  { id: 'medicinas', label: 'Medicinas', ico: 'medicamento' },
  { id: 'resumen', label: 'Resumen', ico: 'resumen' },
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
      <div className="app center" style={{ paddingTop: 'var(--s16)' }}>
        <p className="muted">Abriendo…</p>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <>
      <main className="app">
        {tab === 'hoy' && <Hoy goResumen={() => setTab('resumen')} goMedicinas={() => setTab('medicinas')} />}
        {tab === 'historial' && <Historial />}
        {tab === 'archivo' && <Archivo />}
        {tab === 'medicinas' && <Medicinas />}
        {tab === 'resumen' && <Resumen />}
      </main>

      <nav className="nav no-print" aria-label="Secciones">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="ico">
              <Icon name={t.ico} size={21} />
              {t.id === 'hoy' && alertas > 0 && tab !== 'hoy' && (
                <span className="dot" aria-label={`${alertas} cosas por revisar`}>
                  {alertas > 9 ? '9+' : alertas}
                </span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  )
}
