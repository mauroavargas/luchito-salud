import { useMemo, useState } from 'react'
import Sheet from './Sheet'
import { PhotoPicker, AttachmentGrid } from './Photos'
import { useApp } from '../lib/store'
import { KIND_EMOJI, KIND_LABEL } from '../types'
import type { Entry, EntryKind } from '../types'
import { fromLocalInput, severityLabel, toLocalInput } from '../lib/format'

const KINDS: EntryKind[] = [
  'dolor',
  'sangrado',
  'sintoma',
  'medicamento',
  'animo',
  'pregunta',
  'examen',
  'cita',
  'otro',
]

const HINT: Record<EntryKind, string> = {
  dolor: 'Ej: dolor fuerte en la espalda baja, me costó levantarme',
  sangrado: 'Ej: salió sangre del seno derecho, manchó el brasier',
  sintoma: 'Ej: bulto que se siente duro al tocar, no dolía antes',
  medicamento: 'Ej: tomé el ibuprofeno, me calmó como 2 horas y volvió',
  animo: 'Ej: no dormí del dolor, me sentí desanimada todo el día',
  examen: 'Ej: me hicieron ecografía, me entregan resultado el lunes',
  cita: 'Ej: fui a control, el médico dijo que...',
  pregunta: 'Ej: ¿esto del seno puede ser grave? ¿me pueden mandar una ecografía?',
  otro: 'Cuenta con tus palabras qué pasó',
}

const NEEDS_SEVERITY: EntryKind[] = ['dolor', 'sangrado', 'sintoma', 'animo']

export default function EntrySheet({
  entry,
  defaultKind = 'dolor',
  defaultTopicId = null,
  onClose,
}: {
  entry?: Entry
  defaultKind?: EntryKind
  defaultTopicId?: string | null
  onClose: () => void
}) {
  const { data, addEntry, editEntry, removeEntry, addTopic, addPhotos, removePhoto, say } = useApp()

  const [kind, setKind] = useState<EntryKind>(entry?.kind ?? defaultKind)
  const [when, setWhen] = useState(() => toLocalInput(entry ? new Date(entry.occurred_at) : new Date()))
  const [topicId, setTopicId] = useState<string | null>(entry?.topic_id ?? defaultTopicId)
  const [severity, setSeverity] = useState<number | null>(entry?.severity ?? null)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [busy, setBusy] = useState(false)

  const attachments = useMemo(
    () => (entry ? data.attachments.filter((a) => a.entry_id === entry.id) : []),
    [data.attachments, entry],
  )

  async function save() {
    if (!note.trim() && !title.trim()) {
      say('Escribe al menos una nota corta de lo que pasó')
      return
    }
    setBusy(true)
    try {
      let finalTopic = topicId
      if (newTopic.trim()) {
        const t = await addTopic({ name: newTopic.trim(), status: 'activo' })
        finalTopic = t.id
      }
      const payload = {
        topic_id: finalTopic,
        occurred_at: fromLocalInput(when),
        kind,
        title: title.trim() || null,
        note: note.trim() || null,
        severity: NEEDS_SEVERITY.includes(kind) ? severity : null,
      }
      if (entry) {
        await editEntry(entry.id, payload)
        if (files.length) await addPhotos(entry.id, files)
        say('Registro actualizado')
      } else {
        await addEntry(payload, files)
      }
      onClose()
    } catch (e) {
      say(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={entry ? 'Editar registro' : '¿Qué pasó?'}
      onClose={onClose}
      footer={
        <div className="stack">
          <button className="btn block" onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
          {entry && (
            <button
              className="btn link"
              style={{ color: 'var(--alert)' }}
              onClick={async () => {
                if (!confirm('¿Borrar este registro?')) return
                await removeEntry(entry.id)
                say('Registro borrado')
                onClose()
              }}
            >
              Borrar registro
            </button>
          )}
        </div>
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <span className="section-title" style={{ marginTop: 0 }}>
            Tipo
          </span>
          <div className="chips">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={`chip${k === 'sangrado' || k === 'dolor' ? ' alert' : ''}`}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                <span aria-hidden>{KIND_EMOJI[k]}</span>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field" style={{ marginBottom: 8 }}>
            <span>¿Cuándo fue?</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <div className="chips">
            <button className="chip" type="button" onClick={() => setWhen(toLocalInput(new Date()))}>
              Ahora
            </button>
            <button
              className="chip"
              type="button"
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() - 1)
                setWhen(toLocalInput(d))
              }}
            >
              Ayer
            </button>
          </div>
        </div>

        {NEEDS_SEVERITY.includes(kind) && (
          <div>
            <span className="section-title" style={{ marginTop: 0 }}>
              ¿Qué tan fuerte? {severity !== null && <b style={{ color: 'var(--alert)' }}>{severityLabel(severity)}</b>}
            </span>
            <div className="scale">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={severity === n}
                  aria-label={`Intensidad ${n}`}
                  onClick={() => setSeverity(severity === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              0 = nada · 10 = lo más fuerte que has sentido
            </p>
          </div>
        )}

        <label className="field" style={{ marginBottom: 0 }}>
          <span>Cuéntalo con tus palabras</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={HINT[kind]} />
        </label>

        <label className="field" style={{ marginBottom: 0 }}>
          <span>Resumen en pocas palabras (opcional)</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: sangrado seno derecho"
          />
        </label>

        <div>
          <span className="section-title" style={{ marginTop: 0 }}>
            ¿De qué tema es?
          </span>
          <select value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value || null)}>
            <option value="">Sin tema / general</option>
            {data.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            style={{ marginTop: 8 }}
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="…o escribe un tema nuevo aquí"
          />
        </div>

        <div>
          <span className="section-title" style={{ marginTop: 0 }}>
            Fotos
          </span>
          {entry ? (
            <AttachmentGrid
              attachments={attachments}
              onRemove={async (a) => {
                if (confirm('¿Borrar esta foto?')) await removePhoto(a)
              }}
              onAdd={(fs) => setFiles([...files, ...fs])}
            />
          ) : null}
          {!entry && <PhotoPicker files={files} onChange={setFiles} />}
          {entry && files.length > 0 && (
            <p className="tiny muted" style={{ marginTop: 8 }}>
              {files.length} foto(s) nueva(s) se subirán al guardar.
            </p>
          )}
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Sirve para lesiones, manchas, fórmulas médicas o resultados de exámenes.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
