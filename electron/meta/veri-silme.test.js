// Meta veri silme — yerel silme mantığı (09.09.2026).
//
// Bu testlerin sabitlediği üç şey, üçü de gerçek veri kaybı/uyumsuzluk riski:
//   1. Silme DOĞRU sütunlardan yapılır (gonderen_id / konu_id / ozel_mesaj_alici / alici_id)
//      ve ust_id'ye DOKUNMAZ — ust_id gönderi/yorum kimliği tutar, kişi kimliği değil.
//      Sırf "sayısal alan" diye WHERE'e eklenirse ilgisiz kayıt silinir.
//   2. Başkasının kaydı ASLA silinmez (WHERE gerçekten daraltıyor mu).
//   3. Biçimsiz kimlik silme sorgusuna HİÇ girmez — boş/null bir kimlikle çalışan
//      bir WHERE tabloyu süpürebilirdi.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

const { default: modul } = await import('./veri-silme.js')
const { _yerelSil, _dbAyarla } = modul

const SEMA = `
  CREATE TABLE sosyal_mesajlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT, tur TEXT, harici_id TEXT UNIQUE,
    konu_id TEXT, ust_id TEXT, gonderen_id TEXT, gonderen_ad TEXT,
    metin TEXT, ozel_mesaj_alici TEXT
  );
  CREATE TABLE kupon_dagitim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kupon_kodu TEXT, konu_id TEXT, alici_id TEXT
  );
`

// Silme talebi gelen kişi
const HEDEF = '17841472205031209'
// Dokunulmaması gereken başka bir kişi
const BASKASI = '17841999888777666'

let db

beforeEach(() => {
  db = new DatabaseSync(':memory:')
  db.exec(SEMA)
  _dbAyarla(db)
})

function mesajEkle(alanlar) {
  const t = { platform: 'ig', tur: 'yorum', ...alanlar }
  db.prepare(`INSERT INTO sosyal_mesajlar
    (platform, tur, harici_id, konu_id, ust_id, gonderen_id, gonderen_ad, metin, ozel_mesaj_alici)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    t.platform, t.tur, t.harici_id ?? null, t.konu_id ?? null, t.ust_id ?? null,
    t.gonderen_id ?? null, t.gonderen_ad ?? null, t.metin ?? null, t.ozel_mesaj_alici ?? null)
}

const sayi = (sql) => db.prepare(sql).get().n

describe('yerelSil', () => {
  test('kişinin yorumunu, DM konuşmasını, özel mesajını ve kuponunu siler', () => {
    mesajEkle({ harici_id: 'y1', gonderen_id: HEDEF, metin: 'fiyat?' })
    mesajEkle({ harici_id: 'd1', tur: 'dm', konu_id: HEDEF, gonderen_id: HEDEF, metin: 'merhaba' })
    mesajEkle({ harici_id: 'o1', tur: 'dm', ozel_mesaj_alici: HEDEF, metin: 'yanıt' })
    db.prepare('INSERT INTO kupon_dagitim (kupon_kodu, alici_id) VALUES (?,?)').run('IND10', HEDEF)

    const n = _yerelSil(HEDEF)

    expect(n).toBe(4)
    expect(sayi('SELECT COUNT(*) n FROM sosyal_mesajlar')).toBe(0)
    expect(sayi('SELECT COUNT(*) n FROM kupon_dagitim')).toBe(0)
  })

  test('BAŞKASININ kaydına dokunmaz', () => {
    mesajEkle({ harici_id: 'y1', gonderen_id: HEDEF })
    mesajEkle({ harici_id: 'y2', gonderen_id: BASKASI })
    db.prepare('INSERT INTO kupon_dagitim (kupon_kodu, alici_id) VALUES (?,?)').run('A', BASKASI)

    const n = _yerelSil(HEDEF)

    expect(n).toBe(1)
    expect(sayi('SELECT COUNT(*) n FROM sosyal_mesajlar')).toBe(1)
    expect(db.prepare('SELECT gonderen_id g FROM sosyal_mesajlar').get().g).toBe(BASKASI)
    expect(sayi('SELECT COUNT(*) n FROM kupon_dagitim')).toBe(1)
  })

  // MUTASYON TESTİ: WHERE'e `OR ust_id = ?` eklenirse bu test KIRMIZI olmalı.
  // ust_id bir YORUM kimliğidir; kişi kimliğiyle aynı sayısal uzayda olduğu için
  // "her sayısal alanı ekleyelim" refleksi burada ilgisiz veri siler.
  test('ust_id yalnızca yanıt zinciri bağıdır — silme ölçütü DEĞİLDİR', () => {
    // Başkasının yorumu, üst kimliği tesadüfen hedefin kimliğiyle aynı değere sahip
    mesajEkle({ harici_id: 'y9', gonderen_id: BASKASI, ust_id: HEDEF, metin: 'başkasının yanıtı' })

    const n = _yerelSil(HEDEF)

    expect(n).toBe(0)
    expect(sayi('SELECT COUNT(*) n FROM sosyal_mesajlar')).toBe(1)
  })

  // MUTASYON TESTİ: KIMLIK_DESENI kapısı kaldırılırsa bu test KIRMIZI olmalı.
  //
  // Gerçek risk ŞU (ilk sürümde test bunu ölçmüyordu, mutasyonda yeşil kaldı):
  // üretim DB'sinde gonderen_id = '' olan ON BİNLERCE satır var (09.09 ölçümü:
  // 134.312 satırın 92.752'si dolu). Kapı yokken yerelSil(null) → String('') →
  // `WHERE gonderen_id = ''` → o satırların HEPSİ gider. Parametreli sorgu injection'ı
  // engeller ama boş dizgeyle eşleşmeyi ENGELLEMEZ; kapı bunun için var.
  test('boş/biçimsiz kimlik, gonderen_id boş olan satırları SÜPÜRMEZ', () => {
    mesajEkle({ harici_id: 'y1', gonderen_id: HEDEF })
    // Meta bazen gönderen bilgisi olmadan satır döndürür — üretimdeki gerçek durum
    mesajEkle({ harici_id: 'bos1', gonderen_id: '', konu_id: '', ozel_mesaj_alici: '' })
    mesajEkle({ harici_id: 'bos2', gonderen_id: '', konu_id: '', ozel_mesaj_alici: '' })
    db.prepare('INSERT INTO kupon_dagitim (kupon_kodu, alici_id) VALUES (?,?)').run('A', '')

    for (const kotu of ['', null, undefined, '   ', 'abc', "1' OR '1'='1", '123']) {
      expect(_yerelSil(kotu)).toBe(0)
    }
    expect(sayi('SELECT COUNT(*) n FROM sosyal_mesajlar')).toBe(3)
    expect(sayi('SELECT COUNT(*) n FROM kupon_dagitim')).toBe(1)
  })

  test('idempotent — ikinci çağrı 0 döner, hata vermez', () => {
    mesajEkle({ harici_id: 'y1', gonderen_id: HEDEF })

    expect(_yerelSil(HEDEF)).toBe(1)
    expect(_yerelSil(HEDEF)).toBe(0)
  })

  // 09.09.2026 ölçümünün kod karşılığı: Meta'nın verdiği 33 kimliğin hiçbiri yerel
  // DB'de yoktu. "0 satır silindi" bir HATA DEĞİLDİR, tamamlanmış bir silmedir —
  // tur() bu sonucu Worker'a 'silindi' olarak bildirir.
  test('kaydı olmayan kimlik için 0 döner (meşru sonuç)', () => {
    mesajEkle({ harici_id: 'y2', gonderen_id: BASKASI })
    expect(_yerelSil(HEDEF)).toBe(0)
    expect(sayi('SELECT COUNT(*) n FROM sosyal_mesajlar')).toBe(1)
  })
})
