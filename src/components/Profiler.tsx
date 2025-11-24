import { ProfilerOnRenderCallback, Profiler as ReactProfiler } from 'react'

interface ProfilerProps {
  id: string
  children: React.ReactNode
  onRender?: ProfilerOnRenderCallback
}

/**
 * Wrapper component for React DevTools Profiler
 * Only active in development mode to help identify performance issues
 *
 * @param id - Unique identifier for this profiler instance
 * @param children - Component tree to profile
 * @param onRender - Optional callback to log render metrics
 */
export function Profiler({ id, children, onRender }: ProfilerProps) {
  // Only enable profiling in development
  if (import.meta.env.DEV) {
    const defaultOnRender: ProfilerOnRenderCallback = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    ) => {
      // Log to console in development for debugging
      console.log('[Profiler]', {
        id,
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        startTime: `${startTime.toFixed(2)}ms`,
        commitTime: `${commitTime.toFixed(2)}ms`,
      })
    }

    return (
      <ReactProfiler id={id} onRender={onRender || defaultOnRender}>
        {children}
      </ReactProfiler>
    )
  }

  // In production, just render children without profiling overhead
  return <>{children}</>
}
