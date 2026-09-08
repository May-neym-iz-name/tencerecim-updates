// Yorum NİYET sınıflayıcısı — kural tabanlı, model YOK. 07.09.2026'da 89.409 yorumda
// ölçüldü: fiyat %63, fiyat dışı gerçek soru %11, etiket %14, kalanı övgü/emoji/gürültü.
//
// 🔴 TASARIM KURALI — hata asimetrik: fiyat sorusu "soru" sayılırsa DM gitmez, müşteri
// cevapsız kalır (PAHALI). Soru "fiyat" sayılırsa fiyat kartı gider, temsilci yine görür
// (UCUZ). Bu yüzden fiyat tarafı GENİŞ tutulur ve sıralamada ÖNCE bakılır.
//
// Kullanım: çekimde _upsertMesaj yeni gelen yorum satırına yazar; geçmiş için niyetToplu.
const { trNormal } = require('./tr-arama')

const NIYETLER = ['fiyat', 'soru', 'etiket', 'ovgu', 'emoji', 'gurultu']

// f[ioy]{1,2}[aoyq]?[st]: fiyat, fiyqt, fiyst, foyat, fıyat (trNormal ı→i yapar).
// Uzatılmış harfler ("Fiiiiyaaaat") eşleşmeden önce tekilleştirilir (tekille()).
const FIYAT_ISKELET = /f[ioy]{1,2}[aoyq]?[st]/
// "bilgi" GENİŞ tarafta: "detaylı bilgi için yazıyorum" diyen fiyat ister (ölçüm 07.09).
const FIYAT_KALIP = /\b(kac para|kac tl|kac lira|ne kadar|nekadar|ucret|tl mi|lira mi|bilgi|fiat|fyt)|\btl\b|\blira\b/
// Soru: soru işareti, soru kelimeleri, "mi/mu" soru eki (ayrı ya da bitişik: "geldi mi",
// "geldimi", "mevcutmu") ve satın alma niyeti taşıyan kelimeler (sipariş, ebat, ölçü,
// mevcut, şikâyet). Bitişik "mi/mu" eki "resmi/kimi" gibi kelimeleri de yakalar — kabul
// edilen hata: soru sayılan bir yorumu temsilci görür, kayıp yok.
const SORU_KALIP = /\?|\b(var ?mi|yok ?mu|nerede|nereden|nasil|hangi|hangisi|nedir|ne zaman|neden|kac|kacta|uygun ?mu|olur ?mu|kargo|gonderim|iade|garanti|induksiyon|indiksiyon|midir|mudur|misiniz|miyim|mi|mu|acaba|siparis|ebat|olcu|olcusu|boyut|mevcut|litre|kilo|sikayet|memnun (kalmadi|degil)|istiyorum|alabilir)\b|\w{3,}(mi|mu)\b/
const OVGU_KALIP = /\b(harika|super|muhtesem|ellerinize saglik|cok guzel|cok ?sik|bayildim|tesekkur|helal|mukemmel|memnunum|begendim)\b|👏|❤|😍|🥰/
// Yalnız etiketler; sonda emoji/noktalama olabilir ("@a @b 😍" hâlâ etiket).
const ETIKET_SADECE = /^(@[\w.]+[\s,]*)+[^\p{L}\p{N}]*$/u
// "Fiiiiyaaaat" → "fiyat": aynı harften 3+ ardışık tekrarı teke indirir.
const tekille = (s) => s.replace(/(.)\1{2,}/g, '$1')
// Yalnız emoji / boşluk / noktalama: harf veya rakam YOK.
const HARF_YOK = /^[^\p{L}\p{N}]*$/u

function niyetBul(metin) {
  const ham = String(metin == null ? '' : metin).trim()
  if (!ham || HARF_YOK.test(ham)) return 'emoji'
  const n = tekille(trNormal(ham))
  // FİYAT ÖNCE: etiketli ya da soru işaretli olsa bile fiyat kalıbı varsa fiyat.
  if (FIYAT_ISKELET.test(n) || FIYAT_KALIP.test(n)) return 'fiyat'
  if (ETIKET_SADECE.test(ham)) return 'etiket'
  if (SORU_KALIP.test(n)) return 'soru'
  if (OVGU_KALIP.test(n) || OVGU_KALIP.test(ham)) return 'ovgu'
  return 'gurultu'
}

// Geçmiş yorumlar için tek seferlik toplu sınıflama. Dolu satıra DOKUNMAZ (elle düzeltme
// korunsun). 133k satırda tek transaction, ölçüm: saniyeler.
function niyetToplu(db) {
  const satirlar = db.prepare(
    "SELECT id, metin FROM sosyal_mesajlar WHERE tur='yorum' AND yon='gelen' AND niyet IS NULL"
  ).all()
  const yaz = db.prepare('UPDATE sosyal_mesajlar SET niyet = ? WHERE id = ?')
  db.transaction(() => { for (const s of satirlar) yaz.run(niyetBul(s.metin), s.id) })()
  return { islenen: satirlar.length }
}

module.exports = { niyetBul, NIYETLER, niyetToplu }
