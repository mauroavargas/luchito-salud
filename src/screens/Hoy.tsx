import { useMemo, useState } from 'react'
import EntrySheet from '../components/EntrySheet'
import ReminderSheet from '../components/ReminderSheet'
import DocumentSheet from '../components/DocumentSheet'
import ProfileSheet from '../components/ProfileSheet'
import { useApp } from '../lib/store'
import { KIND_EMOJI, KIND_LABEL, REM_EMOJI, REPEAT_LABEL } from '../types'
import type { EntryKind, Reminder } from '../types'
import { fmtDayHeader, severityLabel } from '../lib/format'
import { buildNudges, pendingReminders, todayKey } from '../lib/nudges'
import type { NudgeAction } from '../lib/nudges'

const QUICK: EntryKind[] = ['dolor', 'sangrado', 'sintoma', 'medicamento', 'animo', 'pregunta']

export default function Hoy({
  goResumen,
  goMedicinas,
}: {
  goResumen: () => void
  goMedicinas: () => void
}) {
  const { data, offline, pendingCount, session, markReminder, say } = useApp()
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null)
  const [entryTopic, setEntryTopic] = useState<string | null>(null)
  const [remSheet, setRemSheet] = useState<Reminder | 'nuevo' | null>(null)
  const [docSheet, setDocSheet] = useState(false)
  const [perfil, setPerfil] = useState(false)
  const [verTodo, setVerTodo] = useState(false)

  const hoy = todayKey()
  const pendientes = useMemo(() => pendingReminders(data, hoy), [data, hoy])
  const nudges = useMemo(() => buildNudges(data), [data])
  const visibles = verTodo ? nudges : nudges.slice(0, 3)
  const recientes = data.entries.slice(0, 3)
  const nombre = data.profile?.full_name?.split(' ')[0] ?? session?.user.email?.split('@')[0] ?? ''

  function hacer(action: NudgeAction) {
    switch (action.type) {
      case 'documento':
        setDocSheet(true)
        break
      case 'medicamento':
        goMedicinas()
        break
      case 'tema':
        setEntryTopic(action.id)
        setEntryKind('sintoma')
        break
      case 'perfil':
        setPerfil(true)
        break
      case 'registro':
        setEntryKind('sintoma')
        break
      case 'recordatorio':
        setRemSheet('nuevo')
        break
    }
  }

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

      {/* --------- Pendientes --------- */}
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ flex: 1 }}>Pendientes de hoy</h2>
        <button className="btn link" onClick={() => setRemSheet('nuevo')}>
          + Recordatorio
        </button>
      </div>

      {pendientes.length === 0 ? (
        <div className="empty" style={{ padding: '22px 20px' }}>
          {data.reminders.length === 0
            ? 'No tienes recordatorios. Ponte uno para no olvidar tomar o reclamar medicamentos.'
            : '¡Todo al día por hoy! 🎉'}
        </div>
      ) : (
        <div className="stack">
          {pendientes.map(({ reminder: r, overdue, doneToday }) => (
            <div
              className="card"
              key={r.id}
              style={overdue > 0 ? { borderColor: 'var(--alert)', background: 'var(--alert-soft)' } : undefined}
            >
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <button
                  aria-label={doneToday ? 'Desmarcar' : 'Marcar como hecho'}
                  onClick={async () => {
                    try {
                      await markReminder(r.id, hoy, !doneToday)
                      if (!doneToday) say('¡Hecho! Queda registrado.')
                    } catch {
                      say('No se pudo marcar. Revisa la señal.')
                    }
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `2px solid ${doneToday ? 'var(--primary)' : 'var(--line)'}`,
                    background: doneToday ? 'var(--primary)' : 'var(--surface)',
                    color: '#fff',
                    fontSize: 18,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {doneToday ? '✓' : ''}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 16, textDecoration: doneToday ? 'line-through' : undefined }}>
                    {REM_EMOJI[r.kind]} {r.title}
                  </strong>
                  <p className="tiny muted" style={{ marginTop: 2 }}>
                    {overdue > 0 ? (
                      <b style={{ color: 'var(--alert)' }}>
                        Atrasado {overdue} día{overdue === 1 ? '' : 's'}
                      </b>
                    ) : (
                      REPEAT_LABEL[r.repeat]
                    )}
                    {r.due_time ? ` · ${r.due_time}` : ''}
                  </p>
                  {r.notes && (
                    <p className="small" style={{ marginTop: 5 }}>
                      {r.notes}
                    </p>
                  )}
                </div>
                <button className="btn link" onClick={() => setRemSheet(r)}>
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --------- Sugerencias --------- */}
      {nudges.length > 0 && (
        <>
          <div className="section-title">Se te está quedando por fuera</div>
          <div className="stack">
            {visibles.map((n) => (
              <div className="card" key={n.id}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <span aria-hidden style={{ fontSize: 20 }}>
                    {n.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="small">{n.text}</p>
                    <button className="btn small-btn" style={{ marginTop: 10 }} onClick={() => hacer(n.action)}>
                      {n.cta}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {nudges.length > 3 && (
            <button className="btn link" style={{ marginTop: 6 }} onClick={() => setVerTodo(!verTodo)}>
              {verTodo ? 'Ver menos' : `Ver las otras ${nudges.length - 3}`}
            </button>
          )}
        </>
      )}

      {/* --------- Registro rápido --------- */}
      <div className="section-title">¿Qué quieres anotar?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {QUICK.map((k) => (
          <button
            key={k}
            className="card tap"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minHeight: 92 }}
            onClick={() => setEntryKind(k)}
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

      {recientes.length > 0 && (
        <>
          <div className="section-title">Lo último que anotaste</div>
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
                </div>
              )
            })}
          </div>
        </>
      )}

      {entryKind && (
        <EntrySheet
          defaultKind={entryKind}
          defaultTopicId={entryTopic}
          onClose={() => {
            setEntryKind(null)
            setEntryTopic(null)
          }}
        />
      )}
      {remSheet && (
        <ReminderSheet
          reminder={remSheet === 'nuevo' ? undefined : remSheet}
          onClose={() => setRemSheet(null)}
        />
      )}
      {docSheet && <DocumentSheet onClose={() => setDocSheet(false)} />}
      {perfil && <ProfileSheet onClose={() => setPerfil(false)} />}
    </>
  )
}
