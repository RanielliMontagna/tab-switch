import { closestCenter, DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  CheckCircle2,
  FolderDown,
  FolderUp,
  Globe,
  GripVertical,
  Info,
  Loader2,
  Moon,
  Pause,
  Play,
  RotateCwSquare,
  Save,
  Settings,
  Sun,
  Trash2,
  XCircle,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from '@/assets/logo.svg'
import { Button, CustomInput, Form, Label, SessionManager, Skeleton, Switch } from '@/components'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INTERVAL, UI, VALIDATION } from '@/constants'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { useLanguage } from '@/hooks/use-language'
import { useTableKeyboardNavigation } from '@/hooks/use-table-keyboard-navigation'
import { useTheme } from '@/hooks/use-theme'
import { useUrlValidation } from '@/hooks/use-url-validation'
import { minInterval } from './home.schema'
import { useHome } from './useHome'

const SortableItem = memo(function SortableItem(props: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    overflow: 'hidden',
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="row"
      tabIndex={0}
      aria-label={`${props.id}, draggable row`}
    >
      {props.children}
    </TableRow>
  )
})

function HomeComponent() {
  const {
    tabs,
    methods,
    activeSwitch,
    isPaused,
    isLoading,
    isSaving,
    isDeleting,
    isReordering,
    exportTabs,
    importFromPaste,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
    handlePauseResume,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    switchSession,
    updateSessionName,
    deleteSession,
  } = useHome()

  const [isDragging, setIsDragging] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteContent, setPasteContent] = useState('')

  const { t } = useTranslation()
  const { effectiveTheme, toggleTheme, mounted } = useTheme()
  const { currentLanguage, toggleLanguage, mounted: languageMounted } = useLanguage()
  const [showSessionManager, setShowSessionManager] = useState(false)

  // Get current URL value from form
  const urlValue = methods.watch('url')
  const urlValidation = useUrlValidation(urlValue || '', !!urlValue && urlValue.length > 0)

  // Keyboard shortcut: Ctrl+Space to toggle rotation
  const handleShortcut = useCallback(() => {
    if (tabs.length >= VALIDATION.MIN_TABS_FOR_ROTATION) {
      handleCheckedChange(!activeSwitch)
    }
  }, [tabs.length, activeSwitch, handleCheckedChange])

  useKeyboardShortcut('ctrl+space', handleShortcut)

  // Keyboard navigation for table
  const { tableRef } = useTableKeyboardNavigation({
    rowCount: tabs.length,
    columnCount: 5,
    enabled: !isLoading && tabs.length > 0,
  })

  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit(handleSubmit)}
        className="flex h-full flex-col gap-6 p-4 pb-32"
        onDragOver={(e) => {
          handleDragOver(e)
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          handleDragLeave(e)
          // Only set dragging to false if we're leaving the form entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false)
          }
        }}
        onDrop={(e) => {
          handleDrop(e)
          setIsDragging(false)
        }}
      >
        {isDragging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-4 border-dashed border-primary rounded-lg m-4">
            <div className="text-center">
              <FolderUp size={48} className="mx-auto mb-4 text-primary" />
              <p className="text-lg font-semibold">{t('import')}</p>
              <p className="text-sm text-muted-foreground">{t('dropFileHere')}</p>
            </div>
          </div>
        )}
        <main className="flex h-full flex-col">
          <header className="flex w-full justify-between items-center px-4 py-2 border-b">
            <div className="flex items-center space-x-3">
              <img src={Logo} alt="logo" width={UI.LOGO_SIZE} height={UI.LOGO_SIZE} />
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{t('title')}</h1>
                {currentSession && (
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                    {currentSession.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="switch-mode"
                checked={activeSwitch}
                onCheckedChange={handleCheckedChange}
                disabled={isLoading || tabs.length < VALIDATION.MIN_TABS_FOR_ROTATION}
                aria-label={activeSwitch ? t('switchActive') : t('switchInactive')}
              />
              <Label htmlFor="switch-mode" className="text-sm cursor-pointer">
                {activeSwitch
                  ? isPaused
                    ? t('switchPaused')
                    : t('switchActive')
                  : t('switchInactive')}
              </Label>
              {activeSwitch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePauseResume}
                  aria-label={isPaused ? t('resume') : t('pause')}
                  className="focus:ring-2 focus:ring-offset-2"
                  title={isPaused ? t('resume') : t('pause')}
                >
                  {isPaused ? (
                    <Play size={UI.ICON_SIZE} aria-hidden="true" />
                  ) : (
                    <Pause size={UI.ICON_SIZE} aria-hidden="true" />
                  )}
                </Button>
              )}
              <div className="h-6 w-px bg-border mx-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSessionManager(!showSessionManager)}
                aria-label={t('session.manage')}
                className="focus:ring-2 focus:ring-offset-2"
                title={t('session.manage')}
              >
                <Settings size={UI.ICON_SIZE} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label={t('theme.ariaLabel')}
                className="focus:ring-2 focus:ring-offset-2"
                disabled={!mounted}
                title={t('theme.ariaLabel')}
              >
                {mounted && effectiveTheme === 'dark' ? (
                  <Sun size={UI.ICON_SIZE} aria-hidden="true" />
                ) : (
                  <Moon size={UI.ICON_SIZE} aria-hidden="true" />
                )}
              </Button>
              {languageMounted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleLanguage}
                  aria-label={t('language.ariaLabel')}
                  title={
                    currentLanguage === 'pt' ? t('language.portuguese') : t('language.english')
                  }
                  className="focus:ring-2 focus:ring-offset-2"
                >
                  <Globe size={UI.ICON_SIZE} aria-hidden="true" />
                </Button>
              )}
            </div>
          </header>
          {showSessionManager && (
            <div className="m-2 mt-4 mb-0 p-4 border rounded-lg bg-background">
              <SessionManager
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSwitchSession={switchSession}
                onCreateSession={createSession}
                onUpdateSessionName={updateSessionName}
                onDeleteSession={deleteSession}
              />
            </div>
          )}
          <section className="mt-8 flex-1 overflow-y-auto pr-2" aria-label={t('table.title')}>
            <Table
              ref={tableRef}
              className="w-full overflow-hidden"
              role="table"
              aria-label={t('table.title')}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" aria-label={t('table.drag')}></TableHead>
                  <TableHead className="w-28">{t('table.name')}</TableHead>
                  <TableHead>{t('table.url')}</TableHead>
                  <TableHead className="w-28">{t('table.interval')}</TableHead>
                  <TableHead className="w-28">{t('table.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tabs.map((tab) => tab.name)}>
                  <TableBody className="overflow-hidden">
                    {isLoading
                      ? // Skeleton loader while loading
                        Array.from({ length: 3 }, (_, index) => (
                          <TableRow key={`skeleton-${Date.now()}-${index}`}>
                            <TableCell>
                              <Skeleton className="h-4 w-4" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-48" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-8 w-24" />
                            </TableCell>
                          </TableRow>
                        ))
                      : tabs.map((tab) => (
                          <SortableItem key={tab.name} id={tab.name}>
                            <TableCell
                              className={`cursor-move transition-opacity ${
                                isDeleting === tab.name ? 'opacity-50' : ''
                              } ${isReordering ? 'opacity-70' : ''}`}
                              aria-label={t('table.drag')}
                              role="button"
                              tabIndex={0}
                            >
                              <GripVertical
                                size={UI.ICON_SIZE}
                                className="ml-1"
                                aria-hidden="true"
                              />
                            </TableCell>
                            <TableCell className={isDeleting === tab.name ? 'opacity-50' : ''}>
                              {tab.name}
                            </TableCell>
                            <TableCell
                              className={`${isDeleting === tab.name ? 'opacity-50' : ''} max-w-xs`}
                            >
                              <a
                                href={tab.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-500 underline hover:font-bold transition-all block truncate"
                                title={tab.url}
                              >
                                {tab.url}
                              </a>
                            </TableCell>
                            <TableCell className={isDeleting === tab.name ? 'opacity-50' : ''}>
                              {tab.interval} ms
                            </TableCell>
                            <TableCell className="position-relative">
                              <Button
                                id="delete"
                                type="button"
                                className="w-24 focus:ring-2 focus:ring-offset-2"
                                variant="outline"
                                disabled={isDeleting === tab.name}
                                aria-label={`${t('table.delete')} ${tab.name}`}
                                aria-busy={isDeleting === tab.name}
                              >
                                {isDeleting === tab.name ? (
                                  <div
                                    className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Trash2
                                    size={UI.ICON_SIZE}
                                    style={{ minWidth: `${UI.ICON_SIZE}px` }}
                                    className="mr-1"
                                    aria-hidden="true"
                                  />
                                )}
                                {t('table.delete')}
                              </Button>
                            </TableCell>
                          </SortableItem>
                        ))}
                  </TableBody>
                </SortableContext>
              </DndContext>
              <TableBody>
                <TableRow>
                  <TableCell className="align-top">
                    <RotateCwSquare size={UI.ICON_SIZE} className="ml-1 mt-2.5" />
                  </TableCell>
                  <TableCell className="align-top">
                    <CustomInput
                      control={methods.control}
                      name="name"
                      placeholder={t('table.namePlaceholder')}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="relative">
                        <CustomInput
                          control={methods.control}
                          name="url"
                          placeholder={t('table.urlPlaceholder')}
                          required
                          endAdornment={
                            urlValue && urlValue.length > 0 ? (
                              <>
                                {urlValidation.status === 'validating' && (
                                  <Loader2
                                    size={16}
                                    className="animate-spin text-muted-foreground"
                                  />
                                )}
                                {urlValidation.status === 'valid' && (
                                  <CheckCircle2 size={16} className="text-green-500" />
                                )}
                                {urlValidation.status === 'invalid' && (
                                  <XCircle size={16} className="text-red-500" />
                                )}
                                {urlValidation.status === 'error' && (
                                  <XCircle size={16} className="text-yellow-500" />
                                )}
                              </>
                            ) : undefined
                          }
                        />
                      </div>
                      {urlValidation.normalizedUrl &&
                        urlValidation.normalizedUrl !== urlValue &&
                        urlValidation.status === 'valid' && (
                          <p
                            className="text-xs text-muted-foreground truncate max-w-xs"
                            title={urlValidation.normalizedUrl}
                          >
                            {t('urlPreview.preview')}: {urlValidation.normalizedUrl}
                          </p>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <CustomInput
                      control={methods.control}
                      name="interval"
                      type="number"
                      placeholder={INTERVAL.DEFAULT_PLACEHOLDER}
                      step={INTERVAL.STEP}
                      onChange={(e) => {
                        const value = e.target.value
                        const numValue = parseInt(value, 10)

                        if (value === '') {
                          methods.setValue('interval', minInterval, { shouldValidate: false })
                          return
                        }

                        if (!Number.isNaN(numValue) && numValue < minInterval) {
                          e.target.value = minInterval.toString()
                          methods.setValue('interval', minInterval, { shouldValidate: true })
                          return
                        }

                        if (!Number.isNaN(numValue)) {
                          methods.setValue('interval', numValue, { shouldValidate: true })
                        }
                      }}
                      required
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Button
                      type="submit"
                      className="w-24 focus:ring-2 focus:ring-offset-2"
                      disabled={isSaving}
                      aria-label={t('table.save')}
                      aria-busy={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div
                            className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                            aria-hidden="true"
                          />
                          {t('table.saving')}
                        </>
                      ) : (
                        <>
                          <Save size={UI.ICON_SIZE} className="mr-1" aria-hidden="true" />
                          {t('table.save')}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </main>
      </form>
      <div className="fixed bottom-0 right-0 left-0 bg-background border-t border-border p-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex space-x-2">
          <Button
            variant="default"
            type="button"
            onClick={() => setShowPasteModal(true)}
            aria-label={t('import')}
            className="focus:ring-2 focus:ring-offset-2"
            title={t('importPasteHint')}
          >
            <FolderUp size={UI.ICON_SIZE} className="mr-1" aria-hidden="true" />
            <p>{t('import')}</p>
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={exportTabs}
            aria-label={t('export')}
            className="focus:ring-2 focus:ring-offset-2"
          >
            <FolderDown size={UI.ICON_SIZE} className="mr-1" aria-hidden="true" />
            <p>{t('export')}</p>
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Info size={UI.ICON_SIZE} />
          <p className="text-sm">{t('infoOpen')}</p>
        </div>
      </div>
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 bg-background border rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">{t('pasteJson')}</h2>
            <textarea
              ref={(textarea) => {
                if (textarea) {
                  setTimeout(() => textarea.focus(), 0)
                }
              }}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={t('pasteJsonPlaceholder')}
              className="w-full h-64 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowPasteModal(false)
                  setPasteContent('')
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="default"
                type="button"
                onClick={async () => {
                  if (pasteContent.trim()) {
                    await importFromPaste(pasteContent)
                    setShowPasteModal(false)
                    setPasteContent('')
                  }
                }}
                disabled={!pasteContent.trim()}
              >
                {t('import')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Form>
  )
}

export const Home = memo(HomeComponent)
