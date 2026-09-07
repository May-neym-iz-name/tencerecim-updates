// YouTube yorumuna yanıt önerisi üretir.
//
// TASARIM KARARI: üretilen metin DOĞRUDAN YAYINLANMAZ, yanıt kutusuna düşer.
// Sebebi ölçülmüş: aynı model 2026-09-07'de video açıklamalarında "çizilmez",
// "patlama riski olmayan" ve hiç var olmayan "titanyum gövde" yazdı. Burası
// herkese açık bir kanal ve yanıtlar mağazayı temsil ediyor.
//
// İKİ KATMAN: istemdeki yasaklar (rica) + metin-denetim kapısı (zorunluluk).
// Kapıya takılan metin kullanıcıya GÖSTERİLİR ama "gönderilebilir" sayılmaz.
const gemini = require('./gemini')
const denetim = require('../youtube/metin-denetim')
const { _ayarlariGetir } = require('../db/ai-ayarlar')
const { getDb } = require('../db/database')

const ENFAZLA_KARAKTER = 400   // yorum yanıtı kısa olmalı; roman yazan yanıt okunmuyor

const ISTEM = `Sen bir mutfak gerecleri magazasinin (Tencerecim) YouTube kanalini yoneten
kisisin. Asagidaki musteri yorumuna KISA ve SICAK bir yanit yaz.

VIDEO: {video}
MUSTERI: {kisi}
YORUM: "{yorum}"

KURALLAR:
- Turkce, en fazla 3 cumle, {enfazla} karakteri gecme.
- Dogal ve samimi ol, kurumsal sablon gibi yazma. Emoji en fazla 1 tane.
- YALNIZCA yorumda gecen konuya cevap ver. Bilmedigin bilgiyi UYDURMA.
- Fiyat, stok, olcu, malzeme veya kargo suresi BILMIYORSAN soyleme; onun yerine
  "magazamizdan ya da sitemizden ogrenebilirsiniz" gibi yonlendir.
- MUTLAK IDDIA YASAK: "cizilmez", "kirilmaz", "yanmaz", "bozulmaz", "omur boyu",
  "patlamaz", "risksiz", "zararsiz", "en iyi", "essiz", "mukemmel", "asla", "%100".
  Olculu soyle: "cizilmeye dayanikli", "yuksek isiya dayanikli".
  ("paslanmaz celik" ve "yapismaz yuzey" serbesttir, onlar malzeme/terim adidir.)
- Yorum OLUMSUZ veya sikayetse savunmaya gecme; anlayis goster ve iletisime cagir.
- Link YAZMA: YouTube yorumlarinda dis linkler tiklanamiyor, kalabalik yapar.

Yalnizca yanit metnini yaz. Tirnak, baslik, aciklama ekleme.`

/** İstemi kurar. SAF — test edilebilsin diye ayrı. */
function istemKur({ yorum, kisi, video }) {
  return ISTEM
    .replace('{video}', video || '(bilinmiyor)')
    .replace('{kisi}', kisi || 'Musteri')
    .replace('{yorum}', String(yorum || '').slice(0, 1000))
    .replace('{enfazla}', String(ENFAZLA_KARAKTER))
}

/** Modelin eklemeyi sevdiği süsleri temizler. SAF. */
function yanitiTemizle(ham) {
  let s = String(ham || '').trim()
  // Model bazen tüm yanıtı tırnağa alıyor; tırnak yanıtın parçası değil.
  if (s.length > 1 && /^["'“”]/.test(s) && /["'“”]$/.test(s)) s = s.slice(1, -1).trim()
  // "Yanıt:" / "Cevap:" gibi başlıkları at.
  s = s.replace(/^(yanıt|yanit|cevap|answer)\s*:\s*/i, '')
  return s.replace(/\s+\n/g, '\n').trim()
}

/**
 * Bir yoruma yanıt önerisi üretir.
 * @returns {{metin, model, temiz, bulgular, uzunluk}}
 *          temiz=false ise metin GÖSTERİLİR ama gönderime uygun sayılmaz.
 */
async function yanitOner({ harici_id, gunluk = () => {} }) {
  const satir = getDb().prepare(`
    SELECT s.metin, s.gonderen_ad, s.konu_id, g.baslik video_basligi
    FROM sosyal_mesajlar s
    LEFT JOIN sosyal_gonderiler g ON g.konu_id = s.konu_id
    WHERE s.harici_id = ? AND s.platform = 'youtube'`).get(harici_id)
  if (!satir) throw new Error('Yorum bulunamadi, once yorumlari cekin.')

  const anahtar = (_ayarlariGetir().gemini_anahtar || '').trim()
  const { metin: ham, model } = await gemini.uret({
    anahtar,
    istem: istemKur({ yorum: satir.metin, kisi: satir.gonderen_ad, video: satir.video_basligi }),
    gunluk,
  })

  const metin = yanitiTemizle(ham)
  const d = denetim.denetle({ baslik: '', aciklama: metin, etiketler: [] })
  return {
    metin,
    model,
    uzunluk: metin.length,
    temiz: d.temiz,
    bulgular: d.bulgular,
    ozet: d.temiz ? '' : denetim.ozet(d.bulgular),
  }
}

module.exports = { yanitOner, istemKur, yanitiTemizle, ENFAZLA_KARAKTER }
