import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { crearCuenta, hojaAbierta, irA } from './helpers'

/**
 * Lo que se rompe en un teléfono no lo ve ninguna aserción de contenido:
 * hay que medir el documento a varios anchos y con texto largo de verdad.
 *
 * 320 px es el Android chico que todavía se vende; 360 el más común.
 */
const ANCHOS = [320, 360, 412]

const NOTA_LARGA =
  'Amanecí con un dolor insoportable que me bajaba desde la espalda hasta el pie y no pude ' +
  'levantarme sola de la cama. Resultado en ' +
  'https://www.clinicaejemplo.com.co/resultados/paciente/2026/radiografia-columna-lumbosacra-completa'

const PALABRA_LARGA = 'Espondilolistesis-degenerativa-multisegmentaria-lumbosacra'

/** Nada puede hacer que la pantalla se arrastre de lado. */
async function noSeMueveDeLado(page: Page, donde: string) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const culpables: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (b.width === 0 || b.height === 0) return
      if (b.right > doc.clientWidth + 1 || b.left < -1) {
        const cls = (el.className || '').toString().split(' ').filter(Boolean)[0] ?? ''
        culpables.push(`${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`)
      }
    })
    return {
      panorama: doc.scrollWidth > doc.clientWidth + 1,
      medidas: `${doc.scrollWidth} > ${doc.clientWidth}`,
      culpables: [...new Set(culpables)].slice(0, 6),
    }
  })
  expect(r.panorama, `${donde}: la pantalla se arrastra de lado (${r.medidas}) → ${r.culpables.join(', ')}`).toBe(
    false,
  )
}

async function sembrarContenidoLargo(page: Page) {
  await page.getByRole('button', { name: 'Dolor', exact: true }).click()
  await hojaAbierta(page, '¿Qué pasó?')
  await page.getByRole('button', { name: 'Intensidad 9 de 10' }).click()
  await page.getByLabel('Cuéntalo con tus palabras').fill(NOTA_LARGA)
  await page.getByLabel('Resumen en pocas palabras (opcional)').fill(PALABRA_LARGA)
  await page
    .getByLabel('Nombre de un tema nuevo')
    .fill('Dolor lumbar irradiado a la pierna derecha por escoliosis dorsolumbar severa')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await irA(page, 'Medicinas')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await hojaAbierta(page, 'Nuevo medicamento')
  await page.getByLabel('Nombre').fill('Acetaminofén + Codeína 500/30 mg tabletas recubiertas')
  await page.getByRole('button', { name: 'No me ayuda', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

test.describe('responsive', () => {
  test('ninguna pantalla se arrastra de lado, con texto largo y a varios anchos', async ({ page }) => {
    test.setTimeout(150_000)
    await crearCuenta(page)
    await sembrarContenidoLargo(page)

    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 780 })
      for (const tab of ['Hoy', 'Historial', 'Archivo', 'Medicinas', 'Resumen']) {
        await irA(page, tab)
        await page.waitForTimeout(200)
        await noSeMueveDeLado(page, `${ancho}px · ${tab}`)
      }
    }
  })

  test('ninguna hoja se arrastra de lado a 320 px', async ({ page }) => {
    test.setTimeout(120_000)
    await crearCuenta(page)
    await page.setViewportSize({ width: 320, height: 720 })

    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    await hojaAbierta(page, '¿Qué pasó?')
    await noSeMueveDeLado(page, '320px · hoja de registro')
    // El 10 puede quedar más abajo del pliegue; lo que importa es que se
    // alcance bajando dentro de la hoja y que no esté fuera de ancho.
    await page.getByRole('button', { name: 'Intensidad 10 de 10' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Intensidad 10 de 10' })).toBeInViewport()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await page.getByRole('button', { name: 'Recordatorio' }).click()
    await hojaAbierta(page, 'Nuevo recordatorio')
    await noSeMueveDeLado(page, '320px · hoja de recordatorio')
    await page.getByRole('button', { name: 'Cerrar' }).click()

    await page.getByRole('button', { name: 'Mis datos y ajustes' }).click()
    await hojaAbierta(page, 'Mis datos y ajustes')
    await noSeMueveDeLado(page, '320px · hoja de ajustes')
  })

  test('el fondo se queda quieto mientras hay una hoja abierta', async ({ page }) => {
    await crearCuenta(page)
    await sembrarContenidoLargo(page)
    // Pantalla corta para que el contenido sobre y de verdad se pueda bajar.
    await page.setViewportSize({ width: 360, height: 420 })
    // Se abre desde un control que ya está a la vista con la página bajada:
    // si se usara uno de arriba, sería el propio navegador el que sube.
    await irA(page, 'Historial')
    await page.evaluate(() => window.scrollTo(0, 200))
    await page.waitForTimeout(300)
    const antes = await page.evaluate(() => window.scrollY)
    expect(antes, 'la pantalla no alcanzó a bajar').toBeGreaterThan(0)

    // Referencia visual del fondo: dónde está el título de la pantalla.
    const donde = () => page.locator('main.app h1').evaluate((el) => Math.round(el.getBoundingClientRect().top))
    const sitioInicial = await donde()

    await page.locator('.card.tappable').first().click()
    await hojaAbierta(page, 'Editar registro')
    // Con el body congelado, window.scrollY vale 0 aunque nada se haya movido;
    // por eso se mide el contenido y no el número del scroll.
    expect(await donde(), 'el fondo saltó al abrir la hoja').toBe(sitioInicial)

    // WebKit móvil no simula la rueda: se empuja el scroll a mano, que es
    // justo lo que un dedo consigue si el fondo no está bien bloqueado.
    await page.evaluate(() => window.scrollBy(0, 900))
    await page.waitForTimeout(400)
    expect(await donde(), 'el fondo se movió por detrás de la hoja').toBe(sitioInicial)

    // Y al cerrar, ella vuelve exactamente donde estaba.
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => window.scrollY), 'al cerrar la hoja se perdió el sitio').toBe(antes)
    expect(await donde(), 'al cerrar, el contenido quedó en otro lado').toBe(sitioInicial)
  })

  test('la barra de abajo no tapa el final de ninguna pantalla', async ({ page }) => {
    test.setTimeout(120_000)
    await crearCuenta(page)
    await sembrarContenidoLargo(page)
    await page.setViewportSize({ width: 360, height: 720 })

    for (const tab of ['Hoy', 'Historial', 'Medicinas', 'Resumen']) {
      await irA(page, tab)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(400)

      const tapados = await page.evaluate(() => {
        const nav = document.querySelector('.nav')!.getBoundingClientRect()
        const malos: string[] = []
        document.querySelectorAll('main.app *').forEach((el) => {
          if (el.children.length > 0) return
          const b = el.getBoundingClientRect()
          if (b.height === 0 || b.width === 0) return
          if (b.top < nav.top && b.bottom > nav.top + 2) {
            malos.push(`${el.tagName.toLowerCase()}: "${(el.textContent ?? '').trim().slice(0, 28)}"`)
          }
        })
        return [...new Set(malos)].slice(0, 4)
      })
      expect(tapados, `${tab}: la barra de abajo tapa contenido`).toEqual([])
    }
  })

  test('con el teclado abierto la hoja sigue siendo usable', async ({ page }) => {
    await crearCuenta(page)
    // El teclado de Android deja más o menos la mitad de la pantalla.
    await page.setViewportSize({ width: 360, height: 380 })

    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    const hoja = await hojaAbierta(page, '¿Qué pasó?')

    const caja = (await hoja.boundingBox())!
    expect(caja.height, 'la hoja se sale del alto disponible').toBeLessThanOrEqual(380)
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeInViewport()

    // Y se puede llegar al botón de guardar bajando dentro de la hoja.
    await page.locator('.sheet-body').evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeInViewport()
  })
})
