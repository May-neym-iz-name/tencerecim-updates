// Ayar senkronu: yerel ayar tablolarını tek bir obje olarak toplar (Supabase'e
// yüklemek için) ve buluttan gelen objeyi yerel tablolara uygular.
// Büyük operasyonel veri (ürün/satış/stok/sipariş) BURAYA DAHİL DEĞİL.
const { getDb } = require('./database')

// ikas'ta cihaza özel olan, senkronlanMAMASI gereken anahtarlar.
const IKAS_YEREL_ANAHTARLAR = new Set(['son_siparis_senk', 'gecmis_cekildi'])

function topla() {
  const db = getDb()
  const kv = (tablo) => {
    const o = {}
    for (const r of db.prepare(`SELECT anahtar, deger FROM ${tablo}`).all()) o[r.anahtar] = r.deger
    return o
  }
  const ikas = kv('ikas_ayarlar')
  for (const k of IKAS_YEREL_ANAHTARLAR) delete ikas[k]

  const gonderici = {}
  for (const r of db.prepare('SELECT * FROM lokasyon_gonderici').all()) {
    const { lokasyon_id, ...rest } = r
    gonderici[lokasyon_id] = rest
  }
  const lokasyon_ikas = {}
  for (const r of db.prepare('SELECT id, ikas_lokasyon_id FROM lokasyonlar WHERE ikas_lokasyon_id IS NOT NULL').all()) {
    lokasyon_ikas[r.id] = r.ikas_lokasyon_id
  }
  return { ups: kv('ups_ayarlar'), ikas, gonderici, lokasyon_ikas }
}

function uygula(veri = {}) {
  const db = getDb()
  const upsertKv = (tablo, obj) => {
    if (!obj) return
    const st = db.prepare(`INSERT INTO ${tablo} (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger`)
    const tx = db.transaction(() => { for (const [a, d] of Object.entries(obj)) st.run(a, d == null ? '' : String(d)) })
    tx()
  }
  upsertKv('ups_ayarlar', veri.ups)
  if (veri.ikas) {
    const ikas = { ...veri.ikas }
    for (const k of IKAS_YEREL_ANAHTARLAR) delete ikas[k]
    upsertKv('ikas_ayarlar', ikas)
  }
  if (veri.gonderici) {
    const tx = db.transaction(() => {
      for (const [lokId, alanlar] of Object.entries(veri.gonderici)) {
        const mevcut = db.prepare('SELECT 1 FROM lokasyon_gonderici WHERE lokasyon_id = ?').get(lokId)
        const kolonlar = Object.keys(alanlar).filter(k => k !== 'lokasyon_id')
        if (!kolonlar.length) continue
        const params = { lokasyon_id: lokId }
        for (const k of kolonlar) params[k] = alanlar[k] ?? null
        if (mevcut) {
          db.prepare(`UPDATE lokasyon_gonderici SET ${kolonlar.map(k => `${k}=@${k}`).join(', ')} WHERE lokasyon_id=@lokasyon_id`).run(params)
        } else {
          const kols = ['lokasyon_id', ...kolonlar]
          db.prepare(`INSERT INTO lokasyon_gonderici (${kols.join(',')}) VALUES (${kols.map(k => '@' + k).join(',')})`).run(params)
        }
      }
    })
    tx()
  }
  if (veri.lokasyon_ikas) {
    const st = db.prepare('UPDATE lokasyonlar SET ikas_lokasyon_id = ? WHERE id = ?')
    const tx = db.transaction(() => { for (const [lokId, ikasId] of Object.entries(veri.lokasyon_ikas)) st.run(ikasId, lokId) })
    tx()
  }
  // ikas kimlik bilgisi değişmiş olabilir → token cache sıfırla.
  try { require('../ikas/client').tokenSifirla() } catch {}
  return { ok: true }
}

module.exports = {
  'ayar-senk:topla': () => topla(),
  'ayar-senk:uygula': (veri) => uygula(veri),
}
