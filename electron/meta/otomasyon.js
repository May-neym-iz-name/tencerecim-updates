// Gönderi bazlı otomatik yorum cevabı ÇALIŞTIRICISI.
// Ayrı dosya: meta/index.js zaten çekme/gönderme ile dolu; bu iş kendi güvenlik kurallarına sahip.
// Polling turunun SONUNDA çalışır (yorumlar çekildikten sonra).
const { getDb } = require('../db/database')
const { _adaylar, _sablonlariCoz, _gonderiUrunleriCoz } = require('../db/sosyal-otomasyon')
const { mesajOlustur, gonderiMesajiOlustur } = require('./sablon-mesaj')
const client = require('./client')

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
async function _ozelMesaj(sayfaId, yorumHariciId, metin) {
  return client.post(`${sayfaId}/messages`, {
    recipient: JSON.stringify({ comment_id: yorumHariciId }),
    message: JSON.stringify({ text: metin }),
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
    return gonderiMesajiOlustur({ aciklama: o.ozel_aciklama, urunler, whatsapp: o.whatsapp })
  }
  return mesajOlustur({ sablonlar: _sablonlariCoz(db, otomasyonId) })
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

    if (!metinOnbellek.has(a.otomasyon_id)) {
      const { metin, asildi } = _otomasyonMetni(db, a.otomasyon_id)
      // Şablon yoksa veya mesaj 1000'i aşıyorsa GÖNDERME — kesik/boş mesaj müşteriye gitmesin.
      metinOnbellek.set(a.otomasyon_id, (!metin || asildi) ? null : metin)
      if (asildi) sonuc.hatalar.push(`Otomasyon ${a.otomasyon_id}: mesaj 1000 karakteri aşıyor, gönderilmedi`)
    }
    const metin = metinOnbellek.get(a.otomasyon_id)
    if (!metin) continue

    try {
      await _ozelMesaj(sayfaId, a.harici_id, metin)
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

module.exports = { _otomasyonCalistir: otomasyonCalistir, _otomasyonMetni }
