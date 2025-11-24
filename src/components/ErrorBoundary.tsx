import { Component, ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { logger } from '@/libs/logger'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-red-600">{t('errorBoundary.title')}</h2>
        <p className="text-gray-600">{t('errorBoundary.description')}</p>
        {error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              {t('errorBoundary.details')}
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
              {'\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-2 justify-center mt-6">
          <Button onClick={onReset} variant="default">
            {t('errorBoundary.retry')}
          </Button>
          <Button
            onClick={() => {
              window.location.reload()
            }}
            variant="outline"
          >
            {t('errorBoundary.reload')}
          </Button>
        </div>
      </div>
    </div>
  )
}
