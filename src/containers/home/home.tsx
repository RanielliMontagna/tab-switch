import { GripVertical, RotateCwSquare, Trash2, Save } from 'lucide-react'

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

function SortableItem(props: { id: string; children: React.ReactNode }) {
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
}

export function Home() {
  const { tabs, methods, activeSwitch, handleSubmit, handleDragEnd, handleCheckedChange } =
    useHome()

  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="p-4">
        <main>
          <header className="flex justify-between w-full px-4 py-2">
            <div className="flex items-center space-x-2">
              <img src={Logo} alt="logo" width="60" height="60" />
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold">Tab Switch</h1>
                <p>Switch between tabs automatically</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="switch-mode"
                checked={activeSwitch}
                onCheckedChange={handleCheckedChange}
              />
              <Label htmlFor="airplane-mode">{activeSwitch ? 'Active' : 'Inactive'}</Label>
            </div>
          </header>
          <section className="mt-8">
            <Table className="overflow-hidden">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-28">Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-28">Interval (ms)</TableHead>
                  <TableHead className="w-28">Action</TableHead>
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
                            Delete
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
                      placeholder="Example"
                      required
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <CustomInput
                      control={methods.control}
                      name="url"
                      placeholder="https://example.com"
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
                        if (parseInt(e.target.value) < 1000) {
                          e.target.value = Math.max(1000, parseInt(e.target.value)).toString()
                        }

                        if (e.target.value === '') {
                          e.target.value = '1000'
                        }

                        methods.setValue('interval', Number(e.target.value))
                      }}
                      required
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Button type="submit" className="w-24">
                      <Save size={16} className="mr-1" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </main>
      </form>
    </Form>
  )
}
