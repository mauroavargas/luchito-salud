import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { borrarUsuarioDePrueba, crearUsuarioDePrueba } from '../pruebas/admin'
import type { CuentaDePrueba } from '../pruebas/admin'

/**
 * Cada prueba entra con su propia cuenta para no ver los datos de otra. Como
 * el registro público está cerrado, la cuenta se crea con la clave de servicio
 * y la prueba solo hace lo que haría ella: escribir correo y contraseña.
 */
export async function crearCuenta(page: Page): Promise<CuentaDePrueba> {
  const cuenta = await crearUsuarioDePrueba('e2e-')
  await entrar(page, cuenta)
  return cuenta
}

export async function entrar(page: Page, cuenta: { email: string; password: string }) {
  await page.goto('./')
  await page.getByLabel('Correo').fill(cuenta.email)
  await page.getByLabel('Contraseña').fill(cuenta.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: /^Hola/ })).toBeVisible()
}

export async function borrarCuenta(cuenta: CuentaDePrueba) {
  await borrarUsuarioDePrueba(cuenta.id)
}

export async function irA(page: Page, tab: string) {
  await page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: tab }).click()
}

/** Espera a que la hoja modal esté realmente abierta y quieta. */
export async function hojaAbierta(page: Page, titulo: string | RegExp) {
  const hoja = page.getByRole('dialog', { name: titulo })
  await expect(hoja).toBeVisible()
  await expect(page.locator('.scrim')).toHaveAttribute('data-state', 'open')
  return hoja
}
