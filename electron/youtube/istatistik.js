// YouTube video istatistigi (izlenme / begeni / yorum sayisi).
//
// NEDEN AYRI DOSYA: yorumlar.js video BILGISINI (baslik, kapak) bir kez cekip birakir
// — baslik degismez. Istatistik ise surekli degisir, bu yuzden tazeleme kurali gerekir
// ve o kural yorum cekme akisina karismamali.
//
// Kota: videos.list = 1 birim/cagri ve bir cagriya 50 kimlik sigar. Parca sayisi
// (part=statistics) maliyeti DEGISTIRMEZ; pahali olan cagrinin kendisidir.
const client = require('./client')
const kota = require('./kota')
const { getDb } = require('../db/database')

const TOPLU = 50           // videos.list tek cagrida en fazla 50 kimlik
const TAZE_SAAT = 6        // bundan yeni kayit yeniden cekilmez

/**
 * videos.list ogesini DB satirina cevirir. SAF: ag ve DB yok.
 *
 * Sayilar API'den METIN gelir ("1234"). Number() ile cevrilir ama BOS METIN 0 verir —
 * "olcum yok" ile "sifir izlenme" ayri seylerdir, bu yuzden bos/eksik alan null kalir.
 *
 * begeni alani kanal begenileri GIZLEDIYSE hic gelmez (dislikeCount 2021'de tamamen
 * kaldirildi, likeCount gizlenebilir). Bu bir hata degildir; null olarak saklanir.
 */
function istatistikCevir(oge) {
  const s = oge && oge.statistics
  if (!oge || !oge.id || !s) return null
  const say = (v) => {
    if (v === undefined || v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return {
    konu_id: oge.id,
    izlenme: say(s.viewCount),
    begeni: say(s.likeCount),
    yorum_adet: say(s.commentCount),
  }
}

/**
 * Hangi kimliklerin yeniden cekilmesi gerektigini soyler. SAF.
 *
 * Zaman damgasi EPOCH MILISANIYE tutulur, metin tarih DEGIL: veritabaninin geri kalani
 * datetime('now','localtime') kullaniyor ve o metinler saat dilimi bilgisi tasimadigi
 * icin ayristirildiginda sessizce 3 saat kayiyor. Sayi karsilastirmasinda bu tuzak yok.
 */
function bayatlar(satirlar, { simdi = Date.now(), tazeSaat = TAZE_SAAT } = {}) {
  const sinir = simdi - tazeSaat * 3600 * 1000
  return (satirlar || [])
    .filter((r) => {
      const t = Number(r && r.istatistik_ts)
      return !Number.isFinite(t) || t <= 0 || t < sinir
    })
    .map((r) => r.konu_id)
}

function _satirlar(db, idler) {
  if (!idler.length) return []
  const soru = idler.map(() => '?').join(',')
  return db.prepare(
    `SELECT konu_id, izlenme, begeni, yorum_adet, istatistik_ts
       FROM sosyal_gonderiler WHERE konu_id IN (${soru})`,
  ).all(...idler)
}

function _yaz(db, veri, ts) {
  db.prepare(
    `UPDATE sosyal_gonderiler
        SET izlenme = ?, begeni = ?, yorum_adet = ?, istatistik_ts = ?
      WHERE konu_id = ?`,
  ).run(veri.izlenme, veri.begeni, veri.yorum_adet, ts, veri.konu_id)
}

/**
 * Bayat olan kimliklerin istatistigini ceker ve yazar. Taze olanlara DOKUNMAZ.
 * Doner: kac kimlik gercekten cekildi (0 = hepsi tazeydi, kota harcanmadi).
 */
async function istatistikCek(idler, { tazeSaat = TAZE_SAAT, simdi = Date.now() } = {}) {
  const hepsi = [...new Set((idler || []).filter(Boolean))]
  if (!hepsi.length) return 0
  const db = getDb()
  // Tabloda satiri OLMAYAN kimlik de bayattir: _satirlar onu dondurmez, bu yuzden
  // eksikler ayrica eklenir. Aksi halde henuz bilgisi cekilmemis video hic sorulmazdi.
  const mevcut = _satirlar(db, hepsi)
  const bilinen = new Set(mevcut.map((r) => r.konu_id))
  const cekilecek = [
    ...bayatlar(mevcut, { simdi, tazeSaat }),
    ...hepsi.filter((id) => !bilinen.has(id)),
  ]
  if (!cekilecek.length) return 0

  const ts = simdi
  for (let i = 0; i < cekilecek.length; i += TOPLU) {
    const dilim = cekilecek.slice(i, i + TOPLU)
    kota.kotaKontrol('videos.list')
    const r = await client.cagir('GET', '/youtube/v3/videos', {
      params: { part: 'statistics', id: dilim.join(',') },
    })
    kota.harca('videos.list')
    for (const oge of (r.items || [])) {
      const veri = istatistikCevir(oge)
      if (veri) _yaz(db, veri, ts)
    }
  }
  return cekilecek.length
}

/** Tek videonun istatistigi; gerekiyorsa once tazeler. */
async function istatistikGetir(konuId) {
  if (!konuId) return null
  await istatistikCek([konuId])
  const [satir] = _satirlar(getDb(), [konuId])
  return satir || null
}

module.exports = { istatistikCevir, bayatlar, istatistikCek, istatistikGetir, TAZE_SAAT }
