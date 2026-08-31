// Fatura verisinin OKUMA yolu. Asıl nüsha Supabase'de olduğu için doğrudan
// oradan okunur — senkron motoru üzerinden DEĞİL (bkz. plan Ruling-5).
const { sec } = require('./bulut')

// PostgREST varsayılan db-max-rows (tipik 1000) devredeyse, açık `limit`
// gönderilmeyen bir SELECT sessizce kırpılabilir. Katalog ~3 bin ürün ve
// büyüyor — bu yüzden ürün/fatura listelerine bilerek yüksek bir üst sınır
// veriyoruz; sınıra tam eşit dönüş kırpılma işareti sayılıp loglanıyor.
const UST_LIMIT = 5000

function kirpilmaUyar(kaynak, satirSayisi, limit) {
  if (satirSayisi === limit) {
    console.warn(`[fatura/okuma] ${kaynak}: dönen satır sayısı (${satirSayisi}) limite (${limit}) eşit — ` +
      `PostgreSQL/PostgREST kırpması OLABİLİR, veri eksik gelmiş olabilir`)
  }
}

// Ürün başına tek satır; katalog ~3 bin ürün olduğu için tek çekim yeterli.
async function faturaStokGetir(jwt) {
  const satirlar = await sec('fatura_stok', `select=urun_senk_id,miktar&limit=${UST_LIMIT}`, jwt)
  kirpilmaUyar('fatura_stok', satirlar.length, UST_LIMIT)
  return satirlar
}

async function hareketGetir({ urun_senk_id, limit = 200 } = {}, jwt) {
  // Geçersiz (NaN üretecek) limit sessizce PostgREST'e `limit=NaN` göndermesin.
  const guvenliLimit = Number.isFinite(Number(limit)) ? Number(limit) : 200
  const parcalar = [
    'select=*',
    'order=senk_guncelleme.desc',
    `limit=${guvenliLimit}`,
  ]
  if (urun_senk_id) parcalar.push(`urun_senk_id=eq.${encodeURIComponent(urun_senk_id)}`)
  return sec('fatura_stok_hareketler', parcalar.join('&'), jwt)
}

async function alisFaturaGetir({ tedarikci_senk_id } = {}, jwt) {
  const parcalar = ['select=*', 'order=fatura_tarihi.desc', `limit=${UST_LIMIT}`]
  if (tedarikci_senk_id) {
    parcalar.push(`tedarikci_senk_id=eq.${encodeURIComponent(tedarikci_senk_id)}`)
  }
  const satirlar = await sec('alis_faturalari', parcalar.join('&'), jwt)
  kirpilmaUyar('alis_faturalari', satirlar.length, UST_LIMIT)
  return satirlar
}

async function alisKalemGetir(alis_fatura_senk_id, jwt) {
  return sec('alis_fatura_kalemleri',
    `select=*&alis_fatura_senk_id=eq.${encodeURIComponent(alis_fatura_senk_id)}`, jwt)
}

module.exports = { faturaStokGetir, hareketGetir, alisFaturaGetir, alisKalemGetir }
