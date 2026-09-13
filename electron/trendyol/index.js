// Kanal stok senkronu — IPC yüzü ve iş akışı.
// Tasarım: docs/superpowers/specs/2026-09-13-kanal-stok-senkronu-design.md
//
// Akış: tazele → karşılaştır → hazırla (ANLIK GÖRÜNTÜ burada alınır) → doğrula → uygula
//       → sonuç → (gerekirse) geri al
const { getDb } = require('../db/database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/trendyol-ayarlar')
const kanalStok = require('../db/kanal-stok')
const mantik = require('../db/stok-senk-mantik')
const client = require('./client')
const tyStok = require('./stok')
const { ikasStokOku } = require('../ikas/kanal-stok')

const KAYNAK = 'ikas'
const HEDEF = 'trendyol'

function ayar(k) { return _ayarlariGetir()[k] }

// Acil anahtar. ikas'taki stok_push_kapali ile aynı desen: tek satırla her gönderimi durdurur.
function senkKapaliMi() { return ayar('senk_kapali') === '1' }

// İlk yayında yazma KAPALI gelir — kullanıcı gerçek veriyle bir tur baksın, sonra açsın.
function yazmaAcikMi() { return ayar('yazma_acik') === '1' }

function kilitKontrol() {
  if (senkKapaliMi()) throw new Error('Kanal senkronu acil olarak kapatılmış (Ayarlar > Trendyol).')
  if (!yazmaAcikMi()) throw new Error('Trendyol\'a yazma henüz açılmadı. Ayarlar > Trendyol bölümünden "Trendyol\'a yazmayı aç" seçeneğini işaretleyin.')
  if (!client.kimlikVar()) throw new Error('Trendyol kimlik bilgileri eksik.')
}

// --- tazeleme ve karşılaştırma --------------------------------------------

// İki kanalı da okuyup kanal_stok'u yeniler. Biri patlarsa diğeri yazılmış kalır ve
// hata döner: yarım fotoğrafla karşılaştırma yapılmasın diye durum ayrıca raporlanır.
async function tazele() {
  const sonuc = { ikas: 0, trendyol: 0, hatalar: [] }
  try {
    const satirlar = await ikasStokOku()
    kanalStok.kanaliYaz('ikas', satirlar)
    sonuc.ikas = satirlar.length
  } catch (e) { sonuc.hatalar.push('ikas: ' + e.message) }
  try {
    const satirlar = await tyStok.stokOku()
    kanalStok.kanaliYaz('trendyol', satirlar)
    sonuc.trendyol = satirlar.length
  } catch (e) { sonuc.hatalar.push('trendyol: ' + e.message) }
  return sonuc
}

function durum() {
  const a = _ayarlariGetir()
  return {
    kimlikVar: client.kimlikVar(),
    senkKapali: senkKapaliMi(),
    yazmaAcik: yazmaAcikMi(),
    sonOkuma: { ikas: kanalStok.sonOkuma('ikas'), trendyol: kanalStok.sonOkuma('trendyol') },
    sellerId: a.seller_id || null,
  }
}

// --- işlem: hazırla -------------------------------------------------------

// ANLIK GÖRÜNTÜ BURADA ALINIR. Trendyol TAZE okunur (kanal_stok'taki fotoğraf eski
// olabilir) ve eski_miktar o okumadan yazılır. Yedek yoksa kalem yok, kalem yoksa
// gönderim yok — "yedeğimiz var mıydı?" sorusu hiç sorulmaz.
async function hazirla({ kullanici } = {}) {
  yetkiKontrol('stok_duzenle')
  kilitKontrol()
  const kaynak = kanalStok.kanalOku(KAYNAK)
  if (!kaynak.length) throw new Error('Önce "Tazele" ile ikas stoğunu okuyun.')
  const hedef = await tyStok.stokOku()          // TAZE — anlık görüntünün kaynağı
  kanalStok.kanaliYaz(HEDEF, hedef)             // ekran da tazelensin

  const plan = mantik.planUret({ kaynak, hedef })
  if (!plan.gonderilecek.length) {
    return { islem_id: null, ...plan, mesaj: 'Gönderilecek fark yok — iki kanal aynı.' }
  }

  const db = getDb()
  const islemId = db.transaction(() => {
    const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan)
      VALUES (?, ?, 'hazir', ?)`).run(KAYNAK, HEDEF, kullanici || null)
    const ekle = db.prepare(`INSERT INTO stok_senk_kalem (islem_id, barkod, ad, eski_miktar, yeni_miktar)
      VALUES (?, ?, ?, ?, ?)`)
    for (const k of plan.gonderilecek) ekle.run(r.lastInsertRowid, k.barkod, k.ad, k.eski_miktar, k.yeni_miktar)
    return r.lastInsertRowid
  })()

  return { islem_id: islemId, ...plan }
}

// --- işlem: uygula --------------------------------------------------------

async function uygula({ islem_id }) {
  yetkiKontrol('stok_duzenle')
  kilitKontrol()
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem) throw new Error('İşlem bulunamadı.')
  // Durum makinesi ikinci kez gönderimi engeller (bkz. stok-senk-mantik.durumGecisi).
  mantik.durumGecisi(islem.durum, 'uygulandi')

  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ?').all(islem_id)
  if (!kalemler.length) throw new Error('İşlemde kalem yok.')

  let batchIdler = []
  try {
    batchIdler = await tyStok.stokYaz(kalemler)
  } catch (e) {
    db.prepare("UPDATE stok_senk_islem SET durum = 'hata', aciklama = ? WHERE id = ?").run(e.message, islem_id)
    throw e
  }

  db.prepare(`UPDATE stok_senk_islem SET durum = 'uygulandi',
    uygulama_tarihi = datetime('now','localtime'), ty_batch_id = ? WHERE id = ?`)
    .run(batchIdler.join(','), islem_id)

  return { islem_id, batchIdler, gonderilen: kalemler.length }
}

// Parti sonucunu sorar ve kalem sonuçlarını işler. Trendyol asenkron çalışır; arayüz
// bu ucu tekrar çağırarak sonucu tazeler (otomatik yoklama yok — kullanıcı görsün).
async function sonucTazele({ islem_id }) {
  yetkiKontrol('stok_duzenle')
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem || !islem.ty_batch_id) throw new Error('Bu işlem henüz gönderilmemiş.')

  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ?').all(islem_id)
  const basarisizlar = []
  let hepsiTamam = true
  for (const batchId of islem.ty_batch_id.split(',').filter(Boolean)) {
    const s = await tyStok.partiSonucu(batchId)
    if (!s.tamam) hepsiTamam = false
    basarisizlar.push(...s.basarisizlar)
  }

  const islenmis = mantik.partiSonucuIsle(kalemler, basarisizlar)
  const guncelle = db.prepare('UPDATE stok_senk_kalem SET sonuc = ?, hata = ? WHERE islem_id = ? AND barkod = ?')
  db.transaction(() => {
    for (const k of islenmis) guncelle.run(k.sonuc, k.hata, islem_id, k.barkod)
    if (hepsiTamam && basarisizlar.length) {
      db.prepare("UPDATE stok_senk_islem SET durum = 'kismi' WHERE id = ? AND durum = 'uygulandi'").run(islem_id)
    }
  })()

  return { tamam: hepsiTamam, basarisiz: basarisizlar.length, kalemler: islenmis }
}

// --- işlem: geri al -------------------------------------------------------

// Anlık görüntüden ters işlem üretir. Yalnız GERÇEKTEN gitmiş kalemler geri alınır.
// Trendyol'un 15 dakika tekrar koruması yüzünden hemen çalışmayabilir — arayüz bunu
// sayaçla gösterir, hata olarak değil.
async function geriAl({ islem_id, kullanici }) {
  yetkiKontrol('stok_duzenle')
  kilitKontrol()
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem) throw new Error('İşlem bulunamadı.')
  mantik.durumGecisi(islem.durum, 'geri_alindi')

  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ?').all(islem_id)
  const ters = mantik.tersPlan(kalemler)
  if (!ters.length) throw new Error('Geri alınacak kalem yok (hiçbiri gönderilmemiş ya da değişmemiş).')

  const yeniId = db.transaction(() => {
    const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan, geri_alindigi_islem_id, aciklama)
      VALUES (?, ?, 'hazir', ?, ?, ?)`)
      .run(KAYNAK, HEDEF, kullanici || null, islem_id, `#${islem_id} işleminin geri alınması`)
    const ekle = db.prepare('INSERT INTO stok_senk_kalem (islem_id, barkod, ad, eski_miktar, yeni_miktar) VALUES (?, ?, ?, ?, ?)')
    for (const k of ters) ekle.run(r.lastInsertRowid, k.barkod, k.ad, k.eski_miktar, k.yeni_miktar)
    return r.lastInsertRowid
  })()

  const sonuc = await uygula({ islem_id: yeniId })
  db.prepare("UPDATE stok_senk_islem SET durum = 'geri_alindi' WHERE id = ?").run(islem_id)
  return { ...sonuc, geri_alinan: islem_id }
}

// --- okuma uçları ---------------------------------------------------------

function islemler({ limit = 30 } = {}) {
  return getDb().prepare(`
    SELECT i.*, (SELECT COUNT(*) FROM stok_senk_kalem k WHERE k.islem_id = i.id) AS kalem_sayisi,
           (SELECT COUNT(*) FROM stok_senk_kalem k WHERE k.islem_id = i.id AND k.sonuc = 'hata') AS hatali
    FROM stok_senk_islem i ORDER BY i.id DESC LIMIT ?`).all(Math.min(200, Number(limit) || 30))
}

function islemDetay({ islem_id }) {
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem) throw new Error('İşlem bulunamadı.')
  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ? ORDER BY ad').all(islem_id)
  const uygulamaMs = islem.uygulama_tarihi ? Date.parse(islem.uygulama_tarihi.replace(' ', 'T')) : null
  return {
    islem, kalemler,
    tekrarKorumasiBitisi: mantik.tekrarKorumasiBitisi(uygulamaMs),
    ozet: mantik.ozetle(kalemler),
  }
}

module.exports = {
  _tazele: tazele,

  'kanal:durum': () => { yetkiKontrol('stok_duzenle'); return durum() },
  'kanal:tazele': () => { yetkiKontrol('stok_duzenle'); return tazele() },
  'kanal:karsilastir': () => { yetkiKontrol('stok_duzenle'); return kanalStok.karsilastir() },
  'kanal:hazirla': (p) => hazirla(p || {}),
  'kanal:uygula': (p) => uygula(p || {}),
  'kanal:sonuc-tazele': (p) => sonucTazele(p || {}),
  'kanal:geri-al': (p) => geriAl(p || {}),
  'kanal:islemler': (p) => { yetkiKontrol('stok_duzenle'); return islemler(p || {}) },
  'kanal:islem-detay': (p) => { yetkiKontrol('stok_duzenle'); return islemDetay(p || {}) },
  'kanal:yazma-ac': ({ acik }) => {
    yetkiKontrol('ayarlar_duzenle')
    _ayarKaydetTek('yazma_acik', acik ? '1' : '0')
    return durum()
  },
  'kanal:acil-kapat': ({ kapali }) => {
    yetkiKontrol('ayarlar_duzenle')
    _ayarKaydetTek('senk_kapali', kapali ? '1' : '0')
    return durum()
  },
}
