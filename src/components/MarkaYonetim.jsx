import { useEffect, useState } from 'react'
import { eslesirMi } from '../utils/arama'
import toast from 'react-hot-toast'
import { markaApi } from '../api/ipc'
import Sayfalama from './Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'

export default function MarkaYonetim() {
  const [markalar, setMarkalar] = useState([])
  const [yeniAd, setYeniAd] = useState('')
  const [yeniKisaltma, setYeniKisaltma] = useState('')
  const [ara, setAra] = useState('')
  const [duzenId, setDuzenId] = useState(null)
  const [duzenAd, setDuzenAd] = useState('')
  // Kısaltma düzenleme ayrı tutulur: ad değiştirmek markaları BİRLEŞTİREBİLİR
  // (markalar:guncelle), kısaltma değiştirmek yalnız sonraki SKU'ları etkiler.
  const [kisaltmaId, setKisaltmaId] = useState(null)
  const [kisaltmaDeger, setKisaltmaDeger] = useState('')

  async function yukle() {
    try { setMarkalar(await markaApi.listele()) }
    catch (e) { toast.error(e.message) }
  }
  useEffect(() => { yukle() }, [])

  async function ekle(e) {
    e.preventDefault()
    const ad = yeniAd.trim()
    if (!ad) return toast.error('Marka adı boş olamaz')
    if (!yeniKisaltma.trim()) return toast.error('SKU kısaltması zorunludur (örn. LAV)')
    try {
      const m = await markaApi.olustur(ad, yeniKisaltma)
      setYeniAd(''); setYeniKisaltma('')
      toast.success(`Marka eklendi — stok kodu öneki TNC.${m.sku_kisaltma}.`)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function kisaltmaKaydet(id) {
    try {
      const m = await markaApi.kisaltmaGuncelle(id, kisaltmaDeger)
      setKisaltmaId(null)
      toast.success(`Kısaltma: TNC.${m.sku_kisaltma}. (üretilmiş SKU'lar değişmez)`)
      yukle()
    } catch (e) { toast.error(e.message) }
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
          {/* Stok kodu bu kısaltmadan üretilir → marka eklenirken ZORUNLU. */}
          <input value={yeniKisaltma} onChange={e => setYeniKisaltma(e.target.value)}
            placeholder="SKU kısaltması*" maxLength={6} title="Stok kodu öneki: TNC.<KISALTMA>.00001"
            className="border rounded-lg px-3 py-1.5 text-sm w-36 font-mono uppercase" />
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
              <th className="text-left px-4 py-2 font-semibold w-48">Stok kodu öneki</th>
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
                <td className="px-4 py-2">
                  {kisaltmaId === m.id ? (
                    <div className="flex gap-1 items-center">
                      <input autoFocus value={kisaltmaDeger} onChange={e => setKisaltmaDeger(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') kisaltmaKaydet(m.id); if (e.key === 'Escape') setKisaltmaId(null) }}
                        maxLength={6} className="border rounded px-2 py-1 text-xs w-24 font-mono uppercase" />
                      <button onClick={() => kisaltmaKaydet(m.id)} className="text-emerald-600 hover:underline text-xs">Kaydet</button>
                      <button onClick={() => setKisaltmaId(null)} className="text-gray-400 hover:underline text-xs">İptal</button>
                    </div>
                  ) : (
                    <button onClick={() => { setKisaltmaId(m.id); setKisaltmaDeger(m.sku_kisaltma || '') }}
                      className="font-mono text-xs hover:underline"
                      title="Değiştir — üretilmiş SKU'lar geriye dönük değişmez">
                      {m.sku_kisaltma
                        ? <span className="text-gray-700">TNC.{m.sku_kisaltma}.</span>
                        : <span className="text-amber-600">kısaltma yok — ekle</span>}
                    </button>
                  )}
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
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Marka yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0 mt-2"><Sayfalama {...sayfalama} /></div>
    </div>
  )
}
