import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const creds = { email: email.trim().toLowerCase(), password }
    const { error: err } =
      mode === 'entrar'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds)
    if (err) {
      const msg = err.message.toLowerCase()
      // Supabase describe el registro cerrado de varias formas según la versión.
      const registroCerrado = /signup|sign-up|signups/.test(msg) && /disabled|not allowed/.test(msg)
      if (msg.includes('invalid login')) setError('Correo o contraseña incorrectos.')
      else if (registroCerrado)
        setError('Esta app es privada y el registro está cerrado. Si necesitas una cuenta, pídesela a Mauro.')
      else if (msg.includes('already registered')) setError('Ese correo ya tiene cuenta. Entra con tu contraseña.')
      else if (msg.includes('password')) setError('La contraseña debe tener al menos 6 caracteres.')
      else if (msg.includes('fetch') || msg.includes('network'))
        setError('No hay internet. Inténtalo cuando vuelva la señal.')
      else setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="app" style={{ paddingBottom: 'var(--s10)' }}>
      <div style={{ height: 'max(var(--s16), calc(env(safe-area-inset-top) + var(--s10)))' }} />

      <div className="center" style={{ marginBottom: 'var(--s8)' }}>
        <h1 style={{ fontSize: 34 }}>Mi Historial de Salud</h1>
        <p className="small muted" style={{ marginTop: 'var(--s3)' }}>
          Anota lo que te pasa, con fotos si hace falta, y llega a la cita con todo claro.
        </p>
      </div>

      <form className="card" onSubmit={submit}>
        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </label>

        {error && (
          <p className="small" role="alert" style={{ color: 'var(--alert-ink)', marginBottom: 'var(--s3)' }}>
            {error}
          </p>
        )}

        <button className="btn block" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}
        </button>
      </form>

      <div className="center" style={{ marginTop: 'var(--s4)' }}>
        <button
          className="btn quiet"
          type="button"
          onClick={() => {
            setMode(mode === 'entrar' ? 'crear' : 'entrar')
            setError(null)
          }}
        >
          {mode === 'entrar' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta, quiero entrar'}
        </button>
      </div>

      <p className="meta center" style={{ marginTop: 'var(--s8)', lineHeight: 1.6 }}>
        Tu información es privada: solo se ve desde tu cuenta.
        <br />
        Nadie más puede leer tus registros ni tus fotos.
      </p>
    </div>
  )
}
