import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { kanalApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { eslesirMi } from '../utils/arama'
import Sayfalama from './Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'

// Kanal Stok Senkronu — her kanal KENDİ listesi.
// Karar kaydı: docs/superpowers/specs/2026-09-13-kanal-stok-senkronu-design.md
//
// Tasarım ilkeleri (kullanıcı kararı 13.09.2026):
//  · Üç kanal ÜÇ AYRI LİSTE. Tek karışık tablo değil.
//  · Eşleşme stok kodu (SKU) ile — ölçüldü: 162/162 (barkodla 161/162).
//  · Ana stok kaynağı SEÇİLEBİLİR ayardır, koda gömülü değil.
//  · "Tazele" düğmesi YOK: okuma arka planda döner (main.js, 10 dk).
//  · Eşitleme ARKA PLANDA otomatiktir; onay YALNIZ ürün satıştan kalkacaksa
//    istenir ve ekranın en üstünde kuyruk olarak belirir.
//  · Mağaza listesi salt görüntü — sayım yapılmadığı için hiçbir şeyi etkilemez.

const KANAL_BILGI = {
  ikas:     { ad: 'ikas',     ikon: '🛍️' },
  trendyol: { ad: 'Trendyol', ikon: '🧡' },
  magaza:   { ad: 'Mağaza',   ikon: '🏬' },
}

const DURUM_ETIKET = {
  onaysiz: 'onay bekliyor', reddedildi: 'reddedildi', arsiv: 'arşivli', kilitli: 'kilitli',
}

function zamanKisa(s) {
  if (!s) return 'henüz okunmadı'
  const t = new Date(String(s).replace(' ', 'T'))
  if (Number.isNaN(t.getTime())) return s
  const dk = Math.round((Date.now() - t.getTime()) / 60000)
  if (dk < 1) return 'az önce'
  if (dk < 60) return `${dk} dk önce`
  return t.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

function Adet({ deger, soluk }) {
  if (deger == null) return <span className="text-gray-300">—</span>
  return <span className={soluk ? 'text-gray-400' : 'font-medium text-gray-800'}>{deger}</span>
}

// Ana kaynağın KENDİ listesinde: bu ürün hangi kanalda uyumsuz? Sütun boş kalmasın —
// "kaynak" yazısı her satırda tekrarlanıp hiçbir şey anlatmıyordu.
function NeredeUyumsuz({ satir, anaKanal, kanallar }) {
  const sapan = kanallar
    .filter(k => k !== anaKanal && k !== 'magaza')          // mağaza karara girmez
    .map(k => ({ k, deger: satir[k] }))
    .filter(x => x.deger != null && x.deger !== satir.miktar)
  if (!sapan.length) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className="flex gap-1 flex-wrap">
      {sapan.map(({ k, deger }) => (
        <span key={k} className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          {KANAL_BILGI[k].ad}: {deger}
        </span>
      ))}
    </span>
  )
}

// Bu satır ana kaynağa göre ne olacak? (eşitlenecek kanalların listesinde)
function Karsilastirma({ satir, anaKanal, buKanal }) {
  if (buKanal === anaKanal) return null
  const ana = satir[anaKanal]
  const bu = satir.miktar
  if (ana == null) return <span className="text-xs text-gray-400">{KANAL_BILGI[anaKanal].ad}'ta yok</span>
  if (ana === bu) return <span className="text-xs text-emerald-600">eşit</span>
  if (satir.durum && satir.durum !== 'onayli') return <span className="text-xs text-gray-400">gönderilemiyor</span>
  if (ana === 0) {
    return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">satıştan kalkacak</span>
  }
  const renk = ana > bu
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-amber-700 bg-amber-50 border-amber-200'
  return <span className={`text-xs font-semibold border rounded px-1.5 py-0.5 ${renk}`}>{bu} → {ana}</span>
}

export default function KanalSenkron() {
  const { yetkiVar, profil } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const ayarYetkisi = yetkiVar('ayarlar_duzenle')

  const [durum, setDurum] = useState(null)
  const [kanal, setKanal] = usePersistentState('kanal_secili', 'ikas')
  const [satirlar, setSatirlar] = useState([])
  const [arama, setArama] = usePersistentState('kanal_arama', '')
  const [yalnizFarkli, setYalnizFarkli] = usePersistentState('kanal_yalniz_farkli', false)
  const [plan, setPlan] = useState(null)
  const [bekleyenler, setBekleyenler] = useState([])
  const [mesgul, setMesgul] = useState(false)

  const durumYukle = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([kanalApi.durum(), kanalApi.bekleyenler()])
      setDurum(d); setBekleyenler(b)
    } catch (e) { toast.error(e.message) }
  }, [])

  // Otomatik eşitleme sıradan farkları zaten yazdı; buraya YALNIZ ürünü satıştan
  // kaldıracak olanlar düşer. Tek tıkla uygulanır ya da reddedilir.
  async function onayla(islemId) {
    setMesgul(true)
    try {
      const r = await kanalApi.bekleyenUygula(islemId)
      if (r.hatalar?.length) r.hatalar.forEach(h => toast.error(h))
      else toast.success(`${r.uygulanan} ürün güncellendi.`)
      await Promise.all([durumYukle(), listeYukle(kanal)])
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }
  async function reddet(islemId) {
    setMesgul(true)
    try { await kanalApi.bekleyenIptal(islemId); toast.success('İşlem iptal edildi.'); await durumYukle() }
    catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const listeYukle = useCallback(async (k) => {
    try { setSatirlar(await kanalApi.liste(k)) } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { durumYukle() }, [durumYukle])
  useEffect(() => { listeYukle(kanal) }, [listeYukle, kanal])

  // Arka plan turu veriyi tazeliyor; ekran açıkken sessizce yakalansın diye 60 sn'de bir
  // yeniden okunur. Bu bir AĞ isteği değil, yalnız yerel tablo okumasıdır.
  useEffect(() => {
    const t = setInterval(() => { durumYukle(); listeYukle(kanal) }, 60000)
    return () => clearInterval(t)
  }, [durumYukle, listeYukle, kanal])

  const anaKanal = durum?.anaKanal || 'ikas'

  async function esitle(hedef) {
    setMesgul(true)
    try {
      const p = await kanalApi.hazirla({ hedef, kullanici: kullanici || null })
      if (!p.islem_id) { toast.success(p.mesaj || 'Fark yok.'); await listeYukle(kanal); return }
      setPlan(p)
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  async function uygula() {
    if (!plan?.islem_id) return
    setMesgul(true)
    try {
      const r = await kanalApi.uygula(plan.islem_id)
      toast.success(`${r.gonderilen} ürün gönderildi.`)
      setPlan(null)
      try {
        const s = await kanalApi.sonucTazele(r.islem_id)
        if (s.basarisiz) toast.error(`${s.basarisiz} üründe hata oldu.`)
      } catch { /* sonuç birazdan hazır olur */ }
      await Promise.all([durumYukle(), listeYukle(kanal)])
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const suzulmus = useMemo(() => satirlar.filter(s => {
    // "Yalnız farklı" ANA KANALDA anlamsızdır (kendisiyle farkı olamaz) ve kutusu da
    // orada gizlidir. Yine de uygulanırsa liste boş görünür ve kullanıcının düzeltme
    // yolu kalmaz — görsel doğrulamada yaşandı (13.09.2026).
    if (yalnizFarkli && kanal !== anaKanal) {
      const ana = s[anaKanal]
      if (ana == null || ana === s.miktar) return false
    }
    return eslesirMi([s.ad, s.sku, s.barkod].filter(Boolean).join(' '), arama)
  }), [satirlar, arama, yalnizFarkli, anaKanal, kanal])

  const { dilim, ...sayfalama } = useSayfalama(suzulmus, 50)

  if (!durum) return <div className="text-sm text-gray-400 py-10 text-center">Yükleniyor…</div>

  if (!durum.kimlikVar) {
    return (
      <div className="border rounded-xl bg-amber-50 border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-1">Trendyol bağlı değil</h3>
        <p className="text-sm text-amber-800">
          Ayarlar &gt; Trendyol bölümünden Satıcı ID, API Key ve API Secret girin.
        </p>
      </div>
    )
  }

  const o = durum.ozet || {}
  const buOzet = o[kanal] || {}
  const yazilabilir = (durum.yazilabilir || []).includes(kanal) && kanal !== anaKanal

  return (
    <div>
      {/* ONAY BEKLEYENLER — en üstte, çünkü iş burada bekliyor */}
      {bekleyenler.map(b => (
        <div key={b.id} className="mb-4 border border-amber-300 bg-amber-50 rounded-xl px-4 py-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="font-semibold text-amber-900">
                {b.kalemler.length} ürün onay bekliyor
              </div>
              <div className="text-sm text-amber-800">{b.aciklama || 'Stok değişikliği onay bekliyor'}</div>
              <div className="text-xs text-amber-700 mt-1">
                {b.kalemler.slice(0, 4).map(k => `${k.ad || k.sku} (${k.eski_miktar}→${k.yeni_miktar})`).join(' · ')}
                {b.kalemler.length > 4 && ` · +${b.kalemler.length - 4} ürün daha`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => reddet(b.id)} disabled={mesgul}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-sm hover:bg-amber-100 disabled:opacity-40">
                Vazgeç
              </button>
              <button onClick={() => onayla(b.id)} disabled={mesgul}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40">
                Onayla
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Ana kaynak — sistemin en belirleyici ayarı, bu yüzden en üstte */}
      <div className="flex flex-wrap items-center gap-3 mb-4 border rounded-xl bg-white px-4 py-3">
        <span className="text-sm text-gray-600">Ana stok kaynağı:</span>
        <div className="flex gap-1">
          {durum.kanallar.map(k => {
            const secili = k === anaKanal
            const secilemez = k === 'magaza'
            return (
              <button key={k} disabled={!ayarYetkisi || secilemez}
                onClick={async () => {
                  try { setDurum(await kanalApi.anaKanalSec(k)); toast.success(`Ana kaynak: ${KANAL_BILGI[k].ad}`) }
                  catch (e) { toast.error(e.message) }
                }}
                title={secilemez ? 'Mağaza sayımı yapılmadığı için ana kaynak olamaz' : ''}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  secili ? 'bg-blue-600 text-white border-blue-600'
                         : secilemez ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                     : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                {KANAL_BILGI[k].ikon} {KANAL_BILGI[k].ad}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-gray-400">Diğer kanallar buna eşitlenir.</span>
        <span className="ml-auto flex items-center gap-2 text-xs">
          {durum.senkKapali && <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">⛔ Acil kapalı</span>}
          <span className={`px-2 py-1 rounded font-medium ${durum.yazmaAcik ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {durum.yazmaAcik ? 'Yazma açık' : 'Salt okunur'}
          </span>
        </span>
      </div>

      {/* Üç kanal, üç ayrı liste — seçilen kanalın listesi aşağıda görünür */}
      <div className="flex gap-2 mb-4">
        {durum.kanallar.map(k => {
          const ozet = o[k] || {}
          const secili = k === kanal
          return (
            <button key={k} onClick={() => setKanal(k)}
              className={`flex-1 text-left border rounded-xl px-4 py-3 transition ${
                secili ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'bg-white hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span>{KANAL_BILGI[k].ikon}</span>
                <span className="font-semibold text-gray-800">{KANAL_BILGI[k].ad}</span>
                {k === anaKanal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium">ANA KAYNAK</span>}
                {k === 'magaza' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">sayım bekliyor</span>}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                <b className="text-gray-800">{ozet.toplam ?? 0}</b> ürün
                {k !== anaKanal && ozet.farkli > 0 && <> · <b className="text-amber-600">{ozet.farkli}</b> farklı</>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{zamanKisa(ozet.sonOkuma)}</div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün adı, stok kodu veya barkod ara..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
        {kanal !== anaKanal && (
          <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
            <input type="checkbox" checked={yalnizFarkli} onChange={e => setYalnizFarkli(e.target.checked)} />
            <span>Yalnız farklı olanlar</span>
          </label>
        )}
        {yazilabilir && (
          <button onClick={() => esitle(kanal)} disabled={mesgul || !durum.yazmaAcik || durum.senkKapali}
            title={!durum.yazmaAcik ? 'Ayarlar > Trendyol bölümünden yazmayı açın' : ''}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {mesgul ? 'Hazırlanıyor…' : `${KANAL_BILGI[anaKanal].ad} ile eşitle`}
          </button>
        )}
      </div>

      {kanal === 'magaza' && (
        <div className="text-xs text-gray-500 bg-gray-50 border rounded-lg px-3 py-2 mb-3">
          Mağaza sayımı yapılmadığı için bu liste <b>hiçbir şeyi etkilemez</b>; yalnızca görüntülenir.
          Sayım tamamlandığında ana kaynak olarak seçilebilir hâle gelecek.
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Ürün</th>
              <th className="text-right px-3 py-2 font-medium w-32">{KANAL_BILGI[kanal].ad} adedi</th>
              <th className="text-left px-3 py-2 font-medium w-48">
                {kanal === anaKanal ? 'Uyumsuz olduğu kanal' : `${KANAL_BILGI[anaKanal].ad}'a göre`}
              </th>
            </tr>
          </thead>
          <tbody>
            {dilim.map(s => (
              <tr key={s.sku}
                className={`border-t hover:bg-gray-50 ${kanal !== anaKanal && s[anaKanal] === 0 && s.miktar > 0 ? 'bg-red-50/40' : ''}`}>
                <td className="px-4 py-2">
                  <div className="text-gray-800">{s.ad || <span className="text-gray-400">(adsız)</span>}</div>
                  <div className="text-xs text-gray-400">
                    {s.sku}
                    {s.durum && s.durum !== 'onayli' && (
                      <span className="ml-2 text-amber-600">· {DURUM_ETIKET[s.durum] || s.durum}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right"><Adet deger={s.miktar} soluk={kanal === 'magaza'} /></td>
                <td className="px-3 py-2">
                  {kanal === anaKanal
                    ? <NeredeUyumsuz satir={s} anaKanal={anaKanal} kanallar={durum.kanallar} />
                    : <Karsilastirma satir={s} anaKanal={anaKanal} buKanal={kanal} />}
                </td>
              </tr>
            ))}
            {!dilim.length && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                {buOzet.toplam ? 'Bu filtreye uyan ürün yok.' : 'Bu kanal henüz okunmadı — arka plan turu birkaç dakika içinde dolduracak.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {plan && <OnayKutusu plan={plan} mesgul={mesgul} onVazgec={() => setPlan(null)} onUygula={uygula} />}

      {ayarYetkisi && (
        <div className="mt-6 border rounded-xl bg-gray-50 px-4 py-3 flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={durum.yazmaAcik}
              onChange={async e => { try { setDurum(await kanalApi.yazmaAc(e.target.checked)) } catch (err) { toast.error(err.message) } }} />
            <span>Trendyol'a yazmayı aç</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={durum.senkKapali}
              onChange={async e => { try { setDurum(await kanalApi.acilKapat(e.target.checked)) } catch (err) { toast.error(err.message) } }} />
            <span className="text-red-600">⛔ Acil durdur</span>
          </label>
        </div>
      )}
    </div>
  )
}

// HAFİF onay. Sıradan eşitlemede tek cümle yeter; yazılı teyit YALNIZ ürün satıştan
// kalkacaksa istenir — geri dönüşü zor olan tek sonuç odur (kullanıcı kararı 13.09).
function OnayKutusu({ plan, mesgul, onVazgec, onUygula }) {
  const { ozet } = plan
  const sifir = ozet.sifirlanacak || 0
  const [teyit, setTeyit] = useState('')
  const hazir = sifir === 0 || teyit.trim() === String(sifir)
  const hedefAd = KANAL_BILGI[plan.hedef]?.ad || plan.hedef

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onVazgec}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">Emin misiniz?</h3>
        <p className="text-sm text-gray-600 mb-3">
          <b>{ozet.toplam}</b> ürünün stoğu {hedefAd}'da güncellenecek
          ({ozet.artacak} artacak, {ozet.azalacak} azalacak). Önceki değerler kaydedildi, geri alabilirsiniz.
        </p>

        {sifir > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3 mb-3">
            <div className="font-semibold text-red-800 text-sm mb-1">{sifir} ürün satıştan kalkacak</div>
            <p className="text-xs text-red-700 mb-2">Stoğu sıfıra inecek. Onaylamak için <b>{sifir}</b> yazın.</p>
            <input value={teyit} onChange={e => setTeyit(e.target.value)} inputMode="numeric"
              placeholder={String(sifir)} autoFocus
              className="border border-red-300 rounded-lg px-3 py-1.5 text-sm w-24" />
          </div>
        )}

        {(plan.gonderilemez?.length > 0 || plan.eslesmeyen?.length > 0) && (
          <p className="text-xs text-gray-500 mb-3">
            {plan.gonderilemez?.length > 0 && <>{plan.gonderilemez.length} ürün gönderilemiyor (onay/arşiv/kilit). </>}
            {plan.eslesmeyen?.length > 0 && <>{plan.eslesmeyen.length} ürün karşı kanalda yok.</>}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onVazgec} disabled={mesgul}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 text-sm">Vazgeç</button>
          <button onClick={onUygula} disabled={!hazir || mesgul}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            {mesgul ? 'Gönderiliyor…' : 'Evet, eşitle'}
          </button>
        </div>
      </div>
    </div>
  )
}
