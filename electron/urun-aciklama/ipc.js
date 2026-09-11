// ÜRÜN AÇIKLAMA STÜDYOSU — IPC katmanı (renderer ↔ main)
// Yetki: 'urun_duzenle' (kanal-yetki.js'te de doğrulanır).

const { onizle: onizleUret } = require('./index')
const { harita: induksiyonHaritasi } = require('./induksiyon')
const aciklamaYaz = require('../ikas/aciklama-yaz')

function gql() { return require('../ikas/client').graphql }

// Aday ürünleri listele (varsayılan: çelik tencere). Hafif alanlar.
async function adaylar({ filtre = 'çelik tencere', limit = 60 } = {}) {
  const q = String(filtre || '').toLocaleLowerCase('tr').split(/\s+/).filter(Boolean)
  const Q = `query($p:Int){ listProduct(pagination:{page:$p,limit:100}){ data{ id name brand{ name } categories{ name }
    variants{ images{ imageId } prices{ sellPrice } } } } }`
  const bulunan = []
  for (let p = 1; p <= 8 && bulunan.length < limit; p++) {
    const r = await gql()(Q, { p })
    const d = r?.listProduct?.data || []
    for (const u of d) {
      const ad = (u.name || '').toLocaleLowerCase('tr')
      if (q.every((k) => ad.includes(k))) {
        bulunan.push({
          id: u.id, name: u.name,
          gorselSayisi: (u.variants || []).reduce((s, v) => s + ((v.images || []).length), 0),
          fiyat: u.variants?.[0]?.prices?.[0]?.sellPrice ?? null,
        })
      }
      if (bulunan.length >= limit) break
    }
    if (d.length < 100) break
  }
  return bulunan
}

// Bir ürün için önizleme (HTML + sınıflar + uyarılar). Yazmaz.
async function onizle({ urunId }) {
  if (!urunId) throw new Error('urunId gerekli')
  const u = await aciklamaYaz.okuId(gql(), urunId)
  const urun = {
    id: u.id, name: u.name,
    categories: u.categories || [], tags: u.tags || [],
    marka: u.brand?.name || '',
  }
  const r = await onizleUret({ urun, induksiyonHaritasi: induksiyonHaritasi() })
  return { urunId, mevcutAciklamaUz: (u.description || '').length, ...r }
}

// Onaylanan HTML'i güvenle yaz (yedek + görsel/fiyat doğrulama içeride).
async function yayinla({ urunId, html }) {
  if (!urunId || !html) throw new Error('urunId ve html gerekli')
  const r = await aciklamaYaz.yaz({ id: urunId, yeniAciklama: html })
  return { ok: r.ok, urunId, yeniUzunluk: (r.sonra.description || '').length }
}

// Yedekleri listele (son yazımlar).
function yedekler({ limit = 50 } = {}) {
  const db = require('../db/database').getDb()
  return db.prepare('SELECT id, urun_id, urun_adi, length(eski_aciklama) eski_uz, tarih FROM aciklama_yedek ORDER BY id DESC LIMIT ?').all(limit)
}

// Bir yedeği geri yükle (eski açıklamayı tekrar yaz).
async function geriAl({ yedekId }) {
  if (!yedekId) throw new Error('yedekId gerekli')
  const db = require('../db/database').getDb()
  const y = db.prepare('SELECT urun_id, eski_aciklama FROM aciklama_yedek WHERE id=?').get(yedekId)
  if (!y) throw new Error('yedek bulunamadı: ' + yedekId)
  const r = await aciklamaYaz.yaz({ id: y.urun_id, yeniAciklama: y.eski_aciklama || '' })
  return { ok: r.ok, urunId: y.urun_id }
}

module.exports = {
  'urun-aciklama:adaylar': adaylar,
  'urun-aciklama:onizle': onizle,
  'urun-aciklama:yayinla': yayinla,
  'urun-aciklama:yedekler': yedekler,
  'urun-aciklama:geriAl': geriAl,
}
