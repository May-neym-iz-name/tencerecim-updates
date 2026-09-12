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
import KuponGonder from './KuponGonder'

const ARAMA_GECIKME_MS = 250
const GERI_BILDIRIM_MS = 1200
// Meta generic template sınırı: tek mesajda en fazla 10 element (bkz. electron/meta/kart-mesaj.js
// MAKS_KART). Fazlası sessizce ATILIR — bu yüzden sepet burada kapanır, kullanıcı uyarılır.
const MAKS_SEPET = 10

// hedefYok: hedef boşken gösterilecek açıklama (ör. konuşmada gelen mesaj yok).
// onSablon(metin): ürünün HAZIR ŞABLON metnini yanıt kutusuna ekler (09.09.2026: yalnız web
// sitesinde var olan ürünler + hazır şablonları listelenir; sitede olmayan ürün gösterilmez).
export default function HizliUrunler({ hedef, kullanici, onGonderildi, hedefYok, onSablon }) {
  const [arama, setArama] = useState('')
  const [liste, setListe] = useState([])
  const [son, setSon] = useState([])
  const [sablonlar, setSablonlar] = useState([]) // ürün/set → hazır şablon eşlemesi
  useEffect(() => { sosyalApi.sablonlar().then(setSablonlar).catch(() => {}) }, [])
  const sablonBul = (u) => sablonlar.find(sb => u._tur === 'set' ? sb.set_id === u.id : sb.urun_id === u.id)
  async function sablonEkle(u) {
    const sb = sablonBul(u)
    if (!sb || !onSablon) return
    try {
      const r = await sosyalApi.sablonMetin(sb.id)
      if (r?.metin) onSablon(r.metin)
      if (r?.asildi) toast('Dikkat: mesaj 1000 karakteri aşıyor, göndermeden kısaltın.', { icon: '⚠️' })
    } catch (e) { toast.error(e.message) }
  }
  const [mesgul, setMesgul] = useState(null)   // gönderilmekte olan ürünün anahtarı
  const [gitti, setGitti] = useState(null)     // az önce gönderilen ürünün anahtarı
  // ÇOKLU KART (12.09.2026): otomasyonun yaptığı gibi tek mesajda birden çok ürün.
  // Satıra tıklamak eskisi gibi TEK ürünü hemen gönderir; "+" sepete ekler, sepet
  // doluyken üstteki "Gönder (N)" hepsini TEK karusel mesajda yollar.
  const [sepet, setSepet] = useState([])

  // Hedef değişince (başka konuşma/yorum) sepet taşınmaz — yanlış kişiye gitmesin.
  useEffect(() => { setSepet([]) }, [hedef?.id])

  const sepetteMi = (anahtar) => sepet.some(x => x._anahtar === anahtar)
  function sepeteAt(u) {
    const anahtar = `${u._tur}-${u.id}`
    setSepet(s => {
      if (s.some(x => x._anahtar === anahtar)) return s.filter(x => x._anahtar !== anahtar)
      if (s.length >= MAKS_SEPET) { toast(`Tek mesajda en fazla ${MAKS_SEPET} ürün gönderilebilir.`, { icon: '⚠️' }); return s }
      return [...s, { ...u, _anahtar: anahtar }]
    })
  }

  useEffect(() => { sosyalApi.sonUrunler().then(setSon).catch(() => {}) }, [hedef?.id])

  useEffect(() => {
    if (!arama.trim()) { setListe([]); return }
    const t = setTimeout(async () => {
      try {
        const [u, s] = await Promise.all([
          urunlerApi.listele({ arama: arama.trim(), boyut: 8, siteVar: true }),
          setApi.listele({ arama: arama.trim(), siteVar: true }),
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

  // Sepetin tamamı TEK kart mesajı olarak gider (kartMesajiOlustur sıralamayı korur).
  async function gonderSepet() {
    if (!hedef?.id || !sepet.length) return
    setMesgul('sepet')
    try {
      await metaApi.kartGonder({
        hedef,
        urunler: sepet.map(u => ({ ad: u.ad, fiyat: u.satis_fiyati, web_link: u.web_link, ikas_urun_id: u.ikas_urun_id })),
        kullanici,
      })
      setSepet([])
      setGitti('sepet'); setTimeout(() => setGitti(null), GERI_BILDIRIM_MS)
      onGonderildi?.()
      sosyalApi.sonUrunler().then(setSon).catch(() => {})
    } catch (e) { toast.error(e.message) }
    finally { setMesgul(null) }
  }

  return (
    <div className="w-[228px] h-full flex-shrink-0 border-l bg-white p-2.5 flex flex-col gap-2 overflow-y-auto">
      <div className="text-[11px] font-bold text-marka-900">🛍️ HIZLI ÜRÜNLER</div>
      <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ara… (ad, SKU)"
        disabled={!hedef?.id}
        className="w-full border border-marka-100 rounded-md px-2 py-1 text-[12px] focus:outline-none focus:border-marka-400 disabled:bg-gray-50" />
      {!hedef?.id && <div className="text-[11px] text-gray-400">{hedefYok || 'Bir konuşma ya da yorum seçin.'}</div>}

      {/* SEPET: tek mesajda gidecek ürünler. Ad tam görünsün diye satır satır, kırpmasız. */}
      {sepet.length > 0 && (
        <div className="rounded-lg border border-krem-400 bg-krem-50 p-1.5 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-marka-900">TEK MESAJDA GİDECEK · {sepet.length}/{MAKS_SEPET}</div>
          {sepet.map((u, i) => (
            <div key={u._anahtar} className="flex items-start gap-1 text-[11px] text-marka-900">
              <span className="text-marka-400 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1 break-words leading-tight">{u.ad}</span>
              <button type="button" onClick={() => sepeteAt(u)} title="Sepetten çıkar"
                className="flex-shrink-0 text-gray-400 hover:text-red-600">✕</button>
            </div>
          ))}
          <div className="flex gap-1">
            <button type="button" onClick={gonderSepet} disabled={!!mesgul}
              className="flex-1 rounded-md bg-marka-900 text-white text-[12px] font-semibold py-1 hover:bg-marka-400 disabled:opacity-60">
              {mesgul === 'sepet' ? 'Gönderiliyor…' : `Gönder (${sepet.length})`}
            </button>
            <button type="button" onClick={() => setSepet([])} disabled={!!mesgul}
              className="px-2 rounded-md border border-marka-100 text-[12px] text-marka-400 hover:bg-white">Boşalt</button>
          </div>
        </div>
      )}
      {gitti === 'sepet' && <div className="text-[11px] text-emerald-600 font-semibold">Kartlar gönderildi ✓</div>}
      {arama.trim() && liste.length === 0 && <div className="text-[11px] text-gray-400">Sitede böyle bir ürün yok.</div>}
      {liste.map(u => {
        const anahtar = `${u._tur}-${u.id}`
        const sb = sablonBul(u)
        return (
          <div key={anahtar} className="rounded-lg border border-marka-100 bg-white">
            <button type="button" onClick={() => gonder(u)} disabled={!!mesgul}
              title="Tıklayınca ürün kartı hemen gider"
              className="w-full flex gap-2 items-center p-1.5 rounded-t-lg hover:bg-marka-50 text-left disabled:opacity-60">
              <div className="min-w-0 text-[12px] flex-1">
                {/* Tam ad: 200px panelde `truncate` adı kesiyordu; personel hangi ürünü
                    gönderdiğini göremiyordu → sarmalı gösterim + tam ad ipucu (12.09.2026). */}
                <div className="font-bold text-marka-900 leading-tight break-words" title={u.ad}>{u.ad}</div>
                <div className="text-marka-400">
                  {u.satis_fiyati ? `${Number(u.satis_fiyati).toLocaleString('tr-TR')} TL` : ''}
                  {!u.web_link && <span className="text-amber-600"> · linksiz</span>}
                </div>
              </div>
              {mesgul === anahtar && <span className="text-[11px] text-gray-400">…</span>}
              {gitti === anahtar && <span className="text-emerald-600 text-[11px] font-semibold">Gönderildi ✓</span>}
            </button>
            <div className="flex items-center gap-1 px-1.5 pb-1.5 text-[10px]">
              <button type="button" onClick={() => sepeteAt(u)} disabled={!hedef?.id || !!mesgul}
                title={sepetteMi(anahtar) ? 'Sepetten çıkar' : 'Sepete ekle — birden çok ürün tek mesajda gider'}
                className={`px-1.5 py-0.5 rounded border disabled:opacity-50 ${sepetteMi(anahtar)
                  ? 'border-marka-900 bg-marka-900 text-white'
                  : 'border-marka-100 text-marka-900 hover:bg-marka-50'}`}>
                {sepetteMi(anahtar) ? '✓ sepette' : '+ sepet'}
              </button>
              {sb && onSablon
                ? <button type="button" onClick={() => sablonEkle(u)} title={`Hazır şablon: ${sb.ad} — metni yanıt kutusuna ekler`}
                    className="ml-auto px-1.5 py-0.5 rounded border border-violet-200 text-violet-700 hover:bg-violet-50">📝 Şablon</button>
                : <span className="ml-auto text-gray-300">şablon yok</span>}
            </div>
          </div>
        )
      })}
      {!arama.trim() && son.length > 0 && (
        <>
          <div className="text-[10px] text-gray-400 mt-1">Son gönderilenler</div>
          {son.map((e, i) => (
            <button key={i} type="button" onClick={() => setArama(e.title)} disabled={!hedef?.id}
              title={e.title}
              className="text-left text-[12px] px-1.5 py-1 rounded hover:bg-marka-50 text-marka-900 truncate disabled:opacity-50">
              {e.title}
            </button>
          ))}
        </>
      )}
      <KuponGonder hedef={hedef} kullanici={kullanici} onGonderildi={onGonderildi} />
    </div>
  )
}
