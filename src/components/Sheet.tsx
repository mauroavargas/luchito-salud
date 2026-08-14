import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon'

/** Debe coincidir con --t-sheet en styles.css. */
const SALIDA_MS = 240

export default function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  // Abre en 'open' de una vez: la entrada la hace una animación CSS, que no
  // necesita que JavaScript alcance a pintar un frame intermedio.
  const [state, setState] = useState<'open' | 'closed'>('open')
  const panel = useRef<HTMLDivElement>(null)
  const devolverFoco = useRef<HTMLElement | null>(null)
  // Se calcula en el primer render y no vuelve a cambiar. Leerlo dentro del
  // efecto daría cero en el segundo montaje de StrictMode, cuando el body ya
  // estuvo congelado, y la hoja abriría saltando al principio de la página.
  const scrollGuardado = useRef(typeof window === 'undefined' ? 0 : window.scrollY)

  const cerrar = useCallback(() => {
    setState('closed')
    window.setTimeout(onClose, SALIDA_MS)
  }, [onClose])

  useEffect(() => {
    devolverFoco.current = document.activeElement as HTMLElement | null

    // Bloquear el fondo con `overflow: hidden` tiene un efecto secundario feo:
    // al no haber nada que desbordar, el navegador lleva el scroll a cero y al
    // cerrar la hoja ella aparece arriba del todo, lejos de donde estaba.
    // Fijar el body con un desplazamiento negativo lo congela donde está y
    // permite devolverlo intacto.
    const y = scrollGuardado.current
    const body = document.body
    const previo = { position: body.style.position, top: body.style.top, width: body.style.width }
    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.width = '100%'

    return () => {
      body.style.position = previo.position
      body.style.top = previo.top
      body.style.width = previo.width
      // Forzar el recálculo: sin esto el documento todavía mide poco y el
      // navegador recorta el scroll a cero.
      void body.offsetHeight
      window.scrollTo(0, y)
      devolverFoco.current?.focus?.()
    }
  }, [])

  // Escape cierra; Tab no puede salirse de la hoja mientras esté abierta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cerrar()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [cerrar])

  return (
    <div
      className="scrim"
      data-state={state}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar()
      }}
    >
      <div className="sheet" ref={panel} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn ghost sm" onClick={cerrar} aria-label="Cerrar">
            <Icon name="cerrar" size={18} />
            Cerrar
          </button>
        </div>
        <div className="sheet-body">
          {children}
          {footer && <div style={{ marginTop: 'var(--s6)' }}>{footer}</div>}
        </div>
      </div>
    </div>
  )
}
