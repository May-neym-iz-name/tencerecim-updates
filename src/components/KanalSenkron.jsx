import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { kanalApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { eslesirMi } from '../utils/arama'
import Sayfalama from './Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'

// Kanal Stok Senkronu — ikas ile Trendyol'un aynı sayıyı göstermesi.
// Karar kaydı: docs/superpowers/specs/2026-09-13-kanal-stok-senkronu-design.md
//
// Tasarım ilkeleri:
//  · Kaynak ikas'tır. Trendyol adedi := ikas adedi. Kullanıcı tek tek ürün SEÇMEZ.
//  · Mağaza sütunu GRİ ve karara girmez — sayım yapılmadığı için güvenilmez.
//  · Sıfırlanacak ürünler ayrı vurgulanır: tek geri dönüşü zor sonuç odur
//    (ürün Trendyol'da satıştan kalkar).

const BOS_DURUM = { kimlikVar: false, senkKapali: false, yazmaAcik: false, sonOkuma: {}, sellerId: null }

// Sayıyı kanal hücresinde gösterir. null = o kanalda ürün yok (eşleşmeyen).
function Adet({ deger, soluk }) {
  if (deger == null) return <span className="text-gray-300">—</span>
  return <span className={soluk ? 'text-gray-400' : 'font-medium text-gray-800'}>{deger}</span>
}

// ikas → Trendyol yönünü ve büyüklüğünü tek bakışta anlatır.
function YonRozeti({ ikas, trendyol }) {
  if (ikas == null || trendyol == null) return <span className="text-xs text-gray-400">eşleşmedi</span>
  if (ikas === trendyol) return <span className="text-xs text-gray-400">aynı</span>
  if (ikas === 0) return <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">satıştan kalkacak</span>
  const fark = ikas - trendyol
  return fark > 0
    ? <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">▲ {fark}</span>
    : <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">▼ {-fark}</span>
}

export default function KanalSenkron() {
  const { yetkiVar, profil } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const ayarYetkisi = yetkiVar('ayarlar_duzenle')

  const [durum, setDurum] = useState(BOS_DURUM)
  const [satirlar, setSatirlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [plan, setPlan] = useState(null)          // hazırla çıktısı → doğrulama modalı
  const [uyguluyor, setUyguluyor] = useState(false)
  const [arama, setArama] = usePersistentState('kanal_arama', '')
  const [yalnizFarkli, setYalnizFarkli] = usePersistentState('kanal_yalniz_farkli', true)

  const durumYukle = useCallback(async () => {
    try { setDurum(await kanalApi.durum()) } catch (e) { toast.error(e.message) }
  }, [])

  const listeYukle = useCallback(async () => {
    try { setSatirlar(await kanalApi.karsilastir()) } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { durumYukle(); listeYukle() }, [durumYukle, listeYukle])

  async function tazele() {
    setYukleniyor(true)
    try {
      const r = await kanalApi.tazele()
      if (r.hatalar?.length) r.hatalar.forEach(h => toast.error(h))
      else toast.success(`Okundu — ikas ${r.ikas}, Trendyol ${r.trendyol} ürün`)
      await Promise.all([durumYukle(), listeYukle()])
    } catch (e) { toast.error(e.message) } finally { setYukleniyor(false) }
  }

  async function hazirla() {
    setYukleniyor(true)
    try {
      const p = await kanalApi.hazirla({ kullanici: kullanici || null })
      if (!p.islem_id) { toast.success(p.mesaj || 'Fark yok.'); await listeYukle(); return }
      setPlan(p)   // doğrulama modalı açılır
      await listeYukle()
    } catch (e) { toast.error(e.message) } finally { setYukleniyor(false) }
  }

  async function uygula() {
    if (!plan?.islem_id) return
    setUyguluyor(true)
    try {
      const r = await kanalApi.uygula(plan.islem_id)
      toast.success(`${r.gonderilen} ürün Trendyol'a gönderildi.`)
      setPlan(null)
      await Promise.all([tazeleSonuc(r.islem_id), listeYukle()])
    } catch (e) { toast.error(e.message) } finally { setUyguluyor(false) }
  }

  async function tazeleSonuc(islemId) {
    try {
      const s = await kanalApi.sonucTazele(islemId)
      if (s.basarisiz) toast.error(`${s.basarisiz} üründe hata — İşlem geçmişinden bakın.`)
      else if (s.tamam) toast.success('Trendyol tüm kalemleri kabul etti.')
    } catch { /* sonuç birazdan hazır olur; sessiz geç */ }
  }

  const suzulmus = useMemo(() => satirlar.filter(s => {
    if (yalnizFarkli && !(s.ikas != null && s.trendyol != null && s.ikas !== s.trendyol)) return false
    return eslesirMi([s.ad, s.barkod, s.sku].filter(Boolean).join(' '), arama)
  }), [satirlar, arama, yalnizFarkli])

  const { dilim, ...sayfalama } = useSayfalama(suzulmus, 50)

  const sayaclar = useMemo(() => {
    let farkli = 0, eslesmeyen = 0
    for (const s of satirlar) {
      if (s.ikas == null || s.trendyol == null) eslesmeyen++
      else if (s.ikas !== s.trendyol) farkli++
    }
    return { farkli, eslesmeyen, toplam: satirlar.length }
  }, [satirlar])

  // --- kapılar ------------------------------------------------------------

  if (!durum.kimlikVar) {
    return (
      <div className="border rounded-xl bg-amber-50 border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-1">Trendyol bağlı değil</h3>
        <p className="text-sm text-amber-800">
          Ayarlar &gt; Trendyol bölümünden Satıcı ID, API Key ve API Secret girin.
          Bilgiler Trendyol Satıcı Paneli &gt; Hesap Bilgilerim &gt; Entegrasyon Bilgileri'nde.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Durum şeridi: neyin ne zaman okunduğu ve yazmanın açık olup olmadığı */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <button onClick={tazele} disabled={yukleniyor}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
          {yukleniyor ? 'Okunuyor…' : '↻ Tazele'}
        </button>
        <span className="text-gray-500">
          ikas: {durum.sonOkuma?.ikas || 'hiç okunmadı'} · Trendyol: {durum.sonOkuma?.trendyol || 'hiç okunmadı'}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {durum.senkKapali && <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">⛔ Acil kapalı</span>}
          <span className={`px-2 py-1 rounded font-medium ${durum.yazmaAcik ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
            {durum.yazmaAcik ? 'Yazma açık' : 'Yazma kapalı (salt okunur)'}
          </span>
        </span>
      </div>

      {/* Sayaçlar — kompakt: ekranın yarısını kaplayan boş kartlar bilgi taşımıyordu */}
      <div className="inline-flex items-stretch divide-x border rounded-lg bg-white mb-4 overflow-hidden">
        {[['Farklı', sayaclar.farkli, 'text-amber-600'], ['Eşleşmeyen', sayaclar.eslesmeyen, 'text-gray-400'], ['Toplam', sayaclar.toplam, 'text-gray-700']].map(([l, v, renk]) => (
          <div key={l} className="px-5 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">{l}</div>
            <div className={`text-xl font-bold leading-tight ${renk}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Arama + filtre */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün adı, barkod veya stok kodu ara..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
        <label className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 text-sm hover:bg-gray-50">
          <input type="checkbox" checked={yalnizFarkli} onChange={e => setYalnizFarkli(e.target.checked)} />
          <span>Yalnız farklı olanlar</span>
        </label>
        <button onClick={hazirla} disabled={yukleniyor || !durum.yazmaAcik || durum.senkKapali}
          title={!durum.yazmaAcik ? 'Ayarlar > Trendyol bölümünden yazmayı açın' : ''}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
          Trendyol'u ikas ile eşitle →
        </button>
      </div>

      {/* Tablo */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            {/* Üst satır üç kanalı TEK GRUP olarak çerçeveler: "üçlü stok" bakışı budur. */}
            <tr className="text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-4 pt-2" />
              <th colSpan={3} className="px-3 pt-2 text-center border-x bg-white/60">Kanallardaki adet</th>
              <th className="px-3 pt-2" />
            </tr>
            <tr>
              <th className="text-left px-4 pb-2 font-medium">Ürün</th>
              <th className="px-3 pb-2 font-medium w-28 text-right border-l bg-white/60" title="Mağaza sayımı yapılmadığı için bu sütun karara girmez">
                <div>Mağaza</div>
                <div className="text-[10px] font-normal text-gray-400 leading-none">sayım bekliyor</div>
              </th>
              <th className="px-3 pb-2 font-medium w-24 text-right bg-white/60">
                <div>ikas</div>
                <div className="text-[10px] font-normal text-blue-500 leading-none">kaynak</div>
              </th>
              <th className="px-3 pb-2 font-medium w-24 text-right border-r bg-white/60">
                <div>Trendyol</div>
                <div className="text-[10px] font-normal text-gray-400 leading-none">hedef</div>
              </th>
              <th className="text-left px-3 pb-2 font-medium w-44">Olacak</th>
            </tr>
          </thead>
          <tbody>
            {dilim.map(s => (
              <tr key={s.barkod} className={`border-t hover:bg-gray-50 ${s.ikas === 0 && s.trendyol > 0 ? 'bg-red-50/40' : ''}`}>
                <td className="px-4 py-2">
                  <div className="text-gray-800">{s.ad || <span className="text-gray-400">(adsız)</span>}</div>
                  <div className="text-xs text-gray-400">{s.sku ? `${s.sku} · ` : ''}{s.barkod}</div>
                </td>
                <td className="px-3 py-2 text-right border-l"><Adet deger={s.magaza} soluk /></td>
                <td className="px-3 py-2 text-right"><Adet deger={s.ikas} /></td>
                <td className="px-3 py-2 text-right border-r"><Adet deger={s.trendyol} /></td>
                <td className="px-3 py-2"><YonRozeti ikas={s.ikas} trendyol={s.trendyol} /></td>
              </tr>
            ))}
            {!dilim.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                {satirlar.length ? 'Bu filtreye uyan ürün yok.' : 'Henüz okuma yapılmadı — "Tazele" ile başlayın.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {plan && (
        <DogrulamaModali plan={plan} uyguluyor={uyguluyor}
          onVazgec={() => setPlan(null)} onUygula={uygula} />
      )}

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
            <span className="text-red-600">⛔ Acil durdur (tüm gönderimleri kapatır)</span>
          </label>
        </div>
      )}
    </div>
  )
}

// Tek onay noktası. Kullanıcı buraya gelene kadar hiçbir şey Trendyol'a gitmemiştir;
// bu ekrandan sonra gider. Bu yüzden özet burada TEKRAR gösterilir ve sıfırlanacaklar
// ayrıca sayılır — "kaç ürün satıştan kalkacak" sorusunun cevabı görünmeden onay istenmez.
function DogrulamaModali({ plan, uyguluyor, onVazgec, onUygula }) {
  const { ozet } = plan
  const sifir = ozet.sifirlanacak || 0
  const [teyit, setTeyit] = useState('')
  const teyitGerekli = sifir > 0
  const hazir = !teyitGerekli || teyit.trim() === String(sifir)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Trendyol stoğu güncellenecek</h3>
        <p className="text-sm text-gray-500 mb-4">
          ikas'taki adetler Trendyol'a yazılacak. Gönderimden önce Trendyol'un şu anki
          adetleri kaydedildi — geri alabilirsiniz.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500">Güncellenecek ürün</div>
            <div className="text-2xl font-bold text-gray-800">{ozet.toplam}</div>
          </div>
          <div className="border rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500">Artacak / Azalacak</div>
            <div className="text-2xl font-bold"><span className="text-emerald-600">{ozet.artacak}</span> <span className="text-gray-300">/</span> <span className="text-amber-600">{ozet.azalacak}</span></div>
          </div>
        </div>

        {sifir > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 mb-4">
            <div className="font-semibold text-red-800 mb-1">{sifir} ürün Trendyol'da satıştan kalkacak</div>
            <p className="text-sm text-red-700 mb-3">
              Bu ürünlerin ikas stoğu sıfır. Onaylamak için aşağıya <b>{sifir}</b> yazın.
            </p>
            <input value={teyit} onChange={e => setTeyit(e.target.value)} inputMode="numeric"
              placeholder={String(sifir)}
              className="border border-red-300 rounded-lg px-3 py-2 text-sm w-28" />
          </div>
        )}

        {(plan.gonderilemez?.length > 0 || plan.eslesmeyen?.length > 0) && (
          <p className="text-xs text-gray-500 mb-4">
            {plan.gonderilemez?.length > 0 && <>{plan.gonderilemez.length} ürün gönderilemiyor (Trendyol onayı/arşiv/kilit). </>}
            {plan.eslesmeyen?.length > 0 && <>{plan.eslesmeyen.length} ürün Trendyol'da bulunamadı.</>}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onVazgec} disabled={uyguluyor}
            className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">Vazgeç</button>
          <button onClick={onUygula} disabled={!hazir || uyguluyor}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {uyguluyor ? 'Gönderiliyor…' : 'Onayla ve gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}
