/**
 * Component for managing rotation sessions
 * Allows creating, switching, renaming, and deleting sessions
 */

import { Edit2, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UI } from '@/constants'
import type { SessionSchema } from '@/containers/home/home.schema'
import { useToast } from '@/hooks/use-toast'

interface SessionManagerProps {
  sessions: SessionSchema[]
  currentSessionId: string | null
  onSwitchSession: (sessionId: string) => Promise<void>
  onCreateSession: (name: string) => Promise<SessionSchema | null>
  onUpdateSessionName: (sessionId: string, name: string) => Promise<void>
  onDeleteSession: (sessionId: string) => Promise<void>
}

export function SessionManager({
  sessions,
  currentSessionId,
  onSwitchSession,
  onCreateSession,
  onUpdateSessionName,
  onDeleteSession,
}: SessionManagerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: t('session.error.nameRequired'),
        variant: 'destructive',
      })
      return
    }

    try {
      const session = await onCreateSession(newSessionName.trim())
      if (session) {
        setNewSessionName('')
        setIsCreating(false)
        toast({
          title: t('session.created'),
          description: t('session.createdDescription', { name: session.name }),
          variant: 'success',
        })
      }
    } catch {
      toast({
        title: t('session.error.createFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleStartEdit = (session: SessionSchema) => {
    setEditingSessionId(session.id)
    setEditingName(session.name)
  }

  const handleSaveEdit = async (sessionId: string) => {
    if (!editingName.trim()) {
      toast({
        title: t('session.error.nameRequired'),
        variant: 'destructive',
      })
      return
    }

    try {
      await onUpdateSessionName(sessionId, editingName.trim())
      setEditingSessionId(null)
      setEditingName('')
      toast({
        title: t('session.updated'),
        variant: 'success',
      })
    } catch {
      toast({
        title: t('session.error.updateFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (sessions.length <= 1) {
      toast({
        title: t('session.error.cannotDeleteLast'),
        variant: 'destructive',
      })
      return
    }

    try {
      setIsDeleting(sessionId)
      await onDeleteSession(sessionId)
      toast({
        title: t('session.deleted'),
        variant: 'success',
      })
    } catch {
      toast({
        title: t('session.error.deleteFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t('session.title')}</h3>
        {!isCreating && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="focus:ring-2 focus:ring-offset-2"
          >
            <Plus size={UI.ICON_SIZE} className="mr-1" aria-hidden="true" />
            {t('session.create')}
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
          <Input
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder={t('session.namePlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateSession()
              } else if (e.key === 'Escape') {
                setIsCreating(false)
                setNewSessionName('')
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleCreateSession}
            className="focus:ring-2 focus:ring-offset-2"
          >
            {t('session.create')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCreating(false)
              setNewSessionName('')
            }}
            className="focus:ring-2 focus:ring-offset-2"
          >
            <X size={UI.ICON_SIZE} aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId
          const isEditing = editingSessionId === session.id
          const isDeletingThis = isDeleting === session.id

          return (
            <div
              key={session.id}
              className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                isCurrent ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-accent'
              } ${isDeletingThis ? 'opacity-50' : ''}`}
            >
              {isEditing ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(session.id)
                      } else if (e.key === 'Escape') {
                        setEditingSessionId(null)
                        setEditingName('')
                      }
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveEdit(session.id)}
                    className="focus:ring-2 focus:ring-offset-2"
                  >
                    {t('session.save')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSessionId(null)
                      setEditingName('')
                    }}
                    className="focus:ring-2 focus:ring-offset-2"
                  >
                    <X size={UI.ICON_SIZE} aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSwitchSession(session.id)}
                    className={`flex-1 text-left px-2 py-1 rounded focus:ring-2 focus:ring-offset-2 ${
                      isCurrent ? 'font-semibold' : ''
                    }`}
                    disabled={isCurrent || isDeletingThis}
                  >
                    <div className="flex items-center gap-2">
                      <span>{session.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-muted-foreground">
                          ({t('session.current')})
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({session.tabs.length} {t('session.tabs')})
                      </span>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(session)}
                    disabled={isDeletingThis}
                    className="focus:ring-2 focus:ring-offset-2"
                    aria-label={t('session.edit', { name: session.name })}
                  >
                    <Edit2 size={UI.ICON_SIZE} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(session.id)}
                    disabled={isDeletingThis || sessions.length <= 1}
                    className="focus:ring-2 focus:ring-offset-2 text-destructive hover:text-destructive"
                    aria-label={t('session.delete', { name: session.name })}
                  >
                    {isDeletingThis ? (
                      <div
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={UI.ICON_SIZE} aria-hidden="true" />
                    )}
                  </Button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
