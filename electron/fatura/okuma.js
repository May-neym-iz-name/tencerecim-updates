// Fatura verisinin OKUMA yolu. Asıl nüsha Supabase'de olduğu için doğrudan
// oradan okunur — senkron motoru üzerinden DEĞİL (bkz. plan Ruling-5).
import { sec } from './bulut.js'

// Ürün başına tek satır; katalog ~3 bin ürün olduğu için tek çekim yeterli.
export async function faturaStokGetir(jwt) {
  return sec('fatura_stok', 'select=urun_senk_id,miktar', jwt)
}

export async function hareketGetir({ urun_senk_id, limit = 200 } = {}, jwt) {
  const parcalar = [
    'select=*',
    'order=senk_guncelleme.desc',
    `limit=${Number(limit)}`,
  ]
  if (urun_senk_id) parcalar.push(`urun_senk_id=eq.${encodeURIComponent(urun_senk_id)}`)
  return sec('fatura_stok_hareketler', parcalar.join('&'), jwt)
}

export async function alisFaturaGetir({ tedarikci_senk_id } = {}, jwt) {
  const parcalar = ['select=*', 'order=fatura_tarihi.desc']
  if (tedarikci_senk_id) {
    parcalar.push(`tedarikci_senk_id=eq.${encodeURIComponent(tedarikci_senk_id)}`)
  }
  return sec('alis_faturalari', parcalar.join('&'), jwt)
}

export async function alisKalemGetir(alis_fatura_senk_id, jwt) {
  return sec('alis_fatura_kalemleri',
    `select=*&alis_fatura_senk_id=eq.${encodeURIComponent(alis_fatura_senk_id)}`, jwt)
}
