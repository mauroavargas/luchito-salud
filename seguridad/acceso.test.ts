import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  CLAVE_DE_PRUEBA,
  borrarUsuarioDePrueba,
  claveAnon,
  crearUsuarioDePrueba,
  urlProyecto,
} from '../pruebas/admin'
import type { CuentaDePrueba } from '../pruebas/admin'

/**
 * La app es privada: solo entran las cuentas ya creadas. Cerrar el registro es
 * fácil de hacer mal — al cerrarlo la primera vez se apagó de paso el inicio de
 * sesión con correo, y las cuentas existentes quedaron fuera. Nadie se habría
 * enterado hasta que ella intentara entrar el día de una cita.
 *
 * Estas dos condiciones tienen que cumplirse a la vez, siempre.
 */
function anon() {
  return createClient(urlProyecto(), claveAnon(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

let cuenta: CuentaDePrueba

beforeAll(async () => {
  cuenta = await crearUsuarioDePrueba('rls-')
}, 60_000)

afterAll(async () => {
  if (cuenta?.id) await borrarUsuarioDePrueba(cuenta.id)
}, 60_000)

describe('quién puede entrar', () => {
  it('un desconocido no puede abrirse una cuenta', async () => {
    const { data, error } = await anon().auth.signUp({
      email: `colado-${Date.now()}@ejemplo.test`,
      password: 'quiero-entrar-123',
    })
    expect(data.user, 'el registro público quedó abierto').toBeNull()
    expect(error).not.toBeNull()
  })

  it('quien ya tiene cuenta sigue entrando con su contraseña', async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: cuenta.email,
      password: cuenta.password,
    })
    expect(error, 'cerrar el registro dejó fuera a las cuentas existentes').toBeNull()
    expect(data.session).not.toBeNull()
  })

  it('la sesión guardada en el celular se puede renovar', async () => {
    // Si esto falla, ella tendría que volver a escribir la contraseña cada rato.
    const sb = anon()
    const { data: entrada } = await sb.auth.signInWithPassword({
      email: cuenta.email,
      password: cuenta.password,
    })
    const { data, error } = await sb.auth.refreshSession(entrada.session!)
    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
  })

  it('una contraseña equivocada no entra', async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: cuenta.email,
      password: `${CLAVE_DE_PRUEBA}-mal`,
    })
    expect(data.session).toBeNull()
    expect(error).not.toBeNull()
  })

  it('un correo que no existe no entra', async () => {
    const { data, error } = await anon().auth.signInWithPassword({
      email: `nadie-${Date.now()}@ejemplo.test`,
      password: CLAVE_DE_PRUEBA,
    })
    expect(data.session).toBeNull()
    expect(error).not.toBeNull()
  })
})
