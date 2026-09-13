import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { trendyolSiparisApi, trendyolFaturaApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'

// Trendyol siparişleri — ikas siparişlerinden AYRI alan (kullanıcı kararı 13.09.2026).
// Trendyol'un birimi sipariş değil PAKETtir: bir sipariş birden çok pakete bölünebilir,
// her paket ayrı kargolanır ve ayrı statü taşır.
//
// Çekme ARKA PLANDA döner (main.js, 10 dk); buradaki "Şimdi çek" düğmesi beklemek
// istemeyenler için, zorunlu değil.

const DURUM_RENK = {
  Created: 'bg-blue-100 text-blue-700',
  Picking: 'bg-indigo-100 text-indigo-700',
  Invoiced: 'bg-violet-100 text-violet-700',
  Shipped: 'bg-amber-100 text-amber-700',
  AtCollectionPoint: 'bg-amber-100 text-amber-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  UnDelivered: 'bg-red-100 text-red-700',
  Returned: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-200 text-gray-600',
  UnSupplied: 'bg-gray-200 text-gray-600',
}

// Trendyol'un izin verdiği ileri geçişler. Geri gidiş yoktur.
const SONRAKI_STATU = { Created: 'Picking', Picking: 'Invoiced', Invoiced: 'Shipped' }

function paraFmt(n) {
  return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function tarihFmt(s) {
  if (!s) return '—'
  const t = new Date(s)
  return Number.isNaN(t.getTime()) ? s : t.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function TrendyolSiparisler() {
  const { yetkiVar } = useAuth()
  const kargoYetkisi = yetkiVar('kargo_yonet')

  const [durumlar, setDurumlar] = useState({})
  const [sayaclar, setSayaclar] = useState({})
  const [satirlar, setSatirlar] = useState([])
  const [durum, setDurum] = usePersistentState('ty_siparis_durum', '')
  const [arama, setArama] = usePersistentState('ty_siparis_arama', '')
  const [secili, setSecili] = useState(null)
  const [mesgul, setMesgul] = useState(false)

  const yukle = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([
        trendyolSiparisApi.listele({ durum: durum || undefined, arama: arama || undefined }),
        trendyolSiparisApi.sayaclar(),
      ])
      setSatirlar(l); setSayaclar(s)
    } catch (e) { toast.error(e.message) }
  }, [durum, arama])

  useEffect(() => { trendyolSiparisApi.durumListesi().then(setDurumlar).catch(() => {}) }, [])
  useEffect(() => { yukle() }, [yukle])
  // Arka plan turu yazdıkça ekran da tazelensin (yerel okuma, ağ isteği değil).
  useEffect(() => {
    const t = setInterval(yukle, 60000)
    return () => clearInterval(t)
  }, [yukle])

  async function simdiCek() {
    setMesgul(true)
    try {
      const r = await trendyolSiparisApi.cek(14)
      if (r.hatalar?.length) r.hatalar.forEach(h => toast.error(h))
      toast.success(`${r.yeni} yeni, ${r.guncellenen} güncellenen paket`)
      await yukle()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  async function statuIlerlet(s) {
    const hedef = SONRAKI_STATU[s.durum]
    if (!hedef) return
    setMesgul(true)
    try {
      const r = await trendyolSiparisApi.statu(s.paket_id, hedef)
      toast.success(`${s.siparis_no} → ${durumlar[hedef] || hedef}`)
      if (r.siparis) setSecili(r.siparis)
      await yukle()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const toplamAdet = useMemo(() => Object.values(sayaclar).reduce((a, b) => a + b, 0), [sayaclar])
  const { dilim, ...sayfalama } = useSayfalama(satirlar, 50)

  // Rozet olarak gösterilecek statüler — hepsini göstermek gürültü olurdu.
  const ONEMLI = ['Created', 'Picking', 'Invoiced', 'Shipped', 'Delivered']

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setDurum('')}
          className={`px-3 py-2 rounded-lg text-sm border ${!durum ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
          Tümü <span className="opacity-70">({toplamAdet})</span>
        </button>
        {ONEMLI.filter(k => sayaclar[k]).map(k => (
          <button key={k} onClick={() => setDurum(k)}
            className={`px-3 py-2 rounded-lg text-sm border ${durum === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}>
            {durumlar[k] || k} <span className="opacity-70">({sayaclar[k]})</span>
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <input value={arama} onChange={e => setArama(e.target.value)}
            placeholder="Sipariş no, müşteri, ürün, stok kodu..."
            className="border rounded-lg px-3 py-2 text-sm min-w-64" />
          <button onClick={simdiCek} disabled={mesgul}
            title="Siparişler zaten arka planda çekiliyor; bu düğme beklemek istemeyenler için"
            className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-50">
            {mesgul ? '…' : '↻ Şimdi çek'}
          </button>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Sipariş</th>
              <th className="text-left px-3 py-2 font-medium">Müşteri</th>
              <th className="text-right px-3 py-2 font-medium w-20">Adet</th>
              <th className="text-right px-3 py-2 font-medium w-28">Tutar</th>
              <th className="text-left px-3 py-2 font-medium w-36">Durum</th>
              <th className="text-left px-3 py-2 font-medium w-44">Kargo</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {dilim.map(s => (
              <tr key={s.paket_id} className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => trendyolSiparisApi.getir(s.paket_id).then(setSecili).catch(e => toast.error(e.message))}>
                <td className="px-4 py-2">
                  <div className="text-gray-800 font-medium">{s.siparis_no || s.paket_id}</div>
                  <div className="text-xs text-gray-400">{tarihFmt(s.siparis_tarihi)}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="text-gray-700">{s.musteri_ad || '—'}</div>
                  <div className="text-xs text-gray-400">{[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ')}</div>
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{s.adet ?? s.kalem_sayisi}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-800">{paraFmt(s.toplam)} ₺</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${DURUM_RENK[s.durum] || 'bg-gray-100 text-gray-600'}`}>
                    {durumlar[s.durum] || s.durum}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {s.kargo_firma || '—'}
                  {s.kargo_takip_no && <div className="text-gray-400">{s.kargo_takip_no}</div>}
                </td>
                <td className="px-3 py-2 text-right">
                  {kargoYetkisi && SONRAKI_STATU[s.durum] && (
                    <button onClick={e => { e.stopPropagation(); statuIlerlet(s) }} disabled={mesgul}
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40">
                      {durumlar[SONRAKI_STATU[s.durum]] || SONRAKI_STATU[s.durum]} →
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!dilim.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                {toplamAdet ? 'Bu filtreye uyan sipariş yok.' : 'Henüz sipariş çekilmedi — arka plan turu birkaç dakika içinde dolduracak.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {secili && <SiparisDetay siparis={secili} durumlar={durumlar} onKapat={() => setSecili(null)} onDegisti={yukle} />}
    </div>
  )
}

function SiparisDetay({ siparis: s, durumlar, onKapat, onDegisti }) {
  const { yetkiVar } = useAuth()
  const kargoYetkisi = yetkiVar('kargo_yonet')
  const faturaYetkisi = yetkiVar('fatura_kes')
  const [takipNo, setTakipNo] = useState(s.kargo_takip_no || '')
  const [mesgul, setMesgul] = useState(false)

  // Fatura zinciri: Bizimhesap'ta kes → belge bağlantısını Trendyol'a bildir → GERİ OKU.
  // "Gönderildi" ile "Trendyol aldı" ayrı raporlanır; doğrulanmadıysa uyarı gösterilir.
  async function faturaKes() {
    setMesgul(true)
    try {
      const r = await trendyolFaturaApi.kes(s.paket_id)
      if (r.durum === 'tamam') {
        if (r.uyari) toast(r.uyari, { icon: '⚠️', duration: 7000 })
        else toast.success(`Fatura kesildi ve Trendyol'a bildirildi.`)
      } else if (r.durum === 'belirsiz') {
        toast(r.mesaj || 'Faturanın sonucu doğrulanamadı — Kontrol Bekliyor listesine düştü.',
          { icon: '❓', duration: 8000 })
      } else {
        toast.error(r.mesaj || 'Fatura kesilemedi.')
      }
      onDegisti()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  async function takipKaydet() {
    setMesgul(true)
    try {
      await trendyolSiparisApi.takipNo(s.paket_id, takipNo)
      toast.success('Kargo takip numarası Trendyol\'a bildirildi.')
      onDegisti()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={onKapat}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-800">{s.siparis_no || s.paket_id}</h3>
            <div className="text-xs text-gray-400">Paket {s.paket_id} · {tarihFmt(s.siparis_tarihi)}</div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${DURUM_RENK[s.durum] || 'bg-gray-100 text-gray-600'}`}>
            {durumlar[s.durum] || s.durum}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Müşteri</div>
            <div className="text-gray-800">{s.musteri_ad || '—'}</div>
            <div className="text-gray-500 text-xs">{s.teslimat_telefon || ''}</div>
            <div className="text-gray-500 text-xs mt-1">{s.teslimat_adres}</div>
            <div className="text-gray-500 text-xs">{[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Fatura</div>
            <div className="text-gray-800">{s.fatura_unvan || s.musteri_ad || '—'}</div>
            {s.ticari
              ? <div className="text-gray-500 text-xs">VKN {s.fatura_vergi_no} · {s.fatura_vergi_dairesi}</div>
              : <div className="text-gray-500 text-xs">Bireysel{s.fatura_tc ? ` · TC ${s.fatura_tc}` : ''}</div>}
            {s.fatura_gonderildi
              ? <div className="text-emerald-600 text-xs mt-1">
                  ✓ Fatura gönderildi
                  {s.ty_fatura_durum
                    ? <span className="text-gray-500"> · Trendyol: {s.ty_fatura_durum}</span>
                    : <span className="text-amber-600"> · Trendyol tarafında henüz görünmüyor</span>}
                </div>
              : <div className="text-amber-600 text-xs mt-1">Fatura henüz kesilmedi</div>}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-3 py-1.5">Ürün</th>
                <th className="text-right px-3 py-1.5 w-16">Adet</th>
                <th className="text-right px-3 py-1.5 w-28">Birim</th>
                <th className="text-right px-3 py-1.5 w-28">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {(s.kalemler || []).map(k => (
                <tr key={k.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="text-gray-800">{k.urun_adi}</div>
                    <div className="text-xs text-gray-400">{k.sku}{k.urun_id ? '' : ' · uygulamada eşleşmedi'}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{k.miktar}</td>
                  {/* birim_fiyat BİRİM fiyattır; satır toplamı için miktarla ÇARPILIR */}
                  <td className="px-3 py-2 text-right text-gray-600">{paraFmt(k.birim_fiyat)} ₺</td>
                  <td className="px-3 py-2 text-right font-medium">{paraFmt(k.birim_fiyat * k.miktar)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {kargoYetkisi && (
          <div className="flex gap-2 items-end mb-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Kargo takip numarası</label>
              <input value={takipNo} onChange={e => setTakipNo(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full" placeholder="Takip no" />
            </div>
            <button onClick={takipKaydet} disabled={mesgul || !takipNo.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              Trendyol'a bildir
            </button>
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div>
            {faturaYetkisi && !s.fatura_gonderildi && (
              <button onClick={faturaKes} disabled={mesgul}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40">
                {mesgul ? 'Kesiliyor…' : `🧾 Fatura kes ve Trendyol'a bildir`}
              </button>
            )}
            {s.fatura_url && (
              <a href={s.fatura_url} target="_blank" rel="noopener noreferrer"
                className="ml-2 text-sm text-blue-600 hover:underline">Faturayı aç</a>
            )}
          </div>
          <button onClick={onKapat} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Kapat</button>
        </div>
      </div>
    </div>
  )
}
