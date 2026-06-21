import { supabase } from './supabase'

// Tüm ayarları { anahtar: deger } olarak getirir.
export async function ayarlariGetir() {
  const { data, error } = await supabase.from('ayarlar').select('anahtar, deger')
  if (error) throw new Error(error.message)
  const map = {}
  for (const r of data) map[r.anahtar] = r.deger
  return map
}

// Tek bir ayarı kaydeder (yalnızca yönetici/süper yönetici — RLS ile korunur).
export async function ayarKaydet(anahtar, deger) {
  const { error } = await supabase
    .from('ayarlar')
    .upsert({ anahtar, deger, guncelleme: new Date().toISOString() }, { onConflict: 'anahtar' })
  if (error) throw new Error(error.message)
}
