import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { AppProvider } from './lib/store'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)

// En desarrollo el service worker serviría módulos viejos, así que solo va en producción.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    })
  } else {
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()))
    void caches?.keys().then((ks) => ks.forEach((k) => void caches.delete(k)))
  }
}
