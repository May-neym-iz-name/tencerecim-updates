import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { stokApi, lokasyonApi } from '../api/ipc'

export default function StokSayim() {
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [secilenLokasyon, setSecilenLokasyon] = useState('')
  const [aktifSayim, setAktifSayim] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [arama, setArama] = useState('')

  useEffect(() => { lokasyonApi.listele().then(lok => { setLokasyonlar(lok); if (lok.length) setSecilenLokasyon(lok[0].id) }) }, [])

  async function baslatSayim() {
    if (!secilenLokasyon) { toast.error('Lokasyon seçin'); return }
    setYukleniyor(true)
    try {
      const r = await stokApi.sayimBaslat({ lokasyon_id: Number(secilenLokasyon) })
      const sayim = await stokApi.sayimGetir(r.sayim_id)
      setAktifSayim({ ...sayim, kalemler: sayim.kalemler.map(k => ({ ...k, _girilen: '' })) })
      toast.success(`Sayım başlatıldı — ${sayim.kalemler.length} ürün`)
    } catch (e) { toast.error(e.message) }
    setYukleniyor(false)
  }

  async function kalemGir(urun_id, deger) {
    setAktifSayim(prev => ({
      ...prev,
      kalemler: prev.kalemler.map(k => k.urun_id === urun_id ? { ...k, _girilen: deger } : k)
    }))
    if (deger !== '' && !isNaN(parseInt(deger))) {
      try {
        const r = await stokApi.sayimKalem(aktifSayim.id, { urun_id, sayilan_miktar: parseInt(deger) })
        setAktifSayim(prev => ({
          ...prev,
          kalemler: prev.kalemler.map(k => k.urun_id === urun_id ? { ...k, sayilan_miktar: parseInt(deger), fark: r.fark } : k)
        }))
      } catch {}
    }
  }

  async function tamamla() {
    if (!confirm('Sayımı tamamlayıp stokları güncellemek istiyor musunuz?')) return
    try {
      await stokApi.sayimTamamla(aktifSayim.id, true)
      toast.success('Sayım tamamlandı, stoklar güncellendi!')
      setAktifSayim(null)
    } catch (e) { toast.error(e.message) }
  }

  const filtrelenmis = aktifSayim?.kalemler.filter(k =>
    !arama || k.urun_adi?.toLowerCase().includes(arama.toLowerCase()) || k.barkod?.includes(arama)
  )

  if (aktifSayim) {
    const girilenSayisi = aktifSayim.kalemler.filter(k => k.sayilan_miktar !== null && k.sayilan_miktar !== undefined).length
    const toplamKalem = aktifSayim.kalemler.length

    return (
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Stok Sayımı #{aktifSayim.id}</h2>
            <p className="text-sm text-gray-500">{lokasyonlar.find(l => l.id === aktifSayim.lokasyon_id)?.ad} — {girilenSayisi}/{toplamKalem} ürün girildi</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if (confirm('Sayımı iptal etmek istiyor musunuz?')) setAktifSayim(null) }}
              className="border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50">İptal</button>
            <button onClick={tamamla}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">
              ✓ Tamamla & Güncelle
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="h-2 bg-gray-200 rounded-full">
            <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${(girilenSayisi / toplamKalem) * 100}%` }} />
          </div>
        </div>

        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün ara..." className="w-full border rounded-lg px-4 py-2.5 mb-3 text-sm" />

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ürün', 'Barkod', 'Sistemde', 'Sayılan', 'Fark'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrelenmis?.map(k => {
                const fark = k.sayilan_miktar !== null && k.sayilan_miktar !== undefined ? k.sayilan_miktar - k.beklenen_miktar : null
                return (
                  <tr key={k.urun_id} className={`border-b ${fark !== null && fark !== 0 ? (fark < 0 ? 'bg-red-50' : 'bg-blue-50') : ''}`}>
                    <td className="px-4 py-2 font-medium">{k.urun_adi}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{k.barkod || '—'}</td>
                    <td className="px-4 py-2 font-bold">{k.beklenen_miktar}</td>
                    <td className="px-4 py-2">
                      <input type="number" value={k._girilen} min="0"
                        onChange={e => kalemGir(k.urun_id, e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-center text-sm"
                        placeholder="—" />
                    </td>
                    <td className={`px-4 py-2 font-semibold ${fark === null ? 'text-gray-300' : fark < 0 ? 'text-red-600' : fark > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {fark === null ? '—' : fark > 0 ? `+${fark}` : fark}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Stok Sayımı</h2>
      <div className="bg-white rounded-xl border p-6 max-w-md shadow-sm">
        <p className="text-gray-600 text-sm mb-4">Sayım başlatıldığında seçilen lokasyondaki tüm ürünler listelenecek, mevcut stok miktarları "beklenen" olarak kaydedilecektir. Sayılan miktarları girerek stokları güncelleyebilirsiniz.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Lokasyon Seçin</label>
            <select value={secilenLokasyon} onChange={e => setSecilenLokasyon(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <button onClick={baslatSayim} disabled={yukleniyor}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {yukleniyor ? 'Hazırlanıyor...' : '🔢 Sayım Başlat'}
          </button>
        </div>
      </div>
    </div>
  )
}
