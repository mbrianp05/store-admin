export const TEXTO_REPOSICION = 'El stock se repondrá próximamente'

// El aviso solo se muestra mientras el producto siga sin stock.
export function esperaReposicion(product) {
  return Boolean(product?.reposicion_pendiente) && (Number(product?.stock) || 0) <= 0
}
