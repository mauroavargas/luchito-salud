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

## Privacidad

Los datos y las fotos viven en Supabase, en tablas con *row level security*: cada usuario solo puede
leer y escribir lo suyo, y el bucket de archivos es privado (se accede con URLs firmadas temporales).
Este repositorio solo tiene código; ningún dato de salud pasa por aquí.

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
npm test        # lógica: avisos, resumen, fechas, calendario (69 casos)
npm run e2e     # flujos reales en WebKit con viewport de iPhone (10 casos)
```

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
