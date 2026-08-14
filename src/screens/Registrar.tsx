import { useState } from 'react'
import EntrySheet from '../components/EntrySheet'
import { useApp } from '../lib/store'
import { KIND_EMOJI, KIND_LABEL } from '../types'
import type { EntryKind } from '../types'
import { fmtDayHeader, severityLabel } from '../lib/format'

const QUICK: EntryKind[] = ['dolor', 'sangrado', 'sintoma', 'medicamento', 'animo', 'pregunta']

export default function Registrar({ goResumen }: { goResumen: () => void }) {
  const { data, offline, pendingCount, session } = useApp()
  const [open, setOpen] = useState<EntryKind | null>(null)
  const recientes = data.entries.slice(0, 4)
  const nombre = session?.user.email?.split('@')[0] ?? ''

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
          <p className="sub">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {(offline || pendingCount > 0) && (
        <div className="banner" style={{ marginBottom: 14 }}>
          <span aria-hidden>📶</span>
          <span>
            {offline ? 'Sin internet. ' : ''}
            {pendingCount > 0
              ? `${pendingCount} registro(s) esperando enviarse. Se envían solos cuando vuelva la señal.`
              : 'Puedes seguir anotando: se guarda en el celular y se envía después.'}
          </span>
        </div>
      )}

      <h2 style={{ marginBottom: 12 }}>¿Qué quieres anotar?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {QUICK.map((k) => (
          <button
            key={k}
            className="card tap"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minHeight: 92 }}
            onClick={() => setOpen(k)}
          >
            <span style={{ fontSize: 26 }} aria-hidden>
              {KIND_EMOJI[k]}
            </span>
            <span style={{ fontWeight: 650, fontSize: 16 }}>{KIND_LABEL[k]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24 }} aria-hidden>
            📋
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--primary-dark)' }}>¿Vas a la cita?</h3>
            <p className="small" style={{ color: 'var(--primary-dark)', marginTop: 2 }}>
              Abre el resumen: queda todo ordenado y claro para mostrárselo al médico.
            </p>
            <button className="btn small-btn" style={{ marginTop: 10 }} onClick={goResumen}>
              Ver mi resumen
            </button>
          </div>
        </div>
      </div>

      <div className="section-title">Lo último que anotaste</div>
      {recientes.length === 0 ? (
        <div className="empty">
          Todavía no hay registros.
          <br />
          Empieza por lo que más te preocupa hoy.
        </div>
      ) : (
        <div className="stack">
          {recientes.map((e) => {
            const tema = data.topics.find((t) => t.id === e.topic_id)
            return (
              <div className="card" key={e.id}>
                <div className="row">
                  <span aria-hidden style={{ fontSize: 20 }}>
                    {KIND_EMOJI[e.kind]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <strong style={{ fontSize: 16 }}>{e.title || KIND_LABEL[e.kind]}</strong>
                      {e.severity !== null && <span className="sev-pill">{e.severity}/10</span>}
                    </div>
                    <p className="tiny muted">
                      {fmtDayHeader(e.occurred_at)}
                      {tema ? ` · ${tema.name}` : ''}
                      {e.severity !== null ? ` · ${severityLabel(e.severity)}` : ''}
                    </p>
                  </div>
                </div>
                {e.note && (
                  <p className="small" style={{ marginTop: 8 }}>
                    {e.note}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && <EntrySheet defaultKind={open} onClose={() => setOpen(null)} />}
    </>
  )
}
