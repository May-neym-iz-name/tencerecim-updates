import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { musteriApi } from '../api/client'

export default function Musteriler() {
  const [arama, setArama] = useState('')
  const [formAcik, setFormAcik] = useState(false)
  const [duzenlenen, setDuzenlenen] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['musteriler', arama],
    queryFn: () => musteriApi.listele({ arama }).then(r => r.data),
  })

  const kaydetMutation = useMutation({
    mutationFn: (veri) => duzenlenen ? musteriApi.guncelle(duzenlenen.id, veri) : musteriApi.olustur(veri),
    onSuccess: () => {
      qc.invalidateQueries(['musteriler'])
      toast.success(duzenlenen ? 'Müşteri güncellendi' : 'Müşteri eklendi')
      setFormAcik(false)
      setDuzenlenen(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Hata'),
  })

  const silMutation = useMutation({
    mutationFn: (id) => musteriApi.sil(id),
    onSuccess: () => { qc.invalidateQueries(['musteriler']); toast.success('Müşteri silindi') },
  })

  function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    kaydetMutation.mutate(Object.fromEntries(
      [...fd.entries()].filter(([, v]) => v !== '')
    ))
  }

  const alanlar = [
    ['ad', 'Ad *', true], ['soyad', 'Soyad *', true],
    ['telefon', 'Telefon', false], ['email', 'E-posta', false],
    ['tc_kimlik', 'TC Kimlik No', false], ['vergi_no', 'Vergi No', false],
    ['vergi_dairesi', 'Vergi Dairesi', false], ['unvan', 'Ünvan (Kurumsal)', false],
    ['adres', 'Adres', false], ['il', 'İl', false], ['ilce', 'İlçe', false],
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Müşteriler</h2>
        <button onClick={() => { setDuzenlenen(null); setFormAcik(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Yeni Müşteri
        </button>
      </div>

      <input value={arama} onChange={e => setArama(e.target.value)}
        placeholder="Ad, soyad, telefon veya vergi no ara..." className="w-full border rounded-lg px-4 py-2 mb-4" />

      {isLoading ? <p>Yükleniyor...</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ad Soyad', 'Telefon', 'Vergi No / TC', 'Adres', 'İşlem'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.musteriler?.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.ad} {m.soyad}{m.unvan ? <span className="text-xs text-gray-400 ml-1">({m.unvan})</span> : null}</td>
                  <td className="px-4 py-3">{m.telefon || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.vergi_no || m.tc_kimlik || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.il ? `${m.il}/${m.ilce}` : m.adres?.substring(0, 30) || '-'}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button onClick={() => { setDuzenlenen(m); setFormAcik(true) }} className="text-blue-600 hover:underline">Düzenle</button>
                    <button onClick={() => { if (confirm('Silmek istediğinize emin misiniz?')) silMutation.mutate(m.id) }}
                      className="text-red-600 hover:underline">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-sm text-gray-500">Toplam: {data?.toplam || 0} müşteri</p>
        </div>
      )}

      {formAcik && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{duzenlenen ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {alanlar.map(([name, label, req]) => (
                  <div key={name} className={name === 'adres' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <input name={name} required={req} defaultValue={duzenlenen?.[name] ?? ''}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                ))}
              </div>
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
