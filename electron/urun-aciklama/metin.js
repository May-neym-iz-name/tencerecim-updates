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
2b. İNDÜKSİYON, GARANTİ ve ÇELİK KALİTESİ hakkında HİÇBİR ŞEY YAZMA — bunlar
   ayrıca doğrulanıp rozet olarak eklenir. Sen yazarsan çift/çelişkili bilgi olur.
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
  if (ilk !== -1 && son <= ilk) {
    // Açılan süslü parantez var ama kapanan yok → yanıt jeton sınırında KESİLMİŞ.
    // Bunu "JSON döndürmedi" diye raporlamak yanlış teşhise götürüyordu (11.09).
    throw new Error(`Gemini yanıtı KESİLDİ (jeton sınırı) — enFazlaJeton artırılmalı: ${aday.slice(-80)}`)
  }
  if (ilk === -1) throw new Error(`Gemini JSON döndürmedi: ${metin.slice(0, 200)}`)
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

// SEO uzunluğu tutmazsa modele NE YAPACAĞINI söyleyip tekrar sorar.
// 11.09 ölçüldü: tek denemede 238 krkt gelip ürün atlandı. 424 üründe bu çok sayıda
// atlama demek. Düzelt-ve-tekrar-sor, "atla"dan iyi; ama sonsuz denemez.
const EN_FAZLA_DENEME = 3

// GEÇİCİ GEMINI ARIZASI — 11.09'da canlıda görüldü:
// "This model is currently experiencing high demand..." Bu kalıcı bir hata değil;
// gemini.js tüm modelleri deneyip pes ediyor. 424 ürünlük turda bunun sık olması
// beklenir ve ürünü atlamak bilgi kaybıdır → geri çekilerek (backoff) tekrar dene.
const GECICI_KALIP = /high demand|yogun|yoğun|overloaded|rate limit|quota|timeout|zaman asimi|ECONNRESET|ETIMEDOUT|socket hang up|503|429/i

function geciciMi(hata) {
  return GECICI_KALIP.test(String((hata && hata.message) || hata || ''))
}

const uyu = (ms) => new Promise(r => setTimeout(r, ms))

// Geçici arızada artan beklemeyle tekrar dener. Kalıcı hatada HEMEN fırlatır —
// yoksa gerçek hatayı 4 kat yavaşlatarak gizlemiş oluruz.
async function geciciyeDayanikli(fn, { tur = 4, ilkBekleme = 5000, gunluk = () => {}, _uyu = uyu } = {}) {
  let son
  for (let i = 1; i <= tur; i++) {
    try { return await fn() } catch (e) {
      son = e
      if (!geciciMi(e) || i === tur) throw e
      const bekle = ilkBekleme * Math.pow(2, i - 1)     // 5s · 10s · 20s
      gunluk(`geçici Gemini arızası (${i}/${tur - 1}), ${bekle / 1000} sn sonra tekrar: ${e.message}`)
      await _uyu(bekle)
    }
  }
  throw son
}

function duzeltmeEki(seo) {
  const n = seo.length
  const yon = n < SEO_EN_AZ
    ? `ÇOK KISA (${n} karakter). Kaynak metindeki BAŞKA olguları ekleyerek uzat.`
    : `ÇOK UZUN (${n} karakter). Yeni bilgi ekleme, sadece kısalt.`
  return `\n\nÖNCEKİ DENEMEN REDDEDİLDİ: "seo" alanı ${yon}`
    + `\n${SEO_EN_AZ}-${SEO_EN_FAZLA} karakter arasında olmalı. Diğer alanları aynı bırakabilirsin.`
    + `\nYine SADECE JSON döndür.`
}

// Dönen: { bilgi, uyari }  — uyari null değilse metin şablona uygun değil.
async function bolumleriUret({ ad, marka, mevcut, anahtar, gunluk, _uret = geminiUret, _uyu = uyu }) {
  const kaynak = duzMetin(mevcut)
  if (!kaynak) return { bilgi: null, uyari: 'mevcut açıklama boş — dağıtılacak bilgi yok' }

  let sonBilgi = null, sonUyari = null
  for (let deneme = 1; deneme <= EN_FAZLA_DENEME; deneme++) {
    const ek = sonBilgi ? duzeltmeEki(sonBilgi.seo) : ''
    sonBilgi = await geciciyeDayanikli(
      () => _tekDeneme({ ad, marka, kaynak, anahtar, ek, _uret }),
      { gunluk, _uyu })
    sonUyari = seoDenetle(sonBilgi.seo)
    if (!sonUyari) return { bilgi: sonBilgi, uyari: null }
  }
  return { bilgi: sonBilgi, uyari: `${sonUyari} — ${EN_FAZLA_DENEME} denemede düzelmedi` }
}

async function _tekDeneme({ ad, marka, kaynak, anahtar, ek, _uret }) {
  const yanit = await _uret({
    anahtar,
    istem: istemKur({ ad, marka, mevcut: kaynak }) + (ek || ''),
    sicaklik: 0.4,          // dağıtım işi; yaratıcılık istemiyoruz
    // 11.09 ÖLÇÜLDÜ: 800 de 2500 de yanıtı ortasından kesti. Sebep jeton azlığı DEĞİL —
    // gemini-3.x flash bir DÜŞÜNME modeli ve maxOutputTokens düşünme jetonlarını da
    // sayıyor; bütçeyi düşünme yiyip görünür çıktıya yer kalmıyordu.
    // Çözüm: düşünmeyi kapat + yanıtı katı JSON'a bağla.
    enFazlaJeton: 4000,
    ekConfig: {
      responseMimeType: 'application/json',   // ``` sarmalı ve önsöz üretmez
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  // gemini.uret → { metin, model }
  return jsonAyristir(yanit && yanit.metin)
}

module.exports = { bolumleriUret, duzMetin, jsonAyristir, seoDenetle, istemKur, SEO_EN_AZ, SEO_EN_FAZLA }
