import { closestCenter, DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FolderDown,
  FolderUp,
  GripVertical,
  Info,
  RotateCwSquare,
  Save,
  Trash2,
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from '@/assets/logo.svg'
import { Button, CustomInput, Form, Label, Skeleton, Switch } from '@/components'
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
    isLoading,
    isSaving,
    isDeleting,
    isReordering,
    exportTabs,
    importTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
  } = useHome()

  const { t } = useTranslation()

  // Keyboard shortcut: Ctrl+Space to toggle rotation
  const handleShortcut = useCallback(() => {
    if (tabs.length >= VALIDATION.MIN_TABS_FOR_ROTATION) {
      handleCheckedChange(!activeSwitch)
    }
  }, [tabs.length, activeSwitch, handleCheckedChange])

  useKeyboardShortcut('ctrl+space', handleShortcut)

  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit(handleSubmit)}
        className="flex h-full flex-col gap-6 p-4 pb-32"
      >
        <main className="flex h-full flex-col">
          <header className="flex w-full justify-between px-4 py-2">
            <div className="flex items-center space-x-2">
              <img src={Logo} alt="logo" width={UI.LOGO_SIZE} height={UI.LOGO_SIZE} />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p>{t('description')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="switch-mode"
                checked={activeSwitch}
                onCheckedChange={handleCheckedChange}
                aria-label={activeSwitch ? t('switchActive') : t('switchInactive')}
                aria-describedby="switch-description"
              />
              <Label htmlFor="switch-mode" id="switch-description">
                {activeSwitch ? t('switchActive') : t('switchInactive')}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({t('keyboard.shortcut')}: Ctrl+Space)
                </span>
              </Label>
            </div>
          </header>
          <section className="mt-8 flex-1 overflow-y-auto pr-2" aria-label={t('table.title')}>
            <Table className="w-full overflow-hidden" role="table" aria-label={t('table.title')}>
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
                                  <Trash2 size={UI.ICON_SIZE} className="mr-1" aria-hidden="true" />
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
                      required
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <CustomInput
                      control={methods.control}
                      name="url"
                      placeholder={t('table.urlPlaceholder')}
                      required
                    />
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
            onClick={importTabs}
            aria-label={t('import')}
            className="focus:ring-2 focus:ring-offset-2"
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
    </Form>
  )
}

export const Home = memo(HomeComponent)
