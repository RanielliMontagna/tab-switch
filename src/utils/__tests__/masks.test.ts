import { describe, expect, it } from 'vitest'
import { cpf, number } from '../masks/masks'

describe('masks', () => {
  describe('cpf', () => {
    describe('format', () => {
      it('should format CPF correctly', () => {
        expect(cpf.format('12345678901')).toBe('123.456.789-01')
      })

      it('should handle partial CPF', () => {
        expect(cpf.format('123456789')).toBe('123.456.789')
        expect(cpf.format('123')).toBe('123')
      })

      it('should remove non-digits', () => {
        // format applies slice(0, 11) first, then removes non-digits, then applies mask
        // '123.456.789-01' -> slice to '123.456.789' (11 chars) -> '123456789' (9 digits) -> '123.456.789'
        expect(cpf.format('123.456.789-01')).toBe('123.456.789')
        // 'abc123def456' -> 'abc123def45' (11 chars) -> '12345' (5 digits) -> '123.45'
        expect(cpf.format('abc123def456')).toBe('123.45')
        // '123abc456def' -> '123abc456de' (11 chars) -> '123456' (6 digits) -> '123.456'
        expect(cpf.format('123abc456def')).toBe('123.456')
      })

      it('should limit to 11 characters', () => {
        expect(cpf.format('123456789012345')).toBe('123.456.789-01')
      })
    })

    describe('parse', () => {
      it('should remove CPF mask', () => {
        expect(cpf.parse('123.456.789-01')).toBe('12345678901')
      })

      it('should remove all non-digits', () => {
        expect(cpf.parse('123.456.789-01')).toBe('12345678901')
        expect(cpf.parse('abc123def456')).toBe('123456')
      })

      it('should limit to 11 characters', () => {
        expect(cpf.parse('123.456.789-01234')).toBe('12345678901')
      })
    })
  })

  describe('number', () => {
    describe('format', () => {
      it('should remove all non-digits', () => {
        expect(number.format('abc123def456')).toBe('123456')
      })

      it('should handle empty string', () => {
        expect(number.format('')).toBe('')
      })

      it('should handle only digits', () => {
        expect(number.format('123456')).toBe('123456')
      })
    })

    describe('parse', () => {
      it('should remove all non-digits', () => {
        expect(number.parse('abc123def456')).toBe('123456')
      })

      it('should handle empty string', () => {
        expect(number.parse('')).toBe('')
      })

      it('should handle only digits', () => {
        expect(number.parse('123456')).toBe('123456')
      })
    })
  })
})
