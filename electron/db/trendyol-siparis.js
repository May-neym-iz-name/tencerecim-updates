// Trendyol siparişlerinin yerel kaydı. Saf mantık trendyol-siparis-mantik.js'te;
// burada yalnız SQL var.
const { getDb } = require('./database')
const { paketiCevir } = require('./trendyol-siparis-mantik')

const SIPARIS_ALANLAR = [
  'paket_id', 'siparis_no', 'siparis_tarihi', 'durum',
  'kargo_firma', 'kargo_takip_no', 'kargo_takip_link', 'kargo_gonderi_no',
  'toplam', 'indirim', 'para_birimi',
  'musteri_ad', 'musteri_email',
  'teslimat_il', 'teslimat_ilce', 'teslimat_adres', 'teslimat_telefon',
  'fatura_unvan', 'fatura_vergi_no', 'fatura_vergi_dairesi', 'fatura_tc',
  'ticari', 'tahmini_teslim', 'kararlastirilan_teslim', 'son_degisiklik',
  'ty_fatura_link', 'ty_fatura_no', 'ty_fatura_durum',
  'kargo_desi', 'kapida_odeme', 'depo_id', 'ham',
]

/**
 * Paketleri idempotent yazar: aynı paket ikinci kez gelirse GÜNCELLENİR.
 * stok_dusuldu ve fatura_* alanlarına DOKUNULMAZ — onlar bizim iç durumumuz,
 * Trendyol'dan gelen veri onları ezmemeli.
 */
function paketleriYaz(hamPaketler) {
  const db = getDb()
  const sutunlar = SIPARIS_ALANLAR.join(', ')
  const degerler = SIPARIS_ALANLAR.map(a => '@' + a).join(', ')
  const guncelle = SIPARIS_ALANLAR.filter(a => a !== 'paket_id')
    .map(a => `${a} = excluded.${a}`).join(', ')

  const siparisYaz = db.prepare(
    `INSERT INTO trendyol_siparisler (${sutunlar}) VALUES (${degerler})
     ON CONFLICT(paket_id) DO UPDATE SET ${guncelle}`
  )
  const idAl = db.prepare('SELECT id FROM trendyol_siparisler WHERE paket_id = ?')
  const kalemYaz = db.prepare(`
    INSERT INTO trendyol_siparis_kalemleri
      (siparis_id, kalem_id, barkod, sku, urun_adi, miktar, birim_fiyat, birim_indirim,
       kdv_orani, komisyon_orani, kalem_durum, iptal_sebep, urun_id)
    VALUES (@siparis_id, @kalem_id, @barkod, @sku, @urun_adi, @miktar, @birim_fiyat,
            @birim_indirim, @kdv_orani, @komisyon_orani, @kalem_durum, @iptal_sebep, @urun_id)
    ON CONFLICT(siparis_id, kalem_id) DO UPDATE SET
      miktar = excluded.miktar, birim_fiyat = excluded.birim_fiyat,
      birim_indirim = excluded.birim_indirim, kalem_durum = excluded.kalem_durum,
      iptal_sebep = excluded.iptal_sebep, urun_id = COALESCE(trendyol_siparis_kalemleri.urun_id, excluded.urun_id)`)
  // Ürünü SKU ile bağla: setler de dahil (setler ayrı tabloda, orada urun_id yok →
  // yalnız urunler eşleşmesi yazılır, set kalemleri urun_id'siz kalır ve bu normaldir).
  const urunBul = db.prepare('SELECT id FROM urunler WHERE upper(sku) = upper(?) LIMIT 1')

  let yeni = 0, guncellenen = 0, atlanan = 0
  const toplu = db.transaction((liste) => {
    for (const ham of liste) {
      const c = paketiCevir(ham)
      if (!c) { atlanan++; continue }
      const vardi = !!idAl.get(c.siparis.paket_id)
      const satir = {}
      for (const a of SIPARIS_ALANLAR) satir[a] = c.siparis[a] ?? null
      siparisYaz.run(satir)
      const sid = idAl.get(c.siparis.paket_id).id
      for (const k of c.kalemler) {
        kalemYaz.run({
          siparis_id: sid,
          kalem_id: k.kalem_id, barkod: k.barkod, sku: k.sku, urun_adi: k.urun_adi,
          miktar: k.miktar, birim_fiyat: k.birim_fiyat, birim_indirim: k.birim_indirim,
          kdv_orani: k.kdv_orani, komisyon_orani: k.komisyon_orani,
          kalem_durum: k.kalem_durum, iptal_sebep: k.iptal_sebep,
          urun_id: k.sku ? (urunBul.get(k.sku)?.id ?? null) : null,
        })
      }
      if (vardi) guncellenen++; else yeni++
    }
  })
  toplu(hamPaketler || [])
  return { yeni, guncellenen, atlanan }
}

function listele({ durum, arama, limit = 200 } = {}) {
  const kosul = []
  const p = []
  if (durum) { kosul.push('s.durum = ?'); p.push(durum) }
  if (arama) {
    kosul.push(`(tr_ara(s.siparis_no) LIKE tr_ara(?) OR tr_ara(s.musteri_ad) LIKE tr_ara(?)
                 OR s.kargo_takip_no LIKE ? OR EXISTS (SELECT 1 FROM trendyol_siparis_kalemleri k
                   WHERE k.siparis_id = s.id AND (tr_ara(k.urun_adi) LIKE tr_ara(?) OR upper(k.sku) LIKE upper(?))))`)
    const q = `%${arama}%`
    p.push(q, q, q, q, q)
  }
  const where = kosul.length ? 'WHERE ' + kosul.join(' AND ') : ''
  return getDb().prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM trendyol_siparis_kalemleri k WHERE k.siparis_id = s.id) AS kalem_sayisi,
           (SELECT SUM(k.miktar) FROM trendyol_siparis_kalemleri k WHERE k.siparis_id = s.id) AS adet
      FROM trendyol_siparisler s
      ${where}
     ORDER BY s.siparis_tarihi DESC
     LIMIT ?`).all(...p, Math.min(1000, Number(limit) || 200))
}

function getir(paketId) {
  const db = getDb()
  const s = db.prepare('SELECT * FROM trendyol_siparisler WHERE paket_id = ?').get(String(paketId))
  if (!s) return null
  s.kalemler = db.prepare('SELECT * FROM trendyol_siparis_kalemleri WHERE siparis_id = ? ORDER BY id').all(s.id)
  return s
}

// Durum sayaçları — ekrandaki sekme rozetleri.
function sayaclar() {
  const satirlar = getDb().prepare(
    'SELECT durum, COUNT(*) adet FROM trendyol_siparisler GROUP BY durum'
  ).all()
  const o = {}
  for (const r of satirlar) o[r.durum] = r.adet
  return o
}

// En son çekilen paketin değişiklik zamanı — artımlı çekimin başlangıcı.
function sonDegisiklik() {
  return getDb().prepare('SELECT MAX(son_degisiklik) t FROM trendyol_siparisler').get()?.t || null
}

function alanGuncelle(paketId, alanlar) {
  const izinli = ['durum', 'kargo_takip_no', 'kargo_firma', 'stok_dusuldu',
    'fatura_senk_id', 'fatura_url', 'fatura_gonderildi']
  const girdiler = Object.entries(alanlar || {}).filter(([k]) => izinli.includes(k))
  if (!girdiler.length) return { guncellenen: 0 }
  const set = girdiler.map(([k]) => `${k} = ?`).join(', ')
  const r = getDb().prepare(`UPDATE trendyol_siparisler SET ${set} WHERE paket_id = ?`)
    .run(...girdiler.map(([, v]) => v), String(paketId))
  return { guncellenen: r.changes }
}

module.exports = { paketleriYaz, listele, getir, sayaclar, sonDegisiklik, alanGuncelle }
