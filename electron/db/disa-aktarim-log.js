// KVKK DIŞA AKTARIM DENETİM KAYDI
//
// Müşteri verisi programdan dosya olarak çıkabiliyor (yedek, PDF). KVKK'nın
// "kim, ne zaman, hangi veriyi dışarı çıkardı" sorusuna bugüne kadar verilecek
// hiçbir cevap yoktu.
//
// Tasarım kararları:
//   - Kayıt YEREL. senk-sema'ya BİLEREK eklenmedi: log'un kendisi kişisel veri
//     içerir ve her dışa aktarım senkron kuyruğunu şişirir.
//   - Silme arayüzü YOK. Silinebilen bir denetim kaydı denetim kaydı değildir;
//     bu modül bilerek hiçbir sil/temizle fonksiyonu dışa vermez.
//   - Log yazımı ASLA çağıran işlemi çökertmez. Denetim kaydı tutulamadı diye
//     kullanıcının yedeği iptal olmamalı.

const TURLER = {
  YEDEK: 'yedek',
  PDF: 'pdf',
  EXCEL: 'excel',
}

const GECERLI_TURLER = new Set(Object.values(TURLER))

function tabloKur(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS disa_aktarim_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarih TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      kullanici_email TEXT NOT NULL DEFAULT '(bilinmiyor)',
      uid TEXT,
      tur TEXT NOT NULL,
      kapsam TEXT,
      kayit_sayisi INTEGER,
      dosya_adi TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_disa_aktarim_tarih ON disa_aktarim_log(tarih DESC);
  `)
}

/**
 * Bir dışa aktarımı kaydeder. Hata fırlatmaz (geçersiz tür hariç — o bir
 * programlama hatasıdır ve log'u kirletir).
 */
function yaz(db, { tur, kullanici_email, uid, kapsam, kayit_sayisi, dosya_adi } = {}) {
  if (!GECERLI_TURLER.has(tur)) {
    throw new Error(`Bilinmeyen disa aktarim turu: ${tur}`)
  }
  try {
    db.prepare(`
      INSERT INTO disa_aktarim_log (kullanici_email, uid, tur, kapsam, kayit_sayisi, dosya_adi)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      kullanici_email || '(bilinmiyor)',
      uid || null,
      tur,
      kapsam || null,
      kayit_sayisi == null ? null : Number(kayit_sayisi),
      dosya_adi || null,
    )
  } catch (e) {
    // Denetim kaydı yazılamadı diye asıl iş iptal olmamalı.
    console.error('[denetim] disa aktarim kaydi yazilamadi:', e.message)
  }
}

function listele(db, limit = 500) {
  return db
    .prepare('SELECT * FROM disa_aktarim_log ORDER BY id DESC LIMIT ?')
    .all(Number(limit) || 500)
}

module.exports = { tabloKur, yaz, listele, TURLER }
