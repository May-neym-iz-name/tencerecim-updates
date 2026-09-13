// Trendyol sipariş/iade/fatura/soru/finans işlemlerinin IPC yüzü.
//
// index.js stok senkronuna odaklı; sipariş tarafı burada. Aynı client ve aynı
// yetki modeli kullanılır.
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/trendyol-ayarlar')
const client = require('./client')
const api = require('./siparis')
const depo = require('../db/trendyol-siparis')
const mantik = require('../db/trendyol-siparis-mantik')

// 🔴 BELGELİ SINIR: startDate/endDate aralığı en fazla 2 HAFTA. Aşılırsa Trendyol
// endDate'i sessizce startDate+2 hafta yapar — yani istediğin aralığı aldığını
// SANIRSIN, ortadaki siparişler hiç gelmez. Bu yüzden pencereyi biz bölüyoruz.
const PENCERE_GUN = 14
const GUN_MS = 24 * 60 * 60 * 1000

function kimlikKontrol() {
  if (!client.kimlikVar()) throw new Error('Trendyol kimlik bilgileri eksik (Ayarlar > Trendyol).')
  if (_ayarlariGetir().senk_kapali === '1') throw new Error('Trendyol senkronu acil olarak kapatılmış.')
}

// Tarih aralığını 14 günlük dilimlere böler.
function pencereler(baslangicMs, bitisMs) {
  const dilimler = []
  let b = Number(baslangicMs)
  const son = Number(bitisMs)
  while (b < son) {
    const s = Math.min(b + PENCERE_GUN * GUN_MS, son)
    dilimler.push([b, s])
    b = s
  }
  return dilimler
}

/**
 * Siparişleri çeker ve yerele yazar.
 * @param gunSayisi  kaç gün geriye bakılacak (varsayılan 14)
 */
async function siparisleriCek({ gunSayisi = PENCERE_GUN } = {}) {
  kimlikKontrol()
  const bitis = Date.now()
  const baslangic = bitis - Math.max(1, Number(gunSayisi) || PENCERE_GUN) * GUN_MS
  const sonuc = { yeni: 0, guncellenen: 0, atlanan: 0, pencere: 0, hatalar: [] }
  for (const [b, s] of pencereler(baslangic, bitis)) {
    sonuc.pencere++
    try {
      const paketler = await api.paketleriCek({ baslangicMs: b, bitisMs: s })
      const y = depo.paketleriYaz(paketler)
      sonuc.yeni += y.yeni; sonuc.guncellenen += y.guncellenen; sonuc.atlanan += y.atlanan
    } catch (e) {
      sonuc.hatalar.push(`${new Date(b).toLocaleDateString('tr-TR')}: ${e.message}`)
    }
  }
  _ayarKaydetTek('son_siparis_cekim', String(Date.now()))
  return sonuc
}

// Yazma işlemi sonrası o paketi Trendyol'dan TEKRAR okuyup yerele yazar.
// Neden: "başarılı döndü" ile "istediğimiz oldu" ayrı şeylerdir; statü gerçekten
// ilerledi mi ancak geri okuyarak bilinir.
async function paketiTazele(paketId) {
  try {
    const hepsi = await api.paketleriCek({
      baslangicMs: Date.now() - 30 * GUN_MS, bitisMs: Date.now(),
    })
    const p = hepsi.find(x => String(x.shipmentPackageId ?? x.id) === String(paketId))
    if (p) depo.paketleriYaz([p])
  } catch { /* tazeleme başarısız olsa da asıl işlem yapıldı */ }
  return depo.getir(paketId)
}

// Yazma uçlarını tek kalıba sokar: yetki + kimlik + işlem + geri okuma.
//
// YETKİ EŞLEŞTİRMESİ (yeni kod UYDURULMADI — parite testi ve Supabase yetki_kodlari
// ile uyumlu kalsın diye mevcut kodlara oturtuldu):
//   okuma            → online_siparis_goruntule
//   kargo akışı      → kargo_yonet     (personelde AÇIK; zaten kargo yönetiyorlar)
//   iptal/iade       → kargo_iptal     (personelde KAPALI; parayla ilgili, geri alınmaz)
//   fatura           → fatura_kes      (personelde KAPALI)
//   müşteri soruları → sosyal_medya_yonet
//   finans           → rapor_goruntule
function yazmaIslemi(fn, yetki = 'kargo_yonet') {
  return async (p = {}) => {
    yetkiKontrol(yetki)
    kimlikKontrol()
    const sonuc = await fn(p)
    const guncel = p.paket_id ? await paketiTazele(p.paket_id) : null
    return { sonuc, siparis: guncel }
  }
}

// --- G: müşteri soruları → SOSYAL MEDYA gelen kutusu ----------------------
//
// YouTube deseninin aynısı: sorular AYNI sosyal_mesajlar tablosunda durur
// (platform='trendyol', tur='yorum'); yalnız ÇEKME ve CEVAPLAMA farklı API.
// Böylece atama, hazır yanıt, arama ve rozet altyapısı olduğu gibi çalışır.
async function sorulariSenkronla({ gunSayisi = 14 } = {}) {
  kimlikKontrol()
  const { _upsertMesaj } = require('../db/sosyal-mesajlar')
  const bitis = Date.now()
  const baslangic = bitis - Math.max(1, Number(gunSayisi) || 14) * GUN_MS
  let n = 0
  // Soru ucu da 2 hafta sınırına tabi (belgede yazıyor) — pencere bölünür.
  for (const [b, e] of pencereler(baslangic, bitis)) {
    const r = await api.sorulariCek({ baslangicMs: b, bitisMs: e, durum: undefined, boyut: 50 })
    for (const q of (r?.content || r?.items || [])) {
      const id = q.id ?? q.questionId
      if (!id) continue
      _upsertMesaj({
        platform: 'trendyol', tur: 'yorum',
        harici_id: 'ty_soru_' + id,
        konu_id: String(q.productContentId ?? q.contentId ?? id),
        gonderen_ad: q.userName || q.customerName || 'Trendyol müşterisi',
        metin: q.text || q.question || '',
        yon: 'gelen',
        mesaj_tarihi: q.creationDate ? new Date(Number(q.creationDate)).toISOString() : new Date().toISOString(),
        konu_baslik: q.productName || null,
        konu_link: q.productUrl || null,
      })
      n++
    }
  }
  return { cekilen: n }
}

// Sosyal medya ekranından gelen cevabı doğru API'ye yönlendirir ve yereli işaretler.
async function soruCevapla({ id, metin, kullanici }) {
  const { getDb } = require('../db/database')
  const { _upsertMesaj } = require('../db/sosyal-mesajlar')
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(id)
  if (!row) throw new Error('Soru bulunamadı.')
  if (row.platform !== 'trendyol') throw new Error('Bu kayıt bir Trendyol sorusu değil.')
  const soruId = String(row.harici_id || '').replace(/^ty_soru_/, '')
  await api.soruyuCevapla(soruId, metin)
  getDb().prepare("UPDATE sosyal_mesajlar SET durum = 'cevaplandi', cevaplayan_kullanici = ? WHERE id = ?")
    .run(kullanici || null, id)
  _upsertMesaj({
    platform: 'trendyol', tur: 'yorum',
    harici_id: 'ty_cevap_' + soruId + '_' + Date.now(),
    konu_id: row.konu_id, ust_id: row.harici_id,
    gonderen_ad: `${kullanici || 'Mağaza'} (yanıt)`, metin: String(metin).trim(),
    yon: 'giden', mesaj_tarihi: new Date().toISOString(),
  })
  return { ok: true }
}

module.exports = {
  _siparisleriCek: siparisleriCek,
  _paketiTazele: paketiTazele,
  _sorulariSenkronla: sorulariSenkronla,
  _pencereler: pencereler,

  // --- okuma ---
  'ty-siparis:cek': (p) => { yetkiKontrol('online_siparis_goruntule'); return siparisleriCek(p || {}) },
  'ty-siparis:listele': (p) => { yetkiKontrol('online_siparis_goruntule'); return depo.listele(p || {}) },
  'ty-siparis:getir': ({ paket_id }) => { yetkiKontrol('online_siparis_goruntule'); return depo.getir(paket_id) },
  'ty-siparis:sayaclar': () => { yetkiKontrol('online_siparis_goruntule'); return depo.sayaclar() },
  'ty-siparis:durum-listesi': () => mantik.DURUMLAR,

  // --- B: kargoya verme ---
  'ty-siparis:statu': yazmaIslemi(({ paket_id, statu, kalemler }) => api.statuGuncelle(paket_id, statu, { kalemler })),
  'ty-siparis:takip-no': yazmaIslemi(({ paket_id, takip_no }) => api.takipNoBildir(paket_id, takip_no)),
  'ty-siparis:koli': yazmaIslemi(({ paket_id, desi, koli_adedi }) => api.koliBilgisi(paket_id, { desi, koliAdedi: koli_adedi })),
  'ty-siparis:kargo-firma': yazmaIslemi(({ paket_id, kargo_kodu }) => api.kargoFirmasiDegistir(paket_id, kargo_kodu)),
  'ty-siparis:depo': yazmaIslemi(({ paket_id, depo_id }) => api.depoGuncelle(paket_id, depo_id)),
  'ty-siparis:sure-uzat': yazmaIslemi(({ paket_id, yeni_tarih_ms }) => api.tedarikSuresiUzat(paket_id, yeni_tarih_ms)),

  // --- D: sorun ve istisnalar ---
  // Kalem iptali = siparişin bir kısmının geri alınması → kargo_iptal (personelde KAPALI).
  'ty-siparis:tedarik-edilemedi': yazmaIslemi(({ paket_id, kalemler }) => api.tedarikEdilemedi(paket_id, kalemler), 'kargo_iptal'),
  'ty-siparis:alternatif-teslimat': yazmaIslemi(({ paket_id, govde }) => api.alternatifTeslimat(paket_id, govde)),
  'ty-siparis:manuel-teslim': yazmaIslemi(({ paket_id, takip_no }) => api.manuelTeslim({ paketId: paket_id, takipNo: takip_no })),
  'ty-siparis:manuel-iade': yazmaIslemi(({ paket_id, takip_no }) => api.manuelIade({ paketId: paket_id, takipNo: takip_no }), 'kargo_iptal'),

  // --- E: iade ve talepler ---
  'ty-iade:listele': (p = {}) => { yetkiKontrol('online_siparis_goruntule'); kimlikKontrol(); return api.iadeleriCek(p) },
  'ty-iade:red-sebepleri': () => { yetkiKontrol('online_siparis_goruntule'); kimlikKontrol(); return api.iadeRedSebepleri() },
  'ty-iade:onayla': ({ claim_id, kalem_idler, not }) => {
    yetkiKontrol('kargo_iptal'); kimlikKontrol()
    return api.iadeOnayla(claim_id, kalem_idler, { not })
  },
  'ty-iade:reddet': ({ claim_id, sebep_id, kalem_idler, aciklama }) => {
    yetkiKontrol('kargo_iptal'); kimlikKontrol()
    return api.iadeReddet(claim_id, { sebepId: sebep_id, kalemIdler: kalem_idler, aciklama })
  },
  'ty-iade:olustur': ({ govde }) => { yetkiKontrol('kargo_iptal'); kimlikKontrol(); return api.iadeTalebiOlustur(govde) },
  'ty-iade:gecmis': ({ kalem_id }) => { yetkiKontrol('online_siparis_goruntule'); kimlikKontrol(); return api.iadeGecmisi(kalem_id) },

  // --- F: fatura ---
  // Gönderim + GERİ OKUMA. "success döndü" ile "Trendyol gerçekten aldı" ayrı şeylerdir
  // (bkz. api-verification kuralı). Paketi tazeleyip Trendyol'un KENDİ invoiceStatus
  // alanına bakarız; tutmuyorsa kullanıcıya SÖYLERİZ, "kuruldu" demeyiz.
  'ty-fatura:link-gonder': async ({ paket_id, fatura_no, fatura_tarihi_ms, url }) => {
    yetkiKontrol('fatura_kes'); kimlikKontrol()
    const r = await api.faturaLinkiGonder({ paketId: paket_id, faturaNo: fatura_no, faturaTarihiMs: fatura_tarihi_ms, url })
    depo.alanGuncelle(paket_id, { fatura_url: url, fatura_gonderildi: 1 })
    const guncel = await paketiTazele(paket_id)
    const dogrulandi = !!(guncel && (guncel.ty_fatura_link || guncel.ty_fatura_durum))
    return {
      sonuc: r, siparis: guncel, dogrulandi,
      uyari: dogrulandi ? null
        : 'Gönderim hata vermedi ama Trendyol tarafında fatura henüz görünmüyor. Birkaç dakika sonra tekrar bakın; kalıcıysa fatura dosyası (F3) ile gönderin.',
    }
  },
  'ty-fatura:link-sil': async ({ paket_id, fatura_no }) => {
    yetkiKontrol('fatura_kes'); kimlikKontrol()
    const r = await api.faturaLinkiSil({ paketId: paket_id, faturaNo: fatura_no })
    depo.alanGuncelle(paket_id, { fatura_gonderildi: 0 })
    return r
  },
  'ty-fatura:dosya': ({ govde }) => { yetkiKontrol('fatura_kes'); kimlikKontrol(); return api.faturaDosyasiGonder(govde) },

  // --- G: müşteri soruları (Sosyal Medya ekranına düşer) ---
  'ty-soru:listele': (p = {}) => { yetkiKontrol('sosyal_medya_yonet'); kimlikKontrol(); return api.sorulariCek(p) },
  'ty-soru:getir': ({ soru_id }) => { yetkiKontrol('sosyal_medya_yonet'); kimlikKontrol(); return api.soruDetay(soru_id) },
  'ty-soru:cevapla': ({ soru_id, metin }) => { yetkiKontrol('sosyal_medya_yonet'); kimlikKontrol(); return api.soruyuCevapla(soru_id, metin) },
  // Sosyal medya ekranının kullandığı yol (yerel kayıt id'siyle).
  'ty-soru:senkronla': (p) => { yetkiKontrol('sosyal_medya_yonet'); return sorulariSenkronla(p || {}) },
  'ty-soru:yanitla': (p) => { yetkiKontrol('sosyal_medya_yonet'); kimlikKontrol(); return soruCevapla(p || {}) },

  // --- H1: ortak etiket (kendi şablonumuza basılır) ---
  'ty-etiket:talep': ({ takip_no, govde }) => { yetkiKontrol('kargo_yonet'); kimlikKontrol(); return api.ortakEtiketTalep(takip_no, govde) },
  'ty-etiket:al': ({ takip_no }) => { yetkiKontrol('kargo_yonet'); kimlikKontrol(); return api.ortakEtiketAl(takip_no) },

  // --- H2/H3/H4: finans ---
  'ty-finans:odeme-emirleri': (p = {}) => { yetkiKontrol('rapor_goruntule'); kimlikKontrol(); return api.odemeEmirleri(p) },
  'ty-finans:mutabakat': (p = {}) => { yetkiKontrol('rapor_goruntule'); kimlikKontrol(); return api.mutabakat(p) },
  'ty-finans:diger': (p = {}) => { yetkiKontrol('rapor_goruntule'); kimlikKontrol(); return api.digerFinansal(p) },
  'ty-finans:kargo-fatura': ({ fatura_seri_no }) => { yetkiKontrol('rapor_goruntule'); kimlikKontrol(); return api.kargoFaturaKalemleri(fatura_seri_no) },
  'ty-tazmin:listele': (p = {}) => { yetkiKontrol('rapor_goruntule'); kimlikKontrol(); return api.tazminTalepleri(p) },
}
