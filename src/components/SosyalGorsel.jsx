import { useEffect, useState } from 'react'
import { metaApi } from '../api/ipc'

// Sosyal medya görselleri için ortak yükleyici.
//
// Meta'nın görsel adresleri süreli olduğundan <img src={ham_url}> eski gönderilerde
// kırık çıkıyordu (ölçüm: 2022-2025 kayıtları HTTP 403). Görseller artık ana süreçte
// bir kez diske indirilir; buradan data URI olarak gelir. Aynı görsel ekranda birden
// çok yerde geçebildiği için oturum boyu bellekte de tutulur (IPC gidiş-gelişi azaltır).
const bellek = new Map() // anahtar -> data URI | null (null = bulunamadı, tekrar deneme)

function anahtarla(tur, konuId) { return `${tur}:${konuId}` }

function getir(tur, konuId) {
  const k = anahtarla(tur, konuId)
  if (bellek.has(k)) return Promise.resolve(bellek.get(k))
  const istek = (tur === 'profil' ? metaApi.profilFoto(konuId) : metaApi.gonderiGorsel(konuId))
    .then(v => { bellek.set(k, v || null); return v || null })
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
