import { useState } from 'react'
import Sheet from '../components/Sheet'
import Icon from '../components/Icon'
import { useApp } from '../lib/store'
import { EFFECT_LABEL } from '../types'
import type { MedEffect, Medication } from '../types'
import { fmtDate } from '../lib/format'

const EFFECTS: MedEffect[] = ['ayuda', 'ayuda_poco', 'no_ayuda', 'empeora', 'sin_saber']

const EFFECT_BADGE: Record<MedEffect, string> = {
  ayuda: 'badge',
  ayuda_poco: 'badge warn',
  no_ayuda: 'badge alert',
  empeora: 'badge alert',
  sin_saber: 'badge grey',
}

type Draft = Partial<Medication> & { name: string }

export default function Medicinas() {
  const { data, addMed, editMed, removeMed } = useApp()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activos = data.medications.filter((m) => !m.ended_on)
  const pasados = data.medications.filter((m) => m.ended_on)

  async function save() {
    if (!draft?.name.trim()) {
      setError('Escribe el nombre del medicamento.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const patch = {
        name: draft.name.trim(),
        dose: draft.dose || null,
        frequency: draft.frequency || null,
        started_on: draft.started_on || null,
        ended_on: draft.ended_on || null,
        effect: draft.effect ?? 'sin_saber',
        side_effects: draft.side_effects || null,
        prescribed_by: draft.prescribed_by || null,
        notes: draft.notes || null,
        topic_id: draft.topic_id ?? null,
      }
      if (draft.id) await editMed(draft.id, patch)
      else await addMed(patch)
      setDraft(null)
    } catch {
      setError('No se pudo guardar. Revisa la señal e inténtalo otra vez.')
    } finally {
      setBusy(false)
    }
  }

  const Card = ({ m }: { m: Medication }) => (
    <button className="card tappable" onClick={() => setDraft(m)}>
      <div className="row top">
        <Icon name="medicamento" size={19} style={{ marginTop: 2, color: 'var(--ink-2)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 15.5 }}>{m.name}</strong>
          <p className="meta" style={{ marginTop: 2 }}>
            {[m.dose, m.frequency].filter(Boolean).join(' · ') || 'Sin dosis anotada'}
          </p>
          {m.side_effects && (
            <p className="small" style={{ marginTop: 'var(--s2)', color: 'var(--alert-ink)' }}>
              Efectos: {m.side_effects}
            </p>
          )}
        </div>
        <span className={EFFECT_BADGE[m.effect]}>{EFFECT_LABEL[m.effect]}</span>
      </div>
    </button>
  )

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Medicamentos</h1>
          <p className="sub">Qué tomas y si te está sirviendo</p>
        </div>
        <button className="btn sm" onClick={() => setDraft({ name: '', effect: 'sin_saber' })}>
          <Icon name="mas" size={16} />
          Agregar
        </button>
      </header>

      <p className="small muted measure" style={{ marginBottom: 'var(--s5)' }}>
        Anotar qué ya probaste y no te funcionó le ahorra al médico volver a mandarte lo mismo.
      </p>

      <h2 className="section" style={{ marginTop: 0 }}>
        Los que tomas ahora
      </h2>
      {activos.length === 0 ? (
        <p className="empty">No hay medicamentos activos anotados.</p>
      ) : (
        <div className="stack">
          {activos.map((m) => (
            <Card key={m.id} m={m} />
          ))}
        </div>
      )}

      {pasados.length > 0 && (
        <>
          <h2 className="section">Los que ya tomaste antes</h2>
          <div className="stack">
            {pasados.map((m) => (
              <Card key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {draft && (
        <Sheet
          title={draft.id ? 'Editar medicamento' : 'Nuevo medicamento'}
          onClose={() => {
            setDraft(null)
            setError(null)
          }}
          footer={
            <div className="stack">
              {error && (
                <p className="small" style={{ color: 'var(--alert-ink)' }} role="alert">
                  {error}
                </p>
              )}
              <button className="btn block" onClick={save} disabled={busy}>
                {busy ? 'Guardando…' : 'Guardar'}
              </button>
              {draft.id && (
                <button
                  className="btn quiet danger"
                  onClick={async () => {
                    if (!confirm('¿Borrar este medicamento?')) return
                    await removeMed(draft.id!)
                    setDraft(null)
                  }}
                >
                  <Icon name="basura" size={17} />
                  Borrar
                </button>
              )}
            </div>
          }
        >
          <label className="field">
            <span>Nombre</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej: Ibuprofeno 400 mg"
            />
          </label>
          <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Dosis</span>
              <input
                type="text"
                value={draft.dose ?? ''}
                onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
                placeholder="1 tableta"
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Cada cuánto</span>
              <input
                type="text"
                value={draft.frequency ?? ''}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                placeholder="cada 8 horas"
              />
            </label>
          </div>

          <div style={{ marginBottom: 'var(--s5)' }}>
            <h3 style={{ marginBottom: 'var(--s3)' }}>¿Te está sirviendo?</h3>
            <div className="chips">
              {EFFECTS.map((ef) => (
                <button
                  key={ef}
                  className={`chip${ef === 'no_ayuda' || ef === 'empeora' ? ' alert' : ''}`}
                  aria-pressed={(draft.effect ?? 'sin_saber') === ef}
                  onClick={() => setDraft({ ...draft, effect: ef })}
                >
                  {EFFECT_LABEL[ef]}
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Desde</span>
              <input
                type="date"
                value={draft.started_on ?? ''}
                onChange={(e) => setDraft({ ...draft, started_on: e.target.value })}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Hasta (si ya lo dejaste)</span>
              <input
                type="date"
                value={draft.ended_on ?? ''}
                onChange={(e) => setDraft({ ...draft, ended_on: e.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>¿Te cayó mal en algo?</span>
            <input
              type="text"
              value={draft.side_effects ?? ''}
              onChange={(e) => setDraft({ ...draft, side_effects: e.target.value })}
              placeholder="Ej: me dio dolor de estómago"
            />
          </label>
          <label className="field">
            <span>¿Quién te lo mandó?</span>
            <input
              type="text"
              value={draft.prescribed_by ?? ''}
              onChange={(e) => setDraft({ ...draft, prescribed_by: e.target.value })}
              placeholder="Ej: Dr. Pérez, o me lo tomé por mi cuenta"
            />
          </label>
          <label className="field">
            <span>¿Es de algún tema?</span>
            <select
              value={draft.topic_id ?? ''}
              onChange={(e) => setDraft({ ...draft, topic_id: e.target.value || null })}
            >
              <option value="">General</option>
              {data.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Notas</span>
            <textarea
              style={{ minHeight: 80 }}
              value={draft.notes ?? ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Ej: me calma como 2 horas y vuelve el dolor"
            />
          </label>
          {draft.created_at && <p className="meta">Anotado el {fmtDate(draft.created_at)}</p>}
        </Sheet>
      )}
    </>
  )
}
