// Mükerrer müşteri birleştirme — ANA BELİRLEYİCİ TELEFON (v1.2.221).
//
// Kullanıcı kararı (16.09.2026): "mükerrer müşterileri de birleştirelim, bu noktada
// telefon numaraları ana belirleyici olsun."
//
// KÖK NEDEN (ölçüldü 16.09): ikas/index.js müşteriyi `WHERE telefon = ?` ile TAM
// eşleştiriyordu, ekstra.js ise son 10 haneye bakıyordu. Aynı kişi ikas'ta
// "+905538638657", yerelde "5538638657" yazılıyken eşleşme kurulamıyor ve HER
// senkronda yeni satır doğuyordu. Bu dosya geçmişi temizler; tekrarı önleyen
// düzeltme ikas/index.js'te (telSon10 ile eşleşme).

const { telSon10 } = require('./telefon')

// İsim karşılaştırması büyük harf + tek boşluk. (v1.2.220'den sonra kayıtlar zaten
// büyük saklanıyor, ama göç öncesi yazılmış satırlar için normalize etmek gerekir.)
function adAnahtari(m) {
  return `${m.ad || ''} ${m.soyad || ''}`.toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim()
}

/**
 * Telefonu olan müşterileri son 10 haneye göre gruplar; yalnız BİRDEN FAZLA kayıt
 * içeren gruplar döner. Telefonsuz kayıt hiçbir gruba girmez — telefon ana
 * belirleyici olduğu için onların birleştirme ölçütü yoktur.
 */
function telefonGruplari(musteriler) {
  const g = new Map()
  for (const m of musteriler) {
    const k = telSon10(m.telefon)
    if (!k || k.length < 10) continue
    if (!g.has(k)) g.set(k, [])
    g.get(k).push(m)
  }
  return [...g.entries()].filter(([, v]) => v.length > 1)
}

/**
 * Bir grubun BİRLEŞTİRİLEBİLİR alt kümesini seçer.
 *
 * 🔴 Aynı telefon FARKLI isim taşıyorsa BİRLEŞTİRİLMEZ: ölçüldü (16.09) —
 * "TUTKU TURKAN" ile "EMİNE BİRÇEK" aynı hattı paylaşıyor ve İKİSİNİN DE kargosu
 * var, yani büyük olasılıkla aynı evden iki ayrı kişi. Telefonu tek ölçüt sayıp
 * körlemesine birleştirmek iki farklı müşterinin geçmişini karıştırırdı.
 * Kullanıcı kararı: farklı isimlere dokunma.
 *
 * `elleOnayli`: kullanıcının tek tek onayladığı istisnalar — `telefonSon10|AD SOYAD`
 * biçiminde. Bu ad, telefonla birlikte grubun BİRLEŞTİRİLECEK tarafını işaret eder.
 * id KULLANILMAZ: satır id'leri PC'ler arasında farklıdır, telefon+ad ise senkronla
 * taşınan aynı veriyi gösterir.
 */
function birlestirilebilir(anahtar, grup, elleOnayli = new Set()) {
  const adlar = new Map()
  for (const m of grup) {
    const a = adAnahtari(m)
    if (!adlar.has(a)) adlar.set(a, [])
    adlar.get(a).push(m)
  }
  if (adlar.size === 1) return grup                       // aynı isim → tamamı
  // Farklı isimler: yalnız elle onaylanmış olanlar gruba katılır.
  const onayliOlanlar = grup.filter(m => elleOnayli.has(`${anahtar}|${adAnahtari(m)}`))
  if (!onayliOlanlar.length) return []
  // Onaylananları, grubun EN GÜÇLÜ kaydıyla (asıl adayıyla) birleştir.
  const kalanlar = grup.filter(m => !onayliOlanlar.includes(m))
  if (!kalanlar.length) return []
  return [asilSec(kalanlar), ...onayliOlanlar]
}

/**
 * Grupta ASIL (hayatta kalacak) kaydı seçer. Sıra:
 *   1. ikas kimliği olan ve ikas harcaması EN YÜKSEK olan
 *      → ikas geçmişi en zengin kayıt korunur; kullanıcı kararı 16.09.
 *   2. ikas kimliği olan herhangi biri
 *   3. en küçük id (en eski kayıt)
 * AKTİFLİK ölçüt DEĞİL: pasif bir kayıt da ikas geçmişini taşıyor olabilir
 * (ölçüldü: BURAK GÜL id 1 pasif ama 8 kargolu).
 */
function asilSec(grup) {
  const ikaslilar = grup.filter(m => String(m.ikas_musteri_id || '').trim())
  if (ikaslilar.length) {
    return [...ikaslilar].sort((a, b) =>
      (Number(b.ikas_toplam_harcama) || 0) - (Number(a.ikas_toplam_harcama) || 0) || a.id - b.id)[0]
  }
  return [...grup].sort((a, b) => a.id - b.id)[0]
}

// Asılda BOŞ olan alanı, birleşen kayıtlardan ilk dolu değerle tamamlar.
// Asıldaki dolu değer ASLA ezilmez — birleştirme veri katmalı, veri değiştirmemeli.
const TAMAMLANACAK = ['soyad', 'email', 'adres', 'il', 'ilce', 'unvan',
  'vergi_no', 'vergi_dairesi', 'tc_kimlik', 'telefon']

function eksikleriTopla(asil, digerleri) {
  const yeni = {}
  for (const alan of TAMAMLANACAK) {
    if (String(asil[alan] ?? '').trim()) continue
    for (const d of digerleri) {
      const v = String(d[alan] ?? '').trim()
      if (v) { yeni[alan] = d[alan]; break }
    }
  }
  return yeni
}

/**
 * Birleştirmeyi UYGULAR. Bağlı kayıtlar (satış, kargo, online sipariş) asıla taşınır;
 * birleşen kayıt SİLİNMEZ, pasifleştirilir.
 *
 * Neden silme yok: satır silmek senkronla YAYILMAZ (karşı PC'de kayıt kalır ve geri
 * gelir), pasifleştirme ise normal bir alan değişikliği olarak yayılır. Ayrıca
 * pasif kabuk, yanlış birleştirme fark edilirse geri dönüş noktasıdır.
 *
 * @returns {{birlesen: number, tasinan: object}}
 */
function uygula(db, asil, digerleri) {
  const tasinan = { satislar: 0, kargolar: 0, online_siparisler: 0 }
  for (const tablo of Object.keys(tasinan)) {
    // Tablo yoksa atla (şema sürümleri arası güvenlik).
    const varMi = db.prepare(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name=?").get(tablo).n
    if (!varMi) continue
    for (const d of digerleri) {
      tasinan[tablo] += db.prepare(
        `UPDATE ${tablo} SET musteri_id = ? WHERE musteri_id = ?`).run(asil.id, d.id).changes
    }
  }
  const eksik = eksikleriTopla(asil, digerleri)
  if (Object.keys(eksik).length) {
    const set = Object.keys(eksik).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE musteriler SET ${set} WHERE id = @id`).run({ ...eksik, id: asil.id })
  }
  // Asıl kayıt aktifleşir (pasif bir kayıt asıl seçilmiş olabilir).
  db.prepare('UPDATE musteriler SET aktif = 1 WHERE id = ?').run(asil.id)
  for (const d of digerleri) {
    db.prepare('UPDATE musteriler SET aktif = 0 WHERE id = ?').run(d.id)
  }
  return { birlesen: digerleri.length, tasinan }
}

module.exports = { adAnahtari, telefonGruplari, birlestirilebilir, asilSec, eksikleriTopla, uygula }
