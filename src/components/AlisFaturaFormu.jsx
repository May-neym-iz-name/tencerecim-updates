import { useState } from 'react'
import toast from 'react-hot-toast'
import { faturaStokApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'

// Tedarikçi alış faturası girişi. Fatura stoğunu ARTIRAN tek yoldur.
// Fiyatlar KDV DAHİL girilir (uygulamanın her yerinde olduğu gibi).
//
// Hesaplama: burada gösterilen "Genel Toplam" yalnızca kullanıcıya gösterim
// içindir. Satır/fatura toplamını gerçekten hesaplayan ve doğrulayan taraf
// arka uçtur (Supabase RPC 1 kuruştan fazla sapmada faturayı reddeder) —
// bu yüzden kalemler ham haliyle (miktar, birim_fiyat, kdv_orani) gönderilir.
export default function AlisFaturaFormu({ acik, kapat, kaydedildi, baslangic, urunler, tedarikciler }) {
  const [tedarikciId, setTedarikciId] = useState(baslangic?.tedarikci_id || '')
  const [faturaNo, setFaturaNo] = useState(baslangic?.fatura_no || '')
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10))
  const [kalemler, setKalemler] = useState(baslangic?.kalemler || [])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  if (!acik) return null

  function kalemEkle(urunId) {
    if (!urunId) return
    const u = urunler.find(x => x.id === Number(urunId))
    if (!u) return
    if (kalemler.some(k => k.urun_id === u.id)) return toast.error('Bu ürün zaten listede')
    setKalemler([...kalemler, {
      urun_id: u.id, urun_adi: u.ad, miktar: 1,
      birim_fiyat: u.alis_fiyati || 0, kdv_orani: u.kdv_orani || 20,
    }])
  }

  function kalemGuncelle(urunId, alan, deger) {
    setKalemler(kalemler.map(k => k.urun_id === urunId ? { ...k, [alan]: deger } : k))
  }

  function kalemSil(urunId) {
    setKalemler(kalemler.filter(k => k.urun_id !== urunId))
  }

  const genelToplam = kalemler.reduce((t, k) => t + Number(k.miktar) * Number(k.birim_fiyat), 0)

  async function gonder(e) {
    e.preventDefault()
    if (!faturaNo.trim()) return toast.error('Fatura numarası zorunlu')
    if (kalemler.length === 0) return toast.error('En az bir kalem eklemelisiniz')
    setKaydediliyor(true)
    try {
      await faturaStokApi.alisKaydet({
        tedarikci_id: tedarikciId ? Number(tedarikciId) : null,
        fatura_no: faturaNo.trim(),
        fatura_tarihi: tarih,
        mal_kabul_id: baslangic?.mal_kabul_id || null,
        kalemler,
      })
      toast.success('Alış faturası kaydedildi, fatura stoğu güncellendi')
      kaydedildi?.()
      kapat()
    } catch (e) {
      // Arka uç hata mesajlarını zaten Türkçeye çeviriyor (bkz. electron/fatura/bulut.js) —
      // burada ek çeviri/kod kontrolü yapılmaz.
      toast.error(e.message)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={gonder} className="bg-white rounded-lg p-6 w-[720px] max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Alış Faturası Gir</h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <select value={tedarikciId} onChange={e => setTedarikciId(e.target.value)}
                  className="border rounded px-3 py-2 text-sm">
            <option value="">Tedarikçi seç</option>
            {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
          </select>
          <input value={faturaNo} onChange={e => setFaturaNo(e.target.value)}
                 placeholder="Fatura no" className="border rounded px-3 py-2 text-sm" />
          <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
                 className="border rounded px-3 py-2 text-sm" />
        </div>

        <AranabilirSecici
          secenekler={urunler.map(u => ({ deger: u.id, etiket: `${u.ad} (${u.sku || '—'})` }))}
          deger=""
          onChange={kalemEkle}
          placeholder="Ürün ekle…"
          bosSecenek={false}
        />

        <table className="w-full text-sm mt-4">
          <thead><tr className="text-left border-b">
            <th className="py-1">Ürün</th><th className="w-20">Miktar</th>
            <th className="w-28">Birim Fiyat</th><th className="w-20">KDV %</th>
            <th className="w-28 text-right">Toplam</th><th className="w-8"></th>
          </tr></thead>
          <tbody>
            {kalemler.map(k => (
              <tr key={k.urun_id} className="border-b">
                <td className="py-1">{k.urun_adi}</td>
                <td><input type="number" min="1" value={k.miktar} className="border rounded w-16 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'miktar', Number(e.target.value))} /></td>
                <td><input type="number" step="0.01" value={k.birim_fiyat} className="border rounded w-24 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'birim_fiyat', Number(e.target.value))} /></td>
                <td><input type="number" value={k.kdv_orani} className="border rounded w-16 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'kdv_orani', Number(e.target.value))} /></td>
                <td className="text-right">{(k.miktar * k.birim_fiyat).toFixed(2)}</td>
                <td><button type="button" className="text-red-600" onClick={() => kalemSil(k.urun_id)}>×</button></td>
              </tr>
            ))}
            {kalemler.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-4">Henüz kalem eklenmedi</td></tr>
            )}
          </tbody>
        </table>

        <div className="text-right mt-3 font-semibold">
          Genel Toplam (KDV dahil): {genelToplam.toFixed(2)} TL
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={kapat} className="px-4 py-2 border rounded">Vazgeç</button>
          <button type="submit" disabled={kaydediliyor}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
