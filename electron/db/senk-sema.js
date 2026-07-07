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
// zorunluFk: çözülemezse satır ertelenir (NOT NULL). Diğer FK'lar çözülemezse null.
// cakismaKolon: bu tekil sütunda UNIQUE çakışması olursa (fis_no PC'ler arası
// çakışabilir) suffix eklenir — iki farklı kayıt yanlışlıkla BİRLEŞTİRİLMEZ.
const TABLOLAR = {
  // --- Faz 1: referans + katalog ---
  markalar:     { kolonlar: ['ad', 'aktif'], fk: {}, dogal: ['ad'] },
  tedarikciler: { kolonlar: ['ad', 'telefon', 'email', 'aktif'], fk: {}, dogal: ['ad'] },
  kategoriler:  { kolonlar: ['ad', 'tam_yol', 'aktif'], fk: { ust_kategori_id: 'kategoriler' }, dogal: [] },
  musteriler:   { kolonlar: ['ad', 'soyad', 'telefon', 'email', 'tc_kimlik', 'vergi_no', 'vergi_dairesi', 'unvan', 'adres', 'il', 'ilce', 'iskonto_orani', 'aktif', 'ikas_musteri_id', 'ikas_siparis_sayisi', 'ikas_toplam_harcama', 'ikas_ilk_siparis', 'ikas_son_siparis'], fk: {}, dogal: ['telefon'] },
  urunler:      { kolonlar: ['ad', 'barkod', 'sku', 'marka', 'kategori', 'aciklama', 'alis_fiyati', 'satis_fiyati', 'kdv_orani', 'aktif', 'ikas_urun_id', 'ikas_varyant_id'], fk: { marka_id: 'markalar', kategori_id: 'kategoriler', tedarikci_id: 'tedarikciler' }, dogal: ['barkod', 'sku'] },
  urun_stoklar: { kolonlar: ['lokasyon_id', 'miktar', 'minimum_stok'], fk: { urun_id: 'urunler' }, zorunluFk: ['urun_id'], dogalCift: ['urun_id', 'lokasyon_id'] },
  setler:       { kolonlar: ['ad', 'fiyat', 'aktif'], fk: {}, dogal: ['ad'] },
  set_urunler:  { kolonlar: ['miktar'], fk: { set_id: 'setler', urun_id: 'urunler' }, zorunluFk: ['set_id', 'urun_id'], dogalCift: ['set_id', 'urun_id'] },

  // --- Faz 2: işlemsel veri (append-mostly). lokasyon_id her PC'de aynı seed → düz kolon. ---
  satislar:           { kolonlar: ['fis_no', 'lokasyon_id', 'odeme_tipi', 'durum', 'tip', 'ara_toplam', 'iskonto_toplam', 'kdv_toplam', 'genel_toplam', 'notlar', 'tarih'], fk: { musteri_id: 'musteriler', iade_kaynak_id: 'satislar' }, cakismaKolon: 'fis_no', dogal: [] },
  satis_kalemleri:    { kolonlar: ['miktar', 'birim_fiyat', 'iskonto_orani', 'kdv_orani', 'toplam', 'iade_miktar', 'set_adi'], fk: { satis_id: 'satislar', urun_id: 'urunler' }, zorunluFk: ['satis_id', 'urun_id'], dogal: [] },
  satis_odemeler:     { kolonlar: ['odeme_tipi', 'tutar'], fk: { satis_id: 'satislar' }, zorunluFk: ['satis_id'], dogal: [] },
  kasa_oturumlar:     { kolonlar: ['lokasyon_id', 'acan', 'acilis_tarihi', 'acilis_nakit', 'kapatan', 'kapanis_tarihi', 'sayilan_nakit', 'beklenen_nakit', 'fark', 'durum', 'notlar'], fk: {}, dogal: [] },
  giderler:           { kolonlar: ['lokasyon_id', 'tarih', 'kategori', 'aciklama', 'tutar', 'odeme_tipi', 'kullanici', 'olusturma_tarihi'], fk: {}, dogal: [] },
  sabit_giderler:     { kolonlar: ['lokasyon_id', 'kategori', 'aciklama', 'tutar', 'odeme_tipi', 'aktif'], fk: {}, dogal: [] },
  mal_kabuller:       { kolonlar: ['lokasyon_id', 'fatura_no', 'tarih', 'toplam_maliyet', 'kullanici', 'notlar'], fk: { tedarikci_id: 'tedarikciler' }, dogal: [] },
  mal_kabul_kalemleri:{ kolonlar: ['miktar', 'birim_maliyet'], fk: { mal_kabul_id: 'mal_kabuller', urun_id: 'urunler' }, zorunluFk: ['mal_kabul_id', 'urun_id'], dogal: [] },

  // Kargo gönderileri: çok-PC senkron. online_siparis_id YERİNE ikas_siparis_id
  // (stabil, PC'ler arası) taşınır; lokasyon_id gönderici mağaza (kapsam filtresi).
  // takip_no UPS'ten benzersiz → doğal anahtar (dedup güvenli).
  // barkod_png (UPS etiket görseli, ~97KB/kargo) SENKRONLANMAZ: Supabase'i çok şişirir
  // ve etiket zaten oluşturan mağazanın PC'sinde yerelde durur. Diğer alanlar (takip no,
  // alıcı, adres, durum, lokasyon) senkronlanır → görünürlük + takip + WhatsApp çalışır.
  kargolar: { kolonlar: ['takip_no', 'durum', 'tip', 'lokasyon_id', 'ikas_siparis_id', 'alici_ad', 'alici_telefon', 'alici_adres', 'il', 'ilce', 'il_kodu', 'ilce_kodu', 'koli_adedi', 'agirlik', 'servis_seviyesi', 'odeme_tipi', 'aciklama', 'etiket_link', 'etiket_storage_yol', 'son_durum', 'son_durum_tarihi', 'olusturma_tarihi'], fk: { musteri_id: 'musteriler', satis_id: 'satislar' }, dogal: ['takip_no'] },
}

// Tablolar bağımlılık (FK) sırasında uygulanmalı: referanslar önce.
const SIRA = [
  'markalar', 'tedarikciler', 'kategoriler', 'musteriler', 'urunler', 'urun_stoklar',
  'setler', 'set_urunler',
  'satislar', 'satis_kalemleri', 'satis_odemeler',
  'kasa_oturumlar', 'giderler', 'sabit_giderler', 'mal_kabuller', 'mal_kabul_kalemleri',
  'kargolar',
]

function kur(db) {
  for (const tablo of Object.keys(TABLOLAR)) {
    try { db.exec(`ALTER TABLE ${tablo} ADD COLUMN senk_id TEXT`) } catch {}
    try { db.exec(`ALTER TABLE ${tablo} ADD COLUMN senk_guncelleme TEXT`) } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_${tablo}_senkid ON ${tablo}(senk_id)`) } catch {}
    try { db.exec(`CREATE INDEX IF NOT EXISTS idx_${tablo}_senkg ON ${tablo}(senk_guncelleme)`) } catch {}
    // Mevcut satırları damgala (bir kez; sadece boş olanlar). senk_guncelleme ESKİ
    // sabit ts ile doldurulur (NOW değil): yükseltme öncesi mevcut veri "temel"dir;
    // yükseltme sonrası GERÇEK her işlem (satış/sayım/düzenleme) bunu yener → bir
    // lokasyonu fiilen işleyen PC'nin stoğu, işlemeyen PC'nin bayat değerini kazanır.
    db.exec(`UPDATE ${tablo} SET senk_id = lower(hex(randomblob(16))) WHERE senk_id IS NULL OR senk_id = ''`)
    db.exec(`UPDATE ${tablo} SET senk_guncelleme = '2000-01-01T00:00:00.000Z' WHERE senk_guncelleme IS NULL OR senk_guncelleme = ''`)
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

  // Bir kerelik: kargolar senkrona sonradan eklendi ve mevcut satırlar temel ts
  // ('2000-01-01') ile damgalandığı için push imlecini geçemiyor, hiç gönderilmiyordu.
  // senk_guncelleme'yi NOW yaparak bir defa push'a sok → diğer PC'ler mevcut kargoları alır.
  try {
    if (!db.prepare("SELECT deger FROM senk_durum WHERE anahtar = 'kargolar_restamp'").get()) {
      db.exec(`UPDATE kargolar SET senk_guncelleme = ${NOWMS} WHERE senk_id IS NOT NULL`)
      db.prepare("INSERT INTO senk_durum (anahtar, deger) VALUES ('kargolar_restamp', '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'").run()
    }
  } catch (e) { console.error('kargolar restamp:', e.message) }

  // Bir kerelik düzeltme: yukarıdaki tek-seferlik yeniden damgalama, senkronla gelen
  // kopyaları "daha yeni" yapıp sonradan gelen İPTAL güncellemelerinin son-yazan-kazanır
  // ile atlanmasına yol açmış olabilir. İptal terminal bir durum → iptal edilmiş
  // kargoları taze ts ile yeniden damgala ki 'iptal' tüm PC'lerde kesin kazansın.
  try {
    if (!db.prepare("SELECT deger FROM senk_durum WHERE anahtar = 'kargolar_iptal_retouch'").get()) {
      db.exec(`UPDATE kargolar SET senk_guncelleme = ${NOWMS} WHERE durum = 'iptal' AND senk_id IS NOT NULL`)
      db.prepare("INSERT INTO senk_durum (anahtar, deger) VALUES ('kargolar_iptal_retouch', '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'").run()
    }
  } catch (e) { console.error('kargolar iptal retouch:', e.message) }
}

module.exports = { kur, TABLOLAR, SIRA }
