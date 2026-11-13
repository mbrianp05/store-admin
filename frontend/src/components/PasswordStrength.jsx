import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  evaluarPassword,
  NIVELES_PASSWORD,
  SCORE_MINIMO,
} from '@/lib/password'

export default function PasswordStrength({ password }) {
  const resultado = useMemo(() => evaluarPassword(password), [password])

  if (!resultado) {
    return (
      <p className="text-xs text-muted-foreground">
        Mínimo 8 caracteres. Mejor si combinas varias palabras.
      </p>
    )
  }

  const score = Math.min(resultado.score, NIVELES_PASSWORD.length - 1)
  const nivel = NIVELES_PASSWORD[score]

  return (
    <div className="grid gap-1.5" aria-live="polite">
      <div className="flex items-center gap-1" aria-hidden="true">
        {NIVELES_PASSWORD.map((_, indice) => (
          <span
            key={indice}
            className={cn(
              'h-1.5 flex-1 rounded-full bg-border transition-colors',
              indice <= score && nivel.clase,
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Seguridad: <span className="font-medium text-foreground">{nivel.etiqueta}</span>
        {score < SCORE_MINIMO && ' · necesitas al menos «Aceptable»'}
      </p>
    </div>
  )
}
