import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ayarlariGetir, ayarKaydet } from '../lib/ayarlar'

const VARSAYILAN = { musteri_zorunlu: false, iskonto_tipi: 'oran' }

const AyarlarContext = createContext(null)

export function AyarlarProvider({ children }) {
  const [ayarlar, setAyarlar] = useState(VARSAYILAN)
  const [yuklendi, setYuklendi] = useState(false)

  const yenile = useCallback(async () => {
    try {
      const m = await ayarlariGetir()
      setAyarlar({ ...VARSAYILAN, ...m })
    } catch {
      // Tablo henüz yoksa veya bağlantı yoksa güvenli varsayılanlarla devam et
      setAyarlar(VARSAYILAN)
    }
    setYuklendi(true)
  }, [])

  useEffect(() => { yenile() }, [yenile])

  const kaydet = useCallback(async (anahtar, deger) => {
    await ayarKaydet(anahtar, deger)
    setAyarlar(a => ({ ...a, [anahtar]: deger }))
  }, [])

  return (
    <AyarlarContext.Provider value={{ ayarlar, yuklendi, kaydet, yenile }}>
      {children}
    </AyarlarContext.Provider>
  )
}

export function useAyarlar() {
  const ctx = useContext(AyarlarContext)
  if (!ctx) throw new Error('useAyarlar, AyarlarProvider içinde kullanılmalı')
  return ctx
}
