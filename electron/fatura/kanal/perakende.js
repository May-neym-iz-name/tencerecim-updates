// PERAKENDE (mağaza satışı) KANAL ADAPTÖRÜ — satışı fatura girdisine çevirir.
//
// 🔴 NEDEN ONLINE DEĞİL DE PERAKENDE (01.09.2026 kararı): ikas siparişleri zaten
// ikas→Bizimhesap entegrasyonuyla Bizimhesap'a taslak olarak düşüyor. Uygulama da
// yazınca AYNI siparişe ikinci kayıt oluşuyordu (canlıda görüldü). Bizimhesap'a
// tek yazıcı olmalı; online tarafı entegrasyona bırakıldı, uygulama mağaza
// satışlarını yazıyor — orada başka yazan yok.
//
// Perakende, online'a göre daha basit: satış kalemleri zaten GERÇEK ürünlere
// bağlı (set satılsa bile bileşenler ayrı satır yazılır), yani set çözme yok.
// Buna karşılık iskonto var ve dikkat ister (aşağıda).
const { yuvarla } = require('../../db/satis-hesapla')

class KanalHatasi extends Error {
  constructor(mesaj) {
    super(mesaj)
    this.name = 'KanalHatasi'
    this.kod = 'dogrulama'   // sahiplenmeden ÖNCE patlar, hiçbir şey işgal edilmez
  }
}

function _depoKur(db) {
  const satisS = db.prepare('SELECT * FROM satislar WHERE id = ?')
  const kalemS = db.prepare(`SELECT urun_id, miktar, birim_fiyat, iskonto_orani, kdv_orani, toplam, set_adi
    FROM satis_kalemleri WHERE satis_id = ? ORDER BY id`)
  const urunS = db.prepare('SELECT id, senk_id, sku, ad, barkod FROM urunler WHERE id = ?')
  const musteriS = db.prepare('SELECT * FROM musteriler WHERE id = ?')
  return {
    satisGetir: (id) => satisS.get(id),
    kalemleriGetir: (id) => kalemS.all(id),
    urunGetir: (id) => urunS.get(id),
    musteriGetir: (id) => (id ? musteriS.get(id) : null),
  }
}

function _musteriCevir(m) {
  const adres = [m.adres, m.ilce, m.il].filter(Boolean).join(' ')
  return {
    id: m.id,
    // Kurumsal müşteride ünvan, bireyselde ad soyad. Fatura başlığı boş kalamaz.
    unvan: (m.unvan && m.unvan.trim()) || [m.ad, m.soyad].filter(Boolean).join(' ').trim(),
    vergi_no: m.vergi_no || null,
    vergi_dairesi: m.vergi_dairesi || '',
    tc: m.tc_kimlik || null,
    eposta: m.email || '',
    telefon: m.telefon || '',
    adres,
  }
}

/**
 * @param {number} satisId yerel satislar.id
 * @param {object} [depo] test için enjekte edilebilir veri erişimi
 */
function satisiFaturayaCevir(satisId, depo) {
  const d = depo || _depoKur(require('../../db/database').getDb())
  const s = d.satisGetir(satisId)
  if (!s) throw new KanalHatasi('Satış bulunamadı, fatura kesilemez')
  if (s.durum && s.durum !== 'tamamlandi') {
    throw new KanalHatasi(`Satış "${s.durum}" durumunda (iade/iptal), fatura kesilemez`)
  }

  const m = d.musteriGetir(s.musteri_id)
  if (!m) {
    // Mağaza satışlarının çoğu müşterisiz kaydediliyor; faturada alıcı kimliği
    // zorunlu olduğu için kullanıcı önce müşteriyi seçmeli.
    throw new KanalHatasi('Satışta müşteri seçili değil — faturada alıcı bilgisi zorunlu')
  }
  const musteri = _musteriCevir(m)
  if (!musteri.unvan) throw new KanalHatasi('Müşterinin adı/ünvanı boş, fatura kesilemez')

  const kalemler = []
  for (const k of d.kalemleriGetir(satisId)) {
    const miktar = Number(k.miktar)
    if (!Number.isFinite(miktar) || miktar <= 0) continue

    const u = d.urunGetir(k.urun_id)
    if (!u) throw new KanalHatasi(`Satırdaki ürün katalogda bulunamadı (kalem ${k.urun_id})`)
    if (!u.sku) {
      throw new KanalHatasi(`"${u.ad}" ürününün stok kodu (SKU) yok, faturaya yazılamaz`)
    }
    if (!u.senk_id) {
      throw new KanalHatasi(`"${u.ad}" ürününün bulut kimliği yok, fatura stoğu düşülemez (senkron bekliyor olabilir)`)
    }

    // 🔴 İSKONTO: satis_kalemleri.birim_fiyat iskonto ÖNCESİ fiyattır, `toplam`
    // ise iskonto sonrası (ve KDV dahil). Faturaya ham birim fiyat gönderilirse
    // sunucu doğrulaması (satir_toplam ≈ miktar × birim_fiyat) tutmaz ve geçerli
    // fatura reddedilir. Bu yüzden ETKİN birim fiyat türetilir.
    const satirToplam = yuvarla(Number(k.toplam))
    const birimFiyat = yuvarla(satirToplam / miktar)

    kalemler.push({
      urun_senk_id: u.senk_id,
      sku: u.sku,
      ad: u.ad,
      barkod: u.barkod || '',
      miktar,
      birim_fiyat: birimFiyat,
      kdv_orani: Number(k.kdv_orani),   // satış anındaki oran; ürün kaydından DEĞİL
      satir_toplam: satirToplam,
      set_senk_id: null,                // perakendede kalem zaten bileşen bazında
    })
  }

  if (!kalemler.length) throw new KanalHatasi('Satışta faturalanacak kalem yok')

  return {
    kanal: 'perakende',
    // Fiş numarası doğal anahtar: yerel id her PC'de farklı olabilir, fiş no değil.
    kanal_siparis_id: s.fis_no,
    musteri,
    kalemler,
    fatura_no: '',                       // numarayı Bizimhesap verir
    // Fatura tarihi KESİM günü; geçmişe tarihlemek beyan dönemini kaydırır.
    tarih: new Date().toISOString().slice(0, 10),
    not: s.fis_no ? `Mağaza satışı ${s.fis_no}` : '',
  }
}

module.exports = { satisiFaturayaCevir, KanalHatasi, _depoKur, _musteriCevir }
