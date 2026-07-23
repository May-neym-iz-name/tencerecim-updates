const invoke = async (channel, ...args) => {
  if (!window.api) throw new Error('Electron API bulunamadı')
  const result = await window.api.invoke(channel, ...args)
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const urunlerApi = {
  listele: (params) => invoke('urunler:listele', params),
  getir: (id) => invoke('urunler:getir', id),
  barkodla: (barkod) => invoke('urunler:barkodla', barkod),
  barkodUret: (id) => invoke('urunler:barkodUret', id),
  sonrakiStokKodu: (marka_id) => invoke('urunler:sonraki-stok-kodu', marka_id),
  olustur: (veri) => invoke('urunler:olustur', veri),
  guncelle: (id, veri) => invoke('urunler:guncelle', { id, ...veri }),
  sil: (id) => invoke('urunler:sil', id),
  aktiflik: (id, aktif) => invoke('urunler:aktiflik', { id, aktif }),
  stok: (id) => invoke('urunler:stok', id),
}

export const musteriApi = {
  listele: (params) => invoke('musteriler:listele', params),
  getir: (id) => invoke('musteriler:getir', id),
  olustur: (veri) => invoke('musteriler:olustur', veri),
  guncelle: (id, veri) => invoke('musteriler:guncelle', { id, ...veri }),
  sil: (id) => invoke('musteriler:sil', id),
}

export const satisApi = {
  listele: (params) => invoke('satislar:listele', params),
  getir: (id) => invoke('satislar:getir', id),
  olustur: (veri) => invoke('satislar:olustur', veri),
  gunlukOzet: (params) => invoke('satislar:gunluk-ozet', params),
  iptal: (id) => invoke('satislar:iptal', id),
  iade: (veri) => invoke('satislar:iade', veri),
}

export const sistemApi = {
  linkAc: (url) => invoke('sistem:link-ac', url),
}

// Telefonu uluslararası WhatsApp formatına çevirir (TR varsayılan +90).
export function whatsappLink(telefon, mesaj = '') {
  const d = String(telefon || '').replace(/\D/g, '')
  if (!d) return null
  let no = d
  if (no.length === 10) no = '90' + no            // 5xx... → 905xx...
  else if (no.length === 11 && no.startsWith('0')) no = '90' + no.slice(1)
  return `https://wa.me/${no}${mesaj ? `?text=${encodeURIComponent(mesaj)}` : ''}`
}

export const stokApi = {
  listele: (params) => invoke('stok:listele', params),
  guncelle: (veri) => invoke('stok:guncelle', veri),
  minimumGuncelle: (veri) => invoke('stok:minimum-guncelle', veri),
  sayimBaslat: (veri) => invoke('sayim:baslat', veri),
  sayimKalem: (sayim_id, veri) => invoke('sayim:kalem-gir', { sayim_id, ...veri }),
  sayimGetir: (sayim_id) => invoke('sayim:getir', sayim_id),
  sayimTamamla: (sayim_id, stogu_guncelle) => invoke('sayim:tamamla', { sayim_id, stogu_guncelle }),
}

export const lokasyonApi = {
  listele: () => invoke('lokasyonlar:listele'),
  olustur: (veri) => invoke('lokasyonlar:olustur', veri),
  guncelle: (id, veri) => invoke('lokasyonlar:guncelle', { id, ...veri }),
}

export const markaApi = {
  listele: () => invoke('markalar:listele'),
  olustur: (ad) => invoke('markalar:olustur', { ad }),
  guncelle: (id, ad) => invoke('markalar:guncelle', { id, ad }),
  sil: (id) => invoke('markalar:sil', id),
}

export const tedarikciApi = {
  listele: () => invoke('tedarikciler:listele'),
  olustur: (veri) => invoke('tedarikciler:olustur', veri),
  sil: (id) => invoke('tedarikciler:sil', id),
}

export const kategoriApi = {
  listele: () => invoke('kategoriler:listele'),
  olustur: (veri) => invoke('kategoriler:olustur', veri),
  guncelle: (id, ad) => invoke('kategoriler:guncelle', { id, ad }),
  sil: (id) => invoke('kategoriler:sil', id),
}

// Kendi setlerimiz (tek set fiyatlı ürün paketleri).
export const setApi = {
  listele: () => invoke('setler:listele'),
  olustur: (veri) => invoke('setler:olustur', veri),
  guncelle: (veri) => invoke('setler:guncelle', veri),
  sil: (id) => invoke('setler:sil', id),
}

export const excelApi = {
  dosyaSec: () => invoke('excel:dosya-sec'),
  urunYukle: (yol) => invoke('excel:urun-yukle', yol),
}

export const fisApi = {
  yazdir: (satis_id, sessiz = false) => invoke('fis:yazdir', { satis_id, sessiz }),
}

export const barkodApi = {
  yazicilar: () => invoke('barkod:yazicilar'),
  yazdir: (html, yazici) => invoke('barkod:yazdir', { html, yazici }),
}

export const upsApi = {
  ayarGetir: () => invoke('ups-ayar:getir'),
  ayarKaydet: (veri) => invoke('ups-ayar:kaydet', veri),
  iller: () => invoke('ups:iller'),
  ilceler: (ilKodu) => invoke('ups:ilceler', ilKodu),
  yazicilar: () => invoke('barkod:yazicilar'),
}

export const lokasyonGondericiApi = {
  getir: () => invoke('lokasyon-gonderici:getir'),
  kaydet: (veri) => invoke('lokasyon-gonderici:kaydet', veri),
  ilIlceBul: (il, ilce) => invoke('ups:il-ilce-bul', { il, ilce }),
}

export const kargoApi = {
  olustur: (veri) => invoke('kargo:olustur', veri),
  listele: () => invoke('kargo:listele'),
  etiket: (id) => invoke('kargo:etiket', id),
  etiketToplu: (idler) => invoke('kargo:etiket-toplu', idler),
  etiketYazdir: (pngler, yazici, sayfaBasina) => invoke('kargo:etiket-yazdir', { pngler, yazici, sayfaBasina }),
  etiketOnizle: (pngler, sayfaBasina) => invoke('kargo:etiket-onizle', { pngler, sayfaBasina }),
  takip: (takipNo) => invoke('kargo:takip', takipNo),
  // Tüm bekleyen gönderilerin durumunu UPS'ten anında sorgular (30 dk'lık otomatik turu beklemeden).
  takipYokla: () => invoke('kargo:takip-yokla'),
  iptal: (id) => invoke('kargo:iptal', id),
  pickup: (veri) => invoke('kargo:pickup', veri),
  detay: (id) => invoke('kargo:detay', id),
  koliler: (takipNo) => invoke('kargo:koliler', takipNo),
  yakitOrani: () => invoke('kargo:yakit-orani'),
}

export const ikasApi = {
  ayarGetir: () => invoke('ikas-ayar:getir'),
  ayarKaydet: (veri) => invoke('ikas-ayar:kaydet', veri),
  test: () => invoke('ikas:test'),
  lokasyonEsle: () => invoke('ikas:lokasyon-esle'),
  stokGonder: () => invoke('ikas:stok-gonder'),
  siparisCek: () => invoke('ikas:siparis-cek'),
  siparisGecmisCek: () => invoke('ikas:siparis-gecmis-cek'),
  durum: () => invoke('ikas:durum'),
  siparisKargola: (veri) => invoke('ikas:siparis-kargola', veri),
  siparisOdemeOnayla: (veri) => invoke('ikas:siparis-odeme-onayla', veri),
  siparisIptal: (veri) => invoke('ikas:siparis-iptal', veri),
  siparisIade: (veri) => invoke('ikas:siparis-iade', veri),
  siparisAdresGetir: (id) => invoke('ikas:siparis-adres-getir', { id }),
  siparisAdres: (veri) => invoke('ikas:siparis-adres', veri),
  siparisTazele: (id) => invoke('ikas:siparis-tazele', { id }),
  // Ek yetenekler (ekstra.js): fiyat senkronu, müşteri çekme, ürün eşleştirme, paket durumu.
  fiyatGonder: () => invoke('ikas:fiyat-gonder'),
  musteriCek: () => invoke('ikas:musteri-cek'),
  urunEsle: () => invoke('ikas:urun-esle'),
  siparisPaketler: (id) => invoke('ikas:siparis-paketler', { id }),
  siparisPaketDurum: (veri) => invoke('ikas:siparis-paket-durum', veri),
  siparisKargoIptal: (veri) => invoke('ikas:siparis-kargo-iptal', veri),
}

// Meta (Facebook/Instagram) sosyal medya entegrasyonu.
export const metaApi = {
  ayarGetir: () => invoke('meta-ayar:getir'),
  ayarKaydet: (veri) => invoke('meta-ayar:kaydet', veri),
  kurulum: () => invoke('meta:kurulum'),
  girisBaslat: (sayfaId) => invoke('meta:girisBaslat', { sayfaId }),
  durum: () => invoke('meta:durum'),
  sonDurum: () => invoke('meta:sonDurum'),
  cek: () => invoke('meta:cek'),
  yorumCevapla: (veri) => invoke('meta:yorumCevapla', veri),
  mesajCevapla: (veri) => invoke('meta:mesajCevapla', veri),
  yorumdanMesaj: (veri) => invoke('meta:yorumdanMesaj', veri),
}

// Sosyal medya gelen kutusu (yerel önbellek + personel takibi).
export const sosyalApi = {
  liste: (params) => invoke('sosyal:liste', params),
  konu: (konuId) => invoke('sosyal:konu', konuId),
  durumGuncelle: (veri) => invoke('sosyal:durumGuncelle', veri),
  ata: (veri) => invoke('sosyal:ata', veri),
  ataKonu: (veri) => invoke('sosyal:ataKonu', veri),
  not: (veri) => invoke('sosyal:not', veri),
  sayac: () => invoke('sosyal:sayac'),
  sayaclar: () => invoke('sosyal:sayaclar'),
  gonderiler: (params) => invoke('sosyal:gonderiler', params),
  konusmalar: (params) => invoke('sosyal:konusmalar', params),
  // Gönderi bazlı otomatik yorum cevabı
  sablonlar: () => invoke('sosyal:sablonlar'),
  sablonKaydet: (v) => invoke('sosyal:sablonKaydet', v),
  sablonSil: (id) => invoke('sosyal:sablonSil', id),
  // Otomasyonu hangi PC yürütüyor (çift DM kilidi — bkz. electron/meta/yurutucu.js)
  yurutucuDurum: () => invoke('sosyal:yurutucuDurum'),
  yurutucuDevral: (ad) => invoke('sosyal:yurutucuDevral', { ad }),
  otomasyonGetir: (v) => invoke('sosyal:otomasyonGetir', v),
  otomasyonKaydet: (v) => invoke('sosyal:otomasyonKaydet', v),
  otomasyonAdaySayisi: (v) => invoke('sosyal:otomasyonAdaySayisi', v),
}

export const onlineSiparisApi = {
  listele: (params) => invoke('online-siparis:listele', params),
  getir: (id) => invoke('online-siparis:getir', id),
  kalemLokasyon: (kalemId, lokasyonId) => invoke('online-siparis:kalem-lokasyon', { kalemId, lokasyonId }),
  etiketVeri: (id) => invoke('kargo-etiket:veri', id),
  etiketOnizle: (html, baslik) => invoke('kargo-etiket:onizle', { html, baslik }),
}

export const raporApi = {
  ozet: (params) => invoke('raporlar:ozet', params),
  enCokUrunler: (params) => invoke('raporlar:en-cok-urunler', params),
  satilmayanUrunler: (params) => invoke('raporlar:satilmayan-urunler', params),
  musteriSadakat: (params) => invoke('raporlar:musteri-sadakat', params),
  zamanSerisi: (params) => invoke('raporlar:zaman-serisi', params),
  kategoriKirilim: (params) => invoke('raporlar:kategori-kirilim', params),
  markaKirilim: (params) => invoke('raporlar:marka-kirilim', params),
  iadeler: (params) => invoke('raporlar:iadeler', params),
}

export const uygulamaApi = {
  surum: () => invoke('app:surum'),
}

export const panelApi = {
  ozet: () => invoke('panel:ozet'),
  dusukStok: (params) => invoke('stok:dusuk', params),
}

export const yedekApi = {
  olustur: () => invoke('yedek:olustur'),
  geriYukle: () => invoke('yedek:geri-yukle'),
}

export const kasaApi = {
  acik: (lokasyon_id) => invoke('kasa:acik', { lokasyon_id }),
  ac: (veri) => invoke('kasa:ac', veri),
  kapat: (veri) => invoke('kasa:kapat', veri),
  gecmis: (params) => invoke('kasa:gecmis', params),
}

export const giderApi = {
  ekle: (veri) => invoke('gider:ekle', veri),
  listele: (params) => invoke('gider:listele', params),
  sil: (id) => invoke('gider:sil', id),
  // Sabit (tekrarlayan) gider şablonları
  sabitListele: () => invoke('sabit-gider:listele'),
  sabitEkle: (veri) => invoke('sabit-gider:ekle', veri),
  sabitSil: (id) => invoke('sabit-gider:sil', id),
  sabitUygula: (veri) => invoke('sabit-gider:uygula', veri),
}

export const malKabulApi = {
  olustur: (veri) => invoke('mal-kabul:olustur', veri),
  listele: (params) => invoke('mal-kabul:listele', params),
  getir: (id) => invoke('mal-kabul:getir', id),
}

export const authApi = {
  beniHatirlaKaydet: (email, sifre) => invoke('auth:beni-hatirla-kaydet', { email, sifre }),
  beniHatirlaGetir: () => invoke('auth:beni-hatirla-getir'),
  beniHatirlaTemizle: () => invoke('auth:beni-hatirla-temizle'),
  // Aktif profili arka uca bildirir (backend yetki kontrolü için).
  profilAyarla: (profil) => invoke('auth:profil-ayarla', profil),
  profilTemizle: () => invoke('auth:profil-temizle'),
}
