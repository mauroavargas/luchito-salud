import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Cuenta nueva por corrida, para que un test no vea los datos de otro. */
export function nuevaCuenta() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  return { email: `e2e-${id}@ejemplo.test`, password: 'prueba-e2e-123' }
}

export async function crearCuenta(page: Page) {
  const cuenta = nuevaCuenta()
  await page.goto('./')
  await page.getByRole('button', { name: /Primera vez/ }).click()
  await page.getByLabel('Correo').fill(cuenta.email)
  await page.getByLabel('Contraseña').fill(cuenta.password)
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('heading', { name: /^Hola/ })).toBeVisible()
  return cuenta
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
