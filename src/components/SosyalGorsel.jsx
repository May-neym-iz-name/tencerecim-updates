import { useEffect, useState } from 'react'
import { metaApi } from '../api/ipc'

// Sosyal medya görselleri için ortak yükleyici.
//
// Meta'nın görsel adresleri süreli olduğundan <img src={ham_url}> eski gönderilerde
// kırık çıkıyordu (ölçüm: 2022-2025 kayıtları HTTP 403). Görseller artık ana süreçte
// bir kez diske indirilir; buradan data URI olarak gelir.
//
// BELLEK SINIRI (2026-08-04 ölçümü): burası eskiden sınırsız bir Map'ti ve hiç
// boşaltılmıyordu. Renderer süreci 229 MB özel bellek tutuyordu (tepe 498 MB), GPU
// süreci ayrıca 118 MB — kullanıcı gezindikçe her görsel base64 string olarak
// oturum sonuna kadar kalıyordu. İki düzeltme birlikte gelir:
//
//   1. data URI yerine BLOB URL: base64 ikili veriden %33 büyüktür ve JS string'i
//      olarak heap'te durur; blob ise tarayıcının kendi deposunda tutulur.
//   2. LRU tavanı: en son kullanılan SINIR kadar görsel tutulur, taşan blob
//      revokeObjectURL ile GERÇEKTEN serbest bırakılır (revoke edilmeyen blob
//      sayfa ömrü boyunca sızar — data URI'dan farkı kalmazdı).
const SINIR = 150 // ~150 küçük görsel; liste ekranında aynı anda görünenin çok üstü
const bellek = new Map() // anahtar -> blob URL | null (null = bulunamadı, tekrar deneme)

function anahtarla(tur, konuId) { return `${tur}:${konuId}` }

// Map ekleme sırasını korur → ilk anahtar en eski kullanılandır.
function tahliyeEt() {
  while (bellek.size > SINIR) {
    const enEski = bellek.keys().next().value
    const deger = bellek.get(enEski)
    if (deger) URL.revokeObjectURL(deger)
    bellek.delete(enEski)
  }
}

// Kullanılanı sona taşı (LRU): sil-yeniden ekle, Map'te sırayı güncellemenin tek yolu.
function tazele(k) {
  if (!bellek.has(k)) return undefined
  const v = bellek.get(k)
  bellek.delete(k)
  bellek.set(k, v)
  return v
}

// Ana süreç data URI döndürüyor; blob'a çevir ki base64 string'i heap'te tutmayalım.
function blobaCevir(dataUri) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null
  try {
    const [bas, veri] = dataUri.split(',')
    const tip = (bas.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg'
    const ikili = atob(veri)
    const bayt = new Uint8Array(ikili.length)
    for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i)
    return URL.createObjectURL(new Blob([bayt], { type: tip }))
  } catch {
    return null // bozuk veri → görselsiz devam et, ekranı kırma
  }
}

function getir(tur, konuId) {
  const k = anahtarla(tur, konuId)
  if (bellek.has(k)) return Promise.resolve(tazele(k))
  const istek = (tur === 'profil' ? metaApi.profilFoto(konuId) : metaApi.gonderiGorsel(konuId))
    .then(v => {
      const url = blobaCevir(v)
      bellek.set(k, url)
      tahliyeEt()
      return url
    })
    .catch(() => { bellek.set(k, null); return null })
  return istek
}

// tur: 'gonderi' | 'profil'. Dönüş: data URI ya da null (henüz yüklenmedi / yok).
export function useSosyalGorsel(konuId, tur = 'gonderi') {
  const [kaynak, setKaynak] = useState(() => bellek.get(anahtarla(tur, konuId)) || null)

  useEffect(() => {
    if (!konuId) { setKaynak(null); return }
    let iptal = false
    getir(tur, konuId).then(v => { if (!iptal) setKaynak(v) })
    return () => { iptal = true }
  }, [konuId, tur])

  return kaynak
}

// Gönderi küçük görseli. Görsel yoksa (silinmiş gönderi / indirilemedi) yedek içerik gösterilir.
export default function SosyalGorsel({ konuId, className, yedek = null }) {
  const kaynak = useSosyalGorsel(konuId, 'gonderi')
  if (!kaynak) return yedek
  return <img src={kaynak} alt="" className={className} />
}
