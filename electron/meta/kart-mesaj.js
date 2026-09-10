// Instagram yorum cevabı için ÜRÜN KARTI (generic template) yükünü üretir —
// veritabanından ve ağdan BAĞIMSIZ saf mantık (sablon-mesaj.js deseni).
//
// NEDEN KART: Meta yorum başına TEK mesaj veriyor ve düz metinde ~1000 karakter sınırı var.
// 11 ürünlük bir gönderide linkler sığmıyordu (ölçüm: 2009 karakter, bkz. [[ig-yorum-karti]]).
// Kart yükünde metin alanı kullanılmadığı için o duvar kalkıyor; üstelik her ürün kendi
// görseli ve tıklanabilir butonlarıyla görünüyor.
//
// 🔴 ÖLÇÜLMÜŞ KISITLAR (08.09.2026, canlı doğrulandı):
//  - `text` ile `attachment` AYNI mesajda GİTMİYOR → yalnız metin ulaşıyor, kart düşüyor.
//    Bu yüzden kargo/açıklama cümlesi kartın ALT BAŞLIĞINA gömülür (kullanıcı kararı).
//  - Kart karuseli DM'de doğru görünüyor (ekran görüntüsüyle kanıtlandı).
//
// Meta belge sınırları: en fazla 10 element, element başına 3 buton, yalnız web_url/postback,
// title 80 krkt, subtitle 80 krkt, buton başlığı 20 krkt.

const MAKS_KART = 10
const MAKS_BUTON = 3
const BASLIK_SINIR = 80
const ALT_BASLIK_SINIR = 80
const BUTON_BASLIK_SINIR = 20
const BUTON_URUN = '🛒 Online Sipariş'

/**
 * Metni sınıra kırpar; kırpıldıysa sonuna … koyar (kelime ortasında kesip anlamsız bırakmamak
 * için son boşluktan geriye alır).
 */
function kirp(metin, sinir) {
  const s = String(metin == null ? '' : metin).trim()
  if (s.length <= sinir) return s
  const kesik = s.slice(0, sinir - 1)
  const bosluk = kesik.lastIndexOf(' ')
  return (bosluk > sinir * 0.6 ? kesik.slice(0, bosluk) : kesik).trimEnd() + '…'
}

/**
 * "0545 151 60 77" → "905451516077". wa.me ülke kodu ister; baştaki 0 atılır, 90 eklenir.
 * Zaten 90 ile başlıyorsa dokunulmaz. Çözülemezse null (buton hiç yazılmaz).
 */
function waNumara(ham) {
  const rakam = String(ham == null ? '' : ham).replace(/\D/g, '')
  if (!rakam) return null
  if (rakam.startsWith('90') && rakam.length === 12) return rakam
  if (rakam.startsWith('0') && rakam.length === 11) return '90' + rakam.slice(1)
  if (rakam.length === 10) return '90' + rakam
  return null
}

/**
 * WhatsApp buton başlığı: "Tencerecim Pendik" → "WhatsApp Pendik" (20 krkt sınırı).
 * Başlık yoksa düz "WhatsApp".
 */
function waButonBasligi(n) {
  const ham = ((n && (n.baslik || n.lokasyon_ad)) || '').trim()
  const yer = ham.replace(/tencerecim/i, '').replace(/whatsapp/i, '').replace(/sipariş hattı/i, '').trim()
  return kirp(yer ? `WhatsApp ${yer}` : 'WhatsApp', BUTON_BASLIK_SINIR)
}

/**
 * Alt başlık: fiyat + (varsa) kargo notu. Kullanıcı kararı 08.09 — kargo cümlesi ayrı metin
 * olarak gidemediği için buraya gömülür.
 * @returns {string} boş olabilir (fiyat da not da yoksa)
 */
function altBaslik(fiyat, kargoNotu) {
  const parcalar = []
  const f = Number(fiyat)
  if (f && !Number.isNaN(f)) parcalar.push(`Fiyat: ${f.toLocaleString('tr-TR')} TL`)
  const not = String(kargoNotu || '').trim()
  if (not) parcalar.push(not)
  return kirp(parcalar.join(' · '), ALT_BASLIK_SINIR)
}

/**
 * Tek ürünün kartı.
 * @param {{ad: string, fiyat?: number|null, web_link?: string|null, gorsel?: string|null}} u
 * @param {Array} numaralar WhatsApp hatları
 * @param {string} kargoNotu alt başlığa eklenecek kısa not
 */
function kart(u, numaralar, kargoNotu) {
  const e = { title: kirp(u.ad, BASLIK_SINIR) }
  const alt = altBaslik(u.fiyat, kargoNotu)
  if (alt) e.subtitle = alt
  if (u.gorsel) e.image_url = u.gorsel
  if (u.web_link) e.default_action = { type: 'web_url', url: u.web_link }

  const butonlar = []
  if (u.web_link) butonlar.push({ type: 'web_url', url: u.web_link, title: BUTON_URUN })
  const gorulen = new Set()
  for (const n of (numaralar || [])) {
    if (butonlar.length >= MAKS_BUTON) break
    const num = waNumara(n && n.numara)
    if (!num || gorulen.has(num)) continue   // aynı numara iki mağaza kaydındaysa tek buton
    gorulen.add(num)
    butonlar.push({ type: 'web_url', url: `https://wa.me/${num}`, title: waButonBasligi(n) })
  }
  if (butonlar.length) e.buttons = butonlar
  return e
}

/**
 * Gönderinin ürünlerinden kart yükünü üretir.
 *
 * @param {{urunler: Array, numaralar?: Array, kargoNotu?: string}} girdi
 * @returns {{yuk: object|null, kartSayisi: number, atlanan: number, sebep?: string}}
 *   yuk null ise kart gönderilemez → çağıran DÜZ METNE düşmeli.
 */
function kartMesajiOlustur({ urunler, numaralar = [], kargoNotu = '' }) {
  const liste = (urunler || []).filter(u => u && String(u.ad || '').trim())
  if (!liste.length) return { yuk: null, kartSayisi: 0, atlanan: 0, sebep: 'ürün yok' }

  // Meta 10 element sınırı. Sıralama çağıranın verdiği sıradır (sosyal_otomasyon_urunler.sira).
  const secilen = liste.slice(0, MAKS_KART)
  const atlanan = liste.length - secilen.length
  const elements = secilen.map(u => kart(u, numaralar, kargoNotu))

  return {
    yuk: { attachment: { type: 'template', payload: { template_type: 'generic', elements } } },
    kartSayisi: elements.length,
    atlanan,
  }
}

module.exports = {
  kartMesajiOlustur, kart, altBaslik, waNumara, waButonBasligi, kirp,
  MAKS_KART, MAKS_BUTON, BASLIK_SINIR, ALT_BASLIK_SINIR, BUTON_BASLIK_SINIR, BUTON_URUN,
}
