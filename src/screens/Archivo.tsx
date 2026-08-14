import { useEffect, useMemo, useState } from 'react'
import DocumentSheet from '../components/DocumentSheet'
import { useApp } from '../lib/store'
import { signedUrl } from '../lib/data'
import { DOC_EMOJI, DOC_LABEL } from '../types'
import type { DocKind, Document } from '../types'
import { fmtDate } from '../lib/format'

function DocCard({ doc, onOpen }: { doc: Document; onOpen: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const esImagen = (doc.mime ?? '').startsWith('image/')

  useEffect(() => {
    let alive = true
    void signedUrl(doc.path).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [doc.path])

  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="thumb" style={{ flexShrink: 0 }}>
          {esImagen && url ? (
            <img src={url} alt={doc.title} />
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 28 }}>
              {DOC_EMOJI[doc.kind]}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 16 }}>{doc.title}</strong>
          <p className="tiny muted" style={{ marginTop: 3 }}>
            {DOC_LABEL[doc.kind]}
            {doc.doc_date ? ` · ${fmtDate(doc.doc_date)}` : ''}
          </p>
          {doc.notes && (
            <p className="small" style={{ marginTop: 6 }}>
              {doc.notes}
            </p>
          )}
          <div className="row" style={{ marginTop: 8, gap: 4 }}>
            {url && (
              <a className="btn link" href={url} target="_blank" rel="noreferrer">
                Abrir
              </a>
            )}
            <button className="btn link" onClick={onOpen}>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Archivo() {
  const { data } = useApp()
  const [nuevo, setNuevo] = useState(false)
  const [editando, setEditando] = useState<Document | null>(null)
  const [filtro, setFiltro] = useState<DocKind | 'todos'>('todos')

  const lista = useMemo(
    () => (filtro === 'todos' ? data.documents : data.documents.filter((d) => d.kind === filtro)),
    [data.documents, filtro],
  )

  const kindsPresentes = useMemo(
    () => [...new Set(data.documents.map((d) => d.kind))] as DocKind[],
    [data.documents],
  )

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Archivo</h1>
          <p className="sub">{data.documents.length} documento(s) guardado(s)</p>
        </div>
        <button className="btn small-btn" onClick={() => setNuevo(true)}>
          + Subir
        </button>
      </div>

      <p className="small muted" style={{ marginBottom: 16 }}>
        Todo en un solo lugar: radiografías, órdenes, fórmulas, resultados e incapacidades. Así no
        toca buscar papeles cuando el médico los pida.
      </p>

      {kindsPresentes.length > 1 && (
        <div className="chips" style={{ marginBottom: 16 }}>
          <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todo
          </button>
          {kindsPresentes.map((k) => (
            <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {DOC_EMOJI[k]} {DOC_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="empty">
          Todavía no hay documentos.
          <br />
          Empieza por lo que tengas a la mano: una radiografía, una fórmula, una orden.
          <br />
          <button className="btn small-btn" style={{ marginTop: 14 }} onClick={() => setNuevo(true)}>
            Subir el primero
          </button>
        </div>
      ) : (
        <div className="stack">
          {lista.map((d) => (
            <DocCard key={d.id} doc={d} onOpen={() => setEditando(d)} />
          ))}
        </div>
      )}

      {nuevo && <DocumentSheet onClose={() => setNuevo(false)} />}
      {editando && <DocumentSheet doc={editando} onClose={() => setEditando(null)} />}
    </>
  )
}
