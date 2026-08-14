import { useRef, useState } from 'react'
import Sheet from './Sheet'
import { useApp } from '../lib/store'
import { DOC_EMOJI, DOC_LABEL } from '../types'
import type { DocKind, Document } from '../types'
import { shrinkImage } from '../lib/image'
import { todayKey } from '../lib/nudges'

const KINDS: DocKind[] = [
  'radiografia',
  'examen',
  'resultado',
  'orden',
  'formula',
  'incapacidad',
  'factura',
  'otro',
]

export default function DocumentSheet({ doc, onClose }: { doc?: Document; onClose: () => void }) {
  const { data, addDocument, editDocument, removeDocument, say } = useApp()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [kind, setKind] = useState<DocKind>(doc?.kind ?? 'radiografia')
  const [docDate, setDocDate] = useState(doc?.doc_date ?? todayKey())
  const [topicId, setTopicId] = useState<string | null>(doc?.topic_id ?? null)
  const [notes, setNotes] = useState(doc?.notes ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function save() {
    if (!doc && !file) {
      say('Escoge la foto o el archivo')
      return
    }
    if (!title.trim()) {
      say('Ponle un nombre para que lo encuentres después')
      return
    }
    setBusy(true)
    try {
      const meta = {
        title: title.trim(),
        kind,
        doc_date: docDate || null,
        topic_id: topicId,
        notes: notes.trim() || null,
      }
      if (doc) await editDocument(doc.id, meta)
      else await addDocument(file!, meta)
      onClose()
    } catch (e) {
      say(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={doc ? 'Editar documento' : 'Guardar un documento'}
      onClose={onClose}
      footer={
        <div className="stack">
          <button className="btn block" onClick={save} disabled={busy}>
            {busy ? 'Subiendo...' : 'Guardar'}
          </button>
          {doc && (
            <button
              className="btn link"
              style={{ color: 'var(--alert)' }}
              onClick={async () => {
                if (!confirm('¿Borrar este documento? No se puede recuperar.')) return
                await removeDocument(doc)
                onClose()
              }}
            >
              Borrar documento
            </button>
          )}
        </div>
      }
    >
      {!doc && (
        <div style={{ marginBottom: 18 }}>
          <button className="btn ghost block" onClick={() => inputRef.current?.click()} disabled={busy}>
            {file ? `✅ ${file.name.slice(0, 34)}` : '📷 Escoger foto o archivo (PDF)'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setBusy(true)
              const ready = await shrinkImage(f)
              setBusy(false)
              setFile(ready)
              if (!title.trim()) setTitle(ready.name.replace(/\.[^.]+$/, '').slice(0, 60))
            }}
          />
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Sirve para radiografías, órdenes, fórmulas, resultados de laboratorio o incapacidades.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <span className="section-title" style={{ marginTop: 0 }}>
          ¿Qué es?
        </span>
        <div className="chips">
          {KINDS.map((k) => (
            <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {DOC_EMOJI[k]} {DOC_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Nombre</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: radiografía de columna 2024"
        />
      </label>

      <label className="field">
        <span>¿De qué fecha es?</span>
        <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
      </label>

      <label className="field">
        <span>¿De qué tema?</span>
        <select value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value || null)}>
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: me la tomaron en la clínica, el médico dijo que la curva empeoró"
        />
      </label>
    </Sheet>
  )
}
