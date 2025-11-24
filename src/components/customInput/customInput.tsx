import React from 'react'

import { Control, FieldValues, Path } from 'react-hook-form'
import { masks, sanitizeName, sanitizeUrlInput } from '@/utils'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'

type MaskType = 'number' | 'cpf'

interface CustomInputProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  control: Control<TFieldValues>
  name: Path<TFieldValues>
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

export function CustomInput<TFieldValues extends FieldValues = FieldValues>({
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
}: CustomInputProps<TFieldValues>) {
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
                const rawValue = e.target.value
                onInputChange?.(rawValue)

                // Sanitize based on input type
                let sanitizedValue = rawValue
                if (name === 'name' || name === 'nome') {
                  sanitizedValue = sanitizeName(rawValue)
                } else if (name === 'url') {
                  sanitizedValue = sanitizeUrlInput(rawValue)
                }

                return onChange(handleParse(sanitizedValue))
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
