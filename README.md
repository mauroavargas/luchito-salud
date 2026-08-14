# Mi Historial de Salud

App personal para anotar síntomas, medicamentos, documentos y recordatorios, y llegar a la cita
médica con un resumen claro en vez de tratar de acordarse de todo.

**App:** https://mauroavargas.github.io/luchito-salud/

## Cómo la usa ella

1. Abre el enlace en el celular.
2. Toca **Crear tu cuenta** (correo + contraseña). No hay que confirmar nada por correo.
3. En el navegador: **Compartir → Agregar a pantalla de inicio**. Queda como una app más.
4. Anota lo que pase, cuando pase. Es más fácil anotar 30 segundos hoy que acordarse de tres meses
   el día de la cita.
5. El día de la cita abre **Resumen** y le da *Imprimir / PDF* o *Compartir texto*.

## Qué hace

- **Hoy** — pendientes del día (tomar, reclamar, hacerse el examen) y avisos de lo que se está
  quedando por fuera: exámenes sin resultado, citas sin órdenes guardadas, medicamentos que lleva
  días tomando sin decir si le sirven, temas de los que hace rato no anota nada.
- **Historial** — todo lo anotado, agrupado por día y por tema, con fotos.
- **Archivo** — repositorio de radiografías, órdenes, fórmulas, resultados e incapacidades (imagen o PDF).
- **Medicinas** — qué toma, cada cuánto, y si le sirve o no. Lo que ya probó y no funcionó queda
  destacado para que no se lo vuelvan a recetar.
- **Resumen** — la hoja para el médico: motivos de consulta ordenados, desde cuándo, intensidad,
  tratamiento probado, cumplimiento, trámites pendientes y preguntas para hacerle al médico.

Detalles que importan en la práctica:

- Funciona sin señal: lo que anote se guarda en el celular y se envía solo cuando vuelva el internet
  (las fotos sí necesitan conexión).
- Las fotos se reducen antes de subir, para que suban con mala señal.
- Los recordatorios se pueden exportar al calendario del celular (`.ics`), que es lo que de verdad
  suena aunque la app esté cerrada.

## Privacidad y seguridad

Los datos y las fotos viven en Supabase. Lo único que los separa del resto de internet es la
*row level security* de Postgres: la URL del proyecto y la clave `anon` viajan dentro del bundle que
cualquiera puede leer, porque así funciona un cliente web. **Son públicas por diseño; lo que protege
los datos son las políticas, no el secreto de la clave.** Por eso están probadas:

```bash
npm run test:seguridad   # 34 casos: intenta leer, cambiar y borrar datos ajenos
npm run auditar:rls      # ninguna tabla puede quedarse sin RLS ni sin políticas
```

Qué comprueban, en concreto:

- Sin sesión no se lee ni una fila de ninguna tabla, ni se baja ningún archivo.
- Con una cuenta distinta no se ven, cambian ni borran los datos de otra persona, **ni pidiéndolos
  por su id**, ni conociendo su `user_id`, ni la ruta exacta de una foto.
- No se puede insertar una fila a nombre de otra persona (la política `WITH CHECK`).
- El bucket es privado: la URL pública no sirve; solo funcionan URLs firmadas y temporales, y solo
  las puede firmar la dueña de los archivos.
- Las restricciones de la base rechazan datos imposibles (intensidad fuera de 0–10, tipos inventados,
  dos marcas del mismo recordatorio el mismo día).

El método de detección se validó al revés: con una tabla desechable **sin** RLS, la prueba
efectivamente la ve. Un test de seguridad que solo sabe pasar no sirve de nada.

Este repositorio contiene solo código: ningún dato de salud pasa por aquí. La contraseña de la base
vive en `.supabase-secrets.local`, fuera de git.

## Diseño

El mundo visual es un cuaderno clínico: papel cálido, tinta profunda, **Newsreader**
(serif de periódico) para los títulos y **Public Sans** para los datos. Las dos son
libres y se sirven desde el propio sitio, así que no hay peticiones a terceros ni
fuentes que tarden en cargar.

- Colores derivados en OKLCH y fijados en hex tras verificar contraste WCAG AA en
  ambos temas. Los valores y su razón están comentados en `src/styles.css`.
- Iconos propios en `src/components/Icon.tsx`: un solo trazo, una sola retícula.
  Nada de emoji, que cambian de forma en cada teléfono y no se pueden teñir.
- Tema claro/oscuro compuestos por separado, con opción manual en *Mis datos*.
- Movimiento: curvas propias, 140–320 ms, `scale(0.97)` al presionar y un solo
  momento con autoría (marcar un pendiente como hecho). Respeta
  `prefers-reduced-motion`.

## Pruebas

```bash
npm test         # lógica: avisos, resumen, fechas, calendario (69 casos)
npm run e2e      # flujos y responsive en Android (Chromium) y iPhone (WebKit): 38 casos
npm run capturas # deja en capturas/ una foto de cada pantalla y cada hoja
```

`npm run capturas` no afirma nada: existe para *mirar* la interfaz a tamaño de
teléfono. Los defectos de maquetación no los ve ninguna aserción de contenido, y
revisar en una ventana de escritorio no sustituye verlo en 390 px de ancho.
Los tres tests de `cabe en la pantalla` sí miden: fallan si algo se sale de ancho
o si el contenido se pasa por debajo del título de una hoja.

Los tests de lógica fijan la zona horaria en `America/Bogotá`: media app depende de
qué día es "hoy". Los E2E crean una cuenta nueva por caso contra el Supabase real.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173/luchito-salud/
```

Necesita un `.env.local` con:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Proyecto Supabase: `luchito-salud` (`djhfrlxtjqbqgvszityr`). El esquema está en
`supabase/migrations/`; se aplica con `supabase db push`.

### Publicar cambios

```bash
./deploy.sh
```

Compila y empuja `dist/` a la rama `gh-pages`, que es la que sirve GitHub Pages.
