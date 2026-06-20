import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { urunlerApi, satisApi, musteriApi, lokasyonApi } from '../api/client'

export default function Satis() {
  const [sepet, setSepet] = useState([])
  const [barkodInput, setBarkodInput] = useState('')
  const [aramaInput, setAramaInput] = useState('')
  const [aramaSonuclari, setAramaSonuclari] = useState([])
  const [secilenMusteriId, setSecilenMusteriId] = useState(null)
  const [secilenLokasyonId, setSecilenLokasyonId] = useState(null)
  const [odemeTipi, setOdemeTipi] = useState('nakit')
  const [musteriArama, setMusteriArama] = useState('')
  const [musteriSonuclari, setMusteriSonuclari] = useState([])
  const barkodRef = useRef()

  const { data: lokasyonlar } = useQuery({
    queryKey: ['lokasyonlar'],
    queryFn: () => lokasyonApi.listele().then(r => r.data),
  })

  const satisMutation = useMutation({
    mutationFn: (veri) => satisApi.olustur(veri),
    onSuccess: (r) => {
      toast.success(`Satış tamamlandı! Fiş No: ${r.data.fis_no}`)
      setSepet([])
      setSecilenMusteriId(null)
      setMusteriArama('')
      window.print()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Satış hatası'),
  })

  async function barkodSorgu(e) {
    e.preventDefault()
    if (!barkodInput.trim()) return
    try {
      const r = await urunlerApi.barkodla(barkodInput.trim())
      sepeteEkle(r.data)
      setBarkodInput('')
    } catch {
      toast.error('Ürün bulunamadı')
    }
  }

  async function urunAra(deger) {
    setAramaInput(deger)
    if (deger.length < 2) { setAramaSonuclari([]); return }
    const r = await urunlerApi.listele({ arama: deger, boyut: 8 })
    setAramaSonuclari(r.data.urunler)
  }

  async function musteriAraFn(deger) {
    setMusteriArama(deger)
    if (deger.length < 2) { setMusteriSonuclari([]); return }
    const r = await musteriApi.listele({ arama: deger, boyut: 5 })
    setMusteriSonuclari(r.data.musteriler)
  }

  function sepeteEkle(urun) {
    setSepet(prev => {
      const var_ = prev.find(k => k.urun_id === urun.id)
      if (var_) return prev.map(k => k.urun_id === urun.id ? { ...k, miktar: k.miktar + 1 } : k)
      return [...prev, { urun_id: urun.id, ad: urun.ad, satis_fiyati: urun.satis_fiyati, kdv_orani: urun.kdv_orani, miktar: 1 }]
    })
    setAramaInput('')
    setAramaSonuclari([])
    barkodRef.current?.focus()
  }

  function miktarDegistir(urun_id, miktar) {
    if (miktar <= 0) { setSepet(prev => prev.filter(k => k.urun_id !== urun_id)); return }
    setSepet(prev => prev.map(k => k.urun_id === urun_id ? { ...k, miktar } : k))
  }

  const toplamKDVsiz = sepet.reduce((t, k) => t + k.satis_fiyati * k.miktar * 100 / (100 + k.kdv_orani), 0)
  const toplamKDV = sepet.reduce((t, k) => t + k.satis_fiyati * k.miktar * k.kdv_orani / (100 + k.kdv_orani), 0)
  const genelToplam = sepet.reduce((t, k) => t + k.satis_fiyati * k.miktar, 0)

  function satisOlustur() {
    if (!secilenLokasyonId) { toast.error('Lütfen lokasyon seçin'); return }
    if (sepet.length === 0) { toast.error('Sepet boş'); return }
    satisMutation.mutate({
      lokasyon_id: secilenLokasyonId,
      musteri_id: secilenMusteriId || undefined,
      odeme_tipi: odemeTipi,
      kalemler: sepet.map(k => ({ urun_id: k.urun_id, miktar: k.miktar })),
    })
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Sol - Ürün seçimi */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-3">
          <select value={secilenLokasyonId || ''} onChange={e => setSecilenLokasyonId(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">-- Lokasyon Seç --</option>
            {lokasyonlar?.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
          </select>
        </div>

        <form onSubmit={barkodSorgu} className="flex gap-2">
          <input ref={barkodRef} value={barkodInput} onChange={e => setBarkodInput(e.target.value)}
            placeholder="Barkod okut veya gir..." className="flex-1 border rounded-lg px-4 py-2" autoFocus />
          <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg">Ekle</button>
        </form>

        <div className="relative">
          <input value={aramaInput} onChange={e => urunAra(e.target.value)}
            placeholder="Ürün adıyla ara..." className="w-full border rounded-lg px-4 py-2" />
          {aramaSonuclari.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
              {aramaSonuclari.map(u => (
                <button key={u.id} onClick={() => sepeteEkle(u)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 flex justify-between">
                  <span>{u.ad}</span>
                  <span className="font-medium text-green-700">₺{u.satis_fiyati?.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Müşteri seçimi */}
        <div className="relative">
          <input value={musteriArama} onChange={e => musteriAraFn(e.target.value)}
            placeholder="Müşteri ara (opsiyonel)..." className="w-full border rounded-lg px-4 py-2" />
          {musteriSonuclari.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10">
              {musteriSonuclari.map(m => (
                <button key={m.id} onClick={() => { setSecilenMusteriId(m.id); setMusteriArama(`${m.ad} ${m.soyad}`); setMusteriSonuclari([]) }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50">
                  {m.ad} {m.soyad} — {m.telefon || m.vergi_no || ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sepet */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ürün', 'Fiyat', 'Miktar', 'Toplam', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sepet.map(k => (
                <tr key={k.urun_id} className="border-b">
                  <td className="px-4 py-2">{k.ad}</td>
                  <td className="px-4 py-2">₺{k.satis_fiyati.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar - 1)} className="w-6 h-6 border rounded text-center">-</button>
                      <input type="number" value={k.miktar} min="1"
                        onChange={e => miktarDegistir(k.urun_id, parseInt(e.target.value))}
                        className="w-12 border rounded text-center py-0.5" />
                      <button onClick={() => miktarDegistir(k.urun_id, k.miktar + 1)} className="w-6 h-6 border rounded text-center">+</button>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium">₺{(k.satis_fiyati * k.miktar).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => setSepet(prev => prev.filter(i => i.urun_id !== k.urun_id))}
                      className="text-red-500 hover:text-red-700">✕</button>
                  </td>
                </tr>
              ))}
              {sepet.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sepet boş</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sağ - Özet & Ödeme */}
      <div className="w-64 space-y-4">
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h3 className="font-bold text-lg">Özet</h3>
          <div className="flex justify-between text-sm"><span>Ara Toplam</span><span>₺{toplamKDVsiz.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>KDV</span><span>₺{toplamKDV.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Toplam</span><span className="text-green-700">₺{genelToplam.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h3 className="font-medium">Ödeme Tipi</h3>
          {['nakit', 'kart', 'havale'].map(tip => (
            <label key={tip} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={tip} checked={odemeTipi === tip} onChange={() => setOdemeTipi(tip)} />
              <span className="capitalize">{tip === 'nakit' ? '💵 Nakit' : tip === 'kart' ? '💳 Kart' : '🏦 Havale'}</span>
            </label>
          ))}
        </div>

        <button onClick={satisOlustur} disabled={satisMutation.isPending || sepet.length === 0}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50">
          {satisMutation.isPending ? 'İşleniyor...' : '✓ Satışı Tamamla'}
        </button>

        <button onClick={() => setSepet([])} className="w-full border border-red-300 text-red-600 py-2 rounded-lg hover:bg-red-50">
          Sepeti Temizle
        </button>
      </div>
    </div>
  )
}
