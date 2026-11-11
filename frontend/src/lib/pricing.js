import { hoyISO } from './fechas'

function fechaISO(valor) {
  if (!valor) return null
  const texto = String(valor).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}

export function descuentoVigente(producto, fecha = hoyISO()) {
  const descuento = producto?.descuento
  if (!descuento || typeof descuento !== 'object') return null

  const porcentaje = Number(descuento.porcentaje)
  const desde = fechaISO(descuento.desde)
  const hasta = fechaISO(descuento.hasta)
  const referencia = fechaISO(fecha) || hoyISO()

  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
    return null
  }
  if (!desde || !hasta || desde > hasta) return null
  if (referencia < desde || referencia > hasta) return null

  return { porcentaje, desde, hasta }
}

export function estadoDescuento(producto, fecha = hoyISO()) {
  const descuento = producto?.descuento
  const desde = fechaISO(descuento?.desde)
  const hasta = fechaISO(descuento?.hasta)
  if (!desde || !hasta || desde > hasta) return null

  const referencia = fechaISO(fecha) || hoyISO()
  if (referencia < desde) return 'programado'
  if (referencia > hasta) return 'vencido'
  return 'activo'
}

export function precioVigente(producto, fecha) {
  const base = Number(producto?.precio) || 0
  const descuento = descuentoVigente(producto, fecha)
  if (!descuento) return base
  return Math.round(((base * (100 - descuento.porcentaje)) / 100) * 100) / 100
}
