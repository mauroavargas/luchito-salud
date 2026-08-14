import { test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { crearCuenta, irA } from './helpers'

/**
 * No es una prueba: es la pasada visual. Deja capturas a tamaño de teléfono
 * de cada pantalla y cada hoja para poder mirarlas de verdad, que es donde
 * salen los defectos que ninguna aserción ve.
 *
 *   npx playwright test capturas --grep-invert xxx
 */
const DIR = process.env.CAPTURAS_DIR ?? 'capturas'

async function foto(page: Page, nombre: string, completa = false) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${DIR}/${nombre}.png`, fullPage: completa })
}

test('capturas de toda la interfaz en un teléfono', async ({ page }) => {
  test.setTimeout(180_000)
  await crearCuenta(page)

  // ---- datos de ejemplo, para que nada se vea vacío ----
  await page.getByRole('button', { name: 'Mis datos y ajustes' }).click()
  await page.getByLabel('Nombre completo').fill('Ana María Vargas')
  await page.getByLabel('Grupo sanguíneo').fill('O+')
  await page.getByLabel('EPS / seguro').fill('Sura')
  await page.getByLabel('Alergias').fill('penicilina')
  await page
    .getByLabel('Antecedentes / diagnósticos que ya te dieron')
    .fill('Escoliosis severa diagnosticada en 2019')
  await foto(page, '05-ajustes-arriba')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await page.getByRole('button', { name: 'Sangrado', exact: true }).click()
  await page.getByRole('button', { name: 'Intensidad 7 de 10' }).click()
  await page.getByLabel('Cuéntalo con tus palabras').fill('Salió sangre del seno derecho, manchó el brasier')
  await page.getByLabel('Resumen en pocas palabras (opcional)').fill('Sangrado seno derecho')
  await page.getByLabel('Nombre de un tema nuevo').fill('Dolor y sangrado en el seno derecho')
  await foto(page, '06-registro')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await page.getByRole('button', { name: 'Recordatorio' }).click()
  await page.getByRole('button', { name: 'Reclamar medicamentos en la EPS' }).click()
  await foto(page, '07-recordatorio')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await irA(page, 'Medicinas')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('Nombre').fill('Ibuprofeno 400 mg')
  await page.getByLabel('Dosis').fill('1 tableta')
  await page.getByLabel('Cada cuánto').fill('cada 8 horas')
  await page.getByRole('button', { name: 'No me ayuda' }).click()
  await foto(page, '08-medicamento')
  await page.getByRole('button', { name: 'Guardar' }).click()

  // ---- pantallas ----
  await irA(page, 'Hoy')
  await foto(page, '01-hoy', true)
  await irA(page, 'Historial')
  await foto(page, '02-historial', true)
  await irA(page, 'Archivo')
  await foto(page, '03-archivo', true)
  await irA(page, 'Medicinas')
  await foto(page, '04-medicinas', true)
  await irA(page, 'Resumen')
  await foto(page, '09-resumen', true)

  // ---- la hoja que reportó el bug, arriba y con scroll ----
  await irA(page, 'Hoy')
  await page.getByRole('button', { name: 'Mis datos y ajustes' }).click()
  await page.waitForTimeout(600)
  await page.locator('.sheet-body').evaluate((el) => el.scrollTo({ top: 320 }))
  await foto(page, '10-ajustes-con-scroll')
  await page.getByRole('button', { name: 'Cerrar' }).click()

  // ---- otras hojas ----
  await irA(page, 'Archivo')
  await page.getByRole('button', { name: 'Subir', exact: true }).click()
  await foto(page, '11-documento')
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await irA(page, 'Historial')
  await page.getByRole('button', { name: 'Temas' }).click()
  await foto(page, '12-temas')
  await page.getByRole('button', { name: 'Cerrar' }).click()

  // ---- tema oscuro ----
  await page.getByRole('button', { name: 'Hoy' }).click()
  await page.getByRole('button', { name: 'Mis datos y ajustes' }).click()
  await page.getByRole('button', { name: 'Oscuro' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await foto(page, '13-hoy-oscuro', true)
  await irA(page, 'Resumen')
  await foto(page, '14-resumen-oscuro', true)
})
