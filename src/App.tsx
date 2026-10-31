import { useCallback, lazy, Suspense, Fragment, useSyncExternalStore } from 'react'
import { useAuth } from './hooks/useAuth'
import { IS_DEMO } from './lib/pocketbase'
import SetupWizard from './components/setup/SetupWizard'
import SessionError from './components/setup/SessionError'
import ListsPage from './pages/ListsPage'
import ListDetailPage from './pages/ListDetailPage'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { getConfigVersion, subscribeConfigVersion } from './lib/liveConfig'
import { go, useRoute } from './lib/router'

// AdminPage is only used via #admin hash and imports the whole admin surface
// area (changelog, stats, seed categories). Lazy-load it so the main bundle
// stays lean.
const AdminPage = lazy(() => import('./pages/AdminPage'))

function App() {
  const { user, loading, authError, retryAuth, logout } = useAuth()
  // Bumped when the admin's configuration changes (lib/liveConfig.ts).
  const configVersion = useSyncExternalStore(subscribeConfigVersion, getConfigVersion)
  // Every screen is a URL + history entry (lib/router.ts): the phone's
  // Back goes to the previous screen instead of leaving the app.
  const route = useRoute()

  const handleResetDebug = () => {
    logout()
  }

  const navigate = useCallback((page: string, params?: Record<string, string>) => {
    if (page === 'admin') window.location.hash = '#admin'
    else if (page === 'list-detail' && params?.listId) go({ page: 'list', listId: params.listId, tab: 'list' })
    else go({ page: 'lists', view: 'home' })
  }, [])

  // Admin page — only for users flagged is_admin (set from the PocketBase
  // dashboard /_/); the server enforces the same on every admin write.
  if (route.page === 'admin') {
    if (!IS_DEMO && loading) {
      return (
        <div className="flex items-center justify-center h-full bg-bg">
          <div className="text-text-soft animate-pulse">Loading admin…</div>
        </div>
      )
    }
    if (!IS_DEMO && !user?.is_admin) {
      return <AdminLocked userId={user?.id ?? null} onBack={() => navigate('lists')} />
    }
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-bg">
              <div className="text-text-soft animate-pulse">Loading admin…</div>
            </div>
          }
        >
          <AdminPage />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg">
        <div className="text-center">
          <div className="text-4xl mb-4">🛒🌍</div>
          <div className="text-text-soft animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user && authError) {
    return <SessionError error={authError} onRetry={retryAuth} />
  }

  if (!user) {
    return <SetupWizard onComplete={() => go({ page: 'lists', view: 'home' }, { replace: true })} />
  }

  // Remount the page when the admin config changes, so everything that reads
  // it while rendering (languages, UI strings, themes, detail lab) refreshes.
  const page = route.page === 'list' ? (
    <ListDetailPage listId={route.listId} tab={route.tab} itemId={route.itemId ?? null} />
  ) : (
    <>
      <ListsPage view={route.page === 'lists' ? route.view : 'home'} onNavigate={navigate} />
      {IS_DEMO && (
        <button
          onClick={handleResetDebug}
          className="fixed top-3 left-3 z-50 px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium opacity-70 active:opacity-100 cursor-pointer"
        >
          Reset
        </button>
      )}
    </>
  )

  return <Fragment key={configVersion}>{page}</Fragment>
}

function AdminLocked({ userId, onBack }: { userId: string | null; onBack: () => void }) {
  return (
    <div className="flex items-center justify-center h-full bg-bg p-6">
      <div className="max-w-sm text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-text font-bold text-lg mb-2">Admin only</h1>
        {userId ? (
          <p className="text-text-muted text-sm mb-4">
            Ask the server owner to enable <code>is_admin</code> for this user in the
            PocketBase dashboard (<code>/_/</code> → users), then reload.
            <br />
            <span className="inline-block mt-3 font-mono text-xs text-text select-all bg-card border border-border rounded-lg px-2 py-1">{userId}</span>
          </p>
        ) : (
          <p className="text-text-muted text-sm mb-4">
            Open the app and create your profile first; then an admin can enable <code>is_admin</code> for it.
          </p>
        )}
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-border-light text-text-soft font-medium cursor-pointer active:bg-card"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

export default App
