import { useMemo, useState } from 'react'
import ProfileSheet from '../components/ProfileSheet'
import EntrySheet from '../components/EntrySheet'
import { AttachmentGrid } from '../components/Photos'
import { useApp } from '../lib/store'
import { buildSummary, summaryText } from '../lib/summary'
import { EFFECT_LABEL, KIND_LABEL, STATUS_LABEL } from '../types'
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

  async function copiar() {
    const text = summaryText(data, s)
    try {
      if (navigator.share) await navigator.share({ title: 'Resumen de salud', text })
      else {
        await navigator.clipboard.writeText(text)
        say('Resumen copiado. Pégalo donde lo necesites.')
      }
    } catch {
      /* el usuario canceló */
    }
  }

  return (
    <>
      <div className="topbar no-print">
        <div>
          <h1>Mi resumen</h1>
          <p className="sub">Para mostrarle al médico</p>
        </div>
        <button className="btn ghost small-btn" onClick={() => setShowProfile(true)}>
          Mis datos
        </button>
      </div>

      <div className="row no-print" style={{ marginBottom: 18, gap: 8 }}>
        <button className="btn small-btn" style={{ flex: 1 }} onClick={() => window.print()}>
          🖨️ Imprimir / PDF
        </button>
        <button className="btn ghost small-btn" style={{ flex: 1 }} onClick={copiar}>
          📤 Compartir texto
        </button>
      </div>

      <div className="summary">
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 className="print-only" style={{ marginBottom: 8 }}>
            Resumen de salud
          </h2>
          {p?.full_name ? <strong style={{ fontSize: 18 }}>{p.full_name}</strong> : null}
          <dl className="kv" style={{ marginTop: 8 }}>
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
            <button className="btn link no-print" style={{ marginTop: 6 }} onClick={() => setShowProfile(true)}>
              + Completar mis datos
            </button>
          )}
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>
          Motivos de consulta
        </div>

        {s.topics.length === 0 && s.general.length === 0 ? (
          <div className="empty">
            Aún no hay nada que resumir.
            <br />
            Anota lo que te pasa desde la pestaña “Registrar”.
          </div>
        ) : (
          <div className="stack">
            {s.topics.map((t) => {
              const abierto = openTopic === t.topic.id
              const desde = t.topic.started_on ?? t.firstAt
              const visibles = abierto ? t.entries : t.entries.slice(0, 3)
              return (
                <div className="card" key={t.topic.id}>
                  <div className="row wrap" style={{ alignItems: 'flex-start' }}>
                    <h3 style={{ flex: 1, minWidth: 0 }}>{t.topic.name}</h3>
                    <span
                      className={`badge${
                        t.topic.status === 'resuelto' ? ' grey' : t.topic.status === 'activo' ? ' alert' : ''
                      }`}
                    >
                      {STATUS_LABEL[t.topic.status]}
                    </span>
                  </div>

                  <p className="small muted" style={{ marginTop: 4 }}>
                    {desde ? `Desde ${fmtDate(desde)} (${since(desde)}). ` : ''}
                    {t.count} episodio(s) anotado(s)
                    {t.maxSeverity !== null
                      ? `. Intensidad máxima ${t.maxSeverity}/10, promedio ${t.avgSeverity}/10`
                      : ''}
                    {t.photos > 0 ? `. ${t.photos} foto(s)` : ''}
                  </p>

                  {t.topic.description && (
                    <p className="small" style={{ marginTop: 8 }}>
                      {t.topic.description}
                    </p>
                  )}

                  {visibles.length > 0 && (
                    <ul className="timeline">
                      {visibles.map((e) => {
                        const fotos = data.attachments.filter((a) => a.entry_id === e.id)
                        return (
                          <li key={e.id}>
                            <strong>{fmtDate(e.occurred_at)}</strong>
                            {e.severity !== null && <span className="sev-pill" style={{ marginLeft: 8 }}>{e.severity}/10</span>}
                            <div>
                              {e.title || KIND_LABEL[e.kind]}
                              {e.note ? ` — ${e.note}` : ''}
                            </div>
                            {abierto && fotos.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <AttachmentGrid attachments={fotos} />
                              </div>
                            )}
                            {abierto && (
                              <button className="btn link no-print tiny" onClick={() => setDetail(e)}>
                                Editar este registro
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {t.meds.length > 0 && (
                    <p className="small" style={{ marginTop: 10 }}>
                      <strong>Tratamiento probado: </strong>
                      {t.meds.map((m) => `${m.name} (${EFFECT_LABEL[m.effect].toLowerCase()})`).join(', ')}
                    </p>
                  )}

                  {t.entries.length > 3 && (
                    <button
                      className="btn link no-print"
                      style={{ marginTop: 6 }}
                      onClick={() => setOpenTopic(abierto ? null : t.topic.id)}
                    >
                      {abierto ? 'Ver menos' : `Ver los ${t.entries.length} registros y las fotos`}
                    </button>
                  )}
                </div>
              )
            })}

            {s.general.length > 0 && (
              <div className="card">
                <h3>Otros registros</h3>
                <ul className="timeline">
                  {s.general.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      <strong>{fmtDate(e.occurred_at)}</strong>
                      {e.severity !== null && <span className="sev-pill" style={{ marginLeft: 8 }}>{e.severity}/10</span>}
                      <div>
                        {e.title || KIND_LABEL[e.kind]}
                        {e.note ? ` — ${e.note}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {s.medsActivos.length > 0 && (
          <>
            <div className="section-title">Medicamentos que toma ahora</div>
            <div className="card">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {s.medsActivos.map((m) => (
                  <li key={m.id} style={{ marginBottom: 6 }}>
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
            <div className="section-title">Ya probó y no le sirvió</div>
            <div className="card" style={{ borderColor: 'var(--alert)' }}>
              <p className="small">
                {s.medsFallidos.map((m) => `${m.name} (${EFFECT_LABEL[m.effect].toLowerCase()})`).join(' · ')}
              </p>
            </div>
          </>
        )}

        <div className="section-title">Preguntas para el médico</div>
        <div className="card">
          {s.preguntas.length === 0 ? (
            <p className="small muted">No hay preguntas anotadas todavía.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {s.preguntas.map((q) => (
                <li key={q.id} style={{ marginBottom: 8 }}>
                  {q.title || q.note}
                  <button
                    className="btn link no-print"
                    style={{ marginLeft: 6, fontSize: 13 }}
                    onClick={() => void editEntry(q.id, { resolved: true })}
                  >
                    ya me la respondieron
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn ghost small-btn no-print" style={{ marginTop: 12 }} onClick={() => setNewQuestion(true)}>
            + Anotar una pregunta
          </button>
        </div>

        <p className="tiny muted center" style={{ margin: '26px 0 10px' }}>
          Documento hecho por la paciente. No reemplaza una valoración médica.
        </p>
      </div>

      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
      {newQuestion && <EntrySheet defaultKind="pregunta" onClose={() => setNewQuestion(false)} />}
      {detail && <EntrySheet entry={detail} onClose={() => setDetail(null)} />}
    </>
  )
}
