// GEMINI KATMANI — mevcut açıklamayı şablon bölümlerine DAĞITIR.
//
// EN ÖNEMLİ KURAL: Gemini'nin işi bilgi üretmek DEĞİL, var olan bilgiyi
// bölümlere yerleştirmek. Tek serbest üretim 250-400 karakterlik SEO paragrafı,
// o da yalnız kaynak metindeki olgulara dayanabilir.
//
// Neden: "indüksiyon uyumlu", "304 çelik", "fırına girer" gibi iddialar
// doğrulanmadan yazılırsa müşteriye yanlış bilgi gider ve iade doğurur.
// Kaynak metinde yoksa çıktıda da olmayacak.

const { uret: geminiUret } = require('../ai/gemini')

const SEO_EN_AZ = 250
const SEO_EN_FAZLA = 400

// HTML açıklamayı düz metne indirger — Gemini'ye etiket kalabalığı gitmesin.
function duzMetin(html) {
  return String(html || '')
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ——— BURAYI KENDİ AĞZINA GÖRE AYARLA ———
// Marka sesi senin bilgin; aşağısı başlangıç noktası.
function istemKur({ ad, marka, mevcut }) {
  return `Sen bir mutfak gereçleri e-ticaret sitesinin ürün metni editörüsün.

ÜRÜN ADI: ${ad}
MARKA: ${marka || 'belirtilmemiş'}

MEVCUT AÇIKLAMA (tek bilgi kaynağın budur):
"""
${mevcut}
"""

GÖREVİN: Yukarıdaki mevcut açıklamadaki bilgileri üç bölüme dağıt ve bir SEO paragrafı yaz.

MUTLAK KURALLAR:
1. Mevcut açıklamada GEÇMEYEN hiçbir özelliği yazma. Indüksiyon uyumluluğu, çelik
   kalitesi (304/18-10), bulaşık makinesi, fırın, garanti süresi, ölçü, ağırlık —
   bunlar kaynak metinde açıkça yazmıyorsa ÇIKTIDA DA OLMAYACAK. Tahmin etme,
   markadan çıkarım yapma, "muhtemelen" deme.
2. Fiyat, indirim, kampanya, kargo sözü YAZMA.
3. Bir bölüme koyacak bilgi yoksa o bölümü boş string bırak. Doldurmak için uydurma.
4. SEO paragrafı ${SEO_EN_AZ}-${SEO_EN_FAZLA} karakter arası olacak. Ürün adı ve
   marka doğal biçimde geçsin. Abartılı sıfat ("muhteşem", "eşsiz") kullanma.
5. Sade Türkçe. Madde işareti, emoji, HTML etiketi KULLANMA — düz metin ver.

YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"seo":"...","icerik":"...","malzeme":"...","saglik":"..."}

icerik  = kutudan ne çıkıyor, parça sayısı, ebat (kaynakta varsa)
malzeme = neyden yapılmış, kaplama, yapı (kaynakta varsa)
saglik  = nasıl kullanılır, nasıl temizlenir, nelere dikkat (kaynakta varsa)`
}

// Gemini bazen JSON'u ``` bloğuna sarar veya önüne laf eder. Temizle ve ayrıştır.
function jsonAyristir(ham) {
  const metin = String(ham || '').trim()
  const blok = metin.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const aday = (blok ? blok[1] : metin).trim()
  const ilk = aday.indexOf('{')
  const son = aday.lastIndexOf('}')
  if (ilk === -1 || son <= ilk) throw new Error(`Gemini JSON döndürmedi: ${metin.slice(0, 200)}`)
  let nesne
  try {
    nesne = JSON.parse(aday.slice(ilk, son + 1))
  } catch (e) {
    throw new Error(`Gemini JSON'u bozuk: ${e.message} — ${aday.slice(0, 200)}`)
  }
  const al = (k) => String(nesne[k] == null ? '' : nesne[k]).trim()
  return { seo: al('seo'), icerik: al('icerik'), malzeme: al('malzeme'), saglik: al('saglik') }
}

// SEO uzunluk kapısı: "hata vermedi" doğrulama değildir, ölç.
// Kısa/uzunsa fırlatmaz — uyarı döndürür, çağıran ürünü atlamaya karar verir.
function seoDenetle(seo) {
  const n = seo.length
  if (!n) return 'SEO metni boş'
  if (n < SEO_EN_AZ) return `SEO metni kısa (${n} krkt, en az ${SEO_EN_AZ})`
  if (n > SEO_EN_FAZLA) return `SEO metni uzun (${n} krkt, en fazla ${SEO_EN_FAZLA})`
  return null
}

// Dönen: { bilgi, uyari }  — uyari null değilse metin şablona uygun değil.
async function bolumleriUret({ ad, marka, mevcut, anahtar, _uret = geminiUret }) {
  const kaynak = duzMetin(mevcut)
  if (!kaynak) return { bilgi: null, uyari: 'mevcut açıklama boş — dağıtılacak bilgi yok' }

  const yanit = await _uret({
    anahtar,
    istem: istemKur({ ad, marka, mevcut: kaynak }),
    sicaklik: 0.4,          // dağıtım işi; yaratıcılık istemiyoruz
    enFazlaJeton: 800,
  })
  // gemini.uret → { metin, model }
  const bilgi = jsonAyristir(yanit && yanit.metin)
  return { bilgi, uyari: seoDenetle(bilgi.seo) }
}

module.exports = { bolumleriUret, duzMetin, jsonAyristir, seoDenetle, istemKur, SEO_EN_AZ, SEO_EN_FAZLA }
