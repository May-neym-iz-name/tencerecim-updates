// UPS takip yoklayıcısı: gönderi durumunu UPS'ten öğrenip YERELE yazar.
//
// Neden: ikas'ın kendi UPS entegrasyonu "gönderildi"yi etiket ağa okutulunca, "teslim"i de
// teslimatta otomatik güncelliyordu. Aynı UPS kimliği bizde de var ama kimse takip servisini
// çağırmıyordu — soap.trackingLogin/trackLast yazılmıştı, tek kullanıcısı olan 'kargo:takip'
// ise StatusCode'a hiç bakmayıp yalnız serbest metni yazıyordu (ölü kod).
//
// KONTROL BİZDE: durum UPS'ten gelir, ikas'ın ne dediğine bağlı değildir.
//
// Canlı doğrulama (2026-07-17, salt okunur): mevcut kimlikle takip login BAŞARILI;
// teslim edilmiş 8 gönderinin 8'i de StatusCode=2 döndü ve ikas'ın DELIVERED'ıyla birebir
// uyuştu. Henüz ağa girmemiş gönderiler kod 13 (TRACKING NUMBER NOT FOUND) veriyor.
const { getDb } = require('../db/database')
const { _ayarlariGetir } = require('../db/ups-ayarlar')
const soap = require('./soap')

// docs/ups-api-reference.md §1. Metne ASLA bakma — StatusCode tek doğru kaynak
// ("HD" metninde 'teslim' geçer ama teslim değil; "S7"de geçmez ama teslim de değil).
const TESLIM = 2          // ALICIYA TESLİM EDİLDİ — tek gerçek teslim kodu
const OZEL_DURUM = 3      // ÖZEL DURUM OLUŞTU (sebep §2 tablosunda)
const BULUNAMADI = 13     // TRACKING NUMBER NOT FOUND — etiket kesilmiş, koli ağa girmemiş

// Kaç günlük kargolar yoklanır. Teslim olmuş kayıtlar zaten sorgu dışı; bu sınır
// "ağa hiç girmemiş" ölü etiketleri sonsuza dek sorgulamayı önler.
const PENCERE_GUN = 30
const CAGRI_ARASI_MS = 250

/**
 * UPS StatusCode'unu uygulama durumuna çevirir.
 * @param {number|string|null} kod - trackLast'ten gelen StatusCode (null = bulunamadı)
 * @returns {{ durum: 'yok'|'gonderildi'|'teslim'|'ozel', gonderildi: boolean }}
 *
 * Kural: kod 2 → teslim. Kod BULUNDUYSA (2 dışında) koli UPS ağındadır → gönderilmiştir.
 * Bu, "1 (giriş scan)" dahil tüm ağ-içi kodları (4/6/7/12/31/32/36/37/38...) tek kuralla
 * kapsar; UPS yeni bir ara kod eklerse de kendiliğinden doğru tarafta kalır.
 */
function durumCevir(kod) {
  if (kod == null || kod === '' || Number(kod) === BULUNAMADI) {
    return { durum: 'yok', gonderildi: false }
  }
  const n = Number(kod)
  if (!Number.isFinite(n)) return { durum: 'yok', gonderildi: false }
  if (n === TESLIM) return { durum: 'teslim', gonderildi: true }
  if (n === OZEL_DURUM) return { durum: 'ozel', gonderildi: true }
  return { durum: 'gonderildi', gonderildi: true }
}

// Yoklanacak takipler. İKİ kaynak var ve ikisi de şart:
//  1) kargolar — bizim programdan oluşturduğumuz gönderiler
//  2) online_siparisler.kargo_takip_no — ikas'ın kendi UPS entegrasyonunun oluşturduğu,
//     bize çekimle gelen takip no'ları. Bunların kargolar'da karşılığı YOKTUR.
// Yalnız (1)'i gezmek ölçüldü: takılı 25 siparişin sadece 16'sını kapsıyordu, 9'u sessizce
// dışarıda kalıyordu (2026-07-17 kuru çalıştırma).
function _bekleyenKargolar(db) {
  return db.prepare(`
    SELECT k.id AS kargo_id, k.takip_no, k.son_durum_kodu,
           -- Sipariş bağı online_siparis_id'de OLMAYABİLİR: bazı kargo kayıtları siparişe
           -- yalnız ikas_siparis_id ile bağlı. Çözemezsek damga basacak sipariş bulunamaz.
           COALESCE(k.online_siparis_id,
             (SELECT s2.id FROM online_siparisler s2 WHERE s2.ikas_siparis_id = k.ikas_siparis_id)
           ) AS siparis_id
    FROM kargolar k
    WHERE k.takip_no IS NOT NULL AND k.takip_no != ''
      AND COALESCE(k.durum,'') != 'iptal'
      AND COALESCE(k.son_durum_kodu, 0) != ${TESLIM}
      AND COALESCE(k.olusturma_tarihi, datetime('now','localtime')) >= datetime('now','localtime', '-${PENCERE_GUN} days')

    UNION ALL

    SELECT NULL AS kargo_id, s.kargo_takip_no AS takip_no, NULL AS son_durum_kodu, s.id AS siparis_id
    FROM online_siparisler s
    WHERE s.kargo_takip_no IS NOT NULL AND s.kargo_takip_no != ''
      AND COALESCE(s.kargo_durumu,'') NOT IN ('DELIVERED','CANCELLED','REFUNDED')
      AND date(s.siparis_tarihi) >= date('now','-${PENCERE_GUN} days')
      -- Yalnız AYNI takip no zaten yukarıdan sorulacaksa atla. Siparişin ikas'tan gelen
      -- takip no'su, bizim (kullanılmamış olabilen) etiketimizden FARKLI olabilir; ölçüldü:
      -- takılı 10 siparişin 10'unda da gerçek numara yalnız siparişte duruyordu.
      AND NOT EXISTS (SELECT 1 FROM kargolar k2 WHERE k2.takip_no = s.kargo_takip_no)
  `).all()
}

const bekle = (ms) => new Promise(r => setTimeout(r, ms))

// Bir turu çalıştırır. Dönen: { sorgulanan, gonderildi, teslim, agdaDegil, hatalar }
async function takipleriYokla() {
  const sonuc = { sorgulanan: 0, gonderildi: 0, teslim: 0, agdaDegil: 0, hatalar: [], degisti: 0 }
  const db = getDb()
  const bekleyenler = _bekleyenKargolar(db)
  if (!bekleyenler.length) return sonuc

  const ayar = _ayarlariGetir()
  if (!ayar.musteri_kodu || !ayar.kullanici_kodu || !ayar.sifre) return sonuc

  // Takip servisi KENDİ oturumunu ister (gönderi oturumu burada geçmez) — bir kez al, hepsinde kullan.
  const session = await soap.trackingLogin({
    musteriKodu: ayar.musteri_kodu, kullaniciKodu: ayar.kullanici_kodu, sifre: ayar.sifre,
  })

  const kargoYaz = db.prepare(`UPDATE kargolar SET son_durum = ?, son_durum_kodu = ?,
    son_durum_tarihi = datetime('now','localtime'), takip_sorgu_tarihi = datetime('now','localtime') WHERE id = ?`)
  const sorguDamga = db.prepare("UPDATE kargolar SET takip_sorgu_tarihi = datetime('now','localtime') WHERE id = ?")
  // Sipariş tarafı. WHERE koşulları hem idempotent yapar (damga bir kez basılır) hem de
  // `changes` üzerinden "gerçekten değişti mi?"yi dürüstçe söyler — yoksa her tur "değişti"
  // sanıp açık ekranı 30 dakikada bir boşuna tazelerdik.
  const gonderildiYaz = db.prepare(`UPDATE online_siparisler
    SET gonderildi_tarihi = datetime('now','localtime')
    WHERE id = ? AND gonderildi_tarihi IS NULL`)
  const teslimYaz = db.prepare(`UPDATE online_siparisler SET kargo_durumu = 'DELIVERED'
    WHERE id = ? AND COALESCE(kargo_durumu,'') != 'DELIVERED'`)

  for (const k of bekleyenler) {
    sonuc.sorgulanan++
    let d = null
    try {
      d = await soap.trackLast(session, k.takip_no)
    } catch (e) {
      // Kod 13 = henüz ağda değil: HATA DEĞİL, beklenen durum (etiket kesildi, koli verilmedi).
      // Ölçüm (2026-07-17): 93 gönderinin 19'u bu durumdaydı — normal, gürültü yapma.
      if (String(e.message).includes('kod 13')) {
        sonuc.agdaDegil++
        if (k.kargo_id) sorguDamga.run(k.kargo_id)
      } else {
        sonuc.hatalar.push(`${k.takip_no}: ${e.message}`)
      }
      await bekle(CAGRI_ARASI_MS)
      continue
    }

    const { durum, gonderildi } = durumCevir(d.durumKodu)
    if (durum === 'yok') {
      sonuc.agdaDegil++
      if (k.kargo_id) sorguDamga.run(k.kargo_id)
      await bekle(CAGRI_ARASI_MS)
      continue
    }

    // kargo_id null olabilir: takip no yalnız siparişte (ikas'ın kendi UPS entegrasyonu).
    if (k.kargo_id) {
      const metin = [d.aciklama, d.sube].filter(Boolean).join(' — ')
      if (Number(d.durumKodu) !== Number(k.son_durum_kodu)) sonuc.degisti++
      kargoYaz.run(metin || d.aciklama || '', Number(d.durumKodu), k.kargo_id)
    }

    if (k.siparis_id) {
      if (gonderildi) sonuc.degisti += gonderildiYaz.run(k.siparis_id).changes
      if (durum === 'teslim') sonuc.degisti += teslimYaz.run(k.siparis_id).changes
    }
    if (durum === 'teslim') sonuc.teslim++
    else if (gonderildi) sonuc.gonderildi++

    await bekle(CAGRI_ARASI_MS)
  }
  return sonuc
}

module.exports = {
  // main.js '_' önekli anahtarları IPC kanalı saymaz.
  _takipleriYokla: takipleriYokla,
  _durumCevir: durumCevir,
  _bekleyenKargolar,

  // Elle tetikleme (Kargo ekranından "Durumları güncelle").
  'kargo:takip-yokla': async () => takipleriYokla(),
}
