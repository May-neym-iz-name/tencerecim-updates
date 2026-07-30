-- D1 şeması — tencerecim-kargo
--
-- İki tablo, iki yön:
--   izlenen  : uygulama → Worker  ("şu takip numaralarını benim için yokla")
--   durumlar : Worker → uygulama  ("UPS bunlar için şunu söyledi")
--
-- Bu veritabanı OTORİTE DEĞİLDİR. Gerçek kargo/sipariş kaydı her PC'nin yerel
-- SQLite'ındadır; buradaki her satır oradan türetilmiş, kaybolursa uygulama
-- açıldığında yeniden üretilebilir bir kopyadır. Bu yüzden yedeklenmesine gerek yok.

CREATE TABLE IF NOT EXISTS izlenen (
  takip_no     TEXT PRIMARY KEY,
  -- son_gorulme: uygulama listeyi her ittiğinde tazelenir. Çok-PC güvenli "canlılık"
  -- ölçüsü: bir PC'nin listesinde olmayan numara, DİĞER PC hâlâ itiyorsa düşmez.
  -- Silme kararı bu yüzden "listede yok" ile değil, TTL ile verilir (bkz. temizle()).
  son_gorulme  TEXT NOT NULL,
  eklenme      TEXT NOT NULL,
  -- Bu numaraya en son ne zaman UPS'e sorduk. Yoklama sırasını belirler.
  -- durumlar'da değil burada: hiç sorulmamış ya da ağa hiç girmemiş (kod 13)
  -- numaraların durumlar'da satırı olmaz, ama sıraya girmeleri gerekir.
  son_sorgu    TEXT,
  -- aktif=0 → terminal durum (teslim edildi). Bir daha UPS'e sorulmaz.
  aktif        INTEGER NOT NULL DEFAULT 1
);

-- Yoklama sırası: hiç sorulmamışlar önce (son_sorgu NULL), sonra en eski sorulan.
CREATE INDEX IF NOT EXISTS izlenen_sira ON izlenen (aktif, son_sorgu);

CREATE TABLE IF NOT EXISTS durumlar (
  takip_no       TEXT PRIMARY KEY,
  -- UPS StatusCode. Yorumlama UYGULAMADA yapılır (electron/ups/takip.js durumCevir).
  -- Worker yalnız tek bir yorum yapar: kod 2 = teslim = terminal, artık sorma.
  -- docs/ups-api-reference.md §1 — metne ASLA bakılmaz, tek doğru kaynak StatusCode.
  durum_kodu     INTEGER,
  aciklama       TEXT,
  aciklama2      TEXT,
  sube           TEXT,
  ups_zaman      TEXT,
  sorgu_zaman    TEXT NOT NULL,
  -- degisim_zaman YALNIZ durum_kodu değiştiğinde güncellenir. Uygulama bunu imleç
  -- olarak kullanır: "son okumamdan beri değişenleri ver". Değişmeyen satır tekrar
  -- gönderilmez — 90 kargoluk liste her açılışta baştan işlenmez.
  degisim_zaman  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS durumlar_degisim ON durumlar (degisim_zaman);

-- ikas webhook olay kuyruğu.
--
-- Bu tablo OTORİTE DEĞİLDİR: yalnız "şu sipariş değişti" tetikleyicisi tutar.
-- Siparişin kendisi ikas'tan uygulama tarafından çekilir (webhook imzası
-- belgelenmemiş — docs/ikas-api-reference.md:154). Kaybolursa 5 dk'lık
-- mutabakat turu aynı işi yapar.
CREATE TABLE IF NOT EXISTS ikas_olaylar (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  siparis_id   TEXT NOT NULL,
  konu         TEXT NOT NULL,
  alinma_zaman TEXT NOT NULL
);

-- Uygulama imleci bu sütun üzerinden okur.
CREATE INDEX IF NOT EXISTS ikas_olaylar_zaman ON ikas_olaylar (alinma_zaman);
