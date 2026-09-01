// Fatura verisinin OKUMA yolu. Asıl nüsha Supabase'de olduğu için doğrudan
// oradan okunur — senkron motoru üzerinden DEĞİL (bkz. plan Ruling-5).
const { sec, secBasliklarla } = require('./bulut')

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
// `secBasliklarla` kullanılır: PostgREST'in sessiz `db-max-rows` kırpması
// yalnız `satirlar.length === limit` eşitliğiyle YAKALANAMAZ (limit tavandan
// düşükse asla eşitlenmez) — gerçek toplamı `Content-Range` başlığından okuyup
// karşılaştırmak gerekir. `|| []`: sunucudan gövde beklenmedik biçimde boş/null
// dönerse (`sec` null dönebiliyor) çökmeden boş liste ile devam edilir.
async function faturaStokGetir(jwt) {
  const { satirlar, toplam } = await secBasliklarla('fatura_stok', `select=urun_senk_id,miktar&limit=${UST_LIMIT}`, jwt)
  const guvenliSatirlar = satirlar || []
  if (toplam != null && guvenliSatirlar.length < toplam) {
    console.warn(`[fatura/okuma] fatura_stok: dönen satır sayısı (${guvenliSatirlar.length}) toplamdan (${toplam}) az — ` +
      `PostgREST db-max-rows kırpması OLABİLİR, veri eksik gelmiş olabilir`)
  }
  return guvenliSatirlar
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

// Kesilen faturalar — sipariş listesinde satır durumunu göstermek için.
// Kanal bazında çekilir; kanal_siparis_id ile eşleştirilir (yerel id her PC'de farklı).
async function kesilenFaturaGetir({ kanal = 'ikas' } = {}, jwt) {
  const parcalar = [
    'select=senk_id,kanal,kanal_siparis_id,durum,saglayici_guid,saglayici_url,fatura_no,toplam,hata_mesaji,tarih',
    `kanal=eq.${encodeURIComponent(kanal)}`,
    'order=tarih.desc',
    `limit=${UST_LIMIT}`,
  ]
  const satirlar = await sec('kesilen_faturalar', parcalar.join('&'), jwt)
  kirpilmaUyar('kesilen_faturalar', satirlar.length, UST_LIMIT)
  return satirlar
}

// "Kontrol Bekliyor" listesi: sonucu doğrulanamamış faturalar (spec §⑤).
// Bu liste boş DEĞİLSE kullanıcı uyarılmalı — sessiz birikirse mükerrer fatura riski.
async function belirsizFaturaGetir(jwt) {
  return sec('kesilen_faturalar',
    'select=*&durum=eq.belirsiz&order=tarih.desc&limit=200', jwt)
}

module.exports = { faturaStokGetir, hareketGetir, alisFaturaGetir, alisKalemGetir,
  kesilenFaturaGetir, belirsizFaturaGetir }
