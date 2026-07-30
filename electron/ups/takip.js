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
const { _ikasaBildir: ikasaBildir } = require('../ikas/kargo-durum')
const { _ekle: bildirimEkle } = require('../db/bildirimler')
const bulut = require('./bulut')
const yerelAyar = require('../db/yerel-ayarlar')

// Bulut köprüsünün okuma imleci. PC'ye ÖZEL (yerel_ayarlar senkronlanmaz): her PC
// değişiklikleri kendi yerel DB'sine uygulamak zorunda, dolayısıyla kendi damgasını tutar.
const IMLEC_ANAHTARI = 'kargo_bulut_imlec'

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

/**
 * Bildirim merkezi kaydını kurar. Yalnız teslim ve özel durum bildirim üretir —
 * "gönderildi"/ara durumlar üretmez (kalabalık olur, kullanıcı kararı 2026-07-28).
 * Dedup anahtarı takip_no+durum: elle "Durumları Yenile" dahil aynı olay bir kez eklenir.
 * @param {{takip_no: string, alici_ad?: string, tip?: string}} k
 * @param {'teslim'|'ozel'|'gonderildi'|'yok'} durum
 * @param {string} [metin] - UPS'in serbest durum açıklaması
 * @returns {object|null} bildirimEkle'ye verilecek kayıt ya da null (bildirim yok)
 */
function bildirimKur(k, durum, metin) {
  if (durum !== 'teslim' && durum !== 'ozel') return null
  const sorun = durum === 'ozel'
  const iade = k.tip === 'iade'
  return {
    tip: sorun ? 'kargo_sorun' : 'kargo_teslim',
    baslik: sorun ? '🚨 Kargoda özel durum'
      : (iade ? '↩️ İade kargosu bize ulaştı' : '📦 Kargo teslim edildi'),
    mesaj: [k.alici_ad, k.takip_no, metin].filter(Boolean).join(' — '),
    onem: sorun ? 'yuksek' : 'normal',
    dedup_anahtar: `kargo:${k.takip_no}:${durum}`,
  }
}

// Yoklama turu yeni bildirim eklediyse açık pencerelere anında duyurur (köşe kutusu +
// rozet + ses renderer'da). Electron dışı ortamda (vitest) sessizce atlanır.
function pencerelereDuyur(sonuc) {
  if (!sonuc.bildirimEklenen) return
  try {
    const { BrowserWindow } = require('electron')
    const veri = {
      adet: sonuc.bildirimEklenen,
      yuksek: sonuc.yeniBildirimler.filter(b => b.onem === 'yuksek').length,
      ornekler: sonuc.yeniBildirimler.slice(0, 3).map(b => ({ baslik: b.baslik, mesaj: b.mesaj, onem: b.onem })),
    }
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('bildirim:yeni', veri)
  } catch { /* test/başsız ortam: duyuru atlanır, 30 sn'lik sayaç yoklaması yakalar */ }
}

// Yoklanacak takipler. İKİ kaynak var ve ikisi de şart:
//  1) kargolar — bizim programdan oluşturduğumuz gönderiler
//  2) online_siparisler.kargo_takip_no — ikas'ın kendi UPS entegrasyonunun oluşturduğu,
//     bize çekimle gelen takip no'ları. Bunların kargolar'da karşılığı YOKTUR.
// Yalnız (1)'i gezmek ölçüldü: takılı 25 siparişin sadece 16'sını kapsıyordu, 9'u sessizce
// dışarıda kalıyordu (2026-07-17 kuru çalıştırma).
function _bekleyenKargolar(db) {
  return db.prepare(`
    SELECT k.id AS kargo_id, k.takip_no, k.son_durum_kodu, k.alici_ad,
           -- tip NULL olabilir (eski kayıtlar): COALESCE şart, yoksa 'gonderi' filtresi
           -- bu kayıtları sessizce eler ve ikas'a hiç bildirim gitmez.
           COALESCE(k.tip, 'gonderi') AS tip,
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

    SELECT NULL AS kargo_id, s.kargo_takip_no AS takip_no, NULL AS son_durum_kodu, s.musteri_ad AS alici_ad,
           'gonderi' AS tip, s.id AS siparis_id
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

// TELAFİ TURU: yerelde TESLİM bilinen ama ikas'a hiç bildirilmemiş siparişler.
//
// Neden ayrı bir sorgu gerekiyor: yukarıdaki _bekleyenKargolar, teslim olmuş kargoları
// `son_durum_kodu != 2` ile ELER (UPS'i boşuna tekrar sorgulamamak için — doğru bir
// optimizasyon). Ama köprü eklenmeden ÖNCE teslim olmuş kargolar ikas'a hiç bildirilmedi
// ve o eleme yüzünden asla da bildirilemezdi: ikas panelinde sipariş "Kargoya Hazır"da
// takılı kalıyordu (ölçüm 2026-07-20: yerelde teslim 73 kargo, ikas'a bildirilen 1).
//
// Bu tur UPS'e HİÇ ÇIKMAZ — durumu zaten yerelde biliyoruz (son_durum_kodu = 2).
// Yalnız ikas'a yazar ve BİLDİRİMSİZ yazar: günler önce teslim olmuş bir sipariş için
// müşteriye şimdi "teslim edildi" maili göndermek anlamsız olurdu.
function _ikasBekleyenTeslimler(db) {
  return db.prepare(`
    SELECT s.id AS siparis_id,
           -- Siparişin birden fazla kargosu olabilir: teslim olanın takip no'sunu tercih et.
           COALESCE(MAX(CASE WHEN k.son_durum_kodu = ${TESLIM} THEN k.takip_no END),
                    MAX(k.takip_no)) AS takip_no
    FROM online_siparisler s
    JOIN kargolar k ON (k.online_siparis_id = s.id OR k.ikas_siparis_id = s.ikas_siparis_id)
    WHERE s.ikas_siparis_id IS NOT NULL
      AND COALESCE(s.ikas_kargo_durumu,'') = ''           -- bize göre HİÇ bildirilmemiş
      AND COALESCE(s.kargo_durumu,'') != 'DELIVERED'      -- ikas'a göre zaten teslim değil
      AND COALESCE(k.tip,'gonderi') != 'iade'
      AND COALESCE(k.durum,'') != 'iptal'
      AND COALESCE(k.olusturma_tarihi, datetime('now','localtime')) >= datetime('now','localtime', '-${PENCERE_GUN} days')
    GROUP BY s.id
    HAVING MAX(CASE WHEN k.son_durum_kodu = ${TESLIM} THEN 1 ELSE 0 END) = 1
  `).all()
}

const bekle = (ms) => new Promise(r => setTimeout(r, ms))

// Bir turu çalıştırır. Dönen: { sorgulanan, gonderildi, teslim, agdaDegil, hatalar }
async function takipleriYokla() {
  const sonuc = {
    sorgulanan: 0, gonderildi: 0, teslim: 0, agdaDegil: 0, hatalar: [], degisti: 0,
    ikasBildirilen: 0, ikasTelafi: 0, ikasHatalari: [],
    bildirimEklenen: 0, yeniBildirimler: [],
  }
  const db = getDb()

  // TELAFİ TURU EN BAŞTA: UPS'e ihtiyaç duymaz (durumu yerelde biliyoruz), bu yüzden
  // aşağıdaki erken dönüşlerin ARKASINDA kalmamalı — yoklanacak yeni kargo yoksa veya
  // UPS ayarları eksikse bile ikas'ın düzeltilmesi gerekir.
  for (const t of _ikasBekleyenTeslimler(db)) {
    const r = await ikasaBildir(t.siparis_id, 'teslim', t.takip_no, { sessiz: true })
    if (r.ok && r.durum) { sonuc.ikasTelafi++; sonuc.degisti++ }
    else if (r.hata) sonuc.ikasHatalari.push(`telafi ${t.takip_no}: ${r.hata}`)
  }

  const bekleyenler = _bekleyenKargolar(db)
  if (!bekleyenler.length) return sonuc

  // İKİ KAYNAK, TEK İŞLEME. Aşağıdaki döngü (durumCevir, bildirim, ikas, DB yazımı)
  // verinin hangi kaynaktan geldiğini BİLMEZ ve bilmemeli — tek fark onu nereden aldığımız:
  //   bulut açık   → Worker'ın D1'deki önbelleği (UPS'e burada hiç gidilmez)
  //   bulut kapalı → doğrudan UPS SOAP (eski yol, aynen duruyor)
  // Köprü çökerse tek yapılacak ayarı boşaltmak; eski kod yolu yerinde duruyor.
  const bulutAyar = bulut._ayar()
  let session = null
  let bulutDurumlar = null // Map<takip_no, ham UPS alanları>
  let yeniImlec = null

  if (bulutAyar.acik) {
    // Worker yoklanacak listeyi kendi üretemez (liste yerel SQLite'tan çıkıyor) — her turda iteriz.
    // Birleştirme Worker'da idempotent: iki PC aynı numarayı itse de sorun olmaz.
    await bulut._itListe(bekleyenler.map(b => b.takip_no))
    const cekilen = await bulut._durumlariCek(yerelAyar._getir(IMLEC_ANAHTARI))
    // Yalnız DEĞİŞENLER gelir. Haritada olmayan kargo = durumu değişmemiş = yapılacak iş yok.
    bulutDurumlar = new Map(cekilen.kayitlar.map(r => [String(r.takip_no), {
      durumKodu: r.durum_kodu, aciklama: r.aciklama || '', aciklama2: r.aciklama2 || '',
      sube: r.sube || '', zaman: r.ups_zaman || '',
    }]))
    yeniImlec = cekilen.imlec
  } else {
    const ayar = _ayarlariGetir()
    if (!ayar.musteri_kodu || !ayar.kullanici_kodu || !ayar.sifre) return sonuc

    // Takip servisi KENDİ oturumunu ister (gönderi oturumu burada geçmez) — bir kez al, hepsinde kullan.
    session = await soap.trackingLogin({
      musteriKodu: ayar.musteri_kodu, kullaniciKodu: ayar.kullanici_kodu, sifre: ayar.sifre,
    })
  }

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

    if (bulutDurumlar) {
      d = bulutDurumlar.get(String(k.takip_no)) || null
      // Haritada yok = son okumamızdan beri değişmemiş. Ağa hiç girmemiş (kod 13)
      // kargolar da buraya düşer — Worker onlar için durum satırı yazmaz.
      if (!d) continue
      // durumKodu null → Worker sorguladı ama UPS kod döndürmedi. Aşağıdaki
      // durumCevir(null) zaten 'yok' der ve kargo atlanır; ayrıca dallanmaya gerek yok.
    } else {
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
    }

    const { durum, gonderildi } = durumCevir(d.durumKodu)
    if (durum === 'yok') {
      sonuc.agdaDegil++
      if (k.kargo_id) sorguDamga.run(k.kargo_id)
      if (!bulutDurumlar) await bekle(CAGRI_ARASI_MS)
      continue
    }

    // kargo_id null olabilir: takip no yalnız siparişte (ikas'ın kendi UPS entegrasyonu).
    if (k.kargo_id) {
      const metin = [d.aciklama, d.sube].filter(Boolean).join(' — ')
      if (Number(d.durumKodu) !== Number(k.son_durum_kodu)) sonuc.degisti++
      kargoYaz.run(metin || d.aciklama || '', Number(d.durumKodu), k.kargo_id)
    }

    // Bildirim merkezi: teslim + özel durum bildirimi. Dedup INSERT OR IGNORE'da —
    // eklenmediyse (0) zaten bildirilmişti, sayaca ve duyuruya girmez.
    const bildirim = bildirimKur(k, durum, d.aciklama)
    if (bildirim && bildirimEkle(db, bildirim)) {
      sonuc.bildirimEklenen++
      sonuc.yeniBildirimler.push(bildirim)
    }

    if (k.siparis_id) {
      if (gonderildi) sonuc.degisti += gonderildiYaz.run(k.siparis_id).changes
      if (durum === 'teslim') sonuc.degisti += teslimYaz.run(k.siparis_id).changes

      // ikas'a bildir. Durumu YALNIZ yerele yazmak müşteriyi bildirimsiz bırakıyordu:
      // ikas kargo/teslim maillerini kendi sipariş durumu değişince gönderir, bizim
      // tablomuza bakmaz. Bu yüzden ikas paneli "Hazırlanıyor"da takılı kalıyordu.
      //
      // İADE gönderileri HARİÇ: iade kargosu aynı online_siparis_id'yi paylaşır ama
      // ikas'ın OrderPackageStatus'u yalnız GİDEN paketi tanımlar. Müşterinin geri
      // gönderdiği kolinin teslimi, giden siparişi "Teslim Edildi" yapıp müşteriye
      // yanlış bildirim gönderirdi. ikas'ta iade ayrı akıştır (refundOrderLine).
      if (k.tip !== 'iade') {
        // Her turda çağrılır ama modül son bildirdiği durumu damgalar: aynı durum
        // ikinci kez GÖNDERİLMEZ (ağ çağrısı bile yapılmaz). Bu, daha önce hiç
        // bildirilmemiş eski siparişleri de kendiliğinden telafi eder.
        const r = await ikasaBildir(k.siparis_id, durum, k.takip_no)
        if (r.ok && r.durum) sonuc.ikasBildirilen++
        else if (r.hata) sonuc.ikasHatalari.push(`${k.takip_no}: ${r.hata}`)
      }
    }
    if (durum === 'teslim') sonuc.teslim++
    else if (gonderildi) sonuc.gonderildi++

    // Nezaket beklemesi YALNIZ doğrudan UPS'e giderken gerekli. Bulut yolunda ağ
    // çağrısı yok (harita bellekte) — burada beklemek 90 kargoda 22 sn'yi çöpe atardı.
    if (!bulutDurumlar) await bekle(CAGRI_ARASI_MS)
  }

  // İmleç EN SONDA ilerletilir: tur ortasında hata fırlarsa (throw) buraya hiç gelinmez
  // ve aynı kayıtlar bir sonraki turda yeniden okunur. Tekrar okumak zararsız — yerel
  // yazımlar idempotent (WHERE koşulları aynı damgayı ikinci kez basmaz), ama kaçırmak
  // zararlı olurdu: o kargo bir daha ASLA "değişmiş" olarak gelmez.
  if (yeniImlec) yerelAyar._yaz(IMLEC_ANAHTARI, yeniImlec)

  pencerelereDuyur(sonuc)
  return sonuc
}

module.exports = {
  // main.js '_' önekli anahtarları IPC kanalı saymaz.
  _takipleriYokla: takipleriYokla,
  _durumCevir: durumCevir,
  _bildirimKur: bildirimKur,
  _bekleyenKargolar,
  _ikasBekleyenTeslimler,

  // Elle tetikleme (Kargo ekranından "Durumları güncelle").
  'kargo:takip-yokla': async () => takipleriYokla(),
}
