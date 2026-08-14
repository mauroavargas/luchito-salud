import { useMemo, useState } from 'react'
import EntrySheet from '../components/EntrySheet'
import TopicsSheet from '../components/TopicsSheet'
import { AttachmentGrid } from '../components/Photos'
import { useApp } from '../lib/store'
import { KIND_EMOJI, KIND_LABEL } from '../types'
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
      <div className="topbar">
        <div>
          <h1>Historial</h1>
          <p className="sub">{data.entries.length} registro(s) en total</p>
        </div>
        <button className="btn ghost small-btn" onClick={() => setShowTopics(true)}>
          Temas
        </button>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        <button className="chip" aria-pressed={topicFilter === 'todos'} onClick={() => setTopicFilter('todos')}>
          Todo
        </button>
        {data.topics.map((t) => (
          <button key={t.id} className="chip" aria-pressed={topicFilter === t.id} onClick={() => setTopicFilter(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {loading && <p className="small muted" style={{ marginBottom: 10 }}>Actualizando…</p>}

      {groups.length === 0 ? (
        <div className="empty">
          Nada por aquí todavía.
          <br />
          <button className="btn link" onClick={() => void refresh()}>
            Volver a cargar
          </button>
        </div>
      ) : (
        groups.map(([key, list]) => (
          <div key={key}>
            <div className="section-title">{fmtDayHeader(list[0].occurred_at)}</div>
            <div className="stack">
              {list.map((e) => {
                const tema = data.topics.find((t) => t.id === e.topic_id)
                const fotos = data.attachments.filter((a) => a.entry_id === e.id)
                return (
                  <div className="card tap" key={e.id} onClick={() => setEditing(e)}>
                    <div className="row" style={{ alignItems: 'flex-start' }}>
                      <span aria-hidden style={{ fontSize: 20 }}>
                        {KIND_EMOJI[e.kind]}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row wrap" style={{ gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>{e.title || KIND_LABEL[e.kind]}</strong>
                          {e.severity !== null && (
                            <span className="sev-pill">
                              {e.severity}/10 {severityLabel(e.severity)}
                            </span>
                          )}
                        </div>
                        <p className="tiny muted" style={{ marginTop: 2 }}>
                          {new Date(e.occurred_at).toLocaleTimeString('es-CO', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {tema ? ` · ${tema.name}` : ''}
                        </p>
                        {e.note && (
                          <p className="small" style={{ marginTop: 8 }}>
                            {e.note}
                          </p>
                        )}
                        {fotos.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <AttachmentGrid attachments={fotos} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {editing && <EntrySheet entry={editing} onClose={() => setEditing(null)} />}
      {showTopics && <TopicsSheet onClose={() => setShowTopics(false)} />}
    </>
  )
}
