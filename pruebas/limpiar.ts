import { limpiarCuentasDePrueba } from './admin'

/**
 * Se ejecuta al terminar la suite de Playwright: borra las cuentas que
 * crearon las pruebas para no dejar basura en el proyecto real.
 */
export default async function limpiar() {
  const borradas = await limpiarCuentasDePrueba()
  if (borradas) console.log(`\nLimpieza: ${borradas} cuenta(s) de prueba borradas.`)
}
