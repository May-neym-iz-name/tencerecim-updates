import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { stokApi, lokasyonApi } from '../api/client'

export default function Stok() {
  const [secilenLokasyon, setSecilenLokasyon] = useState('')
  const [dusukStok, setDusukStok] = useState(false)
  const [arama, setArama] = useState('')

  const { data: lokasyonlar } = useQuery({
    queryKey: ['lokasyonlar'],
    queryFn: () => lokasyonApi.listele().then(r => r.data),
  })

  const { data: stoklar, isLoading } = useQuery({
    queryKey: ['stok', secilenLokasyon, dusukStok],
    queryFn: () => stokApi.listele({
      lokasyon_id: secilenLokasyon || undefined,
      dusuk_stok: dusukStok
    }).then(r => r.data),
  })

  const filtrelenmis = stoklar?.filter(s =>
    !arama || s.urun_adi.toLowerCase().includes(arama.toLowerCase()) || s.barkod?.includes(arama)
  )

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Stok Durumu</h2>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={secilenLokasyon} onChange={e => setSecilenLokasyon(e.target.value)}
          className="border rounded-lg px-3 py-2">
          <option value="">Tüm Lokasyonlar</option>
          {lokasyonlar?.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
        </select>
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün ara..." className="border rounded-lg px-3 py-2 flex-1 min-w-40" />
        <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2">
          <input type="checkbox" checked={dusukStok} onChange={e => setDusukStok(e.target.checked)} />
          <span className="text-sm">Düşük Stok</span>
        </label>
      </div>

      {isLoading ? <p>Yükleniyor...</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Ürün', 'Barkod', 'Lokasyon', 'Miktar', 'Min. Stok', 'Durum'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrelenmis?.map((s, i) => {
                const kritik = s.miktar <= s.minimum_stok
                return (
                  <tr key={i} className={`border-b ${kritik ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium">{s.urun_adi}</td>
                    <td className="px-4 py-3 text-gray-500">{s.barkod || '-'}</td>
                    <td className="px-4 py-3">{lokasyonlar?.find(l => l.id === s.lokasyon_id)?.ad || s.lokasyon_id}</td>
                    <td className="px-4 py-3 font-bold">{s.miktar}</td>
                    <td className="px-4 py-3 text-gray-500">{s.minimum_stok}</td>
                    <td className="px-4 py-3">
                      {kritik
                        ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Düşük</span>
                        : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Normal</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-sm text-gray-500">{filtrelenmis?.length || 0} kayıt</p>
        </div>
      )}
    </div>
  )
}
