// Kanal stok senkronu — IPC yüzü ve iş akışı.
// Tasarım: docs/superpowers/specs/2026-09-13-kanal-stok-senkronu-design.md
//
// Model: bir ANA KANAL (stok gerçeğinin kaynağı) ve ona eşitlenen diğer kanallar.
// Ana kanal AYARDIR, koda gömülü değildir — ilerde mağaza sayımı bitince oraya
// çevrilebilsin diye.
//
// Kullanıcı "tazele" düğmesine BASMAZ: okuma arka planda döner (main.js). Ekran
// kanal_stok'ta ne varsa onu gösterir.
const { getDb } = require('../db/database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/trendyol-ayarlar')
const kanalStok = require('../db/kanal-stok')
const mantik = require('../db/stok-senk-mantik')
const client = require('./client')
const tyStok = require('./stok')
const { ikasStokOku } = require('../ikas/kanal-stok')

// Yazılabilir kanallar. 'magaza' BİLEREK yok: sayım yapılmadığı için sayıları kurgu
// (ölçüm 13.09: 5.624 satır sıfır). Sayım bitince buraya eklenmesi yeterli olacak.
const YAZILABILIR = new Set(['trendyol'])
const OKUNABILIR = ['ikas', 'trendyol', 'magaza']
const VARSAYILAN_ANA = 'ikas'

function ayar(k) { return _ayarlariGetir()[k] }
function anaKanal() {
  const a = ayar('ana_kanal')
  return OKUNABILIR.includes(a) ? a : VARSAYILAN_ANA
}
function senkKapaliMi() { return ayar('senk_kapali') === '1' }
function yazmaAcikMi() { return ayar('yazma_acik') === '1' }

function kilitKontrol(hedef) {
  if (senkKapaliMi()) throw new Error('Kanal senkronu acil olarak kapatılmış (Ayarlar > Trendyol).')
  if (!yazmaAcikMi()) throw new Error('Trendyol\'a yazma kapalı. Ayarlar > Trendyol bölümünden açın.')
  if (!YAZILABILIR.has(hedef)) throw new Error(`"${hedef}" kanalına yazılamaz.`)
  if (anaKanal() === hedef) throw new Error('Ana stok kaynağı ile hedef aynı olamaz.')
  if (!client.kimlikVar()) throw new Error('Trendyol kimlik bilgileri eksik.')
}

// --- okuma (arka planda çağrılır) -----------------------------------------

// Her kanalı ayrı try ile okur: biri patlarsa diğerleri yine tazelenir.
// Mağaza yereldir, ağ gerektirmez — her turda ücretsiz tazelenir.
async function tazele() {
  const sonuc = { ikas: 0, trendyol: 0, magaza: 0, hatalar: [] }
  try { sonuc.magaza = kanalStok.magazaTazele().yazilan } catch (e) { sonuc.hatalar.push('mağaza: ' + e.message) }
  try {
    const s = await ikasStokOku()
    sonuc.ikas = kanalStok.kanaliYaz('ikas', s).yazilan
  } catch (e) { sonuc.hatalar.push('ikas: ' + e.message) }
  if (client.kimlikVar()) {
    try {
      const s = await tyStok.stokOku()
      sonuc.trendyol = kanalStok.kanaliYaz('trendyol', s).yazilan
    } catch (e) { sonuc.hatalar.push('trendyol: ' + e.message) }
  }
  return sonuc
}

function durum() {
  return {
    kimlikVar: client.kimlikVar(),
    senkKapali: senkKapaliMi(),
    yazmaAcik: yazmaAcikMi(),
    anaKanal: anaKanal(),
    kanallar: OKUNABILIR,
    yazilabilir: [...YAZILABILIR],
    ozet: kanalStok.ozet(anaKanal()),
  }
}

// --- işlem: hazırla -------------------------------------------------------

// ANLIK GÖRÜNTÜ BURADA ALINIR: hedef kanal TAZE okunur ve eski_miktar o okumadan yazılır.
// Yedek yoksa kalem yok, kalem yoksa gönderim yok.
async function hazirla({ hedef = 'trendyol', kullanici } = {}) {
  yetkiKontrol('stok_duzenle')
  kilitKontrol(hedef)
  const kaynakKanal = anaKanal()
  const kaynak = kanalStok.kanalOku(kaynakKanal)
  if (!kaynak.length) throw new Error(`Ana kaynak (${kaynakKanal}) henüz okunmadı — birkaç dakika sonra tekrar deneyin.`)

  const hedefSatirlar = await tyStok.stokOku()          // TAZE — anlık görüntünün kaynağı
  kanalStok.kanaliYaz(hedef, hedefSatirlar)             // ekran da tazelensin

  const plan = mantik.planUret({ kaynak, hedef: hedefSatirlar })
  if (!plan.gonderilecek.length) {
    return { islem_id: null, ...plan, kaynak: kaynakKanal, hedef, mesaj: 'Gönderilecek fark yok — iki kanal aynı.' }
  }

  const db = getDb()
  const islemId = db.transaction(() => {
    const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan)
      VALUES (?, ?, 'hazir', ?)`).run(kaynakKanal, hedef, kullanici || null)
    const ekle = db.prepare(`INSERT INTO stok_senk_kalem (islem_id, barkod, sku, ad, eski_miktar, yeni_miktar)
      VALUES (?, ?, ?, ?, ?, ?)`)
    for (const k of plan.gonderilecek) ekle.run(r.lastInsertRowid, k.barkod, k.sku, k.ad, k.eski_miktar, k.yeni_miktar)
    return r.lastInsertRowid
  })()

  return { islem_id: islemId, ...plan, kaynak: kaynakKanal, hedef }
}

// --- işlem: uygula --------------------------------------------------------

async function uygula({ islem_id }) {
  yetkiKontrol('stok_duzenle')
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem) throw new Error('İşlem bulunamadı.')
  kilitKontrol(islem.hedef)
  mantik.durumGecisi(islem.durum, 'uygulandi')   // ikinci kez gönderimi engeller

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

// Parti sonucunu sorar. Tamamlanma kapısı mantik.partiTamamMi'dedir.
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

async function geriAl({ islem_id, kullanici }) {
  yetkiKontrol('stok_duzenle')
  const db = getDb()
  const islem = db.prepare('SELECT * FROM stok_senk_islem WHERE id = ?').get(islem_id)
  if (!islem) throw new Error('İşlem bulunamadı.')
  kilitKontrol(islem.hedef)
  mantik.durumGecisi(islem.durum, 'geri_alindi')

  const kalemler = db.prepare('SELECT * FROM stok_senk_kalem WHERE islem_id = ?').all(islem_id)
  const ters = mantik.tersPlan(kalemler)
  if (!ters.length) throw new Error('Geri alınacak kalem yok (hiçbiri gönderilmemiş ya da değişmemiş).')

  const yeniId = db.transaction(() => {
    const r = db.prepare(`INSERT INTO stok_senk_islem (kaynak, hedef, durum, olusturan, geri_alindigi_islem_id, aciklama)
      VALUES (?, ?, 'hazir', ?, ?, ?)`)
      .run(islem.kaynak, islem.hedef, kullanici || null, islem_id, `#${islem_id} işleminin geri alınması`)
    const ekle = db.prepare('INSERT INTO stok_senk_kalem (islem_id, barkod, sku, ad, eski_miktar, yeni_miktar) VALUES (?, ?, ?, ?, ?, ?)')
    for (const k of ters) ekle.run(r.lastInsertRowid, k.barkod, k.sku, k.ad, k.eski_miktar, k.yeni_miktar)
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
  'kanal:liste': ({ kanal } = {}) => {
    yetkiKontrol('stok_duzenle')
    if (!OKUNABILIR.includes(kanal)) throw new Error('Bilinmeyen kanal: ' + kanal)
    return kanalStok.kanalListesi(kanal)
  },
  // Elle tazeleme UÇTAN KALDIRILMADI ama arayüzde düğmesi yok: arka plan turu
  // beklenmeden bakmak isteyen için (ör. ayar girdikten hemen sonra) duruyor.
  'kanal:tazele': () => { yetkiKontrol('stok_duzenle'); return tazele() },
  'kanal:hazirla': (p) => hazirla(p || {}),
  'kanal:uygula': (p) => uygula(p || {}),
  'kanal:sonuc-tazele': (p) => sonucTazele(p || {}),
  'kanal:geri-al': (p) => geriAl(p || {}),
  'kanal:islemler': (p) => { yetkiKontrol('stok_duzenle'); return islemler(p || {}) },
  'kanal:islem-detay': (p) => { yetkiKontrol('stok_duzenle'); return islemDetay(p || {}) },
  'kanal:ana-kanal-sec': ({ kanal }) => {
    yetkiKontrol('ayarlar_duzenle')
    if (!OKUNABILIR.includes(kanal)) throw new Error('Bilinmeyen kanal: ' + kanal)
    if (kanal === 'magaza') {
      throw new Error('Mağaza stoğu ana kaynak olamaz: sayım yapılmadığı için sayılar gerçeği yansıtmıyor.')
    }
    _ayarKaydetTek('ana_kanal', kanal)
    return durum()
  },
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
