import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kargoApi, upsApi } from '../api/ipc'
import KargoFormu from '../components/KargoFormu'

const DURUM_RENK = {
  olusturuldu: 'bg-blue-100 text-blue-700',
  iptal: 'bg-red-100 text-red-700',
}

export default function Kargo() {
  const [kargolar, setKargolar] = useState([])
  const [formAcik, setFormAcik] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [pickupAcik, setPickupAcik] = useState(false)

  function yenile() {
    setYukleniyor(true)
    kargoApi.listele().then(setKargolar).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  }
  useEffect(yenile, [])

  async function takip(takipNo) {
    if (!takipNo) return
    const bekle = toast.loading('Takip sorgulanıyor…')
    try {
      const d = await kargoApi.takip(takipNo)
      toast.success(`${takipNo}: ${d.aciklama || 'Durum bilgisi alındı'}`, { id: bekle })
      yenile()
    } catch (e) { toast.error(e.message, { id: bekle }) }
  }

  async function iptal(k) {
    if (!confirm(`${k.takip_no} numaralı gönderiyi iptal etmek istediğinize emin misiniz?`)) return
    const bekle = toast.loading('İptal ediliyor…')
    try {
      await kargoApi.iptal(k.id)
      toast.success('Gönderi iptal edildi', { id: bekle })
      yenile()
    } catch (e) { toast.error(e.message, { id: bekle }) }
  }

  async function etiketBas(k) {
    try {
      const pngler = await kargoApi.etiket(k.id)
      if (!pngler.length) { toast.error('Bu gönderinin kayıtlı etiketi yok'); return }
      const ayar = await upsApi.ayarGetir()
      await kargoApi.etiketYazdir(pngler, ayar?.etiket_yazici || undefined)
      toast.success('Etiket yazıcıya gönderildi')
    } catch (e) { toast.error('Etiket yazdırılamadı: ' + e.message) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">📦 Kargo</h2>
        <div className="flex gap-2">
          <button onClick={() => setPickupAcik(true)}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">🚚 Kurye Çağır</button>
          <button onClick={() => setFormAcik(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Yeni Gönderi</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Takip No</th>
              <th className="px-3 py-2 font-medium">Alıcı</th>
              <th className="px-3 py-2 font-medium">Adres</th>
              <th className="px-3 py-2 font-medium">Durum</th>
              <th className="px-3 py-2 font-medium">Son Durum</th>
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="px-3 py-2 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kargolar.map(k => (
              <tr key={k.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{k.takip_no || '—'}</td>
                <td className="px-3 py-2">{k.alici_ad}</td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px] truncate">{[k.ilce, k.il].filter(Boolean).join(', ')}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${DURUM_RENK[k.durum] || 'bg-gray-100 text-gray-600'}`}>
                    {k.durum === 'iptal' ? 'İptal' : 'Oluşturuldu'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{k.son_durum || '—'}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{(k.olusturma_tarihi || '').slice(0, 16)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => takip(k.takip_no)} className="text-blue-600 hover:underline text-xs mr-2">Takip</button>
                  <button onClick={() => etiketBas(k)} className="text-gray-600 hover:underline text-xs mr-2">Etiket</button>
                  {k.durum !== 'iptal' && (
                    <button onClick={() => iptal(k)} className="text-red-600 hover:underline text-xs">İptal</button>
                  )}
                </td>
              </tr>
            ))}
            {kargolar.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                {yukleniyor ? 'Yükleniyor…' : 'Henüz kargo gönderisi yok.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <KargoFormu acik={formAcik} kapat={() => setFormAcik(false)} onTamam={yenile} />
      <KuryeFormu acik={pickupAcik} kapat={() => setPickupAcik(false)} />
    </div>
  )
}

// Kurye çağırma (on-demand pickup) modalı.
function KuryeFormu({ acik, kapat }) {
  // UPS kuralı: toplama tarihi bugünden SONRA olmalı → varsayılan/min yarın.
  const yarin = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [tarih, setTarih] = useState(yarin)
  const [koliAdedi, setKoliAdedi] = useState(1)
  const [gonderiliyor, setGonderiliyor] = useState(false)
  if (!acik) return null

  async function gonder(e) {
    e.preventDefault()
    setGonderiliyor(true)
    try {
      await kargoApi.pickup({ tarih, koliAdedi, kutular: [{ kod: 3, adet: koliAdedi }] })
      toast.success('Kurye talebi oluşturuldu')
      kapat()
    } catch (err) { toast.error(err.message || 'Kurye talebi başarısız') }
    finally { setGonderiliyor(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={kapat}>
      <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">🚚 Kurye Çağır</h3>
        <p className="text-xs text-gray-400 mb-4">Mağazadan paket aldırmak için UPS'e kurye talebi gönderir. Gönderici bilgileri Ayarlar'dan alınır.</p>
        <form onSubmit={gonder} className="space-y-3">
          <label className="block text-xs text-gray-500">Toplama tarihi (en erken yarın)
            <input type="date" min={yarin} value={tarih} onChange={e => setTarih(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
          </label>
          <label className="block text-xs text-gray-500">Koli adedi
            <input type="number" min="1" value={koliAdedi} onChange={e => setKoliAdedi(Number(e.target.value))}
              className="border rounded px-2 py-1.5 text-sm w-full mt-0.5" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={kapat} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">Vazgeç</button>
            <button type="submit" disabled={gonderiliyor}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {gonderiliyor ? 'Gönderiliyor…' : 'Kurye Talebi Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
