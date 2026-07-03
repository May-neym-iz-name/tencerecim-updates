import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kategoriApi } from '../api/ipc'

function derinlik(tamYol) {
  return Math.max(0, String(tamYol || '').split('>').length - 1)
}

export default function KategoriYonetim() {
  const [kategoriler, setKategoriler] = useState([])
  const [yeniAd, setYeniAd] = useState('')
  const [yeniUst, setYeniUst] = useState('')
  const [ara, setAra] = useState('')
  const [duzenId, setDuzenId] = useState(null)
  const [duzenAd, setDuzenAd] = useState('')

  async function yukle() {
    try { setKategoriler(await kategoriApi.listele()) }
    catch (e) { toast.error(e.message) }
  }
  useEffect(() => { yukle() }, [])

  async function ekle(e) {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return
    try {
      await kategoriApi.olustur({ ad, ust_kategori_id: yeniUst ? Number(yeniUst) : null })
      setYeniAd(''); toast.success('Kategori eklendi'); yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function kaydet(id) {
    const ad = duzenAd.trim()
    if (!ad) return
    try { await kategoriApi.guncelle(id, ad); setDuzenId(null); toast.success('Güncellendi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  async function sil(k) {
    const altVar = kategoriler.some(x => x.ust_kategori_id === k.id && x.aktif !== 0)
    let uyari = `"${k.ad}" kategorisi silinsin mi?`
    if (altVar) uyari = `"${k.ad}" kategorisinin alt kategorileri var. Yalnızca bu kategori kaldırılır (alt kategoriler kalır). Devam edilsin mi?`
    else if (k.urun_sayisi > 0) uyari = `"${k.ad}" kategorisine bağlı ${k.urun_sayisi} ürün var. Kategori kaldırılacak (ürünler silinmez). Devam edilsin mi?`
    if (!confirm(uyari)) return
    try { await kategoriApi.sil(k.id); toast.success('Kategori silindi'); yukle() }
    catch (e) { toast.error(e.message) }
  }

  const filtreli = ara
    ? kategoriler.filter(k => (k.tam_yol || k.ad).toLowerCase().includes(ara.toLowerCase()))
    : kategoriler

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 items-end mb-3 flex-shrink-0">
        <form onSubmit={ekle} className="flex flex-wrap gap-2 items-center">
          <input value={yeniAd} onChange={e => setYeniAd(e.target.value)} placeholder="Yeni kategori adı"
            className="border rounded-lg px-3 py-1.5 text-sm" />
          <select value={yeniUst} onChange={e => setYeniUst(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm max-w-[220px]">
            <option value="">— Üst kategori (kök) —</option>
            {kategoriler.map(k => <option key={k.id} value={k.id}>{k.tam_yol || k.ad}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ Ekle</button>
        </form>
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="Ara…"
          className="border rounded-lg px-3 py-1.5 text-sm ml-auto" />
        <span className="text-xs text-gray-400">{filtreli.length} kategori</span>
      </div>

      <div className="flex-1 overflow-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Kategori</th>
              <th className="text-right px-4 py-2 font-semibold">Ürün</th>
              <th className="text-right px-4 py-2 font-semibold w-40">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtreli.map(k => (
              <tr key={k.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  {duzenId === k.id
                    ? <input autoFocus value={duzenAd} onChange={e => setDuzenAd(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') kaydet(k.id); if (e.key === 'Escape') setDuzenId(null) }}
                        className="border rounded px-2 py-1 text-sm w-full max-w-xs" />
                    : <span style={{ paddingLeft: derinlik(k.tam_yol) * 18 }} className="inline-block">
                        {derinlik(k.tam_yol) > 0 && <span className="text-gray-300 mr-1">└</span>}
                        <span className="font-medium text-gray-800">{k.ad}</span>
                      </span>}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">{k.urun_sayisi || 0}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {duzenId === k.id ? (
                    <>
                      <button onClick={() => kaydet(k.id)} className="text-emerald-600 hover:underline text-xs mr-3">Kaydet</button>
                      <button onClick={() => setDuzenId(null)} className="text-gray-400 hover:underline text-xs">İptal</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setDuzenId(k.id); setDuzenAd(k.ad) }} className="text-blue-600 hover:underline text-xs mr-3">Düzenle</button>
                      <button onClick={() => sil(k)} className="text-red-600 hover:underline text-xs">Sil</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtreli.length === 0 && (
              <tr><td colSpan={3} className="text-center py-10 text-gray-400">Kategori yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
