import './styles/globals.css'

import { Toaster } from '@/components'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Home } from '@/containers'

function App() {
  return (
    <ErrorBoundary>
      <Home />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
