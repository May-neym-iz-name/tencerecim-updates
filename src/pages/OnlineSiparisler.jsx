import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { onlineSiparisApi, ikasApi } from '../api/ipc'

const PARA = (n, b = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: b || 'TRY' }).format(Number(n) || 0)

const TARIH = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('tr-TR') } catch { return iso }
}

const DURUM_ETIKET = {
  CREATED: 'Oluşturuldu', FULFILLED: 'Hazırlandı', CANCELLED: 'İptal',
  PARTIALLY_FULFILLED: 'Kısmen Hazırlandı',
}

export default function OnlineSiparisler() {
  const [siparisler, setSiparisler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [secili, setSecili] = useState(null)
  const [cekiliyor, setCekiliyor] = useState(false)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      const r = await onlineSiparisApi.listele({ arama, boyut: 100 })
      setSiparisler(r.siparisler)
      setToplam(r.toplam)
    } catch (e) { toast.error('Siparişler yüklenemedi: ' + e.message) }
    finally { setYukleniyor(false) }
  }, [arama])

  useEffect(() => { yukle() }, [yukle])

  async function detayAc(id) {
    try { setSecili(await onlineSiparisApi.getir(id)) }
    catch (e) { toast.error('Detay açılamadı: ' + e.message) }
  }

  async function siparisCek() {
    setCekiliyor(true)
    try {
      const r = await ikasApi.siparisCek()
      if (r.ilkKurulum) toast.success(`İlk senkron: ${r.kaydedilen} sipariş kaydedildi (stok düşülmedi).`)
      else toast.success(`${r.kaydedilen} yeni sipariş çekildi, ${r.stokDusulen} sipariş stoktan düşüldü.`)
      await yukle()
    } catch (e) { toast.error('Sipariş çekme hatası: ' + e.message) }
    finally { setCekiliyor(false) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Online Siparişler</h2>
          <p className="text-sm text-gray-500">Web sitesinden (ikas) gelen siparişler — toplam {toplam}</p>
        </div>
        <button onClick={siparisCek} disabled={cekiliyor}
          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
          {cekiliyor ? 'Çekiliyor…' : '🔄 Siparişleri Çek'}
        </button>
      </div>

      <input value={arama} onChange={e => setArama(e.target.value)}
        placeholder="Sipariş no, müşteri adı veya telefon ara…"
        className="border rounded-lg px-3 py-2 text-sm w-full max-w-md mb-4" />

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">Sipariş No</th>
              <th className="px-4 py-2.5 font-medium">Tarih</th>
              <th className="px-4 py-2.5 font-medium">Müşteri</th>
              <th className="px-4 py-2.5 font-medium">Teslimat</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
              <th className="px-4 py-2.5 font-medium text-right">Tutar</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : siparisler.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                Henüz sipariş yok. "Siparişleri Çek" ile ikas'tan getirin.
              </td></tr>
            ) : siparisler.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{s.siparis_no}</td>
                <td className="px-4 py-2.5 text-gray-600">{TARIH(s.siparis_tarihi)}</td>
                <td className="px-4 py-2.5">
                  <div>{s.musteri_ad || '—'}</div>
                  <div className="text-xs text-gray-400">{s.musteri_telefon}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.durum === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {DURUM_ETIKET[s.durum] || s.durum}
                  </span>
                  {!s.stok_dusuldu && <span className="block text-[10px] text-gray-400 mt-0.5">stok düşülmedi</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{PARA(s.toplam, s.para_birimi)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => detayAc(s.id)} className="text-blue-600 hover:underline text-xs">Detay</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {secili && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSecili(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Sipariş #{secili.siparis_no}</h3>
              <button onClick={() => setSecili(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="text-sm space-y-1 mb-4">
              <p><span className="text-gray-500">Tarih:</span> {TARIH(secili.siparis_tarihi)}</p>
              <p><span className="text-gray-500">Müşteri:</span> {secili.musteri_ad} · {secili.musteri_telefon} · {secili.musteri_email}</p>
              <p><span className="text-gray-500">Teslimat:</span> {[secili.teslimat_adres, secili.teslimat_ilce, secili.teslimat_il].filter(Boolean).join(', ')}</p>
              <p><span className="text-gray-500">Durum:</span> {DURUM_ETIKET[secili.durum] || secili.durum}</p>
            </div>
            <table className="w-full text-sm border-t">
              <thead className="text-gray-500 text-left">
                <tr><th className="py-2">Ürün</th><th className="py-2 text-center">Adet</th><th className="py-2">Mağaza</th><th className="py-2 text-right">Birim</th></tr>
              </thead>
              <tbody>
                {(secili.kalemler || []).map(k => (
                  <tr key={k.id} className="border-t">
                    <td className="py-2">
                      {k.urun_adi}
                      {!k.urun_id && <span className="block text-[10px] text-amber-600">yerel ürün eşleşmedi</span>}
                    </td>
                    <td className="py-2 text-center">{k.miktar}</td>
                    <td className="py-2 text-gray-600">{k.lokasyon_adi || '—'}</td>
                    <td className="py-2 text-right">{PARA(k.birim_fiyat, secili.para_birimi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mt-3">Toplam: {PARA(secili.toplam, secili.para_birimi)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
