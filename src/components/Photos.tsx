import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import type { Attachment } from '../types'
import { signedUrl } from '../lib/data'
import { shrinkAll } from '../lib/image'

/** Selector de fotos para un registro nuevo (aún no subidas). */
export function PhotoPicker({
  files,
  onChange,
}: {
  files: File[]
  onChange: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f))
    setUrls(next)
    return () => next.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  return (
    <div>
      <div className="thumbs">
        {urls.map((u, i) => (
          <div className="thumb" key={u}>
            <img src={u} alt={`Foto ${i + 1}`} />
            <button
              className="x"
              type="button"
              aria-label={`Quitar la foto ${i + 1}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
            >
              <Icon name="cerrar" size={14} />
            </button>
          </div>
        ))}
        <button className="photo-add" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Icon name="camara" size={20} />
          {busy ? 'Cargando' : 'Agregar'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const picked = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (!picked.length) return
          setBusy(true)
          const ready = await shrinkAll(picked)
          setBusy(false)
          onChange([...files, ...ready])
        }}
      />
    </div>
  )
}

/** Fotos ya guardadas en un registro. */
export function AttachmentGrid({
  attachments,
  onRemove,
  onAdd,
}: {
  attachments: Attachment[]
  onRemove?: (att: Attachment) => void
  onAdd?: (files: File[]) => void
}) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const pairs = await Promise.all(
        attachments.map(async (a) => [a.id, (await signedUrl(a.path)) ?? ''] as const),
      )
      if (alive) setUrls(Object.fromEntries(pairs))
    })()
    return () => {
      alive = false
    }
  }, [attachments])

  if (!attachments.length && !onAdd) return null

  return (
    <div>
      <div className="thumbs">
        {attachments.map((a) => (
          <div className="thumb" key={a.id}>
            {urls[a.id] ? (
              <a href={urls[a.id]} target="_blank" rel="noreferrer">
                <img src={urls[a.id]} alt={a.caption ?? 'Foto del registro'} />
              </a>
            ) : null}
            {onRemove && (
              <button className="x no-print" type="button" aria-label="Borrar foto" onClick={() => onRemove(a)}>
                <Icon name="cerrar" size={14} />
              </button>
            )}
          </div>
        ))}
        {onAdd && (
          <button
            className="photo-add no-print"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Icon name="camara" size={20} />
            {busy ? 'Cargando' : 'Agregar'}
          </button>
        )}
      </div>
      {onAdd && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            const picked = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (!picked.length) return
            setBusy(true)
            try {
              onAdd(await shrinkAll(picked))
            } finally {
              setBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}
