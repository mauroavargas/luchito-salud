import { useState } from 'react'
import Sheet from './Sheet'
import Icon from './Icon'
import { getTheme, setTheme, THEME_LABEL } from '../lib/theme'
import type { Theme } from '../lib/theme'
import { useApp } from '../lib/store'
import type { Profile } from '../types'

const TEMAS: Theme[] = ['auto', 'light', 'dark']

export default function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { data, editProfile, signOut, session, say } = useApp()
  const [form, setForm] = useState<Partial<Profile>>(data.profile ?? {})
  const [busy, setBusy] = useState(false)
  const [tema, setTema] = useState<Theme>(() => getTheme())

  const set = (k: keyof Profile) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <Sheet
      title="Mis datos"
      onClose={onClose}
      footer={
        <div className="stack">
          <button
            className="btn block"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await editProfile(form)
                onClose()
              } catch {
                say('No se pudo guardar')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
          <button className="btn quiet" onClick={() => void signOut()}>
            <Icon name="cerrar" size={16} />
            Cerrar sesión ({session?.user.email})
          </button>
        </div>
      }
    >
      <p className="small muted" style={{ marginBottom: 'var(--s5)' }}>
        Esto aparece de primero en el resumen, para no tener que repetirlo en cada cita.
      </p>
      <label className="field">
        <span>Nombre completo</span>
        <input type="text" value={form.full_name ?? ''} onChange={set('full_name')} />
      </label>
      <div className="row" style={{ gap: 'var(--s3)', alignItems: 'flex-start' }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Fecha de nacimiento</span>
          <input type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Grupo sanguíneo</span>
          <input type="text" value={form.blood_type ?? ''} onChange={set('blood_type')} placeholder="O+" />
        </label>
      </div>
      <label className="field">
        <span>EPS / seguro</span>
        <input type="text" value={form.insurance ?? ''} onChange={set('insurance')} />
      </label>
      <label className="field">
        <span>Alergias</span>
        <input
          type="text"
          value={form.allergies ?? ''}
          onChange={set('allergies')}
          placeholder="Ej: penicilina. Si no tienes, escribe: ninguna"
        />
      </label>
      <label className="field">
        <span>Antecedentes / diagnósticos que ya te dieron</span>
        <textarea
          value={form.conditions ?? ''}
          onChange={set('conditions')}
          placeholder="Ej: escoliosis severa diagnosticada en 2019, cirugía de apendicitis en 2015"
        />
      </label>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h3 style={{ marginBottom: 'var(--s3)' }}>Cómo se ve la app</h3>
        <div className="chips">
          {TEMAS.map((t) => (
            <button
              key={t}
              className="chip"
              aria-pressed={tema === t}
              onClick={() => {
                setTema(t)
                setTheme(t)
              }}
            >
              {THEME_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>A quién llamar en una emergencia</span>
        <input
          type="text"
          value={form.emergency_contact ?? ''}
          onChange={set('emergency_contact')}
          placeholder="Nombre y teléfono"
        />
      </label>
    </Sheet>
  )
}
