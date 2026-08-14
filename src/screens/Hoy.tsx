import { useMemo, useState } from 'react'
import EntrySheet from '../components/EntrySheet'
import ReminderSheet from '../components/ReminderSheet'
import DocumentSheet from '../components/DocumentSheet'
import ProfileSheet from '../components/ProfileSheet'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useApp } from '../lib/store'
import { KIND_ICON, KIND_LABEL, KIND_SHORT, KIND_TONE, REM_ICON, REPEAT_LABEL } from '../types'
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
  const [marcando, setMarcando] = useState<string | null>(null)

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

  const iconoNudge: Record<NudgeAction['type'], IconName> = {
    documento: 'orden',
    medicamento: 'medicamento',
    tema: 'historial',
    perfil: 'alerta',
    registro: 'reloj',
    recordatorio: 'campana',
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
          <p className="sub">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          className="btn ghost sm"
          onClick={() => setPerfil(true)}
          aria-label="Mis datos y ajustes"
        >
          <Icon name="ajustes" size={17} />
        </button>
      </header>

      {(offline || pendingCount > 0) && (
        <div className="banner" style={{ marginBottom: 'var(--s5)' }} role="status">
          <Icon name="sin-senal" size={18} />
          <span>
            {offline ? 'Sin internet. ' : ''}
            {pendingCount > 0
              ? `${pendingCount} registro(s) esperando enviarse. Se envían solos cuando vuelva la señal.`
              : 'Puedes seguir anotando: se guarda en el celular y se envía después.'}
          </span>
        </div>
      )}

      {/* --------- lo que hay que hacer hoy --------- */}
      <div className="section-row" style={{ marginTop: 0 }}>
        <h2 className="section">Pendientes de hoy</h2>
        <button className="btn quiet" onClick={() => setRemSheet('nuevo')}>
          <Icon name="mas" size={16} />
          Recordatorio
        </button>
      </div>

      {pendientes.length === 0 ? (
        <p className="empty">
          {data.reminders.length === 0
            ? 'No tienes recordatorios. Ponte uno para no olvidar tomar o reclamar los medicamentos.'
            : 'Todo al día por hoy.'}
        </p>
      ) : (
        <div className="stack">
          {pendientes.map(({ reminder: r, overdue, doneToday }) => (
            <div className="todo" key={r.id} data-late={overdue > 0} data-done={doneToday}>
              <button
                className="tick"
                aria-pressed={doneToday}
                aria-label={doneToday ? `Desmarcar ${r.title}` : `Marcar ${r.title} como hecho`}
                disabled={marcando === r.id}
                onClick={async () => {
                  setMarcando(r.id)
                  try {
                    await markReminder(r.id, hoy, !doneToday)
                    if (!doneToday) say('Hecho. Queda registrado.')
                  } catch {
                    say('No se pudo marcar. Revisa la señal.')
                  } finally {
                    setMarcando(null)
                  }
                }}
              >
                <Icon name="check" size={18} />
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="todo-title">
                  <Icon name={REM_ICON[r.kind]} size={17} style={{ flexShrink: 0, opacity: 0.75 }} />
                  {r.title}
                </p>
                <p className="meta" style={{ marginTop: 2 }}>
                  {overdue > 0 ? (
                    <strong style={{ color: 'var(--alert-ink)' }}>
                      Atrasado {overdue} día{overdue === 1 ? '' : 's'}
                    </strong>
                  ) : (
                    REPEAT_LABEL[r.repeat]
                  )}
                  {r.due_time ? ` · ${r.due_time}` : ''}
                </p>
                {r.notes && (
                  <p className="small" style={{ marginTop: 'var(--s1)' }}>
                    {r.notes}
                  </p>
                )}
              </div>

              <button className="btn quiet" onClick={() => setRemSheet(r)} aria-label={`Editar ${r.title}`}>
                <Icon name="editar" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --------- lo que se está quedando por fuera --------- */}
      {nudges.length > 0 && (
        <>
          <h2 className="section">Se te está quedando por fuera</h2>
          <div className="stack">
            {visibles.map((n) => (
              <div className="nudge" key={n.id}>
                <Icon name={iconoNudge[n.action.type]} size={19} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="small">{n.text}</p>
                  <button className="btn sm ghost" style={{ marginTop: 'var(--s3)' }} onClick={() => hacer(n.action)}>
                    {n.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {nudges.length > 3 && (
            <button className="btn quiet" style={{ marginTop: 'var(--s2)' }} onClick={() => setVerTodo(!verTodo)}>
              {verTodo ? 'Ver menos' : `Ver las otras ${nudges.length - 3}`}
              <Icon name="chevron" size={15} style={{ transform: verTodo ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
            </button>
          )}
        </>
      )}

      {/* --------- anotar --------- */}
      <h2 className="section">¿Qué quieres anotar?</h2>
      <div className="quick">
        {QUICK.map((k) => (
          <button key={k} data-tone={KIND_TONE[k]} onClick={() => setEntryKind(k)} aria-label={KIND_LABEL[k]}>
            <Icon name={KIND_ICON[k]} size={24} />
            {KIND_SHORT[k]}
          </button>
        ))}
      </div>

      <button
        className="row"
        onClick={goResumen}
        style={{
          width: '100%',
          marginTop: 'var(--s5)',
          padding: 'var(--s4)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--primary-tint)',
          color: 'var(--primary-ink)',
          textAlign: 'left',
        }}
      >
        <Icon name="resumen" size={20} />
        <span style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 15.5 }}>Prepararme para la cita</strong>
          <span className="small">Todo ordenado en una hoja para el médico</span>
        </span>
        <Icon name="chevron" size={18} />
      </button>

      {recientes.length > 0 && (
        <>
          <h2 className="section">Lo último que anotaste</h2>
          <div className="stack">
            {recientes.map((e) => {
              const tema = data.topics.find((t) => t.id === e.topic_id)
              return (
                <div className="card" key={e.id}>
                  <div className="row top">
                    <Icon
                      name={KIND_ICON[e.kind]}
                      size={19}
                      style={{ marginTop: 2, color: KIND_TONE[e.kind] ? 'var(--alert)' : 'var(--ink-2)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row wrap">
                        <strong style={{ fontSize: 15.5 }}>{e.title || KIND_LABEL[e.kind]}</strong>
                        {e.severity !== null && <span className="sev-pill">{e.severity}/10</span>}
                      </div>
                      <p className="meta">
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
