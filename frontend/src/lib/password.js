import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common'

const zxcvbn = new ZxcvbnFactory({
  dictionary,
  graphs: adjacencyGraphs,
  useLevenshteinDistance: true,
})

export const NIVELES_PASSWORD = [
  { etiqueta: 'Muy débil', clase: 'bg-destructive' },
  { etiqueta: 'Débil', clase: 'bg-orange-400' },
  { etiqueta: 'Aceptable', clase: 'bg-amber-400' },
  { etiqueta: 'Fuerte', clase: 'bg-emerald-400' },
  { etiqueta: 'Excelente', clase: 'bg-emerald-300' },
]

export const SCORE_MINIMO = 2

export function evaluarPassword(password) {
  if (!password) return null
  return zxcvbn.check(password)
}
