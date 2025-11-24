import * as React from 'react'

import { cn } from '@/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, startAdornment, endAdornment, type, ...props }, ref) => {
    return (
      <div
        className={cn(
          'relative flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm',
          'focus-within:border-primary focus-within:ring-0 focus-within:ring-primary',
          className
        )}
      >
        {startAdornment && (
          <div className="flex items-center justify-center rounded-md">{startAdornment}</div>
        )}
        <input
          type={type}
          className={cn(
            'w-full h-full bg-transparent placeholder-text-muted-foreground focus:outline-none',
            className
          )}
          ref={ref}
          {...props}
        />
        {endAdornment && (
          <div className="flex items-center justify-center rounded-md">{endAdornment}</div>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
