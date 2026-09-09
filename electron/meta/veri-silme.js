// Meta veri silme talepleri — Worker kuyruğunu tüketip yerel kişisel veriyi siler.
//
// NEDEN VAR: Meta, bir kullanıcı verisinin silinmesini istediğinde uygulamadan bunu
// yapmasını bekler (Platform Terms 3(d)(i)). Geri çağırma ucu tanımlı değilken bu
// talep App Dashboard'a **Urgent uyarı** olarak düşüyordu ve listeyi elle indirip
// veritabanında aramak gerekiyordu (09.09.2026'da iki kez: 25.08 ve 07.09).
// Bu modül o elle işi bitirir.
//
// İŞ BÖLÜMÜ (kargo/ikas ile aynı — docs/cloudflare-plani.md §3 "altın kural"):
//   Worker  : Meta'nın imzasını doğrular, talebi kuyruğa yazar, durum sayfasını sunar.
//   Uygulama: siler. Kişisel veri (sosyal_mesajlar) YALNIZ mağaza PC'sinin yerel
//             SQLite'ındadır; bulutta kopyası yoktur, Worker silemez.
//
// ⚠ ÇOK-PC KURALI: sosyal_mesajlar PC'ler arası SENKRONLANMAZ (db/senk-sema.js SIRA) —
// her PC Meta'dan kendi çekimini yapar, yani aynı kişinin verisi HER PC'de ayrı durur.
// Bu yüzden kuyruk "işlendi/işlenmedi" bayrağıyla değil, PC'ye ÖZEL İMLEÇLE okunur
// (kargo_bulut_imlec deseninin aynısı). Bayrak kullansaydık ilk işleyen PC satırı
// kapatır, ikinci PC talebi hiç görmez ve o PC'de veri KALIRDI.
//
// NOT: Electron 22 = Node 16 → global fetch YOK; ağ işi ups/bulut.js'teki https
// yardımcısı üzerinden yapılır (aynı Worker, aynı bearer, ikinci bir yapılandırma yok).
const database = require('../db/database')
const yerelAyar = require('../db/yerel-ayarlar')
const bulut = require('../ups/bulut')

// Test dikişi — db/sosyal-mesajlar.js'teki desenin aynısı. better-sqlite3 Electron
// ABI'sine derli olduğu için vitest'te açılamıyor; testler node:sqlite ile bellek içi
// bir DB enjekte eder. vi.mock CommonJS require'ını yakalamadığından açık setter şart.
let _testDb = null
function getDb() { return _testDb || database.getDb() }
function _dbAyarla(db) { _testDb = db } // YALNIZ TEST

// PC'ye özel okuma imleci. yerel_ayarlar senkronlanmaz — kasıtlı (yukarıdaki nota bak).
const IMLEC_ANAHTARI = 'meta_veri_silme_imlec'

// Meta app-scoped kullanıcı kimliği: yalnız rakam. Kuyruktan gelen değere GÜVENİLMEZ;
// biçimi tutmayan kayıt silme sorgusuna hiç girmez (yanlış WHERE = veri kaybı).
const KIMLIK_DESENI = /^[0-9]{5,32}$/

/**
 * Tek bir kimliğe ait yerel kişisel veriyi siler.
 *
 * HANGİ SÜTUNLAR ve NEDEN:
 *   sosyal_mesajlar.gonderen_id      → kişinin yazdığı yorum/DM (asıl hedef)
 *   sosyal_mesajlar.konu_id          → DM konuşmasının anahtarı kişinin kimliğidir
 *   sosyal_mesajlar.ozel_mesaj_alici → yoruma özel mesaj gönderdiğimiz kişi
 *   kupon_dagitim.alici_id           → kişiye verilmiş kupon kaydı
 *
 * ust_id ve sosyal_otomasyonlar.konu_id BİLEREK DIŞARIDA: ikisi de GÖNDERİ/yorum
 * kimliği tutar, kişi kimliği değil. Sırf "sayısal alan" diye WHERE'e eklemek
 * ilgisiz kayıt silme riskidir.
 *
 * @param {string} kimlik app-scoped kullanıcı kimliği
 * @returns {number} silinen toplam satır
 */
function yerelSil(kimlik) {
  if (!KIMLIK_DESENI.test(String(kimlik || ''))) return 0
  const db = getDb()
  const k = String(kimlik)

  // Tek işlem: yarım silme (mesaj gitti, kupon kaldı) Meta'ya "sildim" demeyi
  // yalan yapar. Hepsi ya olur ya olmaz.
  //
  // db.transaction() DEĞİL, açık BEGIN/COMMIT: transaction() better-sqlite3'e özel;
  // testlerdeki node:sqlite'ta yok. Açık işlem ikisinde de çalışır — üretim kodunu
  // test edilebilir tutmanın bedeli üç satır.
  db.exec('BEGIN')
  try {
    let n = 0
    n += db.prepare(
      'DELETE FROM sosyal_mesajlar WHERE gonderen_id = ? OR konu_id = ? OR ozel_mesaj_alici = ?'
    ).run(k, k, k).changes
    n += db.prepare('DELETE FROM kupon_dagitim WHERE alici_id = ?').run(k).changes
    db.exec('COMMIT')
    return n
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/**
 * Bir tur: kuyruğu imleçten itibaren çek → her kimliği yerelde sil → Worker'a bildir
 * → imleci ilerlet.
 *
 * İMLEÇ SIRASI KRİTİK: imleç ancak bildirim başarıyla gittikten SONRA ilerler.
 * Önce ilerletseydik, bildirim düştüğünde talep bir daha okunmaz ve o PC'de veri
 * kalıcı olarak kalırdı. Tersi (bildirim gitti, imleç ilerlemedi) zararsızdır —
 * bir sonraki tur aynı kimliği tekrar siler, DELETE idempotenttir.
 *
 * @returns {Promise<{talep:number, silinen:number, atlandi:boolean}>}
 */
async function tur() {
  const { acik } = bulut._ayar()
  if (!acik) return { talep: 0, silinen: 0, atlandi: true }

  const imlec = yerelAyar._getir(IMLEC_ANAHTARI) || ''
  const { talepler, imlec: yeniImlec } = await bekleyenleriCek(imlec)
  if (!talepler.length) return { talep: 0, silinen: 0, atlandi: false }

  const sonuclar = []
  let toplam = 0
  for (const t of talepler) {
    // Tek kimlikte patlama TÜM turu düşürmesin: kalanlar işlensin, düşen kimlik
    // imleç ilerlemediği için bir sonraki turda tekrar denenir.
    let silinen = 0
    try {
      silinen = yerelSil(t.kimlik)
    } catch (err) {
      console.error('[meta-veri-silme] yerel silme hatası:', t.onay_kodu, err.message)
      continue
    }
    toplam += silinen
    sonuclar.push({ onay_kodu: t.onay_kodu, silinen })
  }

  // Hiçbiri işlenemediyse imleci İLERLETME — yoksa talepler sessizce kaybolur.
  if (!sonuclar.length) return { talep: talepler.length, silinen: 0, atlandi: false }

  await tamamBildir(sonuclar)
  yerelAyar._yaz(IMLEC_ANAHTARI, yeniImlec)
  return { talep: talepler.length, silinen: toplam, atlandi: false }
}

/** Worker kuyruğundan imleçten sonraki talepleri çeker. */
async function bekleyenleriCek(since) {
  const { url, anahtar } = bulut._ayar()
  const q = encodeURIComponent(since || '1970-01-01T00:00:00.000Z')
  const { status, json } = await bulut._istek('GET', `${url}/meta/veri-silme/bekleyenler?since=${q}`, anahtar)
  if (status !== 200) {
    throw new Error(`Veri silme kuyruğu okunamadı (HTTP ${status})${json?.hata ? ': ' + json.hata : ''}`)
  }
  return { talepler: json?.talepler || [], imlec: json?.imlec || since || '' }
}

/** "Bunları yerelde işledim" — durum sayfası bunu okur. */
async function tamamBildir(sonuclar) {
  const { url, anahtar } = bulut._ayar()
  const { status, json } = await bulut._istek('POST', `${url}/meta/veri-silme/tamam`, anahtar, { sonuclar })
  if (status !== 200) {
    throw new Error(`Veri silme bildirimi düştü (HTTP ${status})${json?.hata ? ': ' + json.hata : ''}`)
  }
  return Number(json?.guncellenen) || 0
}

module.exports = {
  // '_' önekliler IPC kanalı sayılmaz (main.js) — zamanlayıcı bunları doğrudan çağırır.
  _tur: tur,
  _yerelSil: yerelSil,
  _dbAyarla, // YALNIZ TEST — bkz. yukarıdaki test dikişi notu
  _IMLEC_ANAHTARI: IMLEC_ANAHTARI,
}
