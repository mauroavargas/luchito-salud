import { useMemo, useState } from 'react'
import EntrySheet from '../components/EntrySheet'
import TopicsSheet from '../components/TopicsSheet'
import Icon from '../components/Icon'
import { AttachmentGrid } from '../components/Photos'
import { useApp } from '../lib/store'
import { KIND_ICON, KIND_LABEL, KIND_TONE } from '../types'
import type { Entry } from '../types'
import { dayKey, fmtDayHeader, severityLabel } from '../lib/format'

export default function Historial() {
  const { data, loading, refresh } = useApp()
  const [topicFilter, setTopicFilter] = useState<string | 'todos'>('todos')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [showTopics, setShowTopics] = useState(false)

  const filtered = useMemo(
    () => (topicFilter === 'todos' ? data.entries : data.entries.filter((e) => e.topic_id === topicFilter)),
    [data.entries, topicFilter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of filtered) {
      const k = dayKey(e.occurred_at)
      const arr = map.get(k)
      if (arr) arr.push(e)
      else map.set(k, [e])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Historial</h1>
          <p className="sub">
            {data.entries.length === 0
              ? 'Sin registros todavía'
              : `${data.entries.length} registro${data.entries.length === 1 ? '' : 's'} en total`}
          </p>
        </div>
        <button className="btn ghost sm" onClick={() => setShowTopics(true)}>
          Temas
        </button>
      </header>

      {data.topics.length > 0 && (
        <div className="chips" style={{ marginBottom: 'var(--s5)' }}>
          <button className="chip" aria-pressed={topicFilter === 'todos'} onClick={() => setTopicFilter('todos')}>
            Todo
          </button>
          {data.topics.map((t) => (
            <button key={t.id} className="chip" aria-pressed={topicFilter === t.id} onClick={() => setTopicFilter(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {loading && data.entries.length === 0 && <p className="meta">Cargando…</p>}

      {groups.length === 0 ? (
        <div className="empty">
          {topicFilter === 'todos' ? (
            <>
              Todavía no hay nada anotado.
              <br />
              Empieza por lo que más te preocupa hoy, desde la pestaña Hoy.
            </>
          ) : (
            <>
              No hay registros de este tema.
              <br />
              <button className="btn quiet" onClick={() => setTopicFilter('todos')}>
                Ver todo el historial
              </button>
            </>
          )}
          {topicFilter === 'todos' && (
            <div>
              <button className="btn quiet" style={{ marginTop: 'var(--s3)' }} onClick={() => void refresh()}>
                Volver a cargar
              </button>
            </div>
          )}
        </div>
      ) : (
        groups.map(([key, list]) => (
          <section key={key}>
            <h2 className="section">{fmtDayHeader(list[0].occurred_at)}</h2>
            <div className="stack">
              {list.map((e) => {
                const tema = data.topics.find((t) => t.id === e.topic_id)
                const fotos = data.attachments.filter((a) => a.entry_id === e.id)
                return (
                  <button className="card tappable" key={e.id} onClick={() => setEditing(e)}>
                    <div className="row top">
                      <Icon
                        name={KIND_ICON[e.kind]}
                        size={19}
                        style={{ marginTop: 2, color: KIND_TONE[e.kind] ? 'var(--alert)' : 'var(--ink-2)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row wrap">
                          <strong style={{ fontSize: 15.5 }}>{e.title || KIND_LABEL[e.kind]}</strong>
                          {e.severity !== null && (
                            <span className="sev-pill">
                              {e.severity}/10 {severityLabel(e.severity)}
                            </span>
                          )}
                        </div>
                        <p className="meta" style={{ marginTop: 2 }}>
                          <time dateTime={e.occurred_at}>
                            {new Date(e.occurred_at).toLocaleTimeString('es-CO', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </time>
                          {tema ? ` · ${tema.name}` : ''}
                        </p>
                        {e.note && (
                          <p className="small measure" style={{ marginTop: 'var(--s2)' }}>
                            {e.note}
                          </p>
                        )}
                        {fotos.length > 0 && (
                          <div style={{ marginTop: 'var(--s3)' }}>
                            <AttachmentGrid attachments={fotos} />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))
      )}

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
      {showTopics && <TopicsSheet onClose={() => setShowTopics(false)} />}
    </>
  )
}
