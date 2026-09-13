// Fatura kesme IPC katmanı: kanal adaptörü + çekirdek + sağlayıcı + RPC'yi bağlar.
//
// 🔴 KANAL KARARI (01.09.2026): yalnız PERAKENDE (mağaza) satışları yazılır.
// ikas siparişleri ikas→Bizimhesap entegrasyonuyla zaten taslak olarak düşüyor;
// uygulama da yazınca aynı siparişe İKİNCİ kayıt oluşuyordu (canlıda görüldü).
// Bizimhesap'a tek yazıcı olmalı. Online tarafta uygulamanın işi artık yalnız
// "bu siparişe fatura kesilebilir mi" bilgisini vermek (fatura stoğu).
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
  // Tek MAĞAZA SATIŞINA fatura keser. Sonuç: { durum: 'tamam'|'hata'|'belirsiz', ... }
  // Guard hataları (müşteri yok, SKU yok…) THROW eder — sahiplenme yapılmadan.
  'fatura:kes-satis': async ({ satis_id } = {}) => {
    yetkiKontrol('fatura_kes')
    const girdi = require('../fatura/kanal/perakende').satisiFaturayaCevir(satis_id)
    girdi.kullanici = kullaniciAdi()
    return require('../fatura/cekirdek').faturaKes(girdi, bagimliliklariKur())
  },

  // Toplu kesim: BİRİ PATLARSA DİĞERLERİ DURMAZ. Her siparişin sonucu ayrı döner —
  // 20 siparişten 3'ü hata verdiğinde hangileri olduğunu görmek şart.
  'fatura:toplu-kes-satis': async ({ satis_idler } = {}) => {
    yetkiKontrol('fatura_kes')
    const sonuclar = []
    for (const id of (satis_idler || [])) {
      try {
        const girdi = require('../fatura/kanal/perakende').satisiFaturayaCevir(id)
        girdi.kullanici = kullaniciAdi()
        const s = await require('../fatura/cekirdek').faturaKes(girdi, bagimliliklariKur())
        sonuclar.push({ satis_id: id, ...s })
      } catch (e) {
        sonuclar.push({ satis_id: id, durum: 'hata', mesaj: e.message, kod: e.kod || null })
      }
    }
    return sonuclar
  },

  /**
   * TRENDYOL PAKETİNE fatura keser ve linki Trendyol'a bildirir — zincirin tamamı:
   *
   *   paket → kanal/trendyol.js → çekirdek → Bizimhesap → belge URL'i
   *                                                          ↓
   *                                       Trendyol sendInvoiceLink → GERİ OKU, doğrula
   *
   * Yeni bir fatura sistemi KURULMADI: ikas için çalışan çekirdek ve sağlayıcı aynen
   * kullanılıyor, yalnız kanal adaptörü eklendi.
   *
   * "Gönderdik" ile "Trendyol aldı" AYRI raporlanır (bkz. api-verification kuralı):
   * link gönderimi hata vermese bile paket geri okunup Trendyol'un KENDİ invoiceLink/
   * invoiceStatus alanına bakılır; görünmüyorsa uyarı döner, "tamam" denmez.
   */
  'fatura:kes-trendyol': async ({ paket_id } = {}) => {
    yetkiKontrol('fatura_kes')
    const girdi = require('../fatura/kanal/trendyol').paketiFaturayaCevir(paket_id)
    girdi.kullanici = kullaniciAdi()
    const sonuc = await require('../fatura/cekirdek').faturaKes(girdi, bagimliliklariKur())

    const depo = require('./trendyol-siparis')
    if (sonuc.senk_id) depo.alanGuncelle(paket_id, { fatura_senk_id: sonuc.senk_id })
    // Fatura kesilmediyse (hata/belirsiz) Trendyol'a HİÇBİR ŞEY gönderilmez:
    // olmayan bir belgenin linkini bildirmek müşteriye bozuk bağlantı gösterirdi.
    if (sonuc.durum !== 'tamam') return { ...sonuc, trendyol: null }
    if (!sonuc.url) {
      return { ...sonuc, trendyol: null,
        uyari: 'Fatura kesildi ama sağlayıcı belge bağlantısı döndürmedi; Trendyol tarafına link gönderilemedi.' }
    }

    depo.alanGuncelle(paket_id, { fatura_url: sonuc.url })
    try {
      const api = require('../trendyol/siparis')
      await api.faturaLinkiGonder({ paketId: paket_id, url: sonuc.url })
      depo.alanGuncelle(paket_id, { fatura_gonderildi: 1 })
    } catch (e) {
      // Fatura KESİLDİ ama link gidemedi — bu iki ayrı olaydır ve ayrı raporlanır.
      return { ...sonuc, trendyol: { gonderildi: false, hata: e.message },
        uyari: 'Fatura kesildi ancak Trendyol tarafına bağlantı gönderilemedi: ' + e.message }
    }

    // GERİ OKU: Trendyol gerçekten aldı mı?
    const guncel = await require('../trendyol/siparis-ipc')._paketiTazele(paket_id)
    const dogrulandi = !!(guncel && (guncel.ty_fatura_link || guncel.ty_fatura_durum))
    return {
      ...sonuc,
      trendyol: { gonderildi: true, dogrulandi, durum: guncel && guncel.ty_fatura_durum },
      uyari: dogrulandi ? null
        : 'Bağlantı gönderildi ama Trendyol tarafında henüz görünmüyor. Birkaç dakika sonra tekrar bakın; kalıcıysa fatura dosyası olarak gönderin.',
    }
  },

  // Sipariş listesinde satır durumunu göstermek için. Yetki BİLEREK geniş:
  // fatura kesemeyen kasiyer de "bu sipariş faturalı mı" görebilmeli.
  'fatura:durumlar': async ({ kanal = 'perakende' } = {}) => {
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
