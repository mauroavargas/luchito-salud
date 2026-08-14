export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'historial-tema'

export const THEME_LABEL: Record<Theme, string> = {
  auto: 'Como el celular',
  light: 'Claro',
  dark: 'Oscuro',
}

export function getTheme(): Theme {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : 'auto'
}

export function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)

  // La barra de estado del navegador también debe seguir el tema.
  const oscuro =
    t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', oscuro ? '#0c1416' : '#fcfaf6')
}

export function setTheme(t: Theme) {
  if (t === 'auto') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, t)
  applyTheme(t)
}
