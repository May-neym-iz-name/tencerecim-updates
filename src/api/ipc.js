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
  olustur: (veri) => invoke('urunler:olustur', veri),
  guncelle: (id, veri) => invoke('urunler:guncelle', { id, ...veri }),
  sil: (id) => invoke('urunler:sil', id),
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
  sil: (id) => invoke('kategoriler:sil', id),
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
  etiketYazdir: (pngler, yazici) => invoke('kargo:etiket-yazdir', { pngler, yazici }),
  takip: (takipNo) => invoke('kargo:takip', takipNo),
  iptal: (id) => invoke('kargo:iptal', id),
  pickup: (veri) => invoke('kargo:pickup', veri),
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

export const onlineSiparisApi = {
  listele: (params) => invoke('online-siparis:listele', params),
  getir: (id) => invoke('online-siparis:getir', id),
  kalemLokasyon: (kalemId, lokasyonId) => invoke('online-siparis:kalem-lokasyon', { kalemId, lokasyonId }),
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
