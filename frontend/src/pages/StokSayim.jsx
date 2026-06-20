import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { stokApi, lokasyonApi, urunlerApi } from '../api/client'

export default function StokSayim() {
  const [aktifSayimId, setAktifSayimId] = useState(null)
  const [sayimVerisi, setSayimVerisi] = useState(null)
  const [secilenLokasyon, setSecilenLokasyon] = useState('')
  const qc = useQueryClient()

  const { data: lokasyonlar } = useQuery({
    queryKey: ['lokasyonlar'],
    queryFn: () => lokasyonApi.listele().then(r => r.data),
  })

  const baslatMutation = useMutation({
    mutationFn: () => stokApi.sayimBaslat({ lokasyon_id: Number(secilenLokasyon) }),
    onSuccess: async (r) => {
      const sayimId = r.data.sayim_id
      setAktifSayimId(sayimId)
      const sayim = await stokApi.sayimGetir(sayimId)
      // Ürün adlarını ekle
      const urunIds = sayim.data.kalemler.map(k => k.urun_id)
      const kalemlerDetay = await Promise.all(
        sayim.data.kalemler.map(async k => {
          const urun = await urunlerApi.getir(k.urun_id)
          return { ...k, urun_adi: urun.data.ad, barkod: urun.data.barkod, sayilan: '' }
        })
      )
      setSayimVerisi({ ...sayim.data, kalemler: kalemlerDetay })
      toast.success('Sayım başlatıldı')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Hata'),
  })

  const kalemMutation = useMutation({
    mutationFn: ({ urunId, miktar }) => stokApi.sayimKalem(aktifSayimId, { urun_id: urunId, sayilan_miktar: miktar }),
  })

  const tamamlaMutation = useMutation({
    mutationFn: () => stokApi.sayimTamamla(aktifSayimId, true),
    onSuccess: () => {
      toast.success('Sayım tamamlandı ve stoklar güncellendi!')
      setAktifSayimId(null)
      setSayimVerisi(null)
      qc.invalidateQueries(['stok'])
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Hata'),
  })

  function handleSayilanDegistir(urunId, deger) {
    setSayimVerisi(prev => ({
      ...prev,
      kalemler: prev.kalemler.map(k => k.urun_id === urunId ? { ...k, sayilan: deger } : k)
    }))
  }

  function handleKalemKaydet(urunId, deger) {
    if (deger === '' || isNaN(parseInt(deger))) return
    kalemMutation.mutate({ urunId, miktar: parseInt(deger) })
  }

  if (aktifSayimId && sayimVerisi) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Stok Sayımı #{aktifSayimId}</h2>
          <button onClick={() => tamamlaMutation.mutate()}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
            Sayımı Tamamla & Güncelle
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ürün', 'Barkod', 'Sistemdeki Miktar', 'Sayılan Miktar', 'Fark'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sayimVerisi.kalemler.map(k => {
                const fark = k.sayilan !== '' ? parseInt(k.sayilan) - k.beklenen : null
                return (
                  <tr key={k.urun_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{k.urun_adi}</td>
                    <td className="px-4 py-2 text-gray-500">{k.barkod || '-'}</td>
                    <td className="px-4 py-2">{k.beklenen}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={k.sayilan}
                        onChange={e => handleSayilanDegistir(k.urun_id, e.target.value)}
                        onBlur={e => handleKalemKaydet(k.urun_id, e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className={`px-4 py-2 font-medium ${fark === null ? '' : fark < 0 ? 'text-red-600' : fark > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {fark === null ? '-' : fark > 0 ? `+${fark}` : fark}
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
    <div>
      <h2 className="text-2xl font-bold mb-6">Stok Sayımı</h2>
      <div className="bg-white rounded-lg shadow p-6 max-w-md">
        <h3 className="font-medium mb-4">Yeni Sayım Başlat</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Lokasyon</label>
            <select value={secilenLokasyon} onChange={e => setSecilenLokasyon(e.target.value)}
              className="w-full border rounded-lg px-3 py-2">
              <option value="">-- Lokasyon Seç --</option>
              {lokasyonlar?.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <button
            onClick={() => { if (!secilenLokasyon) { toast.error('Lokasyon seçin'); return } baslatMutation.mutate() }}
            disabled={baslatMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Sayım Başlat
          </button>
        </div>
      </div>
    </div>
  )
}
