import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { initThemes } from './lib/themeStore'
import { loadRemoteConfig } from './lib/appConfigStore'
import { startLiveConfig } from './lib/liveConfig'
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill'
import flagFontUrl from 'country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2?url'

// Windows has no flag emojis (🇪🇸 shows as "ES"): there, load a font with
// just the flags (Twemoji, CC-BY 4.0), bundled with the app instead of a CDN.
polyfillCountryFlagEmojis('Twemoji Country Flags', flagFontUrl)

// Unregister any stale service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
}

// Apply the admin's configuration (app_config) BEFORE the first render, so a
// reload is always enough to see a change (it used to load after rendering,
// which needed a second reload). Capped at 2 s so a slow or unreachable
// server doesn't block the app: it starts with the cached copy instead.
const remoteConfig = Promise.race([
  loadRemoteConfig(),
  new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000)),
])

remoteConfig.finally(() => {
  // Inject per-view theme CSS variables onto <html> before first render so
  // the initial paint already uses the admin's chosen themes.
  initThemes()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
  // From here on, admin changes arrive by realtime / when the tab returns.
  startLiveConfig()
})
