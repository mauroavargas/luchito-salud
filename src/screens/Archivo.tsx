import { useEffect, useMemo, useState } from 'react'
import DocumentSheet from '../components/DocumentSheet'
import Icon from '../components/Icon'
import { useApp } from '../lib/store'
import { signedUrl } from '../lib/data'
import { DOC_ICON, DOC_LABEL } from '../types'
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
      <div className="row top">
        <div className="thumb" style={{ flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          {esImagen && url ? <img src={url} alt="" /> : <Icon name={DOC_ICON[doc.kind]} size={26} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 15.5 }}>{doc.title}</strong>
          <p className="meta" style={{ marginTop: 2 }}>
            {DOC_LABEL[doc.kind]}
            {doc.doc_date ? ` · ${fmtDate(doc.doc_date)}` : ''}
          </p>
          {doc.notes && (
            <p className="small measure" style={{ marginTop: 'var(--s2)' }}>
              {doc.notes}
            </p>
          )}
          <div className="row" style={{ marginTop: 'var(--s2)', gap: 'var(--s4)' }}>
            {url && (
              <a className="btn quiet" href={url} target="_blank" rel="noreferrer">
                Abrir
              </a>
            )}
            <button className="btn quiet" onClick={onOpen}>
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
      <header className="topbar">
        <div>
          <h1>Archivo</h1>
          <p className="sub">
            {data.documents.length === 0
              ? 'Sin documentos todavía'
              : `${data.documents.length} documento${data.documents.length === 1 ? '' : 's'} guardado${
                  data.documents.length === 1 ? '' : 's'
                }`}
          </p>
        </div>
        <button className="btn sm" onClick={() => setNuevo(true)}>
          <Icon name="mas" size={16} />
          Subir
        </button>
      </header>

      <p className="small muted measure" style={{ marginBottom: 'var(--s5)' }}>
        Todo en un solo lugar: radiografías, órdenes, fórmulas, resultados e incapacidades. Así no
        toca buscar papeles cuando el médico los pida.
      </p>

      {kindsPresentes.length > 1 && (
        <div className="chips" style={{ marginBottom: 'var(--s5)' }}>
          <button className="chip" aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todo
          </button>
          {kindsPresentes.map((k) => (
            <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              <Icon name={DOC_ICON[k]} size={16} />
              {DOC_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="empty">
          Todavía no hay documentos.
          <br />
          Empieza por lo que tengas a la mano: una radiografía, una fórmula, una orden.
          <div>
            <button className="btn sm" style={{ marginTop: 'var(--s4)' }} onClick={() => setNuevo(true)}>
              Subir el primero
            </button>
          </div>
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
