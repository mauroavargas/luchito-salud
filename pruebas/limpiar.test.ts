import { expect, it } from 'vitest'
import { limpiarCuentasDePrueba } from './admin'

// Entrada manual (`npm run limpiar:pruebas`) por si una corrida se cae a medias
// y deja cuentas sueltas.
it('borra las cuentas de prueba que hayan quedado sueltas', async () => {
  const borradas = await limpiarCuentasDePrueba()
  console.log(`cuentas de prueba borradas: ${borradas}`)
  expect(borradas).toBeGreaterThanOrEqual(0)
}, 600_000)
