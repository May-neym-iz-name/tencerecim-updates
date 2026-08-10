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
  // Takma ad barkodlar: bir ürünün ek barkodları. Senkronlanmazsa diğer PC'de ek
  // barkod okutma sessizce çalışmaz (ön sipariş çalışmasında birebir aynısı yaşandı).
  // barkod tüm PC'lerde AYNI ve UNIQUE → doğal anahtar, dedup garantili.
  urun_barkodlar: { kolonlar: ['barkod', 'aciklama', 'aktif'], fk: { urun_id: 'urunler' },
                    zorunluFk: ['urun_id'], dogal: ['barkod'], sonradanEklendi: true },
  setler:       { kolonlar: ['ad', 'fiyat', 'aktif'], fk: {}, dogal: ['ad'] },
  set_urunler:  { kolonlar: ['miktar'], fk: { set_id: 'setler', urun_id: 'urunler' }, zorunluFk: ['set_id', 'urun_id'], dogalCift: ['set_id', 'urun_id'] },
  // Sosyal medya otomasyon şablonları: içerik (metin/fiyat/link) — küçük, şişirmez.
  // urun_id/set_id ZORUNLU DEĞİL: çözülemezse null kalır ve şablon elle yazılmış
  // fiyatıyla çalışmaya devam eder (kaynak bağı kopar ama şablon kaybolmaz).
  // sosyal_otomasyonlar / sosyal_otomasyon_sablonlar BİLEREK senkronlanmaz — bkz. SIRA notu.
  // sonradanEklendi: senkrona v1.2.113'te eklendi → mevcut satırlar "şimdi" damgalanmalı,
  // yoksa push imlecinin gerisinde kalıp hiç gönderilmezler (bkz. kur() içindeki not).
  sosyal_sablonlar: { kolonlar: ['ad', 'urun_adi', 'aciklama', 'fiyat', 'link', 'whatsapp', 'tur', 'serbest_metin', 'aktif'],
                      fk: { urun_id: 'urunler', set_id: 'setler' }, dogal: ['ad'], sonradanEklendi: true },

  // Otomasyon durumu ORTAK (v1.2.114). Senkronlanmadığı sürece asıl tehlike buydu: diğer PC
  // otomasyonu göremediği için AYNI gönderiye ikinci bir otomasyon kurup açabiliyordu →
  // aynı yoruma iki DM. konu_id (Meta gönderi kimliği) tüm PC'lerde AYNI → doğal anahtar
  // olarak iki kaydın birleşmesini garanti eder, yani mükerrer otomasyon üretilemez.
  // Çift gönderimi asıl engelleyen: yürütmenin tek PC'de olması (bkz. meta/yurutucu.js).
  sosyal_otomasyonlar: { kolonlar: ['konu_id', 'platform', 'aktif', 'acik_yanit_metni', 'baslangic_tarihi'],
                         fk: {}, dogal: ['konu_id'], sonradanEklendi: true },
  sosyal_otomasyon_sablonlar: { kolonlar: ['sira'],
                                fk: { otomasyon_id: 'sosyal_otomasyonlar', sablon_id: 'sosyal_sablonlar' },
                                zorunluFk: ['otomasyon_id', 'sablon_id'],
                                dogalCift: ['otomasyon_id', 'sablon_id'], sonradanEklendi: true },

  // --- Faz 2: işlemsel veri (append-mostly). lokasyon_id her PC'de aynı seed → düz kolon. ---
  satislar:           { kolonlar: ['fis_no', 'lokasyon_id', 'odeme_tipi', 'durum', 'tip', 'ara_toplam', 'iskonto_toplam', 'kdv_toplam', 'genel_toplam', 'notlar', 'tarih', 'on_siparis', 'on_siparis_durum', 'on_siparis_not'], fk: { musteri_id: 'musteriler', iade_kaynak_id: 'satislar' }, cakismaKolon: 'fis_no', dogal: [] },
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

  // Talep aşaması: ikas'a yazılamayan "onaylandı/kapatıldı" bilgisi. Çok-PC ŞART —
  // bir mağazada kapatılan talep diğerinde kırmızı durursa aynı iade iki kez işlenir.
  // ikas_siparis_id tüm PC'lerde AYNI → doğal anahtar, dedup garantili.
  talep_durumlari: { kolonlar: ['ikas_siparis_id', 'asama', 'not_metni', 'kullanici', 'tarih'],
                     fk: {}, dogal: ['ikas_siparis_id'], sonradanEklendi: true },

  // İstek listeleri: şube+tedarikçi bazlı tedarik istek listesi. urun_adi anlık kopya.
  // lokasyon_id düz kolon (her PC aynı seed, satislar emsali).
  istek_listeleri: { kolonlar: ['lokasyon_id', 'baslik', 'tarih', 'olusturma_tarihi'],
                     fk: { tedarikci_id: 'tedarikciler' }, dogal: [], sonradanEklendi: true },
  // dogalCift ŞART: bir listede bir ürün tek satırdır. Doğal anahtar olmadığı sürece pull
  // yalnız senk_id'ye bakıyordu; karşı PC listeyi her kaydettiğinde kalemler silinip yeni
  // senk_id'lerle yeniden yazıldığı ve SİLME senkronda yayılmadığı için eski satırlar
  // yerelde kalıp yenileri de ekleniyordu. 27.07 Sofram listesi böyle 40 kalemden 182
  // satıra çıktı (2030 adetlik hayalî sipariş). Çift sayesinde ikinci kopya INSERT
  // edilmez, mevcut satır güncellenir. urun_id null (serbest metin) kalemlerde eşleşme
  // olmaz — SQL'de NULL = NULL yanlıştır — ama onların da kalıcı kimliği yoktur.
  istek_listesi_kalemleri: { kolonlar: ['urun_adi', 'miktar'],
                             fk: { istek_id: 'istek_listeleri', urun_id: 'urunler' },
                             zorunluFk: ['istek_id'], dogalCift: ['istek_id', 'urun_id'],
                             sonradanEklendi: true },
}

// Tablolar bağımlılık (FK) sırasında uygulanmalı: referanslar önce.
// Otomasyon senkronu (v1.2.114): durum ORTAK, yürütme TEK PC'de.
// Önce "senkronlamayalım, çift DM olur" diye düşünülmüştü; yanlıştı — senkronlamamak asıl
// tehlikeydi (diğer PC kapalı sanıp ikinci otomasyon kurar). Çift gönderimi engelleyen şey
// senkronun yokluğu değil, yürütücü kilidi (meta/yurutucu.js).
const SIRA = [
  'markalar', 'tedarikciler', 'kategoriler', 'musteriler', 'urunler', 'urun_stoklar', 'urun_barkodlar',
  'setler', 'set_urunler', 'sosyal_sablonlar',
  'sosyal_otomasyonlar', 'sosyal_otomasyon_sablonlar',
  'satislar', 'satis_kalemleri', 'satis_odemeler',
  'kasa_oturumlar', 'giderler', 'sabit_giderler', 'mal_kabuller', 'mal_kabul_kalemleri',
  'kargolar',
  'talep_durumlari',
  // istek_listesi_kalemleri istek_listeleri'ne FK ile bağlı → sırası SONRA olmalı.
  'istek_listeleri', 'istek_listesi_kalemleri',
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
    //
    // AMA senkrona SONRADAN eklenen tablolarda bu ters teper: push imleci (senk-veri.js:
    // "WHERE senk_guncelleme > ?") çoktan bugüne ilerlemiştir, 2000-01-01 damgalı satırlar
    // imlecin GERİSİNDE kalır ve HİÇ GÖNDERİLMEZ — sessizce. Bu tablolar için damga "şimdi"
    // olmalı ki mevcut kayıtlar bir kez yukarı çıksın. (Yalnız boş damgalıları etkiler →
    // kendiliğinden tek seferlik.)
    const damga = TABLOLAR[tablo].sonradanEklendi ? NOWMS : `'2000-01-01T00:00:00.000Z'`
    db.exec(`UPDATE ${tablo} SET senk_id = lower(hex(randomblob(16))) WHERE senk_id IS NULL OR senk_id = ''`)
    db.exec(`UPDATE ${tablo} SET senk_guncelleme = ${damga} WHERE senk_guncelleme IS NULL OR senk_guncelleme = ''`)
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

  // Bir kerelik: istek listesi kalemlerindeki birikmiş kopyaları temizle.
  // (liste, ürün) başına EN ESKİ satır tutulur — 27.07 Sofram listesinde bu kural
  // tedarikçiye giden asıl PDF ile birebir doğrulandı (40 kalem / 430 adet; kopyalarla
  // 182 satır / 2030 adet görünüyordu). Kalan satırlar taze damgalanır ki doğru sürüm
  // buluta çıkıp diğer PC'lerdeki bayat kopyaları yensin — yoksa en son yazılan (yanlış)
  // kopya son-yazan-kazanır ile geri gelirdi.
  try {
    if (!db.prepare("SELECT deger FROM senk_durum WHERE anahtar = 'istek_kalem_kopya_temizlik'").get()) {
      // urun_id IS NULL satırları DIŞARIDA: SQLite GROUP BY tüm NULL'ları TEK grup sayar,
      // filtre olmasa bir listedeki serbest metin kalemlerinin hepsi birden silinirdi.
      const { changes } = db.prepare(`DELETE FROM istek_listesi_kalemleri
        WHERE urun_id IS NOT NULL AND id NOT IN (
          SELECT MIN(id) FROM istek_listesi_kalemleri WHERE urun_id IS NOT NULL
          GROUP BY istek_id, urun_id)`).run()
      if (changes) {
        db.exec(`UPDATE istek_listesi_kalemleri SET senk_guncelleme = ${NOWMS}`)
        console.log(`istek listesi kopya temizliği: ${changes} satır silindi`)
      }
      db.prepare("INSERT INTO senk_durum (anahtar, deger) VALUES ('istek_kalem_kopya_temizlik', '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'").run()
    }
  } catch (e) { console.error('istek kalem kopya temizlik:', e.message) }

  // Bir kerelik: 2026-07 öncesi yüklenmiş ÖKSÜZ urun_stoklar satırlarını kuyruktan düşür.
  //
  // Doğrulama (2026-08-10, yerel DB + Supabase birlikte sorgulandı): buluttaki 19098
  // urun_stoklar satırının 4590'ının ebeveyn ürünü BULUTTA DA YOK (2295 farklı senk_id).
  // Ebeveyn hiçbir PC'ye gelemez → satırlar her senkron turunda yeniden denenip yeniden
  // kuyruğa yazılıyor, sonsuza kadar. Zarar veri kaybı değil, GÖRÜNÜRLÜK: 4590 ölü satırın
  // içinde gerçekten takılmış bir kayıt fark edilmez.
  //
  // Aşağıdaki üç koşul birlikte daraltır — yalnız bu vakayı siler, başkasına dokunmaz:
  //   1. yalnız urun_stoklar (öksüzlüğü ölçülen tek tablo)
  //   2. ebeveyn ürün YERELDE de yok (varsa satır zaten uygulanır, kuyrukta durmaz)
  //   3. guncelleme < 2026-07-08 (ölçülen en yeni öksüz damga 2026-07-07T10:13)
  // Üçüncü koşul olmasa, yeni kuyruklanmış meşru satırlar da silinebilirdi.
  // Kalıcı koruma senk-veri.js'teki 30 günlük ilk_deneme temizliğidir; bu yalnız
  // ilk_deneme'si her turda sıfırlanmış olan MEVCUT birikimi kapatır.
  try {
    if (!db.prepare("SELECT deger FROM senk_durum WHERE anahtar = 'oksuz_stok_kuyruk_temizlik'").get()) {
      const { changes } = db.prepare(`DELETE FROM senk_bekleyen
        WHERE tablo = 'urun_stoklar'
          AND guncelleme < '2026-07-08'
          AND json_extract(veri, '$._fk.urun_id') NOT IN (SELECT senk_id FROM urunler WHERE senk_id IS NOT NULL)`).run()
      if (changes) console.log(`öksüz stok kuyruk temizliği: ${changes} satır düşürüldü`)
      db.prepare("INSERT INTO senk_durum (anahtar, deger) VALUES ('oksuz_stok_kuyruk_temizlik', '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'").run()
    }
  } catch (e) { console.error('öksüz stok kuyruk temizlik:', e.message) }
}

module.exports = { kur, TABLOLAR, SIRA }
