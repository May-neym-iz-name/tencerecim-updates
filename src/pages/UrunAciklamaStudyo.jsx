import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { urunAciklamaApi } from '../api/ipc'

// Ürün Açıklama Stüdyosu — Gemini SEO metni + akordeon şablon → ikas açıklaması.
// Akış: aday seç → önizle (SON KONTROL) → Yayınla. Yayın öncesi eski açıklama yedeklenir.
export default function UrunAciklamaStudyo() {
  const [filtre, setFiltre] = useState('çelik tencere')
  const [adaylar, setAdaylar] = useState([])
  const [yukleniyorListe, setYukleniyorListe] = useState(false)
  const [secili, setSecili] = useState(null)
  const [onizleme, setOnizleme] = useState(null) // {html, seoGiris, saglik, siniflar, uyarilar, mevcutAciklamaUz}
  const [uretiliyor, setUretiliyor] = useState(false)
  const [yayinlaniyor, setYayinlaniyor] = useState(false)
  const [yedekler, setYedekler] = useState([])

  const listeYukle = useCallback(async () => {
    setYukleniyorListe(true)
    try { setAdaylar(await urunAciklamaApi.adaylar({ filtre })) }
    catch (e) { toast.error('Liste alınamadı: ' + e.message) }
    finally { setYukleniyorListe(false) }
  }, [filtre])

  const yedekYukle = useCallback(async () => {
    try { setYedekler(await urunAciklamaApi.yedekler({ limit: 30 })) } catch { /* sessiz */ }
  }, [])

  useEffect(() => { yedekYukle() }, [yedekYukle])

  const onizle = async (urun) => {
    setSecili(urun); setOnizleme(null); setUretiliyor(true)
    try { setOnizleme(await urunAciklamaApi.onizle(urun.id)) }
    catch (e) { toast.error('Önizleme/Gemini hatası: ' + e.message) }
    finally { setUretiliyor(false) }
  }

  const yayinla = async () => {
    if (!secili || !onizleme) return
    if (!confirm(`"${secili.name}" ürününün açıklaması ikas'ta GÜNCELLENECEK.\nEski açıklama yedeklenecek (geri alınabilir).\nDevam?`)) return
    setYayinlaniyor(true)
    try {
      await urunAciklamaApi.yayinla(secili.id, onizleme.html)
      toast.success('Yayınlandı ✓ (görsel/fiyat korundu, doğrulandı)')
      yedekYukle()
    } catch (e) { toast.error('Yayın DURDU: ' + e.message) }
    finally { setYayinlaniyor(false) }
  }

  const geriAl = async (y) => {
    if (!confirm(`"${y.urun_adi}" için eski açıklama geri yüklensin mi?`)) return
    try { await urunAciklamaApi.geriAl(y.id); toast.success('Geri alındı ✓'); yedekYukle() }
    catch (e) { toast.error('Geri alma hatası: ' + e.message) }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-[#052238] mb-1">📝 Ürün Açıklama Stüdyosu</h1>
      <p className="text-sm text-gray-500 mb-4">
        Gemini SEO metni + akordeon şablon → ikas açıklaması. İndüksiyon rozeti yalnız <b>doğrulanmış</b> ürünlerde çıkar.
        Yayın öncesi eski açıklama yedeklenir.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* SOL: aday listesi */}
        <div className="border border-gray-200 rounded-xl p-3 bg-white">
          <div className="flex gap-2 mb-3">
            <input
              value={filtre} onChange={(e) => setFiltre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && listeYukle()}
              placeholder="filtre (örn. çelik tencere)"
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
            />
            <button onClick={listeYukle} disabled={yukleniyorListe}
              className="bg-[#052238] text-white rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
              {yukleniyorListe ? '…' : 'Ara'}
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y">
            {adaylar.map((u) => (
              <button key={u.id} onClick={() => onizle(u)}
                className={`w-full text-left py-2 px-2 text-sm hover:bg-amber-50 ${secili?.id === u.id ? 'bg-amber-100' : ''}`}>
                <div className="font-medium text-[#052238] leading-tight">{u.name}</div>
                <div className="text-xs text-gray-500">{u.gorselSayisi} görsel · {u.fiyat ? u.fiyat + ' TL' : 'fiyat yok'}</div>
              </button>
            ))}
            {!adaylar.length && !yukleniyorListe && <div className="text-sm text-gray-400 py-6 text-center">Ara'ya bas.</div>}
          </div>
        </div>

        {/* SAĞ: önizleme + yayınla */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          {!secili && <div className="text-gray-400 text-center py-16">Soldan bir ürün seç.</div>}
          {secili && (
            <>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="font-semibold text-[#052238]">{secili.name}</div>
                <div className="flex gap-2">
                  <button onClick={() => onizle(secili)} disabled={uretiliyor}
                    className="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">↻ Yeniden üret</button>
                  <button onClick={yayinla} disabled={!onizleme || yayinlaniyor || uretiliyor}
                    className="bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-bold disabled:opacity-40">
                    {yayinlaniyor ? 'Yayınlanıyor…' : '✓ Yayınla'}
                  </button>
                </div>
              </div>

              {uretiliyor && <div className="text-sm text-gray-500 py-10 text-center">Gemini metni üretiliyor…</div>}

              {onizleme && !uretiliyor && (
                <>
                  {onizleme.uyarilar?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-800">
                      {onizleme.uyarilar.map((u, i) => <div key={i}>⚠️ {u}</div>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
                    <span>Çelik: <b>{onizleme.siniflar?.celik ? 'evet' : 'hayır'}</b></span>
                    <span>İndüksiyon: <b>{onizleme.siniflar?.induksiyon}</b></span>
                    <span>Garanti: <b>{onizleme.siniflar?.garanti ? 'var' : 'yok (outlet?)'}</b></span>
                    <span>Model: <b>{onizleme.model}</b></span>
                    <span>Mevcut açıklama: <b>{onizleme.mevcutAciklamaUz}</b> krkt</span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Son kontrol — vitrinde böyle görünecek</div>
                  <div className="border rounded-lg p-3 bg-gray-50" dangerouslySetInnerHTML={{ __html: onizleme.html }} />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Yedekler */}
      {yedekler.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded-xl p-3 bg-white">
          <div className="font-semibold text-[#052238] mb-2 text-sm">Son yazımlar (geri alınabilir)</div>
          <div className="max-h-52 overflow-y-auto divide-y text-sm">
            {yedekler.map((y) => (
              <div key={y.id} className="flex items-center justify-between py-1.5">
                <span className="truncate">{y.urun_adi} <span className="text-gray-400 text-xs">· {new Date(y.tarih).toLocaleString('tr')}</span></span>
                <button onClick={() => geriAl(y)} className="text-red-600 text-xs border border-red-200 rounded px-2 py-1 ml-2 shrink-0">↩ Geri al</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
