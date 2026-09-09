// Kupon havuzu: ikas'taki kuponlar (tek doğruluk kaynağı) + yerel "kime verildi" kaydı.
//
// NEDEN yerel kayıt: ikas yalnız usageCount bilir. "Verildi ama henüz kullanılmadı" ayrımı
// olmadan aynı kod iki müşteriye gider. Kayıt senkronlanır (senk-sema.js) → iki PC aynı
// kodu veremez; yarış penceresi senkron gecikmesi kadardır, UNIQUE(kupon_kodu) ikinci yazanı durdurur.
//
// ŞEMA burada da tutulur: test node:sqlite ile bu metni çalıştırır (database.js aynı metni exec eder).
const SEMA = `CREATE TABLE IF NOT EXISTS kupon_dagitim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kupon_id TEXT,
  kupon_kodu TEXT NOT NULL UNIQUE,
  kampanya_id TEXT NOT NULL,
  platform TEXT,
  konu_id TEXT,
  alici_id TEXT,
  gonderen_kullanici TEXT,
  tarih TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_kupon_dagitim_kampanya ON kupon_dagitim(kampanya_id);`

function havuzdanSec(kuponlar, verilmisKodlar) {
  const verilmis = new Set(verilmisKodlar || [])
  return (kuponlar || []).find(k => !(k.usageCount > 0) && !verilmis.has(k.code)) || null
}

function havuzDurumu(kuponlar, verilmisKodlar) {
  const verilmis = new Set(verilmisKodlar || [])
  let kullanilmis = 0, verilmisSayi = 0, bos = 0
  for (const k of kuponlar || []) {
    if (k.usageCount > 0) kullanilmis++
    else if (verilmis.has(k.code)) verilmisSayi++
    else bos++
  }
  return { toplam: (kuponlar || []).length, kullanilmis, verilmis: verilmisSayi, bos }
}

function verilmisKodlar(db, kampanyaId) {
  return db.prepare('SELECT kupon_kodu FROM kupon_dagitim WHERE kampanya_id = ?').all(kampanyaId).map(r => r.kupon_kodu)
}

function dagitimYaz(db, d) {
  const r = db.prepare(`INSERT INTO kupon_dagitim (kupon_id, kupon_kodu, kampanya_id, platform, konu_id, alici_id, gonderen_kullanici)
    VALUES (?,?,?,?,?,?,?)`).run(d.kupon_id || null, d.kupon_kodu, d.kampanya_id, d.platform || null, d.konu_id || null, d.alici_id || null, d.gonderen_kullanici || null)
  return Number(r.lastInsertRowid)
}

function dagitimSil(db, id) { db.prepare('DELETE FROM kupon_dagitim WHERE id = ?').run(id) }

function dagitimlar(db, kampanyaId) {
  return db.prepare('SELECT * FROM kupon_dagitim WHERE kampanya_id = ? ORDER BY tarih DESC').all(kampanyaId)
}

module.exports = { _SEMA: SEMA, havuzdanSec, havuzDurumu, verilmisKodlar, dagitimYaz, dagitimSil, dagitimlar }
