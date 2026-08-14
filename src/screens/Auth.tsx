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
      if (msg.includes('invalid login')) setError('Correo o contraseña incorrectos.')
      else if (msg.includes('already registered')) setError('Ese correo ya tiene cuenta. Entra con tu contraseña.')
      else if (msg.includes('password')) setError('La contraseña debe tener al menos 6 caracteres.')
      else setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <div style={{ height: 'max(40px, env(safe-area-inset-top))' }} />
      <div className="center stack" style={{ gap: 6, marginBottom: 26 }}>
        <div style={{ fontSize: 46 }}>🩺</div>
        <h1>Mi Historial de Salud</h1>
        <p className="muted small">
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
          <p className="small" style={{ color: 'var(--alert)', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button className="btn block" disabled={busy}>
          {busy ? 'Un momento...' : mode === 'entrar' ? 'Entrar' : 'Crear mi cuenta'}
        </button>
      </form>

      <div className="center" style={{ marginTop: 16 }}>
        <button
          className="btn link"
          type="button"
          onClick={() => {
            setMode(mode === 'entrar' ? 'crear' : 'entrar')
            setError(null)
          }}
        >
          {mode === 'entrar' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta, quiero entrar'}
        </button>
      </div>

      <p className="tiny muted center" style={{ marginTop: 28, lineHeight: 1.6 }}>
        Tu información es privada: solo se ve desde tu cuenta.
        <br />
        Nadie más puede leer tus registros ni tus fotos.
      </p>
    </div>
  )
}
