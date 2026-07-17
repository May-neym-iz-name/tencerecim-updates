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
  // Sosyal medya hazır yanıtları: meta_ayarlar.hizli_yanitlar (JSON dizi). Yalnızca
  // BU anahtar senkronlanır — Meta gizli anahtarları (app_secret/sayfa_token) cihaza özel.
  let hizli_yanitlar = []
  try {
    const row = db.prepare("SELECT deger FROM meta_ayarlar WHERE anahtar = 'hizli_yanitlar'").get()
    const arr = row ? JSON.parse(row.deger || '[]') : []
    if (Array.isArray(arr)) hizli_yanitlar = arr.filter(x => typeof x === 'string')
  } catch { /* bozuksa boş dizi */ }

  // Otomasyonu YÜRÜTEN PC (v1.2.114). Senkron ŞART: otomasyon durumu artık ortak, ama
  // yürütme tek PC'de olmalı — diğer PC'nin "yürütücü kim?" bilgisini bilmesi lazım ki
  // sussun. cihaz_id senkronlanMAZ (her PC'nin kendi kimliği); yalnız SEÇİM taşınır.
  const yur = db.prepare("SELECT anahtar, deger FROM meta_ayarlar WHERE anahtar IN ('otomasyon_yurutucu','otomasyon_yurutucu_ad')").all()
  const otomasyon_yurutucu = {}
  for (const r of yur) otomasyon_yurutucu[r.anahtar] = r.deger

  return { ups: kv('ups_ayarlar'), ikas, gonderici, lokasyon_ikas, hizli_yanitlar, otomasyon_yurutucu }
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
  // Sosyal medya hazır yanıtları (buluttan gelen dizi → meta_ayarlar). Yalnızca dizi
  // geldiğinde yaz; tanımsızsa mevcut yerel listeyi koru (eski istemcilerle uyumlu).
  // Yürütücü seçimi (v1.2.114). Bu PC yürütücü değilse Meta yoklaması durur → çift DM olmaz.
  // Eski istemcilerden gelen veride bu alan YOKTUR → mevcut yerel seçimi KORU (silme).
  if (veri.otomasyon_yurutucu && typeof veri.otomasyon_yurutucu === 'object') {
    upsertKv('meta_ayarlar', veri.otomasyon_yurutucu)
  }
  if (Array.isArray(veri.hizli_yanitlar)) {
    const temiz = veri.hizli_yanitlar.filter(x => typeof x === 'string')
    db.prepare(
      "INSERT INTO meta_ayarlar (anahtar, deger) VALUES ('hizli_yanitlar', ?) " +
      'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
    ).run(JSON.stringify(temiz))
  }
  // ikas kimlik bilgisi değişmiş olabilir → token cache sıfırla.
  try { require('../ikas/client').tokenSifirla() } catch {}
  return { ok: true }
}

module.exports = {
  'ayar-senk:topla': () => topla(),
  'ayar-senk:uygula': (veri) => uygula(veri),
}
