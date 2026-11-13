const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'CUP',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return dateFormatter.format(date)
}
