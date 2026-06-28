// Çok-PC veri senkronu şeması: senkronlanacak tablolara senk_id (UUID) +
// senk_guncelleme (UTC ms ISO) kolonları ve tetikleyiciler ekler.
//
// Tetikleyici mantığı (uygulama kodunu değiştirmeden çalışır):
//  - AFTER INSERT  WHEN senk_id IS NULL                 → yeni satıra senk_id + ts damgala
//  - AFTER UPDATE  WHEN new.senk_guncelleme = old...    → normal güncellemede ts'i tazele
// Senkron uygulaması (pull) satırı YAZARKEN senk_id + senk_guncelleme'yi AÇIKÇA
// verir → WHEN koşulları yanlış olur → tetikleyici ezmez (uzak ts korunur).

const NOWMS = "strftime('%Y-%m-%dT%H:%M:%fZ','now')"

// Senkronlanacak tablolar + senkron alanları + FK eşlemesi + doğal (tekil) anahtarlar.
// kolonlar: kopyalanacak veri alanları (FK kolonları AYRI tutulur). fk: { kolon: referansTablo }.
// dogal: çakışma birleştirme (dedup) için aday tekil sütunlar.
// FAZ 1 — referans + katalog. Faz 2'de satislar/kasa/gider/mal_kabul eklenecek.
const TABLOLAR = {
  markalar:     { kolonlar: ['ad', 'aktif'], fk: {}, dogal: ['ad'] },
  tedarikciler: { kolonlar: ['ad', 'telefon', 'email', 'aktif'], fk: {}, dogal: ['ad'] },
  kategoriler:  { kolonlar: ['ad', 'tam_yol', 'aktif'], fk: { ust_kategori_id: 'kategoriler' }, dogal: [] },
  musteriler:   { kolonlar: ['ad', 'soyad', 'telefon', 'email', 'tc_kimlik', 'vergi_no', 'vergi_dairesi', 'unvan', 'adres', 'il', 'ilce', 'iskonto_orani', 'aktif', 'ikas_musteri_id', 'ikas_siparis_sayisi', 'ikas_toplam_harcama', 'ikas_ilk_siparis', 'ikas_son_siparis'], fk: {}, dogal: ['telefon'] },
  urunler:      { kolonlar: ['ad', 'barkod', 'sku', 'marka', 'kategori', 'aciklama', 'alis_fiyati', 'satis_fiyati', 'kdv_orani', 'aktif', 'ikas_urun_id', 'ikas_varyant_id'], fk: { marka_id: 'markalar', kategori_id: 'kategoriler', tedarikci_id: 'tedarikciler' }, dogal: ['barkod', 'sku'] },
  urun_stoklar: { kolonlar: ['lokasyon_id', 'miktar', 'minimum_stok'], fk: { urun_id: 'urunler' }, dogalCift: ['urun_id', 'lokasyon_id'] },
}

// Tablolar bağımlılık (FK) sırasında uygulanmalı: referanslar önce.
const SIRA = ['markalar', 'tedarikciler', 'kategoriler', 'musteriler', 'urunler', 'urun_stoklar']

function kur(db) {
  for (const tablo of Object.keys(TABLOLAR)) {
    try { db.exec(`ALTER TABLE ${tablo} ADD COLUMN senk_id TEXT`) } catch {}
    try { db.exec(`ALTER TABLE ${tablo} ADD COLUMN senk_guncelleme TEXT`) } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_${tablo}_senkid ON ${tablo}(senk_id)`) } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_${tablo}_senkg ON ${tablo}(senk_guncelleme)`) } catch {}
    // Mevcut satırları damgala (bir kez; sadece boş olanlar).
    db.exec(`UPDATE ${tablo} SET senk_id = lower(hex(randomblob(16))) WHERE senk_id IS NULL OR senk_id = ''`)
    db.exec(`UPDATE ${tablo} SET senk_guncelleme = ${NOWMS} WHERE senk_guncelleme IS NULL OR senk_guncelleme = ''`)
    // Tetikleyiciler.
    db.exec(`CREATE TRIGGER IF NOT EXISTS trg_${tablo}_senk_ins AFTER INSERT ON ${tablo}
      WHEN new.senk_id IS NULL BEGIN
        UPDATE ${tablo} SET senk_id = lower(hex(randomblob(16))), senk_guncelleme = ${NOWMS} WHERE rowid = new.rowid;
      END`)
    db.exec(`CREATE TRIGGER IF NOT EXISTS trg_${tablo}_senk_upd AFTER UPDATE ON ${tablo}
      WHEN new.senk_guncelleme = old.senk_guncelleme BEGIN
        UPDATE ${tablo} SET senk_guncelleme = ${NOWMS} WHERE rowid = new.rowid;
      END`)
  }
  // Senkron imleçleri (push/pull) için kv tablosu.
  db.exec('CREATE TABLE IF NOT EXISTS senk_durum (anahtar TEXT PRIMARY KEY, deger TEXT)')
}

module.exports = { kur, TABLOLAR, SIRA }
