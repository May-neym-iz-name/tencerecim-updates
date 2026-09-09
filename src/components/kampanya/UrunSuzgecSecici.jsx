// Kampanya süzgeci: tür (ürün/kategori/marka/etiket) + çoklu seçim. Ürünler yerel tablodan
// (ikas_urun_id dolu olanlar; süzgece ikas id yazılır), diğerleri ikas sözlüğünden (props.sozlukler).
import { useEffect, useState } from 'react'
import { urunlerApi, kampanyaApi } from '../../api/ipc'

const TURLER = [['urun', 'Ürünler'], ['kategori', 'Kategoriler'], ['marka', 'Markalar'], ['etiket', 'Etiketler']]
const ARAMA_GECIKME_MS = 250

export default function UrunSuzgecSecici({ deger, onChange, sozlukler, etiket }) {
  const [arama, setArama] = useState('')
  const [urunler, setUrunler] = useState([])
  const [adlar, setAdlar] = useState({}) // id → ad (seçili ürünlerin adı için)
  const tur = deger?.tur || 'urun'
  const idler = deger?.idler || []

  // Önceden seçili (ikas'tan okunan) ürün id'lerinin adı yerelde yoksa çöz — çipte ham id kalmasın.
  useEffect(() => {
    if (tur !== 'urun') return
    const eksik = idler.filter(id => !adlar[id])
    if (!eksik.length) return
    kampanyaApi.urunAdlari(eksik).then(m => setAdlar(a => ({ ...a, ...m }))).catch(() => {})
  }, [tur, idler.join('|')])

  useEffect(() => {
    if (tur !== 'urun' || !arama.trim()) { setUrunler([]); return }
    const t = setTimeout(() => {
      urunlerApi.listele({ arama: arama.trim(), boyut: 15 })
        .then(r => setUrunler((r?.urunler || []).filter(u => u.ikas_urun_id)))
        .catch(() => setUrunler([]))
    }, ARAMA_GECIKME_MS)
    return () => clearTimeout(t)
  }, [arama, tur])

  const sozluk = tur === 'kategori' ? sozlukler?.kategoriler : tur === 'marka' ? sozlukler?.markalar : tur === 'etiket' ? sozlukler?.etiketler : null
  const adBul = (id) => adlar[id] || (sozluk || []).find(x => x.id === id)?.name || `${id.slice(0, 8)}… (uygulamada yok)`
  const ekle = (id, ad) => { if (!idler.includes(id)) onChange({ tur, idler: [...idler, id] }); if (ad) setAdlar(a => ({ ...a, [id]: ad })) }
  const cikar = (id) => onChange({ tur, idler: idler.filter(x => x !== id) })

  const adaylar = tur === 'urun'
    ? urunler.map(u => ({ id: u.ikas_urun_id, ad: `${u.ad}${u.sku ? ' · ' + u.sku : ''}` }))
    : (sozluk || []).filter(x => !arama.trim() || x.name.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr'))).slice(0, 15).map(x => ({ id: x.id, ad: x.name }))

  return (
    <div className="space-y-2">
      {etiket && <div className="text-xs font-semibold text-gray-600">{etiket}</div>}
      <div className="flex gap-2">
        <select value={tur} onChange={e => { onChange({ tur: e.target.value, idler: [] }); setArama('') }}
          className="border rounded-lg px-2 py-1.5 text-sm">
          {TURLER.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ara…"
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
      </div>
      {arama.trim() && adaylar.length > 0 && (
        <div className="border rounded-lg max-h-40 overflow-auto bg-white">
          {adaylar.map(a => (
            <button key={a.id} type="button" onClick={() => { ekle(a.id, a.ad); setArama('') }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-marka-50">{a.ad}</button>
          ))}
        </div>
      )}
      {arama.trim() && adaylar.length === 0 && <div className="text-xs text-gray-400">Sonuç yok{tur === 'urun' ? ' (yalnız ikas\'a bağlı ürünler)' : ''}.</div>}
      <div className="flex flex-wrap gap-1">
        {idler.map(id => (
          <span key={id} className="inline-flex items-center gap-1 bg-krem-200 text-marka-900 rounded-full px-2 py-0.5 text-xs">
            {adBul(id)}<button type="button" onClick={() => cikar(id)} className="text-marka-400 hover:text-red-600">✕</button>
          </span>
        ))}
        {!idler.length && <span className="text-xs text-gray-400">Seçim yok.</span>}
      </div>
    </div>
  )
}
