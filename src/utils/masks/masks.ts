// CPF
export function addCpfMask(cpf: string) {
  return cpf
    .slice(0, 11) // Limit to 11 characters
    .replace(/\D/g, '') // Remove everything that isn't a digit
    .replace(/(\d{3})(\d)/, '$1.$2') // Add a dot after the first three digits
    .replace(/(\d{3})(\d)/, '$1.$2') // Add a dot after the second three digits
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2') // Add a dash after the last three digits
}

export function removeCpfMask(cpf: string) {
  return cpf
    .slice(0, 14)
    .replace(/\D/g, '') // Limit to 11 characters and remove everything that isn't a digit
    .replace(/\D/g, '') // Remove everything that isn't a digit
}

export const cpf = {
  format: addCpfMask,
  parse: removeCpfMask,
}

// Number
function addNumberMask(number: string) {
  return number.replace(/\D/g, '') // Remove everything that isn't a digit
}

function removeNumberMask(number: string) {
  return number.replace(/\D/g, '') // Remove everything that isn't a digit
}

export const number = {
  format: addNumberMask,
  parse: removeNumberMask,
}
