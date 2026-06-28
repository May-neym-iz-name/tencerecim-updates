// Çok-PC veri senkron motoru (yerel taraf). Renderer (src/lib/veriSenk.js)
// Supabase'i yönetir; bu modül yerel SQLite okuma/yazmayı yapar.
//  - veri-senk:degisenler  → imleçten beri değişen yerel satırlar (FK'lar senk_id olarak)
//  - veri-senk:uygula      → uzak satırları yerele upsert (son-yazan-kazanır + dedup)
//  - veri-senk:imlec-al/yaz→ push/pull imleçleri (senk_durum)
const { getDb } = require('./database')
const { TABLOLAR, SIRA } = require('./senk-sema')

function imlecAl(db, anahtar) {
  return db.prepare('SELECT deger FROM senk_durum WHERE anahtar = ?').get(anahtar)?.deger || ''
}
function imlecYaz(db, anahtar, deger) {
  db.prepare('INSERT INTO senk_durum (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger')
    .run(anahtar, deger || '')
}

// Bir satırı senkron yüküne çevirir: veri kolonları + _fk { fkKolon: referansSenkId }.
function satirYuku(db, tablo, row, cfg) {
  const veri = {}
  for (const k of cfg.kolonlar) veri[k] = row[k] ?? null
  const fk = {}
  for (const [kolon, ref] of Object.entries(cfg.fk || {})) {
    const refId = row[kolon]
    fk[kolon] = refId ? (db.prepare(`SELECT senk_id FROM ${ref} WHERE id = ?`).get(refId)?.senk_id || null) : null
  }
  veri._fk = fk
  return { senk_id: row.senk_id, guncelleme: row.senk_guncelleme, veri }
}

module.exports = {
  // İmleçten (yerel ts) beri değişen tüm tablolardaki satırlar + en yeni ts.
  'veri-senk:degisenler': ({ since = '' } = {}) => {
    const db = getDb()
    const sonuc = {}
    let enYeni = since
    for (const tablo of SIRA) {
      const cfg = TABLOLAR[tablo]
      const rows = db.prepare(`SELECT * FROM ${tablo} WHERE senk_guncelleme > ? ORDER BY senk_guncelleme`).all(since)
      if (!rows.length) continue
      sonuc[tablo] = rows.map(r => {
        if (r.senk_guncelleme > enYeni) enYeni = r.senk_guncelleme
        return satirYuku(db, tablo, r, cfg)
      })
    }
    return { degisen: sonuc, enYeni }
  },

  // Uzak kayıtları yerele uygula (tek tablo). kayitlar: [{senk_id, guncelleme, veri}].
  'veri-senk:uygula': ({ tablo, kayitlar }) => {
    const db = getDb()
    const cfg = TABLOLAR[tablo]
    if (!cfg || !Array.isArray(kayitlar)) return { uygulanan: 0, atlanan: 0 }
    const bulSenk = db.prepare(`SELECT id, senk_guncelleme FROM ${tablo} WHERE senk_id = ?`)
    let uygulanan = 0, atlanan = 0

    const tx = db.transaction(() => {
      for (const k of kayitlar) {
        const mevcut = bulSenk.get(k.senk_id)
        if (mevcut && mevcut.senk_guncelleme >= k.guncelleme) { atlanan++; continue } // yerel daha yeni/eşit

        // FK'ları yerel id'ye çöz; referans henüz senkronlanmadıysa satırı ertele.
        const fkLocal = {}
        let eksikFk = false
        for (const [kolon, ref] of Object.entries(cfg.fk || {})) {
          const refSenk = k.veri._fk?.[kolon]
          if (!refSenk) { fkLocal[kolon] = null; continue }
          const refRow = db.prepare(`SELECT id FROM ${ref} WHERE senk_id = ?`).get(refSenk)
          if (!refRow) { eksikFk = true; break }
          fkLocal[kolon] = refRow.id
        }
        if (eksikFk) { atlanan++; continue }

        // Kolon değerleri (veri kolonları + çözülmüş FK'lar).
        const cols = {}
        for (const c of cfg.kolonlar) cols[c] = k.veri[c] ?? null
        Object.assign(cols, fkLocal)
        const kolonAdlari = Object.keys(cols)

        if (mevcut) {
          db.prepare(`UPDATE ${tablo} SET ${kolonAdlari.map(c => `${c}=@${c}`).join(', ')}, senk_id=@_sid, senk_guncelleme=@_g WHERE id=@_id`)
            .run({ ...cols, _sid: k.senk_id, _g: k.guncelleme, _id: mevcut.id })
          uygulanan++; continue
        }

        // Yeni: önce doğal anahtarla yerel eşi bul (iki PC bağımsız oluşturmuşsa birleştir).
        let eslesen = null
        if (cfg.dogalCift) {
          eslesen = db.prepare(`SELECT id FROM ${tablo} WHERE ${cfg.dogalCift.map(c => `${c}=@${c}`).join(' AND ')}`).get(cols)
        } else {
          for (const dk of (cfg.dogal || [])) {
            if (cols[dk] == null || cols[dk] === '') continue
            eslesen = db.prepare(`SELECT id FROM ${tablo} WHERE ${dk} = ?`).get(cols[dk])
            if (eslesen) break
          }
        }
        if (eslesen) {
          db.prepare(`UPDATE ${tablo} SET ${kolonAdlari.map(c => `${c}=@${c}`).join(', ')}, senk_id=@_sid, senk_guncelleme=@_g WHERE id=@_id`)
            .run({ ...cols, _sid: k.senk_id, _g: k.guncelleme, _id: eslesen.id })
          uygulanan++; continue
        }
        try {
          const kols = [...kolonAdlari, 'senk_id', 'senk_guncelleme']
          db.prepare(`INSERT INTO ${tablo} (${kols.join(',')}) VALUES (${kols.map(c => '@' + c).join(',')})`)
            .run({ ...cols, senk_id: k.senk_id, senk_guncelleme: k.guncelleme })
          uygulanan++
        } catch (e) { atlanan++ } // UNIQUE vb. — bir sonraki turda doğal eşleşme yakalar
      }
    })
    tx()
    return { uygulanan, atlanan }
  },

  'veri-senk:imlec-al': ({ anahtar }) => ({ deger: imlecAl(getDb(), anahtar) }),
  'veri-senk:imlec-yaz': ({ anahtar, deger }) => { imlecYaz(getDb(), anahtar, deger); return { ok: true } },
}
