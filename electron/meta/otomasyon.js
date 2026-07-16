// Gönderi bazlı otomatik yorum cevabı ÇALIŞTIRICISI.
// Ayrı dosya: meta/index.js zaten çekme/gönderme ile dolu; bu iş kendi güvenlik kurallarına sahip.
// Polling turunun SONUNDA çalışır (yorumlar çekildikten sonra).
const { getDb } = require('../db/database')
const { _adaylar, _sablonlariCoz } = require('../db/sosyal-otomasyon')
const { mesajOlustur } = require('./sablon-mesaj')
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

async function otomasyonCalistir() {
  const db = getDb()
  const sonuc = { islenen: 0, dm: 0, yanit: 0, hatalar: [], sinirDoldu: false }
  const sayfaId = client._sayfaId()
  if (!sayfaId) return sonuc

  const adaylar = _adaylar(db)
  if (!adaylar.length) return sonuc

  // Otomasyon başına mesaj metnini BİR KEZ üret (her yorum için yeniden hesaplama).
  const metinOnbellek = new Map()
  const damgala = db.prepare(
    "UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime') WHERE id = ?"
  )

  for (const a of adaylar) {
    if (!_kotaVar()) { sonuc.sinirDoldu = true; break }

    if (!metinOnbellek.has(a.otomasyon_id)) {
      const sablonlar = _sablonlariCoz(db, a.otomasyon_id)
      const { metin, asildi } = mesajOlustur({ sablonlar })
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
      // Tipik: yoruma zaten mesaj gitmiş (tek hak), yorum 7 günden eski.
      sonuc.hatalar.push(`DM (${a.gonderen_ad}): ${e.message}`)
      damgala.run(a.id) // tekrar denemeyelim; her turda aynı hatayı almanın anlamı yok
    }
    sonuc.islenen++
    await bekle(CAGRI_ARASI_MS)
  }
  return sonuc
}

module.exports = { _otomasyonCalistir: otomasyonCalistir }
