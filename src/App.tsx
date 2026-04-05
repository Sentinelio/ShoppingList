import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import { IS_DEMO } from './lib/supabase'
import SetupWizard from './components/setup/SetupWizard'
import ListsPage from './pages/ListsPage'
import ListDetailPage from './pages/ListDetailPage'
import SettingsPage from './pages/SettingsPage'
import ErrorBoundary from './components/ui/ErrorBoundary'

// AdminPage is only used via #admin hash and imports the whole admin surface
// area (changelog, stats, seed categories). Lazy-load it so the main bundle
// stays lean.
const AdminPage = lazy(() => import('./pages/AdminPage'))

type Page = 'setup' | 'lists' | 'list-detail' | 'settings' | 'admin'

interface Route {
  page: Page
  params?: Record<string, string>
}

function App() {
  const { user, loading, logout } = useAuth()
  const [route, setRoute] = useState<Route>(() => {
    if (window.location.hash === '#admin') return { page: 'admin' }
    return { page: 'lists' }
  })

  // Listen for hash changes
  useEffect(() => {
    const handler = () => {
      if (window.location.hash === '#admin') setRoute({ page: 'admin' })
    }
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const handleResetDebug = () => {
    logout()
  }

  const navigate = useCallback((page: string, params?: Record<string, string>) => {
    if (page === 'admin') window.location.hash = '#admin'
    else window.location.hash = ''
    setRoute({ page: page as Page, params })
  }, [])

  // Admin page — accessible without auth
  if (route.page === 'admin') {
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

  if (!user) {
    return <SetupWizard onComplete={() => setRoute({ page: 'lists' })} />
  }

  switch (route.page) {
    case 'list-detail':
      return (
        <ListDetailPage
          listId={route.params?.listId ?? ''}
          onNavigate={navigate}
        />
      )
    case 'settings':
      return <SettingsPage onNavigate={navigate} />
    case 'lists':
    default:
      return (
        <>
          <ListsPage onNavigate={navigate} />
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
  }
}

export default App
