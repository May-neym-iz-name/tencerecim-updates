// Gönderi bazlı otomatik yorum cevabı ÇALIŞTIRICISI.
// Ayrı dosya: meta/index.js zaten çekme/gönderme ile dolu; bu iş kendi güvenlik kurallarına sahip.
// Polling turunun SONUNDA çalışır (yorumlar çekildikten sonra).
const { getDb } = require('../db/database')
const { _adaylar, _sablonlariCoz, _gonderiUrunleriCoz, _numaralariCoz } = require('../db/sosyal-otomasyon')
const { mesajOlustur, gonderiMesajiOlustur } = require('./sablon-mesaj')
const { kartMesajiOlustur } = require('./kart-mesaj')
const client = require('./client')

// --- ÜRÜN KARTI (generic template) ---
// 08.09.2026'da canlı ölçüldü (bkz. hafıza [[ig-yorum-karti]]):
//  ✔ Yorum cevabında kart karuseli DM'de görsel + butonlarla görünüyor.
//  ✘ `text` ile `attachment` AYNI mesajda gitmiyor — yalnız metin ulaşıyor, kart düşüyor.
// Bu yüzden kart gönderilirken açıklama metni mesaja EKLENEMEZ; yalnız kısa bir not
// kartın alt başlığına gömülür (kullanıcı kararı: "Fiyat: X TL · Ücretsiz kargo").
const KART_KARGO_NOTU = 'Ücretsiz kargo'

/**
 * Gönderinin açıklamasından karta sığacak KISA notu çıkarır.
 * Açıklama 80 karakterlik alt başlığa sığmadığı için tamamı taşınamaz; yalnızca
 * "ücretsiz kargo" bilgisi TANINIRSA yazılır. Uydurma yapılmaz — açıklama başka şey
 * söylüyorsa not boş kalır ve o bilgi kart kipinde KAYBOLUR (çağıran bunu raporlar).
 */
function _kartNotu(aciklama) {
  const a = String(aciklama || '').toLocaleLowerCase('tr')
  return a.includes('ücretsiz kargo') ? KART_KARGO_NOTU : ''
}

// Meta özel yanıt sınırı: saatte 750 (IG hesabı başına). 500'de tutuyoruz çünkü her yorum
// 2 çağrı harcıyor (DM + açık yanıt) ve polling'in kendi çağrıları da aynı kotayı yiyor.
const SAATLIK_SINIR = 500
const CAGRI_ARASI_MS = 400

// Kayan pencere sayacı (bellekte; uygulama yeniden başlarsa sıfırlanır — kabul edilebilir,
// çünkü Meta'nın sayacı da saatlik kayar ve 500 tavanı 750'nin altında pay bırakıyor).
let _gonderimZamanlari = []
function _kotaVar() {
  const birSaatOnce = Date.now() - 3600_000
  _gonderimZamanlari = _gonderimZamanlari.filter(t => t > birSaatOnce)
  return _gonderimZamanlari.length < SAATLIK_SINIR
}

const bekle = (ms) => new Promise(r => setTimeout(r, ms))

// Yoruma özel mesaj: POST {PAGE_ID}/messages + recipient.comment_id.
// IG için de SAYFA ID'si kullanılır ({ig_id} DEĞİL) — Meta dokümanı: "the Facebook Page ID,
// not the Instagram User ID". Yanlış ID izin hatası verir ve App Review sorunu gibi görünür.
// `mesaj` ya { text } ya da kart yükü ({ attachment: … }) olur — Meta ikisini birlikte
// kabul etmiyor, o yüzden çağıran BİRİNİ seçer.
async function _ozelMesaj(sayfaId, yorumHariciId, mesaj) {
  return client.post(`${sayfaId}/messages`, {
    recipient: JSON.stringify({ comment_id: yorumHariciId }),
    message: JSON.stringify(mesaj),
  })
}

// Herkese açık yanıt. IG'de {comment_id}/replies, FB'de {comment_id}/comments.
async function _acikYanit(platform, yorumHariciId, metin) {
  const yol = platform === 'instagram' ? 'replies' : 'comments'
  return client.post(`${yorumHariciId}/${yol}`, { message: metin })
}

/**
 * Bir otomasyonun DM metni. İKİ MODEL bir arada yaşar:
 *  - YENİ (gönderiye özel): gönderinin kendi açıklaması + seçilmiş ürünler. Açıklama tek.
 *  - ESKİ (şablon bağlı): geriye dönük uyum. Gönderi henüz yeni modele taşınmadıysa çalışır.
 * Seçim ölçütü ürün/açıklama VARLIĞI — bayrak sütunu yok, tutulması gereken ikinci bir
 * durum olmasın. Yeni modele geçen gönderide şablon bağı zaten kaldırılıyor.
 * @returns {{metin: string, asildi: boolean}}
 */
function _otomasyonMetni(db, otomasyonId) {
  const o = db.prepare('SELECT ozel_aciklama, whatsapp FROM sosyal_otomasyonlar WHERE id = ?').get(otomasyonId)
  const urunler = _gonderiUrunleriCoz(db, otomasyonId)
  if (urunler.length || (o?.ozel_aciklama || '').trim()) {
    // numaralar (çoklu hat) doluysa o kazanır; boşsa eski tek `whatsapp` alanına düşülür
    // → henüz hat eklenmemiş gönderiler bozulmadan çalışmaya devam eder.
    return gonderiMesajiOlustur({
      aciklama: o.ozel_aciklama, urunler, whatsapp: o.whatsapp,
      numaralar: _numaralariCoz(db, otomasyonId),
    })
  }
  return mesajOlustur({ sablonlar: _sablonlariCoz(db, otomasyonId) })
}

/**
 * Bir otomasyonun gönderilecek içeriğini hazırlar: ürün varsa KART, her hâlükârda düz metin
 * yedeği. Otomasyon başına BİR KEZ çağrılır (görsel için ikas'a tek istek gider).
 *
 * Kart kipinde açıklama metni mesaja giremez (text+attachment birlikte çalışmıyor) — yalnız
 * "ücretsiz kargo" notu alt başlığa gömülür. Açıklamada BAŞKA bilgi varsa bu kart kipinde
 * kaybolur; sessiz kalmamak için `sonuc.hatalar`'a uyarı düşülür.
 *
 * @returns {Promise<{kart: object|null, metin: string|null}>}
 */
async function _icerikHazirla(db, otomasyonId, sonuc) {
  const { metin, asildi } = _otomasyonMetni(db, otomasyonId)
  const duzMetin = (!metin || asildi) ? null : metin
  if (asildi) sonuc.hatalar.push(`Otomasyon ${otomasyonId}: düz metin 1000 karakteri aşıyor`)

  const urunler = _gonderiUrunleriCoz(db, otomasyonId)
  if (!urunler.length) return { kart: null, metin: duzMetin }   // duyuru gönderisi → düz metin

  const o = db.prepare('SELECT ozel_aciklama, mesaj_tipi FROM sosyal_otomasyonlar WHERE id = ?').get(otomasyonId)
  // Kullanıcı gönderi bazında seçer (panelde "Mesaj tipi"). 'metin' seçiliyse kart hiç
  // kurulmaz — açıklama yazısı önemli olan gönderiler için. Varsayılan 'kart'.
  if (o && o.mesaj_tipi === 'metin') return { kart: null, metin: duzMetin }
  const not = _kartNotu(o && o.ozel_aciklama)
  const aciklama = String((o && o.ozel_aciklama) || '').trim()
  if (aciklama && !not) {
    sonuc.hatalar.push(`Otomasyon ${otomasyonId}: açıklama kart kipinde taşınamıyor (kart mesajı metin alamıyor)`)
  }

  // Görsel + FİYAT ikas'tan (kullanıcı kararı 08.09: "fiyatları uygulamadan değil web
  // sitesinden alacağız"). Erişilemezse boş map → yerel fiyata ve görselsize düşülür,
  // mesaj yine gider. `require` içeride: meta ↔ ikas döngüsel bağımlılığı için.
  let ikasVeri = new Map()
  try { ikasVeri = await require('../ikas')._urunKartVerisi(urunler.map(u => u.ikas_urun_id)) } catch { /* yerel veriyle devam */ }
  let yerelFiyatliSayi = 0

  const { yuk, atlanan } = kartMesajiOlustur({
    urunler: urunler.map(u => {
      const i = ikasVeri.get(u.ikas_urun_id)
      if (!i || i.fiyat == null) yerelFiyatliSayi++
      return {
        ...u,
        gorsel: (i && i.gorsel) || null,
        // Site fiyatı KAZANIR; yoksa yerel fiyata düşülür (fiyatsız kart göndermemek için).
        fiyat: (i && i.fiyat != null) ? i.fiyat : u.fiyat,
      }
    }),
    numaralar: _numaralariCoz(db, otomasyonId),
    kargoNotu: not,
  })
  if (yerelFiyatliSayi) {
    sonuc.hatalar.push(`Otomasyon ${otomasyonId}: ${yerelFiyatliSayi} üründe site fiyatı okunamadı, yerel fiyat kullanıldı`)
  }
  if (atlanan) sonuc.hatalar.push(`Otomasyon ${otomasyonId}: ${atlanan} ürün 10 kart sınırına sığmadı`)
  return { kart: yuk, metin: duzMetin }
}

async function otomasyonCalistir() {
  const db = getDb()
  const sonuc = { islenen: 0, dm: 0, yanit: 0, hatalar: [], sinirDoldu: false }
  const sayfaId = client._sayfaId()
  if (!sayfaId) return sonuc

  const adaylar = _adaylar(db)
  if (!adaylar.length) return sonuc

  // Otomasyon başına mesaj metnini BİR KEZ üret (her yorum için yeniden hesaplama).
  const metinOnbellek = new Map()
  // Damga YALNIZ başarıda. Başarısızlık ayrı kolonlara yazılır — eskiden ikisi de aynı damgayı
  // kullanıyordu ve başarısızlar sessizce "gönderildi" gibi görünüyordu.
  const damgala = db.prepare(
    "UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime'), ozel_mesaj_hata = NULL WHERE id = ?"
  )
  const hataYaz = db.prepare(
    "UPDATE sosyal_mesajlar SET ozel_mesaj_hata = ?, ozel_mesaj_deneme = COALESCE(ozel_mesaj_deneme,0) + 1 WHERE id = ?"
  )

  for (const a of adaylar) {
    if (!_kotaVar()) { sonuc.sinirDoldu = true; break }

    // SORU niyeti (08.09.2026): ürün kartı DEĞİL, Ayarlar'daki genel teşekkür DM'i (6B).
    // Kapalıysa ya da metin boşsa aday atlanır ama DAMGALANMAZ: açıldığında geriye dönük gitsin.
    // Bu DM yoruma özel yanıt (private reply) hakkını harcar → recipient_id saklanır ki
    // temsilci "DM'den yanıtla" derken konuşma o kimlikle bulunsun.
    if (a.niyet === 'soru') {
      const ay = require('../db/meta-ayarlar')._ayarlariGetir()
      const metin = String(ay.soru_yaniti_metin || '').trim()
      if (String(ay.soru_yaniti_aktif || '0') !== '1' || !metin) continue
      try {
        const yanit = await _ozelMesaj(sayfaId, a.harici_id, { text: metin })
        _gonderimZamanlari.push(Date.now())
        sonuc.soruDm = (sonuc.soruDm || 0) + 1
        db.prepare("UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime'), ozel_mesaj_hata = NULL, ozel_mesaj_alici = ? WHERE id = ?")
          .run((yanit && yanit.recipient_id) || null, a.id)
      } catch (e) {
        sonuc.hatalar.push(`Soru DM (${a.gonderen_ad}): ${e.message}`)
        hataYaz.run(String(e.message).slice(0, 300), a.id)
        sonuc.basarisiz = (sonuc.basarisiz || 0) + 1
      }
      sonuc.islenen++
      await bekle(CAGRI_ARASI_MS)
      continue
    }

    if (!metinOnbellek.has(a.otomasyon_id)) {
      metinOnbellek.set(a.otomasyon_id, await _icerikHazirla(db, a.otomasyon_id, sonuc))
    }
    const icerik = metinOnbellek.get(a.otomasyon_id)
    // Ne kart ne düz metin üretilebildiyse GÖNDERME — kesik/boş mesaj müşteriye gitmesin.
    if (!icerik || (!icerik.kart && !icerik.metin)) continue

    try {
      // Ürün varsa KART, yoksa düz metin. Kart reddedilirse düz metne DÜŞ — Meta yorum başına
      // tek hak veriyor, o hakkı boş mesajla harcamayalım. (Gönderim patladıysa hak
      // harcanmamıştır; ikinci deneme aynı yoruma yapılabilir.)
      if (icerik.kart) {
        try {
          await _ozelMesaj(sayfaId, a.harici_id, icerik.kart)
        } catch (kartHata) {
          if (!icerik.metin) throw kartHata
          await _ozelMesaj(sayfaId, a.harici_id, { text: icerik.metin })
          sonuc.kartYedek = (sonuc.kartYedek || 0) + 1
          sonuc.hatalar.push(`Otomasyon ${a.otomasyon_id}: kart gönderilemedi, düz metne düşüldü — ${kartHata.message}`)
        }
      } else {
        await _ozelMesaj(sayfaId, a.harici_id, { text: icerik.metin })
      }
      _gonderimZamanlari.push(Date.now())
      sonuc.dm++
      // Damgayı DM'den HEMEN sonra yaz: açık yanıt patlarsa bile aynı yoruma ikinci DM gitmesin
      // (Meta zaten yorum başına tek hak veriyor, ikinci deneme hataya düşerdi).
      damgala.run(a.id)

      // Açık yanıt YALNIZ DM başarılıysa — "DM'den bilgi verilmiştir" yalan olmasın.
      const o = db.prepare('SELECT acik_yanit_metni FROM sosyal_otomasyonlar WHERE id = ?').get(a.otomasyon_id)
      if (o?.acik_yanit_metni) {
        try {
          await _acikYanit(a.platform, a.harici_id, o.acik_yanit_metni)
          _gonderimZamanlari.push(Date.now())
          sonuc.yanit++
        } catch (e) {
          sonuc.hatalar.push(`Açık yanıt (${a.gonderen_ad}): ${e.message}`)
        }
      }
    } catch (e) {
      // Tipik: yoruma zaten mesaj gitmiş (başka bir otomasyon tek hakkı kullanmış),
      // yorum 7 günden eski. DAMGALAMA — bu bir başarı değil; hatayı kaydet, sayacı artır.
      // MAKS_DENEME'ye ulaşınca aday sorgusu bu yorumu kendiliğinden eler.
      sonuc.hatalar.push(`DM (${a.gonderen_ad}): ${e.message}`)
      hataYaz.run(String(e.message).slice(0, 300), a.id)
      sonuc.basarisiz = (sonuc.basarisiz || 0) + 1
    }
    sonuc.islenen++
    await bekle(CAGRI_ARASI_MS)
  }
  return sonuc
}

module.exports = { _otomasyonCalistir: otomasyonCalistir, _otomasyonMetni, _icerikHazirla, _kartNotu }
