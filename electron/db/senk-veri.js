// Çok-PC veri senkron motoru (yerel taraf). Renderer (src/lib/veriSenk.js)
// Supabase'i yönetir; bu modül yerel SQLite okuma/yazmayı yapar.
//  - veri-senk:degisenler  → imleçten beri değişen yerel satırlar (FK'lar senk_id olarak)
//  - veri-senk:uygula      → uzak satırları yerele upsert (son-yazan-kazanır + dedup)
//  - veri-senk:imlec-al/yaz→ push/pull imleçleri (senk_durum)
const { getDb } = require('./database')
const { TABLOLAR, SIRA } = require('./senk-sema')

// FK'sı çözülemediği için uygulanamayan uzak satırların KALICI kuyruğu.
//
// Kök sorun: pull imleci (yuklenme) ilerledikçe bir kayıt bir daha çekilmez. Zorunlu FK'sı
// yerelde yoksa satır "ertelenir" ama imleç yine de ilerler → satır BİR DAHA HİÇ GELMEZ.
// Gerçek vaka: urun_stoklar satırları buluta 6 Tem'de, bağlı oldukları urunler kaydı 9 Tem'de
// yüklendi (Supabase'de 2.316 satır bu sırada). Aradaki turda çeken PC stok satırlarını
// kalıcı olarak kaybediyordu. Kuyruk bunu telafi eder: atlanan satır diske yazılır ve
// ebeveyni gelene kadar HER turda yeniden denenir.
function bekleyenKur(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS senk_bekleyen (
    tablo TEXT NOT NULL,
    senk_id TEXT NOT NULL,
    guncelleme TEXT NOT NULL,
    veri TEXT NOT NULL,
    ilk_deneme TEXT DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (tablo, senk_id)
  )`)
}

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
  'veri-senk:uygula': ({ tablo, kayitlar }) => module.exports._uygula(getDb(), { tablo, kayitlar }),

  // db ENJEKTE EDİLİR (getDb() içeriden çağrılmaz): vitest'in vi.mock'u CJS require'ı
  // yakalayamıyor, bu yüzden './database' mock'lanamıyor. db'yi parametre yapmak
  // mantığı bellek-içi bir DB ile test edilebilir kılar. Bkz. senk-bekleyen.test.js.
  _uygula: (db, { tablo, kayitlar }) => {
    const cfg = TABLOLAR[tablo]
    if (!cfg || !Array.isArray(kayitlar)) return { uygulanan: 0, atlanan: 0, bekleyen: 0 }
    bekleyenKur(db)
    // rowid kullanılır, id DEĞİL: sosyal_otomasyon_sablonlar gibi bileşik anahtarlı
    // tablolarda id kolonu yoktur ("no such column: id" pull'u komple kilitliyordu);
    // id INTEGER PRIMARY KEY olan tablolarda rowid zaten id'nin takma adıdır.
    const bulSenk = db.prepare(`SELECT rowid AS id, senk_guncelleme FROM ${tablo} WHERE senk_id = ?`)
    const bekleyenYaz = db.prepare(`INSERT INTO senk_bekleyen (tablo, senk_id, guncelleme, veri) VALUES (?, ?, ?, ?)
      ON CONFLICT(tablo, senk_id) DO UPDATE SET guncelleme = excluded.guncelleme, veri = excluded.veri`)
    const bekleyenSil = db.prepare('DELETE FROM senk_bekleyen WHERE tablo = ? AND senk_id = ?')
    let uygulanan = 0, atlanan = 0

    // Bu turun uzak deltası + önceki turlardan bekleyenler birlikte denenir. Aynı senk_id
    // her ikisinde de varsa taze olan (daha büyük guncelleme) kazanır.
    const birlesik = new Map()
    for (const b of db.prepare('SELECT senk_id, guncelleme, veri FROM senk_bekleyen WHERE tablo = ?').all(tablo)) {
      try { birlesik.set(b.senk_id, { senk_id: b.senk_id, guncelleme: b.guncelleme, veri: JSON.parse(b.veri) }) }
      catch { bekleyenSil.run(tablo, b.senk_id) } // bozuk JSON → kuyruğu tıkamasın
    }
    for (const k of kayitlar) {
      const v = birlesik.get(k.senk_id)
      if (!v || k.guncelleme >= v.guncelleme) birlesik.set(k.senk_id, k)
    }

    const tx = db.transaction(() => {
      for (const k of birlesik.values()) {
        // Kuyruk kaydı ÖNCE silinir, yalnız FK yine çözülemezse geri yazılır. Böylece
        // "çözüldü" sayılan her yol (uygulandı / yerel daha yeni / çakışma) kuyruğu
        // kendiliğinden temizler — her çıkışa ayrı silme koymaya gerek kalmaz.
        bekleyenSil.run(tablo, k.senk_id)

        const mevcut = bulSenk.get(k.senk_id)
        if (mevcut && mevcut.senk_guncelleme >= k.guncelleme) { atlanan++; continue } // yerel daha yeni/eşit

        // FK'ları yerel id'ye çöz. Zorunlu FK çözülemezse satırı KUYRUĞA al (imleç ilerlese
        // de kaybolmasın, ebeveyni gelince uygulansın); zorunlu olmayan çözülemezse null bırak.
        const zorunlu = new Set(cfg.zorunluFk || [])
        const fkLocal = {}
        let eksikFk = false
        for (const [kolon, ref] of Object.entries(cfg.fk || {})) {
          const refSenk = k.veri._fk?.[kolon]
          if (!refSenk) { fkLocal[kolon] = null; continue }
          const refRow = db.prepare(`SELECT id FROM ${ref} WHERE senk_id = ?`).get(refSenk)
          if (!refRow) {
            if (zorunlu.has(kolon)) { eksikFk = true; break }
            fkLocal[kolon] = null; continue
          }
          fkLocal[kolon] = refRow.id
        }
        if (eksikFk) {
          bekleyenYaz.run(tablo, k.senk_id, k.guncelleme, JSON.stringify(k.veri))
          atlanan++; continue
        }

        // Kolon değerleri (veri kolonları + çözülmüş FK'lar).
        const cols = {}
        for (const c of cfg.kolonlar) cols[c] = k.veri[c] ?? null
        Object.assign(cols, fkLocal)
        const kolonAdlari = Object.keys(cols)

        if (mevcut) {
          db.prepare(`UPDATE ${tablo} SET ${kolonAdlari.map(c => `${c}=@${c}`).join(', ')}, senk_id=@_sid, senk_guncelleme=@_g WHERE rowid=@_id`)
            .run({ ...cols, _sid: k.senk_id, _g: k.guncelleme, _id: mevcut.id })
          uygulanan++; continue
        }

        // Yeni: önce doğal anahtarla yerel eşi bul (iki PC bağımsız oluşturmuşsa birleştir).
        let eslesen = null
        if (cfg.dogalCift) {
          eslesen = db.prepare(`SELECT rowid AS id, senk_guncelleme FROM ${tablo} WHERE ${cfg.dogalCift.map(c => `${c}=@${c}`).join(' AND ')}`).get(cols)
        } else {
          for (const dk of (cfg.dogal || [])) {
            if (cols[dk] == null || cols[dk] === '') continue
            eslesen = db.prepare(`SELECT rowid AS id, senk_guncelleme FROM ${tablo} WHERE ${dk} = ?`).get(cols[dk])
            if (eslesen) break
          }
        }
        if (eslesen) {
          // Son-yazan-kazanır: yalnızca uzak DAHA YENİ ise ez (bayat veri tazeyi ezmesin).
          if (eslesen.senk_guncelleme >= k.guncelleme) { atlanan++; continue }
          db.prepare(`UPDATE ${tablo} SET ${kolonAdlari.map(c => `${c}=@${c}`).join(', ')}, senk_id=@_sid, senk_guncelleme=@_g WHERE rowid=@_id`)
            .run({ ...cols, _sid: k.senk_id, _g: k.guncelleme, _id: eslesen.id })
          uygulanan++; continue
        }
        const insertEt = (degerler) => {
          const kols = [...Object.keys(degerler), 'senk_id', 'senk_guncelleme']
          db.prepare(`INSERT INTO ${tablo} (${kols.join(',')}) VALUES (${kols.map(c => '@' + c).join(',')})`)
            .run({ ...degerler, senk_id: k.senk_id, senk_guncelleme: k.guncelleme })
        }
        try {
          insertEt(cols)
          uygulanan++
        } catch (e) {
          // fis_no gibi PC'ler arası çakışabilen tekil sütun → suffix ile tekrar dene
          // (iki FARKLI kayıt yanlışlıkla birleştirilmesin). Yoksa atla.
          if (cfg.cakismaKolon && cols[cfg.cakismaKolon]) {
            try {
              insertEt({ ...cols, [cfg.cakismaKolon]: `${cols[cfg.cakismaKolon]}-${k.senk_id.slice(0, 6)}` })
              uygulanan++
            } catch { atlanan++ }
          } else { atlanan++ }
        }
      }
    })
    tx()
    const bekleyen = db.prepare('SELECT COUNT(*) AS n FROM senk_bekleyen WHERE tablo = ?').get(tablo).n
    return { uygulanan, atlanan, bekleyen }
  },

  // FK'sı hâlâ çözülemeyen bekleyen kayıtların tabloları. Renderer bunları, uzak delta
  // boş olsa bile her turda yeniden dener (ebeveyn yerelde başka yoldan oluşmuş olabilir).
  'veri-senk:bekleyen-tablolar': () => module.exports._bekleyenTablolar(getDb()),

  _bekleyenTablolar: (db) => {
    bekleyenKur(db)
    return db.prepare('SELECT tablo, COUNT(*) AS adet FROM senk_bekleyen GROUP BY tablo').all()
  },

  // Tablo uygulama sırası (tek kaynak: senk-sema.js). Renderer bunu kullanır ki
  // backend'e tablo eklenince renderer listesi eskimesin (kargolar bug'ının kök nedeni).
  'veri-senk:sira': () => SIRA,

  'veri-senk:imlec-al': ({ anahtar }) => ({ deger: imlecAl(getDb(), anahtar) }),
  'veri-senk:imlec-yaz': ({ anahtar, deger }) => { imlecYaz(getDb(), anahtar, deger); return { ok: true } },
}
