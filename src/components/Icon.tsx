import type { ReactNode } from 'react'

/**
 * Set de iconos dibujados a mano sobre una retícula de 24, todos con el mismo
 * trazo y las mismas terminaciones. Un emoji cambia de forma en cada teléfono
 * y no se puede teñir; un icono sí pertenece a la interfaz.
 */
export type IconName =
  // registros
  | 'dolor'
  | 'sangrado'
  | 'sintoma'
  | 'medicamento'
  | 'animo'
  | 'pregunta'
  | 'examen'
  | 'cita'
  | 'nota'
  // navegación
  | 'hoy'
  | 'historial'
  | 'archivo'
  | 'resumen'
  // documentos
  | 'radiografia'
  | 'orden'
  | 'formula'
  | 'resultado'
  | 'incapacidad'
  | 'factura'
  | 'adjunto'
  // recordatorios
  | 'reclamar'
  | 'campana'
  // acciones y estados
  | 'check'
  | 'mas'
  | 'cerrar'
  | 'camara'
  | 'imprimir'
  | 'compartir'
  | 'editar'
  | 'basura'
  | 'alerta'
  | 'reloj'
  | 'sin-senal'
  | 'calendario-mas'
  | 'chevron'
  | 'usuario'
  | 'ajustes'

const PATHS: Record<IconName, ReactNode> = {
  dolor: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
  sangrado: <path d="M12 2.8c3.4 3.9 5.8 6.9 5.8 9.9a5.8 5.8 0 0 1-11.6 0c0-3 2.4-6 5.8-9.9Z" />,
  sintoma: <path d="M3 12h3.6L9 5.5l3.4 13L15 12h6" />,
  medicamento: (
    <>
      <path d="M10.6 3.6 3.6 10.6a5 5 0 0 0 7 7l7-7a5 5 0 0 0-7-7Z" />
      <path d="m7.1 7.1 7 7" />
    </>
  ),
  animo: <path d="M12 20.3C8.6 17.7 3.6 14 3.6 9.6a4.6 4.6 0 0 1 8.4-2.6 4.6 4.6 0 0 1 8.4 2.6c0 4.4-5 8.1-8.4 10.7Z" />,
  pregunta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.7 2.7 0 0 1 5.3.7c0 1.8-2.7 2.2-2.7 3.9" />
      <path d="M12 17.2h.01" />
    </>
  ),
  examen: (
    <>
      <path d="M9.6 3v5.4L4.9 17a2 2 0 0 0 1.7 3h10.8a2 2 0 0 0 1.7-3l-4.7-8.6V3" />
      <path d="M8.4 3h7.2" />
      <path d="M7.4 14.4h9.2" />
    </>
  ),
  cita: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    </>
  ),
  nota: (
    <>
      <path d="M13 3.5H6.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9.5Z" />
      <path d="M13 3.5v6h6" />
    </>
  ),

  hoy: (
    <>
      <path d="M3.6 10.9 12 3.6l8.4 7.3" />
      <path d="M5.6 12.6V19a1.4 1.4 0 0 0 1.4 1.4h10a1.4 1.4 0 0 0 1.4-1.4v-6.4" />
    </>
  ),
  historial: (
    <>
      <path d="M4.5 4.6A1.6 1.6 0 0 1 6.1 3h12.3a1.1 1.1 0 0 1 1.1 1.1v14.4" />
      <path d="M4.5 4.6v14.8A1.6 1.6 0 0 0 6.1 21h13.4" />
      <path d="M8.5 8.4h7M8.5 12.2h7M8.5 16h4" />
    </>
  ),
  archivo: (
    <>
      <path d="M3.5 7.6A1.6 1.6 0 0 1 5.1 6h3.4l2.2 2.6h8.2a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6Z" />
    </>
  ),
  resumen: (
    <>
      <path d="M8.5 4.5H6.6A1.6 1.6 0 0 0 5 6.1v13.3A1.6 1.6 0 0 0 6.6 21h10.8a1.6 1.6 0 0 0 1.6-1.6V6.1a1.6 1.6 0 0 0-1.6-1.6h-1.9" />
      <rect x="8.5" y="2.8" width="7" height="3.4" rx="1.2" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),

  radiografia: (
    <>
      <path d="M3.5 8.2V5.9a2 2 0 0 1 2-2h2.3M20.5 8.2V5.9a2 2 0 0 0-2-2h-2.3M3.5 15.8v2.3a2 2 0 0 0 2 2h2.3M20.5 15.8v2.3a2 2 0 0 1-2 2h-2.3" />
      <path d="M12 7.4v9.2M9.4 9.6h5.2M9 12.6h6" />
    </>
  ),
  orden: (
    <>
      <path d="M13 3.5H6.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9.5Z" />
      <path d="M13 3.5v6h6M8.6 13.4h6.8M8.6 16.8h4.6" />
    </>
  ),
  formula: (
    <>
      <path d="M6.5 20.4h11a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-11A1.5 1.5 0 0 0 5 5v13.9a1.5 1.5 0 0 0 1.5 1.5Z" />
      <path d="M8.6 8.2h4.6a2 2 0 0 1 0 4H8.6V8.2Zm0 4 5 5" />
    </>
  ),
  resultado: (
    <>
      <path d="M4 20.2h16" />
      <path d="M6.8 20.2V13M11.6 20.2V6.4M16.4 20.2v-5.6" />
    </>
  ),
  incapacidad: (
    <>
      <rect x="3.6" y="5.4" width="16.8" height="14.2" rx="2" />
      <path d="M12 9.2v6.6M8.7 12.5h6.6" />
    </>
  ),
  factura: (
    <>
      <path d="M5.6 20.6V4.6a1 1 0 0 1 1-1h10.8a1 1 0 0 1 1 1v16l-2.4-1.4-2.4 1.4-2.4-1.4-2.4 1.4Z" />
      <path d="M9 8.4h6M9 12.2h6" />
    </>
  ),
  adjunto: <path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.6-7.6a3 3 0 1 1 4.3 4.3l-7.6 7.6a1.5 1.5 0 0 1-2.1-2.1l7-7" />,

  reclamar: (
    <>
      <path d="M4.2 8h15.6l-1.2 11.1a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3Z" />
      <path d="M8.6 8V6.2a3.4 3.4 0 0 1 6.8 0V8" />
    </>
  ),
  campana: (
    <>
      <path d="M6.4 9.4a5.6 5.6 0 0 1 11.2 0c0 4.6 1.9 6.2 1.9 6.2H4.5s1.9-1.6 1.9-6.2Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),

  check: <path d="m4.8 12.6 4.8 4.8L19.2 6.6" />,
  mas: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  cerrar: <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />,
  camara: (
    <>
      <path d="M3.6 9.6a1.6 1.6 0 0 1 1.6-1.6h1.9l1.5-2.4h6.8L16.9 8h1.9a1.6 1.6 0 0 1 1.6 1.6v8.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" />
      <circle cx="12" cy="13.6" r="3.3" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7.4 9.2V3.8h9.2v5.4" />
      <path d="M7.4 17.4H5.2a1.4 1.4 0 0 1-1.4-1.4v-5.4a1.4 1.4 0 0 1 1.4-1.4h13.6a1.4 1.4 0 0 1 1.4 1.4V16a1.4 1.4 0 0 1-1.4 1.4h-2.2" />
      <path d="M7.4 14.4h9.2v5.8H7.4Z" />
    </>
  ),
  compartir: (
    <>
      <path d="M12 15.6V3.6M8.4 7.2 12 3.6l3.6 3.6" />
      <path d="M5 12.8v6.2a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-6.2" />
    </>
  ),
  editar: (
    <>
      <path d="M4 20.4l.9-3.9L15.6 5.8a2.1 2.1 0 0 1 3 3L7.9 19.5Z" />
      <path d="m14.2 7.2 2.6 2.6" />
    </>
  ),
  basura: (
    <>
      <path d="M4.6 7h14.8M9.4 7V5.4a1.2 1.2 0 0 1 1.2-1.2h2.8a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="m6.6 7 .8 12.2a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3L17.4 7" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 4.2 21 19.4H3Z" />
      <path d="M12 10v3.8M12 16.6h.01" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  'sin-senal': (
    <>
      <path d="m3.4 3.4 17.2 17.2" />
      <path d="M8.2 13.4a5.6 5.6 0 0 1 3.1-1.5M4.6 9.8a10.6 10.6 0 0 1 4-2.5M19.4 9.8a10.6 10.6 0 0 0-6.6-2.6" />
      <path d="M12 18.4h.01" />
    </>
  ),
  'calendario-mas': (
    <>
      <path d="M20.5 11.5V7a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v11.5a2 2 0 0 0 2 2h6" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
      <path d="M17.4 15v5.4M14.7 17.7h5.4" />
    </>
  ),
  chevron: <path d="m9.4 6 6 6-6 6" />,
  usuario: (
    <>
      <circle cx="12" cy="8.4" r="3.9" />
      <path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z" />
    </>
  ),
}

export default function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
