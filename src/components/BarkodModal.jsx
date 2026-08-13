import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { barkodApi } from '../api/ipc'
import { barkodSvg, barkodYazdirHtml, VARSAYILAN_BOYUT, boyutBul } from '../lib/barkod'
import { BARKOD_YAZICI_KEY, BARKOD_BOYUT_KEY, yaziciAyarOku } from '../lib/yaziciAyarlari'

const FIYAT_KEY = 'barkod_fiyat_goster'

// Tek bir ürün için barkod etiketi önizleyip yazdıran modal.
// Yazıcı ve etiket boyutu Ayarlar > 🖨️ Yazıcılar'dan TEK SEFER tanımlanır (2026-08-13
// kararı); burada yalnız gösterilir. Adet ve fiyat baskı başına değişebildiği için kaldı.
export default function BarkodModal({ urun, onKapat }) {
  const deger = urun.barkod || urun.sku || ''
  const [adet, setAdet] = useState(1)
  const [fiyatGoster, setFiyatGoster] = useState(() => localStorage.getItem(FIYAT_KEY) !== '0')
  const [yazdiriliyor, setYazdiriliyor] = useState(false)
  // Modal her açılışta ayarlardan okur — Ayarlar'da yapılan değişiklik anında geçerli.
  const secilenYazici = yaziciAyarOku(BARKOD_YAZICI_KEY)
  const boyut = yaziciAyarOku(BARKOD_BOYUT_KEY, VARSAYILAN_BOYUT)

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

  async function handleYazdir() {
    if (!deger) return
    setYazdiriliyor(true)
    try {
      // magaza GEÇİLMİYOR: etikette mağaza adı istenmiyor. barkodYazdirHtml alanı
      // opsiyonel tutuyor (boşsa satırı hiç basmıyor), geri istenirse tek satır.
      const html = barkodYazdirHtml({
        ad: urun.ad,
        deger,
        fiyat: urun.satis_fiyati,
        adet: parseInt(adet) || 1,
        fiyatGoster,
        boyut,
      })
      const olcu = boyutBul(boyut)
      await barkodApi.yazdir(html, secilenYazici || undefined, { genislikMm: olcu.genislik, yukseklikMm: olcu.yukseklik })
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
            {/* Etiket önizleme — seçilen boyutun gerçek oranı */}
            <div className="flex justify-center mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded bg-white flex flex-col items-center justify-center text-center overflow-hidden"
                style={{ width: `${boyutBul(boyut).genislik * 4}px`, height: `${boyutBul(boyut).yukseklik * 4}px`, padding: '4px' }}>
                {/* Fiyatlıyken yazdırma düzeniyle AYNI sıkıştırma: barkod kısalır, ad 2 TAM satır
                    (flexShrink 0 — yoksa flex adı ezip tek satıra indiriyordu). */}
                <div className="leading-tight overflow-hidden flex-shrink-0" style={{ fontSize: fiyatGoster ? '8px' : '9px', maxHeight: '2.15em' }}>{urun.ad}</div>
                {onizlemeSvg && (
                  <div className="w-full leading-none my-0.5 overflow-hidden [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-full" style={{ maxHeight: fiyatGoster ? '20px' : '36px' }}
                    dangerouslySetInnerHTML={{ __html: onizlemeSvg }} />
                )}
                <div className="leading-none flex-shrink-0" style={{ fontSize: fiyatGoster ? '8px' : '9px', letterSpacing: '1.5px' }}>{deger}</div>
                {fiyatGoster && (
                  <div className="font-bold leading-none flex-shrink-0" style={{ fontSize: '11px' }}>
                    {(urun.satis_fiyati || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-600">
                🖨️ {secilenYazici || 'Sistem yazdırma penceresi'} · {boyutBul(boyut).ad}
                <span className="text-gray-400"> — Ayarlar &gt; 🖨️ Yazıcılar'dan değiştirilir</span>
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
