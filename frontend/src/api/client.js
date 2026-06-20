import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const urunlerApi = {
  listele: (params) => api.get('/urunler', { params }),
  getir: (id) => api.get(`/urunler/${id}`),
  barkodla: (barkod) => api.get(`/urunler/barkod/${barkod}`),
  olustur: (veri) => api.post('/urunler', veri),
  guncelle: (id, veri) => api.put(`/urunler/${id}`, veri),
  sil: (id) => api.delete(`/urunler/${id}`),
  stok: (id) => api.get(`/urunler/${id}/stok`),
}

export const musteriApi = {
  listele: (params) => api.get('/musteriler', { params }),
  getir: (id) => api.get(`/musteriler/${id}`),
  olustur: (veri) => api.post('/musteriler', veri),
  guncelle: (id, veri) => api.put(`/musteriler/${id}`, veri),
  sil: (id) => api.delete(`/musteriler/${id}`),
}

export const satisApi = {
  listele: (params) => api.get('/satislar', { params }),
  getir: (id) => api.get(`/satislar/${id}`),
  olustur: (veri) => api.post('/satislar', veri),
}

export const stokApi = {
  listele: (params) => api.get('/stok', { params }),
  guncelle: (veri) => api.put('/stok/guncelle', veri),
  sayimBaslat: (veri) => api.post('/stok/sayim/baslat', veri),
  sayimKalem: (sayimId, veri) => api.put(`/stok/sayim/${sayimId}/kalem`, veri),
  sayimTamamla: (sayimId, stoguGuncelle) => api.post(`/stok/sayim/${sayimId}/tamamla`, null, { params: { stogu_guncelle: stoguGuncelle } }),
  sayimGetir: (sayimId) => api.get(`/stok/sayim/${sayimId}`),
}

export const lokasyonApi = {
  listele: () => api.get('/lokasyonlar'),
  olustur: (veri) => api.post('/lokasyonlar', veri),
}
