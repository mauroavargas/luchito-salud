import { useMemo, useState } from 'react'
import ProfileSheet from '../components/ProfileSheet'
import EntrySheet from '../components/EntrySheet'
import Icon from '../components/Icon'
import { AttachmentGrid } from '../components/Photos'
import { useApp } from '../lib/store'
import { buildSummary, summaryText } from '../lib/summary'
import { DOC_LABEL, EFFECT_LABEL, KIND_LABEL, REM_LABEL, STATUS_LABEL } from '../types'
import type { Entry } from '../types'
import { fmtDate, since } from '../lib/format'

export default function Resumen() {
  const { data, editEntry, say } = useApp()
  const [showProfile, setShowProfile] = useState(false)
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState(false)
  const [detail, setDetail] = useState<Entry | null>(null)

  const s = useMemo(() => buildSummary(data), [data])
  const p = data.profile
  const hoy = fmtDate(new Date().toISOString())

  async function compartir() {
    const text = summaryText(data, s)
    try {
      if (navigator.share) await navigator.share({ title: 'Resumen de salud', text })
      else {
        await navigator.clipboard.writeText(text)
        say('Resumen copiado. Pégalo donde lo necesites.')
      }
    } catch {
      /* la persona canceló el diálogo del sistema */
    }
  }

  const badgeTema = (estado: string) =>
    `badge${estado === 'resuelto' ? ' grey' : estado === 'activo' ? ' alert' : ''}`

  return (
    <>
      <header className="topbar no-print">
        <div>
          <h1>Mi resumen</h1>
          <p className="sub">Para mostrarle al médico</p>
        </div>
        <button className="btn ghost sm" onClick={() => setShowProfile(true)}>
          <Icon name="usuario" size={16} />
          Mis datos
        </button>
      </header>

      <div className="row no-print" style={{ marginBottom: 'var(--s6)' }}>
        <button className="btn sm" style={{ flex: 1 }} onClick={() => window.print()}>
          <Icon name="imprimir" size={17} />
          Imprimir / PDF
        </button>
        <button className="btn ghost sm" style={{ flex: 1 }} onClick={compartir}>
          <Icon name="compartir" size={17} />
          Compartir texto
        </button>
      </div>

      <div className="summary">
        <div className="card">
          <h2 className="print-only" style={{ marginBottom: 'var(--s2)' }}>
            Resumen de salud
          </h2>
          {p?.full_name ? <strong style={{ fontSize: 17 }}>{p.full_name}</strong> : null}
          <dl className="kv">
            {p?.birth_date && (
              <>
                <dt>Nacimiento</dt>
                <dd>{fmtDate(p.birth_date)}</dd>
              </>
            )}
            {p?.insurance && (
              <>
                <dt>EPS</dt>
                <dd>{p.insurance}</dd>
              </>
            )}
            {p?.blood_type && (
              <>
                <dt>Sangre</dt>
                <dd>{p.blood_type}</dd>
              </>
            )}
            <dt>Alergias</dt>
            <dd>{p?.allergies || 'sin anotar'}</dd>
            {p?.conditions && (
              <>
                <dt>Antecedentes</dt>
                <dd style={{ fontWeight: 500 }}>{p.conditions}</dd>
              </>
            )}
            <dt>Fecha</dt>
            <dd>{hoy}</dd>
          </dl>
          {!p?.full_name && (
            <button className="btn quiet no-print" style={{ marginTop: 'var(--s2)' }} onClick={() => setShowProfile(true)}>
              <Icon name="mas" size={16} />
              Completar mis datos
            </button>
          )}
        </div>

        <h2 className="section">Motivos de consulta</h2>

        {s.topics.length === 0 && s.general.length === 0 ? (
          <div className="empty">
            Aún no hay nada que resumir.
            <br />
            Anota lo que te pasa desde la pestaña Hoy.
          </div>
        ) : (
          <div className="stack">
            {s.topics.map((t) => {
              const abierto = openTopic === t.topic.id
              const desde = t.topic.started_on ?? t.firstAt
              const visibles = abierto ? t.entries : t.entries.slice(0, 3)
              return (
                <article className="card" key={t.topic.id}>
                  <div className="row wrap top">
                    <h3 style={{ flex: 1, minWidth: 0 }}>{t.topic.name}</h3>
                    <span className={badgeTema(t.topic.status)}>{STATUS_LABEL[t.topic.status]}</span>
                  </div>

                  <p className="meta" style={{ marginTop: 'var(--s1)' }}>
                    {desde ? `Desde ${fmtDate(desde)} (${since(desde)}). ` : ''}
                    {t.count} episodio{t.count === 1 ? '' : 's'} anotado{t.count === 1 ? '' : 's'}
                    {t.maxSeverity !== null
                      ? `. Intensidad máxima ${t.maxSeverity}/10, promedio ${t.avgSeverity}/10`
                      : ''}
                    {t.photos > 0 ? `. ${t.photos} foto${t.photos === 1 ? '' : 's'}` : ''}
                  </p>

                  {t.topic.description && (
                    <p className="small measure" style={{ marginTop: 'var(--s3)' }}>
                      {t.topic.description}
                    </p>
                  )}

                  {visibles.length > 0 && (
                    <ul className="timeline">
                      {visibles.map((e) => {
                        const fotos = data.attachments.filter((a) => a.entry_id === e.id)
                        return (
                          <li key={e.id}>
                            <time dateTime={e.occurred_at}>{fmtDate(e.occurred_at)}</time>
                            {e.severity !== null && (
                              <span className="sev-pill" style={{ marginLeft: 'var(--s2)' }}>
                                {e.severity}/10
                              </span>
                            )}
                            <div>
                              {e.title || KIND_LABEL[e.kind]}
                              {e.note ? ` — ${e.note}` : ''}
                            </div>
                            {abierto && fotos.length > 0 && (
                              <div style={{ marginTop: 'var(--s2)' }}>
                                <AttachmentGrid attachments={fotos} />
                              </div>
                            )}
                            {abierto && (
                              <button className="btn quiet no-print" onClick={() => setDetail(e)}>
                                Editar este registro
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {t.docs.length > 0 && (
                    <p className="small" style={{ marginTop: 'var(--s3)' }}>
                      <strong>Documentos: </strong>
                      {t.docs
                        .map((d) => `${DOC_LABEL[d.kind]} “${d.title}”${d.doc_date ? ` (${fmtDate(d.doc_date)})` : ''}`)
                        .join(', ')}
                    </p>
                  )}

                  {t.meds.length > 0 && (
                    <p className="small" style={{ marginTop: 'var(--s3)' }}>
                      <strong>Tratamiento probado: </strong>
                      {t.meds.map((m) => `${m.name} (${EFFECT_LABEL[m.effect].toLowerCase()})`).join(', ')}
                    </p>
                  )}

                  {t.entries.length > 3 && (
                    <button
                      className="btn quiet no-print"
                      style={{ marginTop: 'var(--s2)' }}
                      onClick={() => setOpenTopic(abierto ? null : t.topic.id)}
                    >
                      {abierto ? 'Ver menos' : `Ver los ${t.entries.length} registros y las fotos`}
                      <Icon
                        name="chevron"
                        size={15}
                        style={{ transform: abierto ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                      />
                    </button>
                  )}
                </article>
              )
            })}

            {s.general.length > 0 && (
              <article className="card">
                <h3>Otros registros</h3>
                <ul className="timeline">
                  {s.general.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      <time dateTime={e.occurred_at}>{fmtDate(e.occurred_at)}</time>
                      {e.severity !== null && (
                        <span className="sev-pill" style={{ marginLeft: 'var(--s2)' }}>
                          {e.severity}/10
                        </span>
                      )}
                      <div>
                        {e.title || KIND_LABEL[e.kind]}
                        {e.note ? ` — ${e.note}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        )}

        {s.medsActivos.length > 0 && (
          <>
            <h2 className="section">Medicamentos que toma ahora</h2>
            <div className="card">
              <ul className="list-plain">
                {s.medsActivos.map((m) => (
                  <li key={m.id}>
                    <strong>{m.name}</strong>
                    {m.dose ? ` ${m.dose}` : ''}
                    {m.frequency ? `, ${m.frequency}` : ''} — {EFFECT_LABEL[m.effect].toLowerCase()}
                    {m.side_effects ? ` (efectos: ${m.side_effects})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {s.medsFallidos.length > 0 && (
          <>
            <h2 className="section">Ya probó y no le sirvió</h2>
            <div className="card" style={{ borderColor: 'var(--alert)' }}>
              <p className="small">
                {s.medsFallidos.map((m) => `${m.name} (${EFFECT_LABEL[m.effect].toLowerCase()})`).join(' · ')}
              </p>
            </div>
          </>
        )}

        {s.adherencia.length > 0 && (
          <>
            <h2 className="section">Cumplimiento del tratamiento</h2>
            <div className="card">
              <ul className="list-plain">
                {s.adherencia.map((a) => (
                  <li key={a.reminder.id}>
                    <strong>{a.reminder.title}</strong>: {a.done} de los últimos {a.days} días
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {s.tramites.length > 0 && (
          <>
            <h2 className="section">Trámites pendientes</h2>
            <div className="card" style={{ borderColor: 'var(--warn)' }}>
              <ul className="list-plain">
                {s.tramites.map((t) => (
                  <li key={t.reminder.id}>
                    {REM_LABEL[t.reminder.kind]}: <strong>{t.reminder.title}</strong>
                    {t.overdue > 0 && (
                      <span style={{ color: 'var(--alert-ink)' }}> — atrasado {t.overdue} día(s)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {s.documents.filter((d) => !d.topic_id).length > 0 && (
          <>
            <h2 className="section">Otros documentos guardados</h2>
            <div className="card">
              <ul className="list-plain">
                {s.documents
                  .filter((d) => !d.topic_id)
                  .map((d) => (
                    <li key={d.id}>
                      {DOC_LABEL[d.kind]}: <strong>{d.title}</strong>
                      {d.doc_date ? ` (${fmtDate(d.doc_date)})` : ''}
                    </li>
                  ))}
              </ul>
            </div>
          </>
        )}

        <h2 className="section">Preguntas para el médico</h2>
        <div className="card">
          {s.preguntas.length === 0 ? (
            <p className="small muted">No hay preguntas anotadas todavía.</p>
          ) : (
            <ul className="list-plain">
              {s.preguntas.map((q) => (
                <li key={q.id} style={{ marginBottom: 'var(--s2)' }}>
                  {q.title || q.note}
                  <button
                    className="btn quiet no-print"
                    style={{ marginLeft: 'var(--s2)', fontSize: 13.5 }}
                    onClick={() => void editEntry(q.id, { resolved: true })}
                  >
                    ya me la respondieron
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            className="btn ghost sm no-print"
            style={{ marginTop: 'var(--s4)' }}
            onClick={() => setNewQuestion(true)}
          >
            <Icon name="mas" size={16} />
            Anotar una pregunta
          </button>
        </div>

        <p className="meta center" style={{ margin: 'var(--s8) 0 var(--s3)' }}>
          Documento hecho por la paciente. No reemplaza una valoración médica.
        </p>
      </div>

      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
      {newQuestion && <EntrySheet defaultKind="pregunta" onClose={() => setNewQuestion(false)} />}
      {detail && <EntrySheet entry={detail} onClose={() => setDetail(null)} />}
    </>
  )
}
