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

// ——— İSTEM — BURAYI KENDİ AĞZINA GÖRE AYARLA ———
//
// HEDEF: SEO ODAKLI ve AKICI. Ne kuru katalog metni, ne hikâye.
//
// 11.09'da iki kez ayar tutturulamadı, ikisi de kullanıcı geri bildirimiyle:
//   1. Fazla kısıtlıydı ("abartılı sıfat kullanma", "sade Türkçe", sıcaklık 0.4)
//      → metinler KURU çıktı. Modele yaratıcı olmamasını söylemiştim, uymuştu.
//   2. Aşırı düzeltildi (tezgâh dili, duyusal anlatım, sıcaklık 0.9)
//      → HİKÂYE ANLATMAYA kaçtı. Oysa bu metnin işi Google'da bulunmak.
// Şimdiki denge: arama terimleri cümlenin içine yedirilir, akıcı yazılır,
// sahne kurulmaz. Sıcaklık 0.65.
//
// OLGULAR her koşulda kilitlidir ve bu istemle değil denetim.js ile güvence altında:
// her sayı ve teknik iddia kaynağa karşı sınanır, uydurma varsa ürün yazılmaz.
// Bkz. [[uretilen-metin-dogruluk-denetimi]]
function istemKur({ ad, marka, mevcut }) {
  return `Sen Tencerecim'in ürün metni yazarısın. Yazdığın metnin İKİ işi var:
Google'da doğru aramalarda çıkmak ve okuyan müşteriye ürünü net anlatmak.

ÜRÜN ADI: ${ad}
MARKA: ${marka || 'belirtilmemiş'}

MEVCUT AÇIKLAMA (OLGULAR için tek kaynağın budur):
"""
${mevcut}
"""

GÖREVİN: SEO odaklı, akıcı bir ürün metni yaz ve kaynak metindeki bilgileri üç
bölüme dağıt.

SEO — METNİN ASIL İŞİ BU:
· Ürün adı ilk cümlede doğal biçimde geçsin. Marka adı da metinde yer alsın.
· Müşterinin ARAMA KUTUSUNA YAZACAĞI terimleri kullan: ürün tipi, ölçü, hacim,
  malzeme, kullanım alanı ("34 cm karnıyarık tenceresi", "granit tencere",
  "7 litre", "yapışmaz tava"). Bunları cümlenin içine yedir.
· Ürünün NE İŞE YARADIĞINI ve KİME uygun olduğunu açıkça yaz — arayan kişi
  aradığını bulduğunu ilk cümlede anlasın.
· Kaynakta geçen yemek adlarını (karnıyarık, güveç, zeytinyağlı vb.) kullan;
  bunlar gerçek arama terimleridir.

ÜSLUP:
· AKICI ve net yaz. Kopuk, madde madde sıralanmış cümle kurma.
· HİKÂYE ANLATMA. "Misafir gününde...", "Karnıyarık yapacaksanız..." gibi sahne
  kurma; doğrudan ürünü anlat.
· Klişe kullanma: "mutfağınızın vazgeçilmezi", "kaliteyi ayağınıza getiriyoruz",
  "eşsiz", "muhteşem" YASAK.
· Anahtar kelime tıkıştırma; aynı terimi arka arkaya tekrarlama. Akıcılık önce gelir.

OLGULAR — BURADA KESİNLİKLE SERBEST DEĞİLSİN:
1. Kaynak metinde GEÇMEYEN hiçbir ÖZELLİK yazma. Ölçü, hacim, ağırlık, parça sayısı,
   kaplama türü — kaynakta yoksa çıktıda da olmayacak. Tahmin etme, markadan çıkarım
   yapma, "muhtemelen" deme. Sayı uydurmak en ağır hatadır.
2. İNDÜKSİYON, GARANTİ, ÇELİK KALİTESİ (304/18-10), BULAŞIK MAKİNESİ, FIRIN, BPA
   hakkında HİÇBİR ŞEY yazma. Bunlar ayrıca doğrulanıp rozet olarak ekleniyor;
   sen yazarsan çelişkili bilgi çıkar.
3. Fiyat, indirim, kampanya, kargo sözü YAZMA.
4. Bir bölüme koyacak BİLGİ yoksa o bölümü boş string bırak. Doldurmak için uydurma.
   (Üslup serbest demek, olgu icat etmek demek değil — anlatımı zenginleştir,
   özelliği değil.)
5. SEO paragrafı ${SEO_EN_AZ}-${SEO_EN_FAZLA} karakter arası. Ürün adı ve marka
   doğal aksın, anahtar kelime tıkıştırma.
6. Düz metin ver: madde işareti, emoji, HTML etiketi yok.

YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"seo":"...","icerik":"...","malzeme":"...","saglik":"..."}

seo     = ürünü tanıtan SEO giriş paragrafı: ne olduğu, ölçüsü, neye yaradığı
icerik  = kutudan ne çıkıyor, parça sayısı, ebat (kaynakta varsa)
malzeme = neyden yapılmış, kaplama, yapı — ve bunun pişirmeye pratik faydası
saglik  = nasıl kullanılır, nasıl bakılır, hangi yemekler için uygun`
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
const GECICI_KALIP = /high demand|yogun|yoğun|overloaded|rate limit|timeout|zaman asimi|ECONNRESET|ETIMEDOUT|socket hang up|503|429/i

// GÜNLÜK KOTA BİTMESİ geçici DEĞİLDİR — beklemekle geçmez, ertesi güne kadar sürer.
// 11.09'da "quota" kalıbı geçici sayılmıştı: her ürün 4 kez deneyip 35 sn bekledi,
// kalan ürünler için bu saatlerce boşuna iş demek. Artık ayrı sınıf.
const KOTA_KALIP = /exceeded your current quota|billing details|RESOURCE_EXHAUSTED/i

function kotaMi(hata) {
  return KOTA_KALIP.test(String((hata && hata.message) || hata || ''))
}

function geciciMi(hata) {
  if (kotaMi(hata)) return false
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
    // 0.4 çok kuru, 0.9 ise hikâye anlatmaya kaçtı (kullanıcı 11.09'da ikisini de
    // bildirdi). 0.65: akıcı cümle kurmaya yetecek kadar serbest, SEO odağını
    // kaybedecek kadar değil. Olgu güvenliği zaten sıcaklıktan değil denetim.js'ten.
    sicaklik: 0.65,
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

module.exports = {
  bolumleriUret, duzMetin, jsonAyristir, seoDenetle, istemKur,
  kotaMi, geciciMi, SEO_EN_AZ, SEO_EN_FAZLA,
}
