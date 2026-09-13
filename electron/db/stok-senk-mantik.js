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
  reddedildi: 'Trendyol reddetti',
  arsiv: 'Trendyol\'da arşivli',
  kilitli: 'Trendyol\'da kilitli',
}

// Parti bitti mi? 🔴 ÖLÇÜLDÜ (13.09.2026, canlı): stok/fiyat partisinde `status` alanı
// HİÇ GELMİYOR (undefined). status==='COMPLETED' beklenirse sonsuza kadar yoklanır.
// Tek güvenilir kapı: dönen kalem sayısı istenen kalem sayısına ulaştı mı.
// (Ürün YARATMA partisinde status VAR; stok partisinde YOK — ikisini karıştırma.)
function partiTamamMi(yanit) {
  if (!yanit) return false
  const istenen = Number(yanit.itemCount)
  const gelen = Array.isArray(yanit.items) ? yanit.items.length : null
  if (Number.isFinite(istenen) && gelen != null) return gelen >= istenen
  // itemCount gelmediyse status'e düş (ürün yaratma partisi bu yoldan geçer).
  return String(yanit.status || '').toUpperCase() === 'COMPLETED'
}

// Trendyol ürün listesi alanlarından gönderilebilirlik durumu türetir.
// Sıra önemli: arşiv/kilit en kesin engel, onay durumu en sonda.
function urunDurumu(u) {
  if (!u) return 'onaysiz'
  if (u.archived) return 'arsiv'
  if (u.locked) return 'kilitli'
  if (u.rejected) return 'reddedildi'
  if (u.approved === false) return 'onaysiz'
  return 'onayli'
}

// Stok kodu iki kanaldan farklı biçimde gelebilir (boşluk, büyük/küçük harf). Tek biçime
// indirger; aksi hâlde aynı ürün "eşleşmeyen" sayılıp sessizce senkron dışında kalır.
// ÖLÇÜLDÜ (13.09.2026): SKU ile 162/162, barkodla 161/162 eşleşiyor.
function skuAnahtar(deger) {
  if (deger == null) return ''
  return String(deger).trim().toUpperCase()
}

// Barkod EŞLEŞME anahtarı değildir ama Trendyol'a YAZARKEN gerekir — ayrı tutulur.
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
 * @param kaynak  [{ sku, barkod, miktar, ad }]         — ana stok kaynağı
 * @param hedef   [{ sku, barkod, miktar, ad, durum }]  — eşitlenecek kanal
 * @returns { gonderilecek, gonderilemez, eslesmeyen, degismeyen, ozet }
 */
function planUret({ kaynak = [], hedef = [] } = {}) {
  const hedefHarita = new Map()
  for (const h of hedef) {
    const k = skuAnahtar(h && h.sku)
    if (k) hedefHarita.set(k, h)
  }

  const gonderilecek = []
  const gonderilemez = []
  const eslesmeyen = []
  const degismeyen = []

  for (const s of kaynak) {
    const k = skuAnahtar(s && s.sku)
    if (!k) continue // stok kodsuz kaynak satırı eşleşemez, plana da giremez
    const h = hedefHarita.get(k)
    if (!h) {
      eslesmeyen.push({ sku: k, ad: s.ad || null, miktar: miktarSinirla(s.miktar) })
      continue
    }
    const durum = h.durum || 'onayli'
    if (durum !== 'onayli') {
      gonderilemez.push({ sku: k, ad: s.ad || h.ad || null, sebep: GONDERILEMEZ_SEBEP[durum] || `Gönderilemez (${durum})` })
      continue
    }
    // Yazma anahtarı HEDEFİN barkodudur: Trendyol kendi kaydındaki barkodla günceller.
    const barkod = barkodAnahtar(h.barkod)
    const yeni = miktarSinirla(s.miktar)
    const eski = miktarSinirla(h.miktar)
    const satir = { sku: k, barkod, ad: s.ad || h.ad || null, eski_miktar: eski, yeni_miktar: yeni }
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
      sku: skuAnahtar(k.sku), barkod: barkodAnahtar(k.barkod), ad: k.ad || null,
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
  skuAnahtar, barkodAnahtar, miktarSinirla,
  planUret, ozetle, parcala, tersPlan, durumGecisi, tekrarKorumasiBitisi, partiSonucuIsle,
  partiTamamMi, urunDurumu,
}
