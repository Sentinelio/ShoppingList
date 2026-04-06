import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { initThemes, reloadThemes } from './lib/themeStore'
import { loadRemoteConfig, subscribeToConfigChanges, onConfigChange } from './lib/appConfigStore'

// Unregister any stale service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
}

// Inject per-view theme CSS variables onto <html> before first render so the
// initial paint already uses the admin's chosen themes (from localStorage).
initThemes()

// Boot the app immediately, then load remote config in the background.
// This ensures the user sees something instantly and config updates arrive
// shortly after without blocking the initial render.
const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Load remote config from Supabase → overwrite localStorage → re-apply themes.
// Also subscribe to realtime changes so admin updates propagate instantly.
loadRemoteConfig().then((loaded) => {
  if (loaded) {
    // Re-apply themes since remote config may have overwritten localStorage
    reloadThemes()
  }
  // Subscribe to realtime config changes from admin
  subscribeToConfigChanges()
  // When a realtime config change arrives, re-apply themes if relevant
  onConfigChange((key) => {
    if (key === "themes") reloadThemes()
  })
})
