/**
 * Hook for managing rotation sessions
 * Allows creating, switching, updating, and deleting multiple rotation sessions
 */

import { useCallback, useMemo, useState } from 'react'
import type { SessionSchema, SessionsStorageSchema, TabSchema } from '@/containers/home/home.schema'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/libs/logger'
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/libs/storage'

/**
 * Hook for managing rotation sessions
 * @returns Object with session management functions and current session
 */
export function useSessions() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<SessionSchema[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Loads sessions from storage
   * Migrates existing tabs to a default session if needed
   */
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const sessionsData = await getStorageItem<SessionsStorageSchema>(STORAGE_KEYS.SESSIONS)

      if (sessionsData && sessionsData.sessions.length > 0) {
        setSessions(sessionsData.sessions)
        setCurrentSessionId(sessionsData.currentSessionId || sessionsData.sessions[0].id)

        // If no current session but sessions exist, set first one as current
        if (!sessionsData.currentSessionId && sessionsData.sessions.length > 0) {
          const firstSessionId = sessionsData.sessions[0].id
          setCurrentSessionId(firstSessionId)
          await setStorageItem(STORAGE_KEYS.SESSIONS, {
            sessions: sessionsData.sessions,
            currentSessionId: firstSessionId,
          })
        }
      } else {
        // No sessions found, check for legacy tabs and migrate
        const { getTabsWithMigration } = await import('@/libs/storage')
        const legacyTabs = await getTabsWithMigration()

        // Create default session with legacy tabs if they exist
        const defaultSession: SessionSchema = {
          id: `session-${Date.now()}`,
          name: 'Default',
          tabs: legacyTabs,
          createdAt: Date.now(),
        }
        setSessions([defaultSession])
        setCurrentSessionId(defaultSession.id)
        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions: [defaultSession],
          currentSessionId: defaultSession.id,
        })

        // Clear legacy tabs storage after migration
        if (legacyTabs.length > 0) {
          const { removeStorageItem, STORAGE_KEYS: STORAGE } = await import('@/libs/storage')
          await removeStorageItem(STORAGE.TABS)
          logger.info('Migrated legacy tabs to default session')
        }
      }
    } catch (error) {
      logger.error('Error loading sessions:', error)
      // Create default session on error
      const defaultSession: SessionSchema = {
        id: `session-${Date.now()}`,
        name: 'Default',
        tabs: [],
        createdAt: Date.now(),
      }
      setSessions([defaultSession])
      setCurrentSessionId(defaultSession.id)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Gets the current session (memoized)
   */
  const currentSession = useMemo((): SessionSchema | null => {
    if (!currentSessionId) return null
    return sessions.find((s) => s.id === currentSessionId) || null
  }, [currentSessionId, sessions])

  /**
   * Gets tabs from current session (memoized)
   */
  const currentSessionTabs = useMemo((): TabSchema[] => {
    return currentSession?.tabs || []
  }, [currentSession])

  /**
   * Creates a new session
   */
  const createSession = useCallback(
    async (name: string): Promise<SessionSchema | null> => {
      try {
        const newSession: SessionSchema = {
          id: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: name.trim(),
          tabs: [],
          createdAt: Date.now(),
        }

        const updatedSessions = [...sessions, newSession]
        setSessions(updatedSessions)
        setCurrentSessionId(newSession.id)

        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions: updatedSessions,
          currentSessionId: newSession.id,
        })

        logger.debug(`Created new session: ${newSession.name} (${newSession.id})`)
        return newSession
      } catch (error) {
        logger.error('Error creating session:', error)
        toast({
          title: 'Error',
          description: 'Failed to create session',
          variant: 'destructive',
        })
        return null
      }
    },
    [sessions, toast]
  )

  /**
   * Updates tabs in current session
   */
  const updateCurrentSessionTabs = useCallback(
    async (tabs: TabSchema[]): Promise<void> => {
      if (!currentSessionId) return

      try {
        const updatedSessions = sessions.map((session) => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              tabs,
              updatedAt: Date.now(),
            }
          }
          return session
        })

        setSessions(updatedSessions)

        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions: updatedSessions,
          currentSessionId,
        })

        logger.debug(`Updated tabs in session: ${currentSessionId}`)
      } catch (error) {
        logger.error('Error updating session tabs:', error)
        throw error
      }
    },
    [currentSessionId, sessions]
  )

  /**
   * Switches to a different session
   */
  const switchSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        const session = sessions.find((s) => s.id === sessionId)
        if (!session) {
          throw new Error(`Session ${sessionId} not found`)
        }

        setCurrentSessionId(sessionId)

        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions,
          currentSessionId: sessionId,
        })

        logger.debug(`Switched to session: ${session.name} (${sessionId})`)
      } catch (error) {
        logger.error('Error switching session:', error)
        throw error
      }
    },
    [sessions]
  )

  /**
   * Updates session name
   */
  const updateSessionName = useCallback(
    async (sessionId: string, newName: string): Promise<void> => {
      try {
        const updatedSessions = sessions.map((session) => {
          if (session.id === sessionId) {
            return {
              ...session,
              name: newName.trim(),
              updatedAt: Date.now(),
            }
          }
          return session
        })

        setSessions(updatedSessions)

        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions: updatedSessions,
          currentSessionId,
        })

        logger.debug(`Updated session name: ${sessionId} -> ${newName}`)
      } catch (error) {
        logger.error('Error updating session name:', error)
        throw error
      }
    },
    [sessions, currentSessionId]
  )

  /**
   * Deletes a session
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        if (sessions.length <= 1) {
          toast({
            title: 'Error',
            description: 'Cannot delete the last session',
            variant: 'destructive',
          })
          return
        }

        const updatedSessions = sessions.filter((s) => s.id !== sessionId)
        let newCurrentSessionId = currentSessionId

        // If deleting current session, switch to first available
        if (currentSessionId === sessionId) {
          newCurrentSessionId = updatedSessions[0]?.id || null
          setCurrentSessionId(newCurrentSessionId)
        }

        setSessions(updatedSessions)

        await setStorageItem(STORAGE_KEYS.SESSIONS, {
          sessions: updatedSessions,
          currentSessionId: newCurrentSessionId || undefined,
        })

        logger.debug(`Deleted session: ${sessionId}`)
      } catch (error) {
        logger.error('Error deleting session:', error)
        throw error
      }
    },
    [sessions, currentSessionId, toast]
  )

  return {
    sessions,
    currentSessionId,
    currentSession,
    currentSessionTabs,
    isLoading,
    loadSessions,
    createSession,
    updateCurrentSessionTabs,
    switchSession,
    updateSessionName,
    deleteSession,
  }
}
