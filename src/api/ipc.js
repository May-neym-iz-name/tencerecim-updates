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
