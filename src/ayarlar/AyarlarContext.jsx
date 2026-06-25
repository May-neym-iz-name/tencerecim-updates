import { createContext, useContext, useState, useCallback } from 'react'

// Uygulama ayarları YEREL olarak (localStorage) saklanır — Supabase gerektirmez.
// Bunlar makineye/kullanıcıya özel tercihlerdir, merkezi politika değil.
// odeme_oran_*: ödeme tipine göre yüzdesel fiyat farkı (pozitif = artırım, negatif = indirim).
const VARSAYILAN = {
  musteri_zorunlu: false, iskonto_tipi: 'oran',
  odeme_oran_nakit: 0, odeme_oran_kart: 0, odeme_oran_havale: 0,
}
const ANAHTAR = 'tencerecim_ayarlar'

function yukle() {
  try {
    const raw = localStorage.getItem(ANAHTAR)
    if (raw) return { ...VARSAYILAN, ...JSON.parse(raw) }
  } catch { /* bozuk veri → varsayılan */ }
  return VARSAYILAN
}

const AyarlarContext = createContext(null)

export function AyarlarProvider({ children }) {
  const [ayarlar, setAyarlar] = useState(yukle)

  const kaydet = useCallback((anahtar, deger) => {
    setAyarlar(a => {
      const yeni = { ...a, [anahtar]: deger }
      try { localStorage.setItem(ANAHTAR, JSON.stringify(yeni)) } catch { /* yok say */ }
      return yeni
    })
  }, [])

  return (
    <AyarlarContext.Provider value={{ ayarlar, kaydet }}>
      {children}
    </AyarlarContext.Provider>
  )
}

export function useAyarlar() {
  const ctx = useContext(AyarlarContext)
  if (!ctx) throw new Error('useAyarlar, AyarlarProvider içinde kullanılmalı')
  return ctx
}
