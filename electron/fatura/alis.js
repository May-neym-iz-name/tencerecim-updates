// Tedarikçi (alış) faturası: yerel hesap + Supabase'e yazma.
// Fatura stoğunu ARTIRAN tek yol budur.
const { rpc } = require('./bulut')
const { yuvarla } = require('../db/satis-hesapla')

// Fiyatlar KDV DAHİL. KDV iç yüzdeyle ayrıştırılır (satis-hesapla ile aynı formül).
function kalemleriHesapla(girdiler) {
  let kdvToplam = 0, genelToplam = 0
  const kalemler = (girdiler || []).map(k => {
    // Sunucu satir_toplam'i gonderilen (yuvarlanmis) birim_fiyat'tan yeniden
    // hesaplayip karsilastirir (SATIR_TOPLAM_UYUSMUYOR). Istemci ile sunucu AYNI
    // girdiden AYNI sonucu uretsin diye once birim fiyat yuvarlanir, satir toplami
    // o yuvarlanmis degerden hesaplanir — ham (yuvarlanmamis) fiyattan degil.
    const birimFiyat = yuvarla(Number(k.birim_fiyat))
    const satirToplam = yuvarla(Number(k.miktar) * birimFiyat)
    const oran = Number(k.kdv_orani)
    const kdv = yuvarla(satirToplam * oran / (100 + oran))
    kdvToplam += kdv
    genelToplam += satirToplam
    return {
      urun_id: k.urun_id,
      urun_adi: k.urun_adi,
      miktar: Number(k.miktar),
      birim_fiyat: birimFiyat,
      kdv_orani: oran,
      satir_toplam: satirToplam,
    }
  })
  kdvToplam = yuvarla(kdvToplam)
  genelToplam = yuvarla(genelToplam)
  return { kalemler, araToplam: yuvarla(genelToplam - kdvToplam), kdvToplam, genelToplam }
}

// Supabase'e yazar. Fatura + kalemler + stok artışı TEK transaction (RPC içinde).
async function kaydet({ tedarikci_senk_id, fatura_no, fatura_tarihi, mal_kabul_senk_id,
                        notlar, kullanici, kalemler, urunSenkIdler }, jwt) {
  const hesap = kalemleriHesapla(kalemler)
  const yuk = hesap.kalemler.map(k => ({
    urun_senk_id: urunSenkIdler[k.urun_id],
    urun_adi: k.urun_adi,
    miktar: k.miktar,
    birim_fiyat: k.birim_fiyat,
    kdv_orani: k.kdv_orani,
    satir_toplam: k.satir_toplam,
  }))
  return rpc('alis_faturasi_kaydet', {
    p_tedarikci_senk_id: tedarikci_senk_id,
    p_fatura_no: fatura_no,
    p_fatura_tarihi: fatura_tarihi,
    p_mal_kabul_senk_id: mal_kabul_senk_id || null,
    p_notlar: notlar || null,
    p_kullanici: kullanici || null,
    p_kalemler: yuk,
  }, jwt)
}

module.exports = { kalemleriHesapla, kaydet }
