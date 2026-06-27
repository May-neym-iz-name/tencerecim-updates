import { useState, useEffect } from 'react'

// useState gibi ama değeri localStorage'da saklar — sekme değişip component
// unmount olsa bile (ve uygulama yeniden açılınca) durum korunur.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? JSON.parse(raw) : initial
    } catch { return initial }
  })

  useEffect(() => {
    try {
      if (value === undefined || value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
    } catch { /* kota/erişim hatası — yok say */ }
  }, [key, value])

  return [value, setValue]
}
