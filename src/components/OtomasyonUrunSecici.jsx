// Gönderi otomasyonu için ürün/set seçici. Aranarak seçilir — katalogda 2800+ aktif ürün var,
// hepsini belleğe alıp combobox'a doldurmak açılışı yavaşlatırdı. Arama SUNUCUDA yapılır
// (urunler:listele; ad + barkod + SKU + marka, Türkçe duyarsız — bkz. tr-arama.js).
import { useEffect, useState } from 'react'
import { urunlerApi, setApi } from '../api/ipc'
import toast from 'react-hot-toast'

const SAYFA_BOYUT = 25

export default function OtomasyonUrunSecici({ onSec, kapat }) {
  const [sekme, setSekme] = useState('urun')
  const [arama, setArama] = useState('')
  const [liste, setListe] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)

  // Arama gecikmesi (debounce): her tuşta sorgu atmak 2800 satırlık tabloda gereksiz yük.
  useEffect(() => {
    if (sekme !== 'urun') return
    setYukleniyor(true)
    const t = setTimeout(() => {
      urunlerApi.listele({ arama: arama.trim(), boyut: SAYFA_BOYUT })
        .then(r => setListe(r?.urunler || []))
        .catch(e => toast.error(e.message))
        .finally(() => setYukleniyor(false))
    }, 250)
    return () => clearTimeout(t)
  }, [arama, sekme])

  useEffect(() => {
    if (sekme !== 'set') return
    setYukleniyor(true)
    setApi.listele()
      .then(r => setListe(r || []))
      .catch(e => toast.error(e.message))
      .finally(() => setYukleniyor(false))
  }, [sekme])

  const gorunen = sekme === 'set' && arama.trim()
    ? liste.filter(s => (s.ad || '').toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr')))
    : liste

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {[['urun', 'Ürünler'], ['set', 'Setler']].map(([k, etiket]) => (
          <button key={k} onClick={() => { setSekme(k); setListe([]) }}
            className={`px-3 py-1 rounded-lg text-sm ${sekme === k ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
            {etiket}
          </button>
        ))}
      </div>

      <input autoFocus value={arama} onChange={e => setArama(e.target.value)}
        placeholder="Ürün adı, barkod veya stok kodu ara…"
        className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />

      {yukleniyor && <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor…</p>}
      {!yukleniyor && !gorunen.length && (
        <p className="text-xs text-gray-400 py-4 text-center">Sonuç yok.</p>
      )}

      <div className="space-y-1">
        {gorunen.map(u => (
          <button key={u.id}
            onClick={() => onSec(sekme === 'set'
              ? { set_id: u.id, ad: u.ad, fiyat: u.fiyat, tip: 'set' }
              : { urun_id: u.id, ad: u.ad, fiyat: u.satis_fiyati, web_link: u.web_link, sku: u.sku, tip: 'urun' })}
            className="w-full text-left border rounded-lg px-3 py-2 hover:bg-blue-50 flex items-center gap-2">
            <span className="text-sm flex-1 truncate">{u.ad}</span>
            {/* Linksiz ürün BURADA belli olsun: seçtikten sonra mesajda sipariş linki satırı
                sessizce eksik kalmasın. Setlerde link zaten hiç yok (web sitesinde karşılığı yok). */}
            {sekme === 'urun' && !u.web_link && (
              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">linksiz</span>
            )}
            {!Number(sekme === 'set' ? u.fiyat : u.satis_fiyati) && (
              <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-1">fiyatsız</span>
            )}
            <span className="text-xs text-gray-500 shrink-0">
              {Number(sekme === 'set' ? u.fiyat : u.satis_fiyati || 0).toLocaleString('tr-TR')} TL
            </span>
          </button>
        ))}
      </div>

      <button onClick={kapat} className="mt-3 w-full border rounded-lg py-1.5 text-sm hover:bg-gray-50">
        Kapat
      </button>
    </div>
  )
}
