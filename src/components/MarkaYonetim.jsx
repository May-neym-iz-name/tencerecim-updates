import { useEffect, useState } from 'react'
import { eslesirMi } from '../utils/arama'
import toast from 'react-hot-toast'
import { markaApi } from '../api/ipc'
import Sayfalama from './Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'

export default function MarkaYonetim() {
  const [markalar, setMarkalar] = useState([])
  const [yeniAd, setYeniAd] = useState('')
  const [ara, setAra] = useState('')
  const [duzenId, setDuzenId] = useState(null)
  const [duzenAd, setDuzenAd] = useState('')

  async function yukle() {
    try { setMarkalar(await markaApi.listele()) }
    catch (e) { toast.error(e.message) }
  }
  useEffect(() => { yukle() }, [])

  async function ekle(e) {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    try { await markaApi.olustur(ad); setYeniAd(''); toast.success('Marka eklendi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  async function kaydet(id) {
    const ad = duzenAd.trim()
    if (!ad) return
    try {
      const sonuc = await markaApi.guncelle(id, ad)
      setDuzenId(null)
      toast.success(sonuc?._birlesti ? `"${ad}" markasıyla birleştirildi` : 'Güncellendi')
      yukle()
    }
    catch (e) { toast.error(e.message) }
  }

  async function sil(m) {
    const uyari = m.urun_sayisi > 0
      ? `"${m.ad}" markasına bağlı ${m.urun_sayisi} ürün var. Marka listeden kaldırılacak (ürünler silinmez). Devam edilsin mi?`
      : `"${m.ad}" markası silinsin mi?`
    if (!confirm(uyari)) return
    try { await markaApi.sil(m.id); toast.success('Marka silindi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  // Türkçe duyarsız: marka adları büyük harfli ("LİNES"), toLowerCase() ile "lines" bulmuyordu.
  const filtreli = markalar.filter(m => eslesirMi(m.ad, ara))
  const { dilim, ...sayfalama } = useSayfalama(filtreli, 50)

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 items-center mb-3 flex-shrink-0">
        <form onSubmit={ekle} className="flex gap-2">
          <input value={yeniAd} onChange={e => setYeniAd(e.target.value)} placeholder="Yeni marka adı"
            className="border rounded-lg px-3 py-1.5 text-sm" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ Ekle</button>
        </form>
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Ara…"
          className="border rounded-lg px-3 py-1.5 text-sm ml-auto" />
        <span className="text-xs text-gray-400">{filtreli.length} marka</span>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Marka</th>
              <th className="text-right px-4 py-2 font-semibold">Ürün</th>
              <th className="text-right px-4 py-2 font-semibold w-40">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {dilim.map(m => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  {duzenId === m.id
                    ? <input autoFocus value={duzenAd} onChange={e => setDuzenAd(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') kaydet(m.id); if (e.key === 'Escape') setDuzenId(null) }}
                        className="border rounded px-2 py-1 text-sm w-full max-w-xs" />
                    : <span className="font-medium text-gray-800">{m.ad}</span>}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">{m.urun_sayisi || 0}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {duzenId === m.id ? (
                    <>
                      <button onClick={() => kaydet(m.id)} className="text-emerald-600 hover:underline text-xs mr-3">Kaydet</button>
                      <button onClick={() => setDuzenId(null)} className="text-gray-400 hover:underline text-xs">İptal</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setDuzenId(m.id); setDuzenAd(m.ad) }} className="text-blue-600 hover:underline text-xs mr-3">Düzenle</button>
                      <button onClick={() => sil(m)} className="text-red-600 hover:underline text-xs">Sil</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtreli.length === 0 && (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400">Marka yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0 mt-2"><Sayfalama {...sayfalama} /></div>
    </div>
  )
}
