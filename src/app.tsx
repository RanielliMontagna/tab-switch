import './styles/globals.css'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Profiler } from '@/components/Profiler'

// Lazy load non-critical components for better initial bundle size
// Note: ErrorBoundary is kept synchronous as it needs to catch errors during lazy loading
const Home = lazy(() => import('@/containers').then((module) => ({ default: module.Home })))

const Toaster = lazy(() =>
  import('@/components/ui/toaster').then((module) => ({ default: module.Toaster }))
)

function App() {
  return (
    <Profiler id="App">
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center">
              <div className="space-y-4">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          }
        >
          <Home />
          <Toaster />
        </Suspense>
      </ErrorBoundary>
    </Profiler>
  )
}

export default App
