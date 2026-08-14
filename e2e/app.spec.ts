import { expect, test } from '@playwright/test'
import { crearCuenta, hojaAbierta, irA } from './helpers'

test.describe('entrar a la app', () => {
  test('se puede crear una cuenta y entra directo, sin confirmar correo', async ({ page }) => {
    await crearCuenta(page)
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible()
  })

  test('avisa con palabras claras cuando la contraseña está mal', async ({ page }) => {
    const { email } = await crearCuenta(page)
    await page.getByRole('button', { name: /Cerrar sesión/ }).count() // la sesión quedó abierta
    await page.evaluate(() => {
      localStorage.removeItem('historial-salud-auth')
      location.reload()
    })
    await page.getByLabel('Correo').fill(email)
    await page.getByLabel('Contraseña').fill('estaNoEs')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert')).toHaveText(/incorrectos/)
  })
})

test.describe('la hoja modal', () => {
  // Regresión: la entrada se hacía con requestAnimationFrame y en una pestaña
  // en segundo plano ese frame no llega, así que la hoja quedaba fuera de
  // pantalla y la app se veía congelada.
  test('se abre visible y vuelve a cerrarse', async ({ page }) => {
    await crearCuenta(page)
    await page.getByRole('button', { name: 'Dolor', exact: true }).click()

    const hoja = await hojaAbierta(page, '¿Qué pasó?')
    const caja = await hoja.boundingBox()
    const alto = page.viewportSize()!.height
    expect(caja).not.toBeNull()
    // De verdad dentro de la pantalla, no traducida hacia abajo.
    expect(caja!.y).toBeLessThan(alto)

    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('se cierra con la tecla Escape', async ({ page }) => {
    await crearCuenta(page)
    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    await hojaAbierta(page, '¿Qué pasó?')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})

test.describe('anotar lo que pasa', () => {
  test('guarda un registro con tema nuevo e intensidad, y sale en el historial', async ({ page }) => {
    await crearCuenta(page)

    await page.getByRole('button', { name: 'Sangrado', exact: true }).click()
    await hojaAbierta(page, '¿Qué pasó?')

    await page.getByRole('button', { name: 'Intensidad 7 de 10' }).click()
    await page.getByLabel('Cuéntalo con tus palabras').fill('Salió sangre del seno derecho, manchó el brasier')
    await page.getByLabel('Resumen en pocas palabras (opcional)').fill('Sangrado seno derecho')
    await page.getByLabel('Nombre de un tema nuevo').fill('Dolor y sangrado en el seno derecho')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('Registro guardado')).toBeVisible()

    await irA(page, 'Historial')
    await expect(page.getByText('Sangrado seno derecho')).toBeVisible()
    await expect(page.getByText('7/10 fuerte')).toBeVisible()
    // El tema queda como filtro del historial.
    await expect(
      page.locator('.chips').getByRole('button', { name: 'Dolor y sangrado en el seno derecho' }),
    ).toBeVisible()
  })

  test('no deja guardar un registro vacío y lo dice', async ({ page }) => {
    await crearCuenta(page)
    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    await hojaAbierta(page, '¿Qué pasó?')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('alert')).toHaveText(/al menos una nota/)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('medicamentos', () => {
  test('lo que no le sirve queda destacado en el resumen', async ({ page }) => {
    await crearCuenta(page)

    await irA(page, 'Medicinas')
    await page.getByRole('button', { name: 'Agregar' }).click()
    await hojaAbierta(page, 'Nuevo medicamento')

    await page.getByLabel('Nombre').fill('Ibuprofeno 400 mg')
    await page.getByLabel('Dosis').fill('1 tableta')
    await page.getByLabel('Cada cuánto').fill('cada 8 horas')
    await page.getByRole('button', { name: 'No me ayuda' }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText('Ibuprofeno 400 mg')).toBeVisible()

    await irA(page, 'Resumen')
    await expect(page.getByRole('heading', { name: 'Ya probó y no le sirvió' })).toBeVisible()
    await expect(page.getByText('Ibuprofeno 400 mg (no me ayuda)')).toBeVisible()
  })
})

test.describe('recordatorios', () => {
  test('se crea, aparece como pendiente y se puede marcar hecho', async ({ page }) => {
    await crearCuenta(page)

    await page.getByRole('button', { name: 'Recordatorio' }).click()
    await hojaAbierta(page, 'Nuevo recordatorio')
    await page.getByRole('button', { name: 'Reclamar medicamentos en la EPS' }).click()
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    const pendiente = page.locator('.todo', { hasText: 'Reclamar medicamentos en la EPS' })
    await expect(pendiente).toBeVisible()
    await expect(pendiente).toHaveAttribute('data-done', 'false')

    await pendiente.getByRole('button', { name: /^Marcar/ }).click()
    await expect(pendiente).toHaveAttribute('data-done', 'true')
    await expect(page.getByText('Hecho. Queda registrado.')).toBeVisible()

    // Y sigue marcado al recargar: quedó guardado, no solo en pantalla.
    await page.reload()
    const otraVez = page.locator('.todo', { hasText: 'Reclamar medicamentos en la EPS' })
    await expect(otraVez).toHaveAttribute('data-done', 'true')
  })
})

test.describe('resumen para el médico', () => {
  test('junta datos personales, tema y preguntas en una sola hoja', async ({ page }) => {
    await crearCuenta(page)

    await page.getByRole('button', { name: 'Pregunta para el médico' }).click()
    await hojaAbierta(page, '¿Qué pasó?')
    await page.getByLabel('Cuéntalo con tus palabras').fill('¿Esto del seno puede ser grave?')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await irA(page, 'Resumen')
    await page.getByRole('button', { name: 'Mis datos', exact: true }).click()
    await hojaAbierta(page, 'Mis datos')
    await page.getByLabel('Nombre completo').fill('Ana Vargas')
    await page.getByLabel('Alergias').fill('penicilina')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await expect(page.getByText('Ana Vargas')).toBeVisible()
    await expect(page.getByText('penicilina')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Preguntas para el médico' })).toBeVisible()
    await expect(page.getByText('¿Esto del seno puede ser grave?')).toBeVisible()
  })
})

test.describe('apariencia', () => {
  test('la preferencia de tema se guarda y sobrevive a recargar', async ({ page }) => {
    await crearCuenta(page)
    await irA(page, 'Resumen')
    await page.getByRole('button', { name: 'Mis datos', exact: true }).click()
    await hojaAbierta(page, 'Mis datos')

    await page.getByRole('button', { name: 'Oscuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
