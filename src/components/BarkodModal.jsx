import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { barkodApi } from '../api/ipc'
import { barkodSvg, barkodYazdirHtml, ETIKET_GENISLIK_MM, ETIKET_YUKSEKLIK_MM } from '../lib/barkod'

const MAGAZA_ADI = 'TENCERECİM'
const YAZICI_KEY = 'barkod_yazici'
const FIYAT_KEY = 'barkod_fiyat_goster'

// Tek bir ürün için barkod etiketi önizleyip yazdıran modal.
// 45mm x 20mm OS-214 plus etiketi içindir.
export default function BarkodModal({ urun, onKapat }) {
  const deger = urun.barkod || urun.sku || ''
  const [adet, setAdet] = useState(1)
  const [fiyatGoster, setFiyatGoster] = useState(() => localStorage.getItem(FIYAT_KEY) !== '0')
  const [yazicilar, setYazicilar] = useState([])
  const [secilenYazici, setSecilenYazici] = useState(() => localStorage.getItem(YAZICI_KEY) || '')
  const [yazdiriliyor, setYazdiriliyor] = useState(false)

  useEffect(() => {
    barkodApi.yazicilar()
      .then(list => {
        setYazicilar(list)
        setSecilenYazici(prev => {
          if (prev && list.some(y => y.ad === prev)) return prev
          const varsayilan = list.find(y => y.varsayilan)
          return varsayilan ? varsayilan.ad : ''
        })
      })
      .catch(e => toast.error('Yazıcılar alınamadı: ' + e.message))
  }, [])

  // Önizleme barkodu (geçersiz değerde null).
  const onizlemeSvg = useMemo(() => {
    if (!deger) return null
    try { return barkodSvg(deger) } catch { return null }
  }, [deger])

  function handleFiyatGoster(e) {
    const v = e.target.checked
    setFiyatGoster(v)
    localStorage.setItem(FIYAT_KEY, v ? '1' : '0')
  }

  function handleYaziciSec(e) {
    setSecilenYazici(e.target.value)
    localStorage.setItem(YAZICI_KEY, e.target.value)
  }

  async function handleYazdir() {
    if (!deger) return
    setYazdiriliyor(true)
    try {
      const html = barkodYazdirHtml({
        magaza: MAGAZA_ADI,
        ad: urun.ad,
        deger,
        fiyat: urun.satis_fiyati,
        adet: parseInt(adet) || 1,
        fiyatGoster,
      })
      await barkodApi.yazdir(html, secilenYazici || undefined)
      toast.success(secilenYazici ? 'Barkod yazıcıya gönderildi' : 'Yazdırma penceresi açıldı')
      onKapat()
    } catch (e) {
      toast.error(e.message)
    }
    setYazdiriliyor(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold mb-1">Barkod Bas</h3>
        <p className="text-sm text-gray-500 mb-4 truncate" title={urun.ad}>{urun.ad}</p>

        {!deger ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm mb-4">
            Bu üründe barkod veya SKU yok. Önce ürünü düzenleyip barkod ekleyin.
          </div>
        ) : (
          <>
            {/* Etiket önizleme — gerçek oran 45x20mm */}
            <div className="flex justify-center mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded bg-white flex flex-col items-center justify-center text-center overflow-hidden"
                style={{ width: `${ETIKET_GENISLIK_MM * 4}px`, height: `${ETIKET_YUKSEKLIK_MM * 4}px`, padding: '4px' }}>
                <div className="font-bold leading-none" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>{MAGAZA_ADI}</div>
                <div className="leading-tight overflow-hidden" style={{ fontSize: '9px', maxHeight: '2.1em' }}>{urun.ad}</div>
                {onizlemeSvg && (
                  <div className="w-full leading-none my-0.5" style={{ maxHeight: '36px' }}
                    dangerouslySetInnerHTML={{ __html: onizlemeSvg }} />
                )}
                <div className="leading-none" style={{ fontSize: '9px', letterSpacing: '1.5px' }}>{deger}</div>
                {fiyatGoster && (
                  <div className="font-bold leading-none" style={{ fontSize: '11px' }}>
                    {(urun.satis_fiyati || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Yazıcı</label>
                <select value={secilenYazici} onChange={handleYaziciSec}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Sistem yazdırma penceresi (seç)</option>
                  {yazicilar.map(y => (
                    <option key={y.ad} value={y.ad}>{y.aciklama}{y.varsayilan ? ' (varsayılan)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Adet</label>
                  <input type="number" min={1} max={500} value={adet}
                    onChange={e => setAdet(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm mt-5 cursor-pointer">
                  <input type="checkbox" checked={fiyatGoster} onChange={handleFiyatGoster} />
                  Fiyatı göster
                </label>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={handleYazdir} disabled={!deger || yazdiriliyor}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
            {yazdiriliyor ? 'Yazdırılıyor...' : '🏷️ Yazdır'}
          </button>
          <button onClick={onKapat} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
        </div>
      </div>
    </div>
  )
}
