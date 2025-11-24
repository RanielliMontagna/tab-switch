import './styles/globals.css'

import { Home } from '@/containers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components'

function App() {
  return (
    <ErrorBoundary>
      <Home />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
