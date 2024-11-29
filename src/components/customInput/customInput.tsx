import React, { FC } from 'react'

import { Control } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'

import { masks } from '@/utils'

type MaskType = 'number' | 'cpf'

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label?: string
  placeholder?: string
  type?: React.InputHTMLAttributes<HTMLInputElement>['type']
  mask?: MaskType
  defaultValue?: string
  required?: boolean
  helperText?: string
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
  onInputChange?: (value: string) => void
}

export const CustomInput: FC<CustomInputProps> = ({
  mask,
  name,
  label,
  control,
  placeholder,
  defaultValue,
  type = 'text',
  required = false,
  helperText,
  startAdornment,
  endAdornment,
  onInputChange,
  ...rest
}) => {
  const handleFormat = (value: string) => {
    if (mask) {
      return masks[mask].format(value)
    } else {
      return value
    }
  }

  const handleParse = (value: string) => {
    if (mask) {
      return masks[mask].parse(value)
    } else {
      return value
    }
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <FormItem>
          {label && (
            <FormLabel required={required} htmlFor={name}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <Input
              startAdornment={startAdornment}
              endAdornment={endAdornment}
              defaultValue={defaultValue}
              id={name}
              data-mask={mask}
              placeholder={placeholder}
              type={type}
              autoComplete="off"
              value={handleFormat(value || '')}
              onChange={(e) => {
                onInputChange?.(e.target.value)
                return onChange(handleParse(e.target.value))
              }}
              {...rest}
            />
          </FormControl>
          <FormMessage>{helperText}</FormMessage>
        </FormItem>
      )}
    />
  )
}
