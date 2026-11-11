const fechaCortaFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const mesFormatter = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
})

export function isoLocal(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function hoyISO() {
  return isoLocal(new Date())
}

export function parseFechaISO(valor) {
  if (!valor) return null
  const texto = String(valor).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null
  const [anio, mes, dia] = texto.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia, 12)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function sumarDias(valor, dias) {
  const fecha = parseFechaISO(valor) || parseFechaISO(hoyISO())
  fecha.setDate(fecha.getDate() + dias)
  return isoLocal(fecha)
}

export function formatFechaCorta(valor) {
  const fecha = parseFechaISO(valor)
  return fecha ? fechaCortaFormatter.format(fecha) : '—'
}

export function formatMes(fecha) {
  const texto = mesFormatter.format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function diasEntre(desde, hasta) {
  const inicio = parseFechaISO(desde)
  const fin = parseFechaISO(hasta)
  if (!inicio || !fin) return 0
  return Math.round((fin - inicio) / 86400000) + 1
}
