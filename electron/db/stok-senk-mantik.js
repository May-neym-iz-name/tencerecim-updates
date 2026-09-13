// Kanal stok senkronunun SAF mantığı: ağ yok, DB yok, bu yüzden testlenebilir.
// Karar kaydı: docs/superpowers/specs/2026-09-13-kanal-stok-senkronu-design.md
//
// Kural (13.09.2026, kullanıcı kararı): hedef kanalın adedi := kaynak kanalın adedi.
// Emniyet payı YOK, sabit adet YOK. Kaynakta 0 ise hedefte de 0 — ürün satıştan kalkar.
// Bu bilinçlidir: iki mağazada tek bir doğru sayı olsun isteniyor.

// Trendyol sınırları (belgeli — docs/trendyol-api-reference.md).
const PARTI_BOYUTU = 1000      // tek istekte en fazla kalem
const STOK_TAVANI = 20000      // ürün başına en fazla stok
const TEKRAR_KORUMA_DK = 15    // aynı istek bu süre içinde reddedilir

// Trendyol'da yalnız ONAYLI ürünün stoğu güncellenebilir. Diğerleri sessizce
// düşürülmez, gerekçesiyle listelenir — sessiz kayıp teşhis edilemez.
const GONDERILEMEZ_SEBEP = {
  onaysiz: 'Trendyol onayı bekliyor',
  arsiv: 'Trendyol\'da arşivli',
  kilitli: 'Trendyol\'da kilitli',
}

// Barkod iki kanaldan farklı biçimde gelebilir (boşluk, sayı/metin). Tek biçime indirger;
// aksi hâlde aynı ürün "eşleşmeyen" sayılıp sessizce senkron dışında kalır.
function barkodAnahtar(deger) {
  if (deger == null) return ''
  return String(deger).trim()
}

// Miktarı Trendyol'un kabul ettiği aralığa çeker. null/NaN → 0 (ürünü satıştan kaldırır),
// çünkü "bilinmiyor" durumunda satışta bırakmak aşırı satış riskidir.
function miktarSinirla(deger) {
  const n = Math.trunc(Number(deger))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, STOK_TAVANI)
}

/**
 * Gönderim planı üretir.
 *
 * @param kaynak  [{ barkod, miktar, ad }]            — ikas (gerçeği tutan taraf)
 * @param hedef   [{ barkod, miktar, ad, durum }]     — Trendyol
 * @returns { gonderilecek, gonderilemez, eslesmeyen, degismeyen, ozet }
 */
function planUret({ kaynak = [], hedef = [] } = {}) {
  const hedefHarita = new Map()
  for (const h of hedef) {
    const k = barkodAnahtar(h && h.barkod)
    if (k) hedefHarita.set(k, h)
  }

  const gonderilecek = []
  const gonderilemez = []
  const eslesmeyen = []
  const degismeyen = []

  for (const s of kaynak) {
    const k = barkodAnahtar(s && s.barkod)
    if (!k) continue // barkodsuz kaynak satırı eşleşemez, plana da giremez
    const h = hedefHarita.get(k)
    if (!h) {
      eslesmeyen.push({ barkod: k, ad: s.ad || null, miktar: miktarSinirla(s.miktar) })
      continue
    }
    const durum = h.durum || 'onayli'
    if (durum !== 'onayli') {
      gonderilemez.push({ barkod: k, ad: s.ad || h.ad || null, sebep: GONDERILEMEZ_SEBEP[durum] || `Gönderilemez (${durum})` })
      continue
    }
    const yeni = miktarSinirla(s.miktar)
    const eski = miktarSinirla(h.miktar)
    const satir = { barkod: k, ad: s.ad || h.ad || null, eski_miktar: eski, yeni_miktar: yeni }
    if (yeni === eski) degismeyen.push(satir)
    else gonderilecek.push(satir)
  }

  return {
    gonderilecek, gonderilemez, eslesmeyen, degismeyen,
    ozet: ozetle(gonderilecek, { gonderilemez: gonderilemez.length, eslesmeyen: eslesmeyen.length, degismeyen: degismeyen.length }),
  }
}

// Doğrulama ekranının okuduğu özet. "sifirlanacak" AYRI sayılır çünkü tek geri dönüşü
// zor sonuç odur: ürün Trendyol'da satıştan kalkar.
function ozetle(gonderilecek, ekler = {}) {
  let artacak = 0, azalacak = 0, sifirlanacak = 0
  for (const s of gonderilecek) {
    if (s.yeni_miktar === 0) sifirlanacak++
    if (s.yeni_miktar > s.eski_miktar) artacak++
    else if (s.yeni_miktar < s.eski_miktar) azalacak++
  }
  return { toplam: gonderilecek.length, artacak, azalacak, sifirlanacak, ...ekler }
}

// 1000'lik partilere böler. Boş girdide boş dizi döner (tek bir boş istek atılmasın).
function parcala(kalemler, boyut = PARTI_BOYUTU) {
  const n = Math.max(1, Math.trunc(boyut) || PARTI_BOYUTU)
  const parcalar = []
  for (let i = 0; i < (kalemler || []).length; i += n) parcalar.push(kalemler.slice(i, i + n))
  return parcalar
}

// Geri alma planı: anlık görüntüdeki ESKİ miktarı yeni hedef yapar.
// sonuc'u 'basarili' olmayan kalem geri alınmaz — zaten gitmemiştir, geri yazmak
// hedefte olmayan bir değişikliği "düzeltmeye" kalkmak olurdu.
function tersPlan(kalemler) {
  return (kalemler || [])
    .filter(k => k && (k.sonuc == null || k.sonuc === 'basarili'))
    .map(k => ({
      barkod: barkodAnahtar(k.barkod), ad: k.ad || null,
      eski_miktar: miktarSinirla(k.yeni_miktar),
      yeni_miktar: miktarSinirla(k.eski_miktar),
    }))
    .filter(k => k.barkod && k.eski_miktar !== k.yeni_miktar)
}

// Durum makinesi. Geçersiz geçiş SESSİZCE yutulmaz, fırlatılır: yarı uygulanmış bir
// işlemin "hazır"a dönmesi ikinci kez gönderim demektir.
const GECISLER = {
  hazir: ['uygulandi', 'kismi', 'hata'],
  kismi: ['geri_alindi'],
  uygulandi: ['geri_alindi'],
  hata: [],
  geri_alindi: [],
}

function durumGecisi(mevcut, hedef) {
  const izinli = GECISLER[mevcut]
  if (!izinli) throw new Error(`Bilinmeyen işlem durumu: ${mevcut}`)
  if (!izinli.includes(hedef)) throw new Error(`Geçersiz durum geçişi: ${mevcut} → ${hedef}`)
  return hedef
}

// Trendyol'un 15 dakika tekrar koruması ne zaman biter? Geri alma düğmesi bu ana kadar
// kapalı kalır ve sayaç gösterilir — hata mesajı değil, bilgi.
function tekrarKorumasiBitisi(uygulamaTarihiMs, dakika = TEKRAR_KORUMA_DK) {
  // null/'' Number() ile 0'a düşer ve 1970'ten 15 dk sonrasını verirdi — açıkça ele alınır.
  if (uygulamaTarihiMs == null || uygulamaTarihiMs === '') return null
  const t = Number(uygulamaTarihiMs)
  if (!Number.isFinite(t) || t <= 0) return null
  return t + dakika * 60 * 1000
}

// Parti yanıtındaki kalem sonuçlarını barkoda göre eşler. Trendyol başarısız kalemleri
// failureReasons ile döndürür; dönmeyen kalem başarılı sayılır.
function partiSonucuIsle(kalemler, basarisizlar) {
  const hataHarita = new Map()
  for (const b of basarisizlar || []) {
    const k = barkodAnahtar(b && (b.barcode || b.barkod))
    if (k) hataHarita.set(k, b.failureReasons ? [].concat(b.failureReasons).join('; ') : (b.message || 'bilinmeyen hata'))
  }
  return (kalemler || []).map(k => {
    const hata = hataHarita.get(barkodAnahtar(k.barkod))
    return { ...k, sonuc: hata ? 'hata' : 'basarili', hata: hata || null }
  })
}

module.exports = {
  PARTI_BOYUTU, STOK_TAVANI, TEKRAR_KORUMA_DK, GONDERILEMEZ_SEBEP,
  barkodAnahtar, miktarSinirla,
  planUret, ozetle, parcala, tersPlan, durumGecisi, tekrarKorumasiBitisi, partiSonucuIsle,
}
