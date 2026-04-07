import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { initThemes, reloadThemes } from './lib/themeStore'
import { loadRemoteConfig } from './lib/appConfigStore'

// Unregister any stale service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
}

// Inject per-view theme CSS variables onto <html> before first render so the
// initial paint already uses the admin's chosen themes.
initThemes()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// After render, load remote config and re-apply themes if changed
loadRemoteConfig().then((loaded) => {
  if (loaded) reloadThemes()
}).catch(() => { /* Supabase unavailable */ })
