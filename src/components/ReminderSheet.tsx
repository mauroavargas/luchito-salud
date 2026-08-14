import { useState } from 'react'
import Sheet from './Sheet'
import Icon from './Icon'
import { useApp } from '../lib/store'
import { REM_ICON, REM_LABEL, REPEAT_LABEL } from '../types'
import type { Reminder, ReminderKind, Repeat } from '../types'
import { downloadIcs } from '../lib/ics'
import { todayKey } from '../lib/nudges'

const KINDS: ReminderKind[] = ['tomar', 'reclamar', 'examen', 'documento', 'cita', 'otro']
const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly']

const PLANTILLAS: { kind: ReminderKind; title: string; repeat: Repeat }[] = [
  { kind: 'tomar', title: 'Tomarme el medicamento', repeat: 'daily' },
  { kind: 'reclamar', title: 'Reclamar medicamentos en la EPS', repeat: 'monthly' },
  { kind: 'examen', title: 'Sacar la cita del examen', repeat: 'none' },
  { kind: 'documento', title: 'Subir el resultado del examen', repeat: 'none' },
]

export default function ReminderSheet({
  reminder,
  onClose,
}: {
  reminder?: Reminder
  onClose: () => void
}) {
  const { data, addReminder, editReminder, removeReminder, say } = useApp()
  const [form, setForm] = useState<Partial<Reminder> & { title: string }>(
    reminder ?? { title: '', kind: 'tomar', repeat: 'daily', due_on: todayKey(), due_time: '08:00', active: true },
  )
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!form.title.trim()) {
      say('Escribe qué hay que recordar')
      return
    }
    setBusy(true)
    try {
      const patch = {
        title: form.title.trim(),
        kind: form.kind ?? 'otro',
        repeat: form.repeat ?? 'none',
        due_on: form.due_on || null,
        due_time: form.due_time || null,
        topic_id: form.topic_id ?? null,
        medication_id: form.medication_id ?? null,
        notes: form.notes || null,
        active: form.active ?? true,
      }
      if (reminder) await editReminder(reminder.id, patch)
      else await addReminder(patch)
      onClose()
    } catch {
      say('No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      onClose={onClose}
      footer={
        <div className="stack">
          <button className="btn block" onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
          {reminder && (
            <>
              <button className="btn ghost block" onClick={() => downloadIcs(reminder)}>
                <Icon name="calendario-mas" size={18} />
                Agregarlo al calendario del celular
              </button>
              <p className="meta center">
                Así el celular es el que te avisa, aunque no tengas la app abierta.
              </p>
              <button
                className="btn quiet danger"
                onClick={async () => {
                  if (!confirm('¿Borrar este recordatorio?')) return
                  await removeReminder(reminder.id)
                  onClose()
                }}
              >
                Borrar recordatorio
              </button>
            </>
          )}
        </div>
      }
    >
      {!reminder && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <h3 style={{ marginBottom: 'var(--s3)' }}>Los más comunes</h3>
          <div className="chips">
            {PLANTILLAS.map((p) => (
              <button
                key={p.title}
                className="chip"
                onClick={() => setForm({ ...form, ...p })}
              >
                <Icon name={REM_ICON[p.kind]} size={17} />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>¿Qué hay que recordar?</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ej: reclamar el ibuprofeno en la EPS"
        />
      </label>

      <div style={{ marginBottom: 'var(--s5)' }}>
        <h3 style={{ marginBottom: 'var(--s3)' }}>Tipo</h3>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k} className="chip" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k })}>
              <Icon name={REM_ICON[k]} size={17} />
              {REM_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 'var(--s5)' }}>
        <h3 style={{ marginBottom: 'var(--s3)' }}>¿Cada cuánto?</h3>
        <div className="chips">
          {REPEATS.map((rp) => (
            <button
              key={rp}
              className="chip"
              aria-pressed={(form.repeat ?? 'none') === rp}
              onClick={() => setForm({ ...form, repeat: rp })}
            >
              {REPEAT_LABEL[rp]}
            </button>
          ))}
        </div>
      </div>

      <div className="pair">
        <label className="field" style={{ flex: 1 }}>
          <span>{form.repeat === 'none' ? '¿Para qué día?' : 'Empezando el'}</span>
          <input
            type="date"
            value={form.due_on ?? ''}
            onChange={(e) => setForm({ ...form, due_on: e.target.value })}
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Hora</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.due_time ?? ''}
            onChange={(e) => setForm({ ...form, due_time: e.target.value })}
            placeholder="08:00"
          />
        </label>
      </div>

      <label className="field">
        <span>¿Es de algún medicamento?</span>
        <select
          value={form.medication_id ?? ''}
          onChange={(e) => setForm({ ...form, medication_id: e.target.value || null })}
        >
          <option value="">Ninguno</option>
          {data.medications.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>¿Es de algún tema?</span>
        <select value={form.topic_id ?? ''} onChange={(e) => setForm({ ...form, topic_id: e.target.value || null })}>
          <option value="">General</option>
          {data.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Nota</span>
        <textarea
          style={{ minHeight: 70 }}
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Ej: llevar la orden y la cédula"
        />
      </label>
    </Sheet>
  )
}
