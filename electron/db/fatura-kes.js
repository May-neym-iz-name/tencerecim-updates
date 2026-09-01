// Fatura kesme IPC katmanı: kanal adaptörü + çekirdek + sağlayıcı + RPC'yi bağlar.
//
// Burada İŞ MANTIĞI YOK — hepsi test edilebilir modüllerde:
//   kanal/ikas.js  → siparişi fatura girdisine çevirir
//   cekirdek.js    → guard, sahiplenme, üç sonuç sınıfı
//   saglayici/bizimhesap.js → belgeyi oluşturur ve gönderir
// Bu dosya yalnız bağımlılıkları enjekte eder ve renderer'a uygun şekle çevirir.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const okuma = require('../fatura/okuma')

function jwtAl() {
  return require('../oturum-canli').aktifJwt?.() || null
}

function bagimliliklariKur() {
  const jwt = jwtAl()
  const bulut = require('../fatura/bulut')
  return {
    saglayici: require('../fatura/saglayici/bizimhesap'),
    ayarlar: require('./fatura-ayarlar')._ayarlariGetir(),
    rpc: {
      faturaKesBasla: (p) => bulut.rpc('fatura_kes_basla', {
        p_kanal: p.kanal,
        p_kanal_siparis_id: p.kanal_siparis_id,
        p_kalemler: p.kalemler,
        p_kullanici: p.kullanici,
      }, jwt),
      faturaKesBitir: (p) => bulut.rpc('fatura_kes_bitir', {
        p_fatura_senk_id: p.senk_id,
        p_durum: p.durum,
        p_guid: p.guid || null,
        p_url: p.url || null,
        p_fatura_no: p.fatura_no || null,
        p_belge_tipi: p.belge_tipi || null,
        p_belge_tipi_kaynak: p.belge_tipi_kaynak || 'tahmin',
        p_hata: p.hata || null,
      }, jwt),
      faturaKesTelafi: (p) => bulut.rpc('fatura_kes_telafi', {
        p_fatura_senk_id: p.senk_id,
        p_hata: p.hata,
        p_kullanici: p.kullanici || null,
      }, jwt),
    },
  }
}

function kullaniciAdi() {
  const kimlik = require('../yetki')._aktifKimlik()
  return (kimlik && kimlik.eposta) || null
}

module.exports = {
  // Tek siparişe fatura keser. Sonuç: { durum: 'tamam'|'hata'|'belirsiz', ... }
  // Guard hataları (SKU yok, ünvan yok…) THROW eder — sahiplenme yapılmadan.
  'fatura:kes': async ({ siparis_id } = {}) => {
    yetkiKontrol('fatura_kes')
    const girdi = require('../fatura/kanal/ikas').siparisiFaturayaCevir(siparis_id)
    girdi.kullanici = kullaniciAdi()
    return require('../fatura/cekirdek').faturaKes(girdi, bagimliliklariKur())
  },

  // Toplu kesim: BİRİ PATLARSA DİĞERLERİ DURMAZ. Her siparişin sonucu ayrı döner —
  // 20 siparişten 3'ü hata verdiğinde hangileri olduğunu görmek şart.
  'fatura:toplu-kes': async ({ siparis_idler } = {}) => {
    yetkiKontrol('fatura_kes')
    const sonuclar = []
    for (const id of (siparis_idler || [])) {
      try {
        const girdi = require('../fatura/kanal/ikas').siparisiFaturayaCevir(id)
        girdi.kullanici = kullaniciAdi()
        const s = await require('../fatura/cekirdek').faturaKes(girdi, bagimliliklariKur())
        sonuclar.push({ siparis_id: id, ...s })
      } catch (e) {
        sonuclar.push({ siparis_id: id, durum: 'hata', mesaj: e.message, kod: e.kod || null })
      }
    }
    return sonuclar
  },

  // Sipariş listesinde satır durumunu göstermek için. Yetki BİLEREK geniş:
  // fatura kesemeyen kasiyer de "bu sipariş faturalı mı" görebilmeli.
  'fatura:durumlar': async ({ kanal = 'ikas' } = {}) => {
    const satirlar = await okuma.kesilenFaturaGetir({ kanal }, jwtAl())
    const harita = {}
    for (const s of satirlar) harita[s.kanal_siparis_id] = s
    return harita
  },

  // "Kontrol Bekliyor" listesi — sonucu doğrulanamamış faturalar.
  'fatura:belirsizler': async () => {
    yetkiKontrol('fatura_stok_goruntule')
    return okuma.belirsizFaturaGetir(jwtAl())
  },

  // Kullanıcı Bizimhesap'ta kontrol edip karar verir:
  //   kesilmis=true  → durum 'tamam' (guid kullanıcıdan; stok düşük KALIR)
  //   kesilmis=false → telafi (stok İADE edilir, sipariş yeniden faturalanabilir)
  'fatura:belirsiz-karar': async ({ senk_id, kesilmis, guid, fatura_no } = {}) => {
    yetkiKontrol('fatura_kes')
    const b = bagimliliklariKur()
    if (kesilmis) {
      if (!guid) {
        // Sunucu da reddeder (GUID_YOK); mesajı burada Türkçe verelim.
        throw new Error('Fatura kesilmiş işaretlemek için Bizimhesap fatura kimliği (guid) gerekli')
      }
      return b.rpc.faturaKesBitir({ senk_id, durum: 'tamam', guid, fatura_no })
    }
    return b.rpc.faturaKesTelafi({
      senk_id, hata: 'Kullanıcı kontrolü: fatura Bizimhesap\'ta oluşmamış', kullanici: kullaniciAdi(),
    })
  },
}
