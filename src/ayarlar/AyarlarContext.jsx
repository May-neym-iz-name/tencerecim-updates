import { createContext, useContext, useState, useCallback } from 'react'

// Uygulama ayarları YEREL olarak (localStorage) saklanır — Supabase gerektirmez.
// Bunlar makineye/kullanıcıya özel tercihlerdir, merkezi politika değil.
// odeme_oran_*: ödeme tipine göre yüzdesel fiyat farkı (pozitif = artırım, negatif = indirim).
const VARSAYILAN = {
  musteri_zorunlu: false, iskonto_tipi: 'oran',
  odeme_oran_nakit: 0, odeme_oran_kart: 0, odeme_oran_havale: 0,
  // Açıkken: kasa (vardiya) açılmadan nakit satış yapılamaz (kart/havale serbest).
  kasa_zorunlu_nakit: false,
  // Açıkken: stok yetersiz olsa bile satış tamamlanabilir (stok 0'ın altına düşmez).
  stok_yetersiz_satis: false,
  // Kargo etiketinde basılan gönderen telefonu. Boşsa mağaza gönderici kaydından /
  // UPS ayarlarından otomatik bulunur; dolduranın yazdığı numara HEP öncelikli.
  etiket_gonderen_telefon: '',
}
const ANAHTAR = 'tencerecim_ayarlar'

function yukle() {
  try {
    const raw = localStorage.getItem(ANAHTAR)
    if (raw) return { ...VARSAYILAN, ...JSON.parse(raw) }
  } catch { /* bozuk veri → varsayılan */ }
  return VARSAYILAN
}

// Context dışında (baskı anında vb.) tek ayar okumak için: hook zinciri gerektirmez,
// her çağrıda localStorage'dan günceli okur.
export function ayarOku(anahtar, varsayilan = '') {
  const v = yukle()[anahtar]
  return v === undefined || v === null || v === '' ? varsayilan : v
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

  // Buluttan ayar çekildikten (localStorage güncellendikten) sonra state'i tazeler;
  // böylece senkronlanan ayarlar uygulamayı kapatmadan anında etkili olur.
  const yenile = useCallback(() => setAyarlar(yukle()), [])

  return (
    <AyarlarContext.Provider value={{ ayarlar, kaydet, yenile }}>
      {children}
    </AyarlarContext.Provider>
  )
}

export function useAyarlar() {
  const ctx = useContext(AyarlarContext)
  if (!ctx) throw new Error('useAyarlar, AyarlarProvider içinde kullanılmalı')
  return ctx
}
