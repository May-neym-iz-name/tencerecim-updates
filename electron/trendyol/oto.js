// OTOMATİK STOK EŞİTLEMESİ — arka planda döner, iki yönü de kapatır:
//
//   1) Trendyol'da satış oldu  → ana kanaldan (ikas) o kadar DÜŞ
//   2) Ana kanal değişti        → Trendyol'u ana kanala EŞİTLE
//
// Kullanıcı kararı (13.09.2026): sıradan eşitlenme SESSİZCE olur; onay YALNIZ bir
// ürün satıştan kalkacaksa (stok 0'a inecekse) istenir. Onay bekleyenler kuyruğa
// yazılır (stok_senk_islem.durum = 'onay_bekliyor'), ekrandan tek tıkla uygulanır.
//
// Yazma yönü HER ZAMAN ana kanaldan geçer. İki kanal birbirine doğrudan yazsaydı
// hangi sayının doğru olduğu belirsizleşir ve yazma döngüsü oluşurdu.
const { getDb } = require('../db/database')
const { _ayarlariGetir } = require('../db/trendyol-ayarlar')
const kanalStok = require('../db/kanal-stok')
const mantik = require('../db/stok-senk-mantik')
const oto = require('../db/oto-esitleme')
const { stokAyarla } = require('../ikas/kanal-stok')
const { STOK_GOTUREN } = require('../db/trendyol-siparis-mantik')
const tyStok = require('./stok')
const client = require('./client')

const ANA_VARSAYILAN = 'ikas'

function ayar(k) { return _ayarlariGetir()[k] }
function anaKanal() {
  const a = ayar('ana_kanal')
  return ['ikas', 'trendyol'].includes(a) ? a : ANA_VARSAYILAN
}
function acikMi() {
  return ayar('senk_kapali') !== '1' && ayar('yazma_acik') === '1' && client.kimlikVar()
}

// Kuyruğa bir onay bekleyen işlem yazar. Kalemler zaten eski/yeni taşır.
function onayaAl({ kaynak, hedef, kalemler, aciklama }) {
  if (!kalemler.length) return null
  const db = getDb()
  return db.transaction(() => {
    const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan, aciklama)
      VALUES (?, ?, 'onay_bekliyor', 'otomatik', ?)`).run(kaynak, hedef, aciklama || null)
    const ekle = db.prepare(`INSERT INTO stok_senk_kalem (islem_id, barkod, sku, ad, eski_miktar, yeni_miktar)
      VALUES (?, ?, ?, ?, ?, ?)`)
    for (const k of kalemler) {
      ekle.run(r.lastInsertRowid, k.barkod || k.sku, k.sku, k.ad || null, k.eski ?? k.eski_miktar, k.yeni ?? k.yeni_miktar)
    }
    return r.lastInsertRowid
  })()
}

// Aynı ürün için zaten bekleyen bir onay varsa ikinci kez kuyruğa yazma.
function zatenBekliyorMu(hedef, skular) {
  if (!skular.length) return new Set()
  const db = getDb()
  const q = skular.map(() => '?').join(',')
  const satirlar = db.prepare(`
    SELECT DISTINCT k.sku FROM stok_senk_kalem k
      JOIN stok_senk_islem i ON i.id = k.islem_id
     WHERE i.durum = 'onay_bekliyor' AND i.hedef = ? AND upper(k.sku) IN (${q})`)
    .all(hedef, ...skular.map(s => s.toUpperCase()))
  return new Set(satirlar.map(r => String(r.sku).toUpperCase()))
}

// --- 1) Trendyol satışı → ana kanaldan düş --------------------------------

async function satislariUygula() {
  const sonuc = { dusulen: 0, onaya: 0, eslesmeyen: 0, hatalar: [] }
  const kaynak = anaKanal()
  if (kaynak !== 'ikas') return sonuc   // şimdilik yalnız ikas'a düşüm yazabiliyoruz

  const db = getDb()
  // Stok götüren (iptal/iade OLMAYAN), henüz düşülmemiş paketlerin kalemleri.
  const goturenler = [...STOK_GOTUREN]
  const satislar = db.prepare(`
    SELECT s.paket_id, k.sku, k.miktar
      FROM trendyol_siparisler s
      JOIN trendyol_siparis_kalemleri k ON k.siparis_id = s.id
     WHERE s.stok_dusuldu = 0
       AND COALESCE(k.sku,'') <> ''
       AND s.durum IN (${goturenler.map(() => '?').join(',')})`).all(...goturenler)
  if (!satislar.length) return sonuc

  const anaStok = oto.stokHaritasi(kanalStok.kanalOku(kaynak))
  const { uygulanacak, bekleyen, eslesmeyen } = oto.satisEtkisi({ satislar, anaStok })
  sonuc.eslesmeyen = eslesmeyen.length

  const bitenPaketler = new Set()
  for (const u of uygulanacak) {
    try {
      await stokAyarla(u.sku, u.yeni)
      sonuc.dusulen++
      u.paketler.forEach(p => bitenPaketler.add(p))
    } catch (e) {
      sonuc.hatalar.push(`${u.sku}: ${e.message}`)
    }
  }

  // Riskli olanlar kuyruğa; aynı ürün için ikinci kayıt açma.
  const kuyruktakiler = zatenBekliyorMu('ikas', bekleyen.map(x => x.sku))
  const bekleyenler = bekleyen.filter(b => !kuyruktakiler.has(b.sku.toUpperCase()))
  if (bekleyenler.length) {
    onayaAl({
      kaynak: 'trendyol-satis', hedef: 'ikas', kalemler: bekleyenler,
      aciklama: 'Trendyol satışı sonrası ikas stoğu sıfıra inecek',
    })
    sonuc.onaya = bekleyenler.length
  }

  // Paketi ancak TÜM kalemleri işlendiyse "düşüldü" say. Onay bekleyen kalemi olan
  // paket açık kalır, yoksa onay verilse bile bir daha düşülmez.
  if (bitenPaketler.size) {
    const bekleyenSku = new Set(bekleyen.map(b => b.sku.toUpperCase()))
    const isaretle = db.prepare('UPDATE trendyol_siparisler SET stok_dusuldu = 1 WHERE paket_id = ?')
    const kalemSor = db.prepare(`SELECT upper(k.sku) sku FROM trendyol_siparis_kalemleri k
      JOIN trendyol_siparisler s ON s.id = k.siparis_id WHERE s.paket_id = ?`)
    db.transaction(() => {
      for (const p of bitenPaketler) {
        const skular = kalemSor.all(p).map(r => r.sku).filter(Boolean)
        if (skular.some(s => bekleyenSku.has(s))) continue
        isaretle.run(p)
      }
    })()
  }
  return sonuc
}

// --- 2) Ana kanal → Trendyol eşitle ---------------------------------------

async function trendyoluEsitle() {
  const sonuc = { gonderilen: 0, onaya: 0, hatalar: [] }
  const kaynak = anaKanal()
  if (kaynak === 'trendyol') return sonuc

  const kaynakSatirlar = kanalStok.kanalOku(kaynak)
  if (!kaynakSatirlar.length) return sonuc

  let hedefSatirlar
  try {
    hedefSatirlar = await tyStok.stokOku()
    kanalStok.kanaliYaz('trendyol', hedefSatirlar)
  } catch (e) {
    sonuc.hatalar.push('trendyol okuma: ' + e.message)
    return sonuc
  }

  const plan = mantik.planUret({ kaynak: kaynakSatirlar, hedef: hedefSatirlar })
  const { otomatik, onayli } = oto.gonderimiAyir(plan.gonderilecek)

  if (otomatik.length) {
    const db = getDb()
    try {
      const islemId = db.transaction(() => {
        const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan, aciklama)
          VALUES (?, 'trendyol', 'hazir', 'otomatik', 'Otomatik eşitleme')`).run(kaynak)
        const ekle = db.prepare(`INSERT INTO stok_senk_kalem (islem_id, barkod, sku, ad, eski_miktar, yeni_miktar)
          VALUES (?, ?, ?, ?, ?, ?)`)
        for (const k of otomatik) ekle.run(r.lastInsertRowid, k.barkod, k.sku, k.ad, k.eski_miktar, k.yeni_miktar)
        return r.lastInsertRowid
      })()
      const batchIdler = await tyStok.stokYaz(otomatik)
      db.prepare(`UPDATE stok_senk_islem SET durum = 'uygulandi',
        uygulama_tarihi = datetime('now','localtime'), ty_batch_id = ? WHERE id = ?`)
        .run(batchIdler.join(','), islemId)
      sonuc.gonderilen = otomatik.length
    } catch (e) {
      sonuc.hatalar.push('trendyol yazma: ' + e.message)
    }
  }

  if (onayli.length) {
    const bekleyen = zatenBekliyorMu('trendyol', onayli.map(k => k.sku))
    const yeniler = onayli.filter(k => !bekleyen.has(String(k.sku).toUpperCase()))
    if (yeniler.length) {
      onayaAl({
        kaynak, hedef: 'trendyol', kalemler: yeniler,
        aciklama: 'Bu ürünler Trendyol\'da satıştan kalkacak',
      })
      sonuc.onaya = yeniler.length
    }
  }
  return sonuc
}

// Arka plan turu. Sıra önemli: önce satışları ana kanala işle, sonra ana kanalı
// Trendyol'a yansıt — tersi olsaydı satış bilgisi bir tur geç yansırdı.
async function tur() {
  if (!acikMi()) return { atlandi: 'yazma kapalı veya kimlik yok' }
  const satis = await satislariUygula()
  const esit = await trendyoluEsitle()
  return { satis, esit }
}

module.exports = { tur, satislariUygula, trendyoluEsitle, _onayaAl: onayaAl }

// --- onay kuyruğu ---------------------------------------------------------

// Onay bekleyen işlemleri (ve kalemlerini) listeler — ekran bunu gösterir.
function bekleyenler() {
  const db = getDb()
  const islemler = db.prepare(`SELECT * FROM stok_senk_islem
    WHERE durum = 'onay_bekliyor' ORDER BY id DESC`).all()
  const kalemSor = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ? ORDER BY ad')
  return islemler.map(i => ({ ...i, kalemler: kalemSor.all(i.id) }))
}

/**
 * Onaylanan işlemi uygular. Hedefe göre yol ayrılır:
 *   hedef 'ikas'     → varyant varyant stokAyarla (Trendyol satışı sonrası düşüm)
 *   hedef 'trendyol' → tek partide price-and-inventory
 */
async function bekleyeniUygula(islemId) {
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islemId)
  if (!islem) throw new Error('İşlem bulunamadı.')
  mantik.durumGecisi(islem.durum, 'uygulandi')
  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ?').all(islemId)
  if (!kalemler.length) throw new Error('İşlemde kalem yok.')

  const hatalar = []
  if (islem.hedef === 'ikas') {
    for (const k of kalemler) {
      try {
        await stokAyarla(k.sku, k.yeni_miktar)
        db.prepare("UPDATE stok_senk_kalem SET sonuc = 'basarili' WHERE islem_id = ? AND barkod = ?").run(islemId, k.barkod)
      } catch (e) {
        hatalar.push(`${k.sku}: ${e.message}`)
        db.prepare('UPDATE stok_senk_kalem SET sonuc = ?, hata = ? WHERE islem_id = ? AND barkod = ?')
          .run('hata', e.message, islemId, k.barkod)
      }
    }
    // Bu düşümü tetikleyen paketler artık işlenmiş sayılır.
    if (islem.kaynak === 'trendyol-satis' && !hatalar.length) {
      const skular = kalemler.map(k => String(k.sku || '').toUpperCase()).filter(Boolean)
      if (skular.length) {
        db.prepare(`UPDATE trendyol_siparisler SET stok_dusuldu = 1
          WHERE stok_dusuldu = 0 AND id IN (
            SELECT DISTINCT k.siparis_id FROM trendyol_siparis_kalemleri k
             WHERE upper(k.sku) IN (${skular.map(() => '?').join(',')}))`).run(...skular)
      }
    }
  } else {
    const batchIdler = await tyStok.stokYaz(kalemler)
    db.prepare('UPDATE stok_senk_islem SET ty_batch_id = ? WHERE id = ?').run(batchIdler.join(','), islemId)
  }

  db.prepare(`UPDATE stok_senk_islem SET durum = ?, uygulama_tarihi = datetime('now','localtime')
    WHERE id = ?`).run(hatalar.length ? 'kismi' : 'uygulandi', islemId)
  return { islemId, uygulanan: kalemler.length - hatalar.length, hatalar }
}

// Onayı reddet: işlem iptal edilir, hiçbir yere yazılmaz.
function bekleyeniIptal(islemId) {
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islemId)
  if (!islem) throw new Error('İşlem bulunamadı.')
  mantik.durumGecisi(islem.durum, 'iptal')
  db.prepare("UPDATE stok_senk_islem SET durum = 'iptal' WHERE id = ?").run(islemId)
  return { islemId }
}

module.exports.bekleyenler = bekleyenler
module.exports.bekleyeniUygula = bekleyeniUygula
module.exports.bekleyeniIptal = bekleyeniIptal
