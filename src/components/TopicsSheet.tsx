import { useState } from 'react'
import Sheet from './Sheet'
import { useApp } from '../lib/store'
import { STATUS_LABEL } from '../types'
import type { Topic, TopicStatus } from '../types'

const STATUSES: TopicStatus[] = ['activo', 'seguimiento', 'resuelto']

export default function TopicsSheet({ onClose }: { onClose: () => void }) {
  const { data, addTopic, editTopic, removeTopic, say } = useApp()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Topic | null>(null)
  const [busy, setBusy] = useState(false)

  const count = (id: string) => data.entries.filter((e) => e.topic_id === id).length

  return (
    <Sheet title="Mis temas de salud" onClose={onClose}>
      <p className="small muted" style={{ marginBottom: 'var(--s5)' }}>
        Un tema es cada problema que estás viviendo: la escoliosis, lo del seno, el insomnio. Así el
        médico ve cada cosa por aparte y no todo revuelto.
      </p>

      <div className="card" style={{ marginBottom: 'var(--s6)' }}>
        <label className="field" style={{ marginBottom: 'var(--s3)' }}>
          <span>Agregar un tema</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: dolor y sangrado en el seno derecho"
          />
        </label>
        <button
          className="btn block"
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              await addTopic({ name: name.trim(), status: 'activo' })
              setName('')
              say('Tema agregado')
            } catch {
              say('No se pudo agregar el tema')
            } finally {
              setBusy(false)
            }
          }}
        >
          Agregar
        </button>
      </div>

      {data.topics.length === 0 ? (
        <div className="empty">Aún no hay temas.</div>
      ) : (
        <div className="stack">
          {data.topics.map((t) => (
            <div className="card" key={t.id}>
              {editing?.id === t.id ? (
                <div className="stack">
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>Nombre</span>
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>¿Desde cuándo te pasa?</span>
                    <input
                      type="date"
                      value={editing.started_on ?? ''}
                      onChange={(e) => setEditing({ ...editing, started_on: e.target.value || null })}
                    />
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>Detalle para el médico</span>
                    <textarea
                      style={{ minHeight: 80 }}
                      value={editing.description ?? ''}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value || null })}
                      placeholder="Contexto: diagnóstico previo, qué te han dicho, qué te preocupa"
                    />
                  </label>
                  <div>
                    <h3 style={{ marginBottom: 'var(--s3)' }}>Estado</h3>
                    <div className="chips">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          className="chip"
                          aria-pressed={editing.status === s}
                          onClick={() => setEditing({ ...editing, status: s })}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="row">
                    <button
                      className="btn sm"
                      onClick={async () => {
                        await editTopic(t.id, {
                          name: editing.name.trim() || t.name,
                          started_on: editing.started_on,
                          description: editing.description,
                          status: editing.status,
                        })
                        setEditing(null)
                        say('Tema actualizado')
                      }}
                    >
                      Guardar
                    </button>
                    <button className="btn ghost sm" onClick={() => setEditing(null)}>
                      Cancelar
                    </button>
                    <div className="spacer" />
                    <button
                      className="btn quiet danger"
                      onClick={async () => {
                        if (!confirm(`¿Borrar el tema "${t.name}"? Los registros se conservan.`)) return
                        await removeTopic(t.id)
                        setEditing(null)
                      }}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{t.name}</strong>
                    <p className="meta" style={{ marginTop: 'var(--s1)' }}>
                      {count(t.id)} registro(s)
                      {t.started_on ? ` · desde ${t.started_on}` : ''}
                    </p>
                  </div>
                  <span className={`badge${t.status === 'resuelto' ? ' grey' : t.status === 'activo' ? ' alert' : ''}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  <button className="btn quiet" onClick={() => setEditing(t)}>
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
