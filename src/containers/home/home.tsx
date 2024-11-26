import { GripVertical, RotateCwSquare, Trash2, Save } from 'lucide-react'

import Logo from '@/assets/logo.svg'
import { useHome } from './useHome'

import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

export function Home() {
  const { methods, tabs, handleSubmit, handleRemoveTab } = useHome()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <header className="flex items-center space-x-2">
        <img src={Logo} alt="logo" width="60" height="60" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Tab Switch</h1>
          <p>Switch between tabs automatically</p>
        </div>
      </header>
      <section>
        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit)} className="flex space-x-2 mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Interval (ms)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabs.map((tab, index) => (
                  <TableRow key={index}>
                    <TableCell className="cursor-move">
                      <GripVertical size={16} className="ml-1" />
                    </TableCell>
                    <TableCell>{tab.name}</TableCell>
                    <TableCell>{tab.url}</TableCell>
                    <TableCell>{tab.interval}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        className="w-24"
                        variant="outline"
                        onClick={() => handleRemoveTab(index)}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <RotateCwSquare size={16} className="ml-1" />
                  </TableCell>
                  <TableCell>
                    <Input
                      {...methods.register('name', {
                        required: 'Name is required',
                      })}
                      name="name"
                      placeholder="Example"
                      required
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      {...methods.register('url', {
                        pattern: {
                          value: /^https?:\/\/.+/,
                          message: 'URL must start with http:// or https://',
                        },
                      })}
                      name="url"
                      placeholder="https://example.com"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      {...methods.register('interval', {
                        valueAsNumber: true,
                        min: 1000,
                      })}
                      name="interval"
                      type="number"
                      step="1000"
                      placeholder="1000"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="submit" className="w-24">
                      <Save size={16} className="mr-1" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </form>
        </Form>
      </section>
    </main>
  )
}
