// Sohbetin sağında kalıcı dar panel — temsilci tek tıkla ÜRÜN KARTI gönderir (08.09.2026,
// kullanıcı seçimi 5B). Otomasyonun attığı kartın aynısı (meta:kartGonder → kartMesajiOlustur).
//
// hedef: { tur: 'dm', id: <son gelen DM id> } ya da { tur: 'yorum', id: <yorum id> }; yoksa
// panel pasif. Arama SUNUCUDA (urunler:listele + setler:listele, OtomasyonUrunSecici ile aynı).
// "Son gönderilenler" kart yükünden gelir ve ürün id'si taşımaz → tıklayınca arama kutusunu
// doldurur, kullanıcı sonuçtan tıklar. Gönderim geri alınamaz; onay yerine 1 sn "Gönderildi ✓".
import { useEffect, useState } from 'react'
import { urunlerApi, setApi, sosyalApi, metaApi } from '../api/ipc'
import toast from 'react-hot-toast'

const ARAMA_GECIKME_MS = 250
const GERI_BILDIRIM_MS = 1200

export default function HizliUrunler({ hedef, kullanici, onGonderildi }) {
  const [arama, setArama] = useState('')
  const [liste, setListe] = useState([])
  const [son, setSon] = useState([])
  const [mesgul, setMesgul] = useState(null)   // gönderilmekte olan ürünün anahtarı
  const [gitti, setGitti] = useState(null)     // az önce gönderilen ürünün anahtarı

  useEffect(() => { sosyalApi.sonUrunler().then(setSon).catch(() => {}) }, [hedef?.id])

  useEffect(() => {
    if (!arama.trim()) { setListe([]); return }
    const t = setTimeout(async () => {
      try {
        const [u, s] = await Promise.all([
          urunlerApi.listele({ arama: arama.trim(), boyut: 8 }),
          setApi.listele({ arama: arama.trim() }),
        ])
        setListe([
          ...(u?.urunler || []).map(x => ({ ...x, _tur: 'urun' })),
          ...(s || []).slice(0, 4).map(x => ({ ...x, _tur: 'set', satis_fiyati: x.fiyat })),
        ])
      } catch (e) { toast.error(e.message) }
    }, ARAMA_GECIKME_MS)
    return () => clearTimeout(t)
  }, [arama])

  async function gonder(u) {
    if (!hedef?.id) return
    const anahtar = `${u._tur}-${u.id}`
    setMesgul(anahtar)
    try {
      await metaApi.kartGonder({
        hedef,
        urunler: [{ ad: u.ad, fiyat: u.satis_fiyati, web_link: u.web_link, ikas_urun_id: u.ikas_urun_id }],
        kullanici,
      })
      setGitti(anahtar); setTimeout(() => setGitti(null), GERI_BILDIRIM_MS)
      onGonderildi?.()
      sosyalApi.sonUrunler().then(setSon).catch(() => {})
    } catch (e) { toast.error(e.message) }
    finally { setMesgul(null) }
  }

  return (
    <div className="w-[200px] flex-shrink-0 border-l bg-white p-2.5 flex flex-col gap-2 overflow-y-auto">
      <div className="text-[11px] font-bold text-marka-900">🛍️ HIZLI ÜRÜNLER</div>
      <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ara… (ad, SKU)"
        disabled={!hedef?.id}
        className="w-full border border-marka-100 rounded-md px-2 py-1 text-[12px] focus:outline-none focus:border-marka-400 disabled:bg-gray-50" />
      {!hedef?.id && <div className="text-[11px] text-gray-400">Bir konuşma ya da yorum seçin.</div>}
      {liste.map(u => {
        const anahtar = `${u._tur}-${u.id}`
        return (
          <button key={anahtar} type="button" onClick={() => gonder(u)} disabled={!!mesgul}
            title="Tıklayınca kart hemen gider"
            className="w-full flex gap-2 items-center p-1.5 rounded-lg border border-marka-100 bg-white hover:bg-marka-50 text-left disabled:opacity-60">
            <div className="min-w-0 text-[12px] flex-1">
              <div className="font-bold text-marka-900 truncate">{u.ad}</div>
              <div className="text-marka-400">
                {u.satis_fiyati ? `${Number(u.satis_fiyati).toLocaleString('tr-TR')} TL` : ''}
                {!u.web_link && <span className="text-amber-600"> · linksiz</span>}
              </div>
            </div>
            {mesgul === anahtar && <span className="text-[11px] text-gray-400">…</span>}
            {gitti === anahtar && <span className="text-emerald-600 text-[11px] font-semibold">Gönderildi ✓</span>}
          </button>
        )
      })}
      {!arama.trim() && son.length > 0 && (
        <>
          <div className="text-[10px] text-gray-400 mt-1">Son gönderilenler</div>
          {son.map((e, i) => (
            <button key={i} type="button" onClick={() => setArama(e.title)} disabled={!hedef?.id}
              className="text-left text-[12px] px-1.5 py-1 rounded hover:bg-marka-50 text-marka-900 truncate disabled:opacity-50">
              {e.title}
            </button>
          ))}
        </>
      )}
    </div>
  )
}
