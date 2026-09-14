// Satış ekranı gezinmesinin ikinci düzeyi: ANA TİP.
//
// Kategoriler (48 adet, tamamı tek düzey) malzeme ile ürün tipini BİRLEŞTİRİYOR:
// "Demir Döküm Tekli Tencereler", "Granit Tencere Setleri"… Bu yüzden bir markanın
// altında 20'ye yakın kart çıkıyor ve aynı tipteki ürünler malzemeye göre dağılıyor.
//
// Bu harita 48 kategoriyi 21 ana tipe indirir. Kullanıcı kararı (2026-09-12):
// MALZEME EKSENİ NAVİGASYONDA YER ALMAZ — hiyerarşi yalnız Marka > Ürün Tipi > Model.
// "Tencere" dalında 995 ürünün malzemeye göre ayrışmadan listeleneceği ölçülerek
// bildirildi ve kabul edildi (bkz. docs/superpowers/specs/2026-09-12-satis-kategori-hiyerarsisi-design.md §9.5).
//
// Kategori↔ürün bağına DOKUNULMAZ. urunler.kategori_id olduğu gibi kalır; bu harita
// yalnızca "bu kategori hangi genel tipe ait" bilgisini ekler. ikas kategori ağacı ve
// 42/42 SEO çalışması etkilenmez ([[ikas-kategori-agaci]]).

// Ana tip → o tipe düşen kategori adları. Ad ile eşleşir (id ile DEĞİL): kategori
// id'leri PC'ler arasında farklı olabilir, ad senkronun doğal anahtarıdır.
const HARITA = {
  // Mega Granitler/Mega Çelikler burada: "Mega Boy" bir ÖLÇÜdür, ürün tipi değil
  // ([[ikas-kategori-agaci]]: "Mega Boy otomatik OLAMAZ").
  'Tencere': ['Demir Döküm Tekli Tencereler', 'Granit Tekli Tencereler', 'Çelik Tekli Tencereler',
              'Seramik Tekli Tencereler', 'Titanyum Tekli Tencereler', 'Mega Granitler', 'Mega Çelikler'],
  'Tava': ['Demir Döküm Tavalar', 'Granit Tavalar', 'Seramik Tavalar', 'Titanyum Tavalar', 'Çelik Tavalar'],
  // Bıçaklar (11 ürün) ayrı ana tip AÇILMADI — çatal-kaşık takımlarıyla aynı raf.
  'Çatal Kaşık Bıçak': ['Kaşık Çatal Bıçak', 'Bıçaklar'],
  'Çaydanlık': ['Çaydanlık Takımları'],
  // Kendi setlerimiz de buraya düşer (setler.js kayıtları), tedarikçi setleriyle birlikte.
  'Set': ['Demir Döküm Tencere Setleri', 'Granit Tencere Setleri', 'Çelik Tencere Setleri',
          'Seramik Tencere Setleri', 'Titanyum Tencere Setleri'],
  'Yemek & Servis Takımı': ['Yemek Takımları', 'Kahvaltı Takımları', 'Servis & Sunum'],
  'Izgara': ['Demir Döküm Izgaralar', 'Izgaralar'],
  'Düdüklü': ['Klasik Düdüklüler', 'Matik Düdüklüler', 'Süper Hızlı Pişiriciler'],
  'Sahan': ['Demir Döküm Sahanlar', 'Granit Sahanlar', 'Titanyum Sahanlar', 'Çelik Sahanlar'],
  'Mutfak Gereçleri': ['Mutfak Gereçleri', 'Rende Kapları', 'Süzgeçler'],
  'Bardak & Fincan': ['Bardak & Fincan'],
  'Güveç': ['Güveçler', 'Demir Döküm Güveçler'],
  'Termos': ['Termoslar'],
  'Yedek Parça': ['Yedek Parçalar'],
  'Kaçerola': ['Kaçerola'],
  'Fırın Kabı': ['Fırın Tepsileri', 'Tart Kalıpları'],
  'Cezve': ['Cezveler'],
  // Tek ana tip: ikiye bölmek için önce 13 ürünlük kategoriyi bölmek gerekir,
  // harita tek başına yetmez.
  'Karıştırma & Saklama Kabı': ['Karıştırma ve Saklama Kapları'],
  'Sütlük': ['Sütlük'],
  'Kase': ['Kaseler'],
  // Ürünü yok → satış ekranında kart çıkmaz, ama haritada KORUNUR (kategori canlanabilir).
  'Outlet': ['OUTLET'],
}

// Kategorisi olmayan ürünlerin (ölçüm 14.09: 172 aktif ürün) düştüğü sanal dal.
// 21 ana tipe EK, haritada satırı yok.
const DIGER = 'Diğer'

// Kategori adı → ana tip. Ters indeks bir kez kurulur.
const TERS = new Map()
for (const [tip, katlar] of Object.entries(HARITA)) {
  for (const k of katlar) TERS.set(k, tip)
}

/**
 * Kategori adının ana tipini verir. Haritada yoksa null döner — bu "Diğer" DEĞİLDİR:
 * null = "haritada eksik kategori" (yeni kategori açılmış, haritaya eklenmeli),
 * "Diğer" = "ürünün kategorisi hiç yok". İkisini ayırmak, haritanın bayatladığını
 * fark etmemizi sağlar; testi de bu ayrım üzerine kurulu.
 * @param {string} kategoriAdi
 * @returns {string|null}
 */
function anaTip(kategoriAdi) {
  if (!kategoriAdi) return null
  return TERS.get(String(kategoriAdi).trim()) || null
}

// Satış ekranında kartların çıkma sırası. Alfabetik DEĞİL: kasada en sık dokunulan
// tipler önde olsun (ürün sayısına göre, ölçüm 14.09). Haritada olmayan bir tip
// gelirse sona düşer.
const SIRA = Object.keys(HARITA)

/**
 * Ana tipleri satış ekranı sırasına dizer. "Diğer" DAİMA en sonda.
 * @param {string[]} tipler
 * @returns {string[]}
 */
function sirala(tipler) {
  return [...tipler].sort((a, b) => {
    if (a === DIGER) return 1
    if (b === DIGER) return -1
    const ia = SIRA.indexOf(a), ib = SIRA.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
}

module.exports = { HARITA, DIGER, anaTip, sirala, _SIRA: SIRA }
