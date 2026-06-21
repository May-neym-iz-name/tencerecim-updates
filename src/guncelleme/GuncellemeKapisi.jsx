import { useEffect, useRef, useState } from 'react'

// Güvenlik için: güncelleme kontrolü çok uzun sürerse (internet yok vb.)
// kullanıcıyı sonsuza kadar bekletmemek adına uygulamaya geç.
const ZAMAN_ASIMI_MS = 10000

/**
 * Uygulama açılışında giriş ekranından ÖNCE güncellemeleri kontrol eder.
 * Güncelleme varsa indirme/kurulum ekranını gösterir, bittiğinde uygulamayı
 * yeniden başlatır. Güncelleme yoksa veya hata olursa children (giriş) gösterilir.
 */
export default function GuncellemeKapisi({ children }) {
  // durum: 'kontrol' | 'mevcut' | 'indiriliyor' | 'indirildi' | 'hazir'
  const [durum, setDurum] = useState('kontrol')
  const [yuzde, setYuzde] = useState(0)
  const [surum, setSurum] = useState(null)
  const yenidenBaslatildi = useRef(false)

  useEffect(() => {
    let zamanlayici

    const gec = () => setDurum((d) => (d === 'kontrol' || d === 'mevcut' ? 'hazir' : d))

    window.api.on('update:durum', (p) => {
      switch (p?.tip) {
        case 'kontrol':
          setDurum('kontrol')
          break
        case 'mevcut':
          clearTimeout(zamanlayici)
          setSurum(p.surum)
          setDurum('mevcut')
          break
        case 'indiriliyor':
          clearTimeout(zamanlayici)
          setYuzde(p.yuzde ?? 0)
          setDurum('indiriliyor')
          break
        case 'indirildi':
          setDurum('indirildi')
          if (!yenidenBaslatildi.current) {
            yenidenBaslatildi.current = true
            setTimeout(() => window.api.invoke('update:kurVeYenidenBaslat'), 1200)
          }
          break
        case 'yok':
        case 'hata':
        default:
          gec()
          break
      }
    })

    // Kontrolü başlat; başlamazsa veya yanıt gelmezse zaman aşımıyla geç.
    window.api.invoke('update:kontrolEt').catch(() => gec())
    zamanlayici = setTimeout(gec, ZAMAN_ASIMI_MS)

    return () => {
      clearTimeout(zamanlayici)
      window.api.removeAllListeners('update:durum')
    }
  }, [])

  if (durum === 'hazir') return children

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center gap-5 px-8 text-center max-w-sm">
        <div className="text-4xl">🏪</div>
        <h1 className="text-lg font-semibold">Tencerecim Mağaza</h1>

        {durum === 'kontrol' && (
          <>
            <Spinner />
            <p className="text-sm text-gray-300">Güncellemeler kontrol ediliyor…</p>
          </>
        )}

        {durum === 'mevcut' && (
          <>
            <Spinner />
            <p className="text-sm text-gray-300">
              Yeni sürüm bulundu{surum ? ` (v${surum})` : ''}, indiriliyor…
            </p>
          </>
        )}

        {durum === 'indiriliyor' && (
          <div className="w-full">
            <p className="text-sm text-gray-300 mb-2">Güncelleme indiriliyor… %{yuzde}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200"
                style={{ width: `${yuzde}%` }}
              />
            </div>
          </div>
        )}

        {durum === 'indirildi' && (
          <>
            <Spinner />
            <p className="text-sm text-gray-300">
              Güncelleme tamamlandı, uygulama yeniden başlatılıyor…
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
  )
}
