import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { urunlerApi } from '../api/client'

export default function Urunler() {
  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['urunler', arama],
    queryFn: () => urunlerApi.listele({ arama }).then(r => r.data),
  })

  const olusturMutation = useMutation({
    mutationFn: (veri) => duzenlenen ? urunlerApi.guncelle(duzenlenen.id, veri) : urunlerApi.olustur(veri),
    onSuccess: () => {
      qc.invalidateQueries(['urunler'])
      toast.success(duzenlenen ? 'Ürün güncellendi' : 'Ürün eklendi')
      setFormAcik(false)
      setDuzenlenen(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Hata oluştu'),
  })

  const silMutation = useMutation({
    mutationFn: (id) => urunlerApi.sil(id),
    onSuccess: () => { qc.invalidateQueries(['urunler']); toast.success('Ürün silindi') },
  })

  function handleDuzenle(urun) {
    setDuzenlenen(urun)
    setFormAcik(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    olusturMutation.mutate({
      ad: fd.get('ad'),
      barkod: fd.get('barkod') || undefined,
      sku: fd.get('sku') || undefined,
      kategori: fd.get('kategori') || undefined,
      marka: fd.get('marka') || undefined,
      alis_fiyati: parseFloat(fd.get('alis_fiyati')) || 0,
      satis_fiyati: parseFloat(fd.get('satis_fiyati')),
      kdv_orani: parseInt(fd.get('kdv_orani')) || 20,
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ürünler</h2>
        <button onClick={() => { setDuzenlenen(null); setFormAcik(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Yeni Ürün
        </button>
      </div>

      <input value={arama} onChange={e => setArama(e.target.value)}
        placeholder="Ürün adı veya barkod ara..." className="w-full border rounded-lg px-4 py-2 mb-4" />

      {isLoading ? <p>Yükleniyor...</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ürün Adı', 'Barkod', 'Kategori', 'Marka', 'Alış', 'Satış', 'KDV', 'İşlem'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.urunler?.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.ad}</td>
                  <td className="px-4 py-3 text-gray-500">{u.barkod || '-'}</td>
                  <td className="px-4 py-3">{u.kategori || '-'}</td>
                  <td className="px-4 py-3">{u.marka || '-'}</td>
                  <td className="px-4 py-3">₺{u.alis_fiyati?.toFixed(2)}</td>
                  <td className="px-4 py-3 font-medium text-green-700">₺{u.satis_fiyati?.toFixed(2)}</td>
                  <td className="px-4 py-3">%{u.kdv_orani}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => handleDuzenle(u)} className="text-blue-600 hover:underline">Düzenle</button>
                    <button onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) silMutation.mutate(u.id) }}
                      className="text-red-600 hover:underline">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-sm text-gray-500">Toplam: {data?.toplam || 0} ürün</p>
        </div>
      )}

      {formAcik && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">{duzenlenen ? 'Ürün Düzenle' : 'Yeni Ürün'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                ['ad', 'Ürün Adı *', 'text', true],
                ['barkod', 'Barkod', 'text', false],
                ['sku', 'SKU Kodu', 'text', false],
                ['kategori', 'Kategori', 'text', false],
                ['marka', 'Marka', 'text', false],
                ['alis_fiyati', 'Alış Fiyatı', 'number', false],
                ['satis_fiyati', 'Satış Fiyatı *', 'number', true],
                ['kdv_orani', 'KDV Oranı (%)', 'number', false],
              ].map(([name, label, type, req]) => (
                <div key={name}>
                  <label className="block text-sm font-medium mb-1">{label}</label>
                  <input name={name} type={type} required={req} step={type === 'number' ? '0.01' : undefined}
                    defaultValue={duzenlenen?.[name] ?? (name === 'kdv_orani' ? 20 : '')}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {duzenlenen ? 'Güncelle' : 'Ekle'}
                </button>
                <button type="button" onClick={() => { setFormAcik(false); setDuzenlenen(null) }}
                  className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
