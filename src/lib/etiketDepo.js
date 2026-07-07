// Kargo etiketi PNG'lerinin Supabase Storage köprüsü (PC'ler arası basım).
// Etiket PNG'leri DB'yi (500MB limit) şişirmesin diye AYRI Storage bucket'ında durur;
// DB'ye sadece minik dosya yolu (etiket_storage_yol) yazılır ve senkronlanır.
// Saklama: 5 aydan eski etiketler otomatik silinir (depo ~725MB'de sabit kalır).
import { supabase } from './supabase'

const BUCKET = 'kargo-etiketleri'

const invoke = async (channel, ...args) => {
  const r = await window.api.invoke(channel, ...args)
  if (!r.ok) throw new Error(r.error)
  return r.data
}

// Bu PC'de oluşturulup henüz yüklenmemiş etiketleri Storage'a yükler, yolu DB'ye yazar.
// Sessiz çalışır (sync döngüsünde çağrılır); hata olursa bir sonraki turda tekrar dener.
export async function etiketleriYukle() {
  let yuklenen = 0
  try {
    const bekleyen = await invoke('kargo:etiket-yuklenecekler')
    for (const k of bekleyen) {
      const yol = `${k.senk_id}.json`
      const govde = new Blob([k.barkod_png], { type: 'application/json' })
      const { error } = await supabase.storage.from(BUCKET).upload(yol, govde, { upsert: true, contentType: 'application/json' })
      if (error) { console.warn('[etiketDepo] yükleme hatası', yol, error.message); continue }
      await invoke('kargo:etiket-yol-yaz', { id: k.id, yol })
      yuklenen++
    }
  } catch (e) { console.warn('[etiketDepo] yükleme turu:', e.message) }
  return yuklenen
}

// Storage'dan bir etiketi indirir → base64 PNG dizisi döndürür (basmak için).
export async function etiketIndir(yol) {
  const { data, error } = await supabase.storage.from(BUCKET).download(yol)
  if (error) throw new Error('Etiket indirilemedi: ' + error.message)
  const metin = await data.text()
  try { return JSON.parse(metin) } catch { return [] }
}

// 5 aydan eski etiketleri Storage'dan siler ve DB yolunu temizler (depoyu sabit tutar).
export async function eskiEtiketleriTemizle() {
  let silinen = 0
  try {
    const eskiler = await invoke('kargo:etiket-eskiler', 5)
    for (const k of eskiler) {
      const { error } = await supabase.storage.from(BUCKET).remove([k.etiket_storage_yol])
      // "not found" olsa bile yolu temizle (tekrar denemesin).
      if (error && !/not.*found/i.test(error.message)) { console.warn('[etiketDepo] silme:', error.message); continue }
      await invoke('kargo:etiket-yol-temizle', k.id)
      silinen++
    }
  } catch (e) { console.warn('[etiketDepo] temizlik turu:', e.message) }
  return silinen
}
