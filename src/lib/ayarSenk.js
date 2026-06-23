// Ayar senkronu: yerel ayarları Supabase'deki küçük 'uygulama_ayarlar' tablosuyla
// eşitler. Yalnızca ayar grupları (ups/ikas/gonderici/lokasyon_ikas/genel) — büyük
// operasyonel veri (ürün/satış/stok/sipariş) senkronlanmaz.
import { supabase } from './supabase'

const invoke = async (channel, ...args) => {
  if (!window.api) throw new Error('Electron API bulunamadı')
  const r = await window.api.invoke(channel, ...args)
  if (!r.ok) throw new Error(r.error)
  return r.data
}

const GENEL_ANAHTAR = 'tencerecim_ayarlar' // AyarlarContext localStorage anahtarı

// Buluttan ayarları çekip yerel'e uygular. Fresh PC bu sayede tüm ayarları alır.
export async function buluttanAl() {
  const { data, error } = await supabase.from('uygulama_ayarlar').select('anahtar, deger')
  if (error) throw new Error(error.message)
  if (!data?.length) return { uygulandi: false }

  const map = {}
  for (const r of data) map[r.anahtar] = r.deger

  // Yerel SQLite ayarları (ups/ikas/gonderici/lokasyon_ikas)
  await invoke('ayar-senk:uygula', {
    ups: map.ups, ikas: map.ikas, gonderici: map.gonderici, lokasyon_ikas: map.lokasyon_ikas,
  })

  // Genel app ayarları (localStorage)
  if (map.genel && typeof map.genel === 'object') {
    try { localStorage.setItem(GENEL_ANAHTAR, JSON.stringify(map.genel)) } catch { /* yok say */ }
  }
  return { uygulandi: true }
}

// Yerel ayarları buluta yükler (her grup tek satır → şişmez). Son-yazan kazanır.
export async function bulutaYukle() {
  const yerel = await invoke('ayar-senk:topla') // { ups, ikas, gonderici, lokasyon_ikas }
  let genel = {}
  try { genel = JSON.parse(localStorage.getItem(GENEL_ANAHTAR) || '{}') } catch { /* yok */ }

  const satirlar = [
    { anahtar: 'ups', deger: yerel.ups || {} },
    { anahtar: 'ikas', deger: yerel.ikas || {} },
    { anahtar: 'gonderici', deger: yerel.gonderici || {} },
    { anahtar: 'lokasyon_ikas', deger: yerel.lokasyon_ikas || {} },
    { anahtar: 'genel', deger: genel },
  ].map(s => ({ ...s, guncelleme: new Date().toISOString() }))

  const { error } = await supabase.from('uygulama_ayarlar').upsert(satirlar, { onConflict: 'anahtar' })
  if (error) throw new Error(error.message)
  return { ok: true }
}
