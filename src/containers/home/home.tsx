import { memo } from 'react'
import {
  GripVertical,
  RotateCwSquare,
  Trash2,
  Save,
  FolderDown,
  FolderUp,
  Info,
} from 'lucide-react'

import Logo from '@/assets/logo.svg'
import { useHome } from './useHome'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { CSS } from '@dnd-kit/utilities'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { closestCenter, DndContext } from '@dnd-kit/core'

import { Button, CustomInput, Form, Label, Switch } from '@/components'
import { minInterval } from './home.schema'
import { useTranslation } from 'react-i18next'

const SortableItem = memo(function SortableItem(props: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    overflow: 'hidden',
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {props.children}
    </TableRow>
  )
})

function HomeComponent() {
  const {
    tabs,
    methods,
    activeSwitch,
    exportTabs,
    importTabs,
    handleSubmit,
    handleDragEnd,
    handleCheckedChange,
  } = useHome()

  const { t } = useTranslation()

  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="p-4">
        <main>
          <header className="flex justify-between w-full px-4 py-2">
            <div className="flex items-center space-x-2">
              <img src={Logo} alt="logo" width="60" height="60" />
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
              />
              <Label htmlFor="airplane-mode">
                {activeSwitch ? t('switchActive') : t('switchInactive')}
              </Label>
            </div>
          </header>
          <section className="mt-8">
            <Table className="overflow-hidden">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-28">{t('table.name')}</TableHead>
                  <TableHead>{t('table.url')}</TableHead>
                  <TableHead className="w-28">{t('table.interval')}</TableHead>
                  <TableHead className="w-28">{t('table.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tabs.map((tab) => tab.name)}>
                  <TableBody className="overflow-hidden">
                    {tabs.map((tab) => (
                      <SortableItem key={tab.name} id={tab.name}>
                        <TableCell className="cursor-move">
                          <GripVertical size={16} className="ml-1" />
                        </TableCell>
                        <TableCell>{tab.name}</TableCell>
                        <TableCell>
                          <a
                            href={tab.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 underline hover:font-bold transition-all"
                          >
                            {tab.url}
                          </a>
                        </TableCell>
                        <TableCell>{tab.interval} ms</TableCell>
                        <TableCell className="position-relative">
                          <Button id="delete" type="button" className="w-24" variant="outline">
                            <Trash2 size={16} className="mr-1" />
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
                    <RotateCwSquare size={16} className="ml-1 mt-2.5" />
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
                      placeholder="1000"
                      step="1000"
                      onChange={(e) => {
                        const value = e.target.value
                        const numValue = parseInt(value, 10)

                        if (value === '') {
                          methods.setValue('interval', minInterval, { shouldValidate: false })
                          return
                        }

                        if (!isNaN(numValue) && numValue < minInterval) {
                          e.target.value = minInterval.toString()
                          methods.setValue('interval', minInterval, { shouldValidate: true })
                          return
                        }

                        if (!isNaN(numValue)) {
                          methods.setValue('interval', numValue, { shouldValidate: true })
                        }
                      }}
                      required
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Button type="submit" className="w-24">
                      <Save size={16} className="mr-1" />
                      {t('table.save')}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </main>
      </form>
      <div className="fixed bottom-4 right-4 left-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <Button variant="default" type="button" onClick={importTabs}>
            <FolderUp size={16} className="mr-1" />
            <p>{t('import')}</p>
          </Button>
          <Button variant="secondary" type="button" onClick={exportTabs}>
            <FolderDown size={16} className="mr-1" />
            <p>{t('export')}</p>
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <Info size={16} />
          <p className="text-sm">{t('infoOpen')}</p>
        </div>
      </div>
    </Form>
  )
}

export const Home = memo(HomeComponent)
