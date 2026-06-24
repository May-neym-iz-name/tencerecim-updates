// Birleşik satış raporları: mağaza içi (satislar) + web (online_siparisler).
// Her iki kaynak ortak bir `kalemler` CTE'sinde birleştirilir; tüm raporlar
// bu tek katmandan türetilir (tutarlı filtreleme). Salt-okunur; yetki: rapor_goruntule.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const VARSAYILAN_LIMIT = 25
const MAKS_LIMIT = 200
const TARIH_RE = /^\d{4}-\d{2}-\d{2}$/

// Tarih filtrelerini YYYY-MM-DD formatına göre doğrular (hatalı string sessizce
// yanlış sonuç üretmesin diye). Boş/undefined kabul edilir (filtre yok demektir).
function tarihDogrula(baslangic, bitis) {
  if (baslangic && !TARIH_RE.test(baslangic)) throw new Error('Geçersiz başlangıç tarihi (YYYY-AA-GG bekleniyor)')
  if (bitis && !TARIH_RE.test(bitis)) throw new Error('Geçersiz bitiş tarihi (YYYY-AA-GG bekleniyor)')
}

// İstemciden gelen limit'i güvenli aralığa sıkıştırır.
function limitGuvenli(n, varsayilan = VARSAYILAN_LIMIT) {
  const v = Number(n) || varsayilan
  return Math.min(MAKS_LIMIT, Math.max(1, v))
}

// Web siparişleri için durum filtresi (SQL parçası). Mağaza içi tarafta
// iptal edilenler `satislar.durum` ile zaten elenir.
function webDurumKosulu(webDurum) {
  switch (webDurum) {
    case 'odenmis':
      return "os.odeme_durumu = 'PAID'"
    case 'tumu':
      return '1=1'
    case 'gecerli':
    default:
      // İptal edilen veya iade/başarısız ödemeli siparişleri hariç tut.
      return "os.durum != 'CANCELLED' AND COALESCE(os.odeme_durumu,'') NOT IN ('REFUNDED','FAILED','CANCELLED')"
  }
}

/**
 * Birleşik kalem CTE'sini ve parametrelerini üretir.
 * @param {{ baslangic?: string, bitis?: string, lokasyon_id?: number,
 *           kaynak?: 'hepsi'|'magaza'|'web', webDurum?: 'gecerli'|'odenmis'|'tumu' }} f
 * @returns {{ cte: string, params: any[] }}
 */
function kalemlerCte(f = {}) {
  const { baslangic, bitis, lokasyon_id, kaynak = 'hepsi', webDurum = 'gecerli' } = f
  tarihDogrula(baslangic, bitis)
  const params = []

  // Mağaza içi kalemler. tutar = satır neti (sk.toplam). satis_anahtar kaynak
  // ön ekiyle benzersiz: 'M'<id> / 'W'<id> (işlem sayısı DISTINCT sayımı için).
  let magaza = `
    SELECT 'magaza' AS kaynak, 'M' || s.id AS satis_anahtar,
           substr(s.tarih,1,10) AS gun,
           s.lokasyon_id, s.musteri_id,
           sk.urun_id, COALESCE(u.ad, '(silinmiş ürün)') AS urun_adi,
           u.marka_id, COALESCE(mk.ad, u.marka) AS marka,
           u.kategori_id, COALESCE(kt.ad, u.kategori) AS kategori,
           sk.miktar AS adet, sk.toplam AS tutar
    FROM satis_kalemleri sk
    JOIN satislar s ON sk.satis_id = s.id
    LEFT JOIN urunler u ON sk.urun_id = u.id
    LEFT JOIN markalar mk ON u.marka_id = mk.id
    LEFT JOIN kategoriler kt ON u.kategori_id = kt.id
    WHERE s.durum = 'tamamlandi'`
  const magazaParams = []
  if (baslangic) { magaza += ' AND substr(s.tarih,1,10) >= ?'; magazaParams.push(baslangic) }
  if (bitis) { magaza += ' AND substr(s.tarih,1,10) <= ?'; magazaParams.push(bitis) }
  if (lokasyon_id) { magaza += ' AND s.lokasyon_id = ?'; magazaParams.push(Number(lokasyon_id)) }

  // Web kalemleri. tutar = birim_fiyat * miktar. Eski senkronlanan siparişlerde
  // birim_fiyat 0 kaydedilmiş olabilir (finalUnitPrice null bug'ı, v1.2.33'te
  // düzeltildi) → 0 ise eşleşen ürünün güncel satış fiyatına düşülür. Yerel ürün
  // eşleşmemişse (urun_id NULL) ad/marka/kategori için kalemin urun_adi'na düşülür.
  let web = `
    SELECT 'web' AS kaynak, 'W' || os.id AS satis_anahtar,
           substr(os.siparis_tarihi,1,10) AS gun,
           ok.lokasyon_id, os.musteri_id,
           ok.urun_id, COALESCE(u.ad, ok.urun_adi, '(isimsiz)') AS urun_adi,
           u.marka_id, COALESCE(mk.ad, u.marka) AS marka,
           u.kategori_id, COALESCE(kt.ad, u.kategori) AS kategori,
           ok.miktar AS adet,
           (CASE WHEN ok.birim_fiyat > 0 THEN ok.birim_fiyat ELSE COALESCE(u.satis_fiyati, 0) END) * ok.miktar AS tutar
    FROM online_siparis_kalemleri ok
    JOIN online_siparisler os ON ok.siparis_id = os.id
    LEFT JOIN urunler u ON ok.urun_id = u.id
    LEFT JOIN markalar mk ON u.marka_id = mk.id
    LEFT JOIN kategoriler kt ON u.kategori_id = kt.id
    WHERE ${webDurumKosulu(webDurum)}`
  const webParams = []
  if (baslangic) { web += ' AND substr(os.siparis_tarihi,1,10) >= ?'; webParams.push(baslangic) }
  if (bitis) { web += ' AND substr(os.siparis_tarihi,1,10) <= ?'; webParams.push(bitis) }
  if (lokasyon_id) { web += ' AND ok.lokasyon_id = ?'; webParams.push(Number(lokasyon_id)) }

  let birlesim
  if (kaynak === 'magaza') { birlesim = magaza; params.push(...magazaParams) }
  else if (kaynak === 'web') { birlesim = web; params.push(...webParams) }
  else { birlesim = `${magaza}\n    UNION ALL${web}`; params.push(...magazaParams, ...webParams) }

  return { cte: `WITH kalemler AS (${birlesim}\n  )`, params }
}

module.exports = {
  // KPI özeti — kaynak kırılımıyla (mağaza / web) + genel toplam.
  'raporlar:ozet': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const satirlar = db.prepare(`${cte}
      SELECT kaynak,
             COUNT(DISTINCT satis_anahtar) AS islem_sayisi,
             SUM(adet) AS urun_adedi,
             SUM(tutar) AS ciro
      FROM kalemler GROUP BY kaynak`).all(...params)

    const bos = { islem_sayisi: 0, urun_adedi: 0, ciro: 0 }
    const magaza = satirlar.find(s => s.kaynak === 'magaza') || { ...bos }
    const web = satirlar.find(s => s.kaynak === 'web') || { ...bos }
    const genel = {
      islem_sayisi: (magaza.islem_sayisi || 0) + (web.islem_sayisi || 0),
      urun_adedi: (magaza.urun_adedi || 0) + (web.urun_adedi || 0),
      ciro: (magaza.ciro || 0) + (web.ciro || 0),
    }
    const ortSepet = (g) => g.islem_sayisi ? g.ciro / g.islem_sayisi : 0
    return {
      magaza: { ...bos, ...magaza, ortalama_sepet: ortSepet({ ...bos, ...magaza }) },
      web: { ...bos, ...web, ortalama_sepet: ortSepet({ ...bos, ...web }) },
      genel: { ...genel, ortalama_sepet: ortSepet(genel) },
    }
  },

  // En çok tercih edilen ürünler. siralama: 'adet' | 'ciro'.
  'raporlar:en-cok-urunler': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const limit = limitGuvenli(f.limit)
    const sutun = f.siralama === 'ciro' ? 'ciro' : 'adet'
    const satirlar = db.prepare(`${cte}
      SELECT COALESCE(CAST(urun_id AS TEXT), urun_adi) AS anahtar,
             MAX(urun_adi) AS urun_adi, urun_id,
             SUM(adet) AS adet, SUM(tutar) AS ciro,
             SUM(CASE WHEN kaynak='magaza' THEN adet ELSE 0 END) AS magaza_adet,
             SUM(CASE WHEN kaynak='web' THEN adet ELSE 0 END) AS web_adet
      FROM kalemler
      GROUP BY anahtar
      ORDER BY ${sutun} DESC, adet DESC
      LIMIT ?`).all(...params, limit)
    return satirlar
  },

  // Müşteri sadakati — müşteri başına işlem sayısı + toplam harcama.
  // Misafir (musteri_id NULL) işlemler hariç tutulur.
  'raporlar:musteri-sadakat': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const limit = limitGuvenli(f.limit)
    const sutun = f.siralama === 'islem' ? 'islem_sayisi' : 'toplam_harcama'
    const satirlar = db.prepare(`${cte}
      SELECT k.musteri_id,
             COALESCE(m.ad || ' ' || COALESCE(m.soyad,''), '#' || k.musteri_id) AS musteri_adi,
             m.telefon,
             COUNT(DISTINCT k.satis_anahtar) AS islem_sayisi,
             SUM(k.tutar) AS toplam_harcama
      FROM kalemler k
      LEFT JOIN musteriler m ON k.musteri_id = m.id
      WHERE k.musteri_id IS NOT NULL
      GROUP BY k.musteri_id
      ORDER BY ${sutun} DESC
      LIMIT ?`).all(...params, limit)
    return satirlar
  },

  // Zaman serisi — gün ('gun') veya ay ('ay') bazında ciro + işlem sayısı.
  'raporlar:zaman-serisi': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const donem = f.granularite === 'ay' ? 'substr(gun,1,7)' : 'gun'
    const satirlar = db.prepare(`${cte}
      SELECT ${donem} AS donem,
             COUNT(DISTINCT satis_anahtar) AS islem_sayisi,
             SUM(tutar) AS ciro,
             SUM(CASE WHEN kaynak='magaza' THEN tutar ELSE 0 END) AS magaza_ciro,
             SUM(CASE WHEN kaynak='web' THEN tutar ELSE 0 END) AS web_ciro
      FROM kalemler
      WHERE gun IS NOT NULL AND gun != ''
      GROUP BY donem
      ORDER BY donem ASC`).all(...params)
    return satirlar
  },

  // Kategori kırılımı — kategori başına adet + ciro.
  'raporlar:kategori-kirilim': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const satirlar = db.prepare(`${cte}
      SELECT COALESCE(kategori, '(kategorisiz)') AS kategori,
             SUM(adet) AS adet, SUM(tutar) AS ciro
      FROM kalemler
      GROUP BY COALESCE(kategori, '(kategorisiz)')
      ORDER BY ciro DESC`).all(...params)
    return satirlar
  },

  // Marka kırılımı — marka başına adet + ciro.
  'raporlar:marka-kirilim': (f = {}) => {
    yetkiKontrol('rapor_goruntule')
    const db = getDb()
    const { cte, params } = kalemlerCte(f)
    const satirlar = db.prepare(`${cte}
      SELECT COALESCE(marka, '(markasız)') AS marka,
             SUM(adet) AS adet, SUM(tutar) AS ciro
      FROM kalemler
      GROUP BY COALESCE(marka, '(markasız)')
      ORDER BY ciro DESC`).all(...params)
    return satirlar
  },

  // Test/yeniden kullanım için saf yardımcıları dışa ver ('_' önekli → IPC'ye kaydedilmez).
  _kalemlerCte: kalemlerCte,
  _webDurumKosulu: webDurumKosulu,
  _limitGuvenli: limitGuvenli,
}
