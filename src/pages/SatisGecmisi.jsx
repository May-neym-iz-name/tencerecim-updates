import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { satisApi, lokasyonApi } from '../api/ipc'

export default function SatisGecmisi() {
  const [satislar, setSatislar] = useState([])
  const [toplam, setToplam] = useState(0)
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [ozet, setOzet] = useState(null)
  const [seciliSatis, setSeciliSatis] = useState(null)
  const [satisDetay, setSatisDetay] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)

  const bugun = new Date().toISOString().split('T')[0]
  const [filtre, setFiltre] = useState({ lokasyon_id: '', baslangic: bugun, bitis: bugun, odeme_tipi: '', sayfa: 1 })

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      const params = { ...filtre, lokasyon_id: filtre.lokasyon_id || undefined, odeme_tipi: filtre.odeme_tipi || undefined }
      const [r, o] = await Promise.all([
        satisApi.listele(params),
        satisApi.gunlukOzet({ lokasyon_id: filtre.lokasyon_id || undefined, tarih: filtre.baslangic === filtre.bitis ? filtre.baslangic : undefined }),
      ])
      setSatislar(r.satislar); setToplam(r.toplam); setOzet(o)
    } catch (e) { toast.error(e.message) }
    setYukleniyor(false)
  }, [filtre])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar) }, [])

  async function satisDetayAc(id) {
    setSeciliSatis(id)
    try { setSatisDetay(await satisApi.getir(id)) } catch (e) { toast.error(e.message) }
  }

  async function satisIptal(id) {
    if (!confirm('Bu satışı iptal etmek istediğinize emin misiniz? Stoklar geri yüklenecek.')) return
    try { await satisApi.iptal(id); toast.success('Satış iptal edildi'); yukle(); setSeciliSatis(null); setSatisDetay(null) }
    catch (e) { toast.error(e.message) }
  }

  const odemeRenk = { nakit: 'bg-green-100 text-green-700', kart: 'bg-blue-100 text-blue-700', havale: 'bg-purple-100 text-purple-700' }
  const durumRenk = { tamamlandi: 'bg-green-100 text-green-700', iptal: 'bg-red-100 text-red-700', iade: 'bg-orange-100 text-orange-700' }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol: liste */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex-shrink-0">Satış Geçmişi</h2>

        {/* Özet Kartları */}
        {ozet && (
          <div className="grid grid-cols-4 gap-3 mb-3 flex-shrink-0">
            {[
              ['Satış Sayısı', ozet.satis_sayisi || 0, '🧾'],
              ['Toplam Ciro', `₺${(ozet.toplam_ciro||0).toFixed(2)}`, '💰'],
              ['KDV', `₺${(ozet.toplam_kdv||0).toFixed(2)}`, '📋'],
              ['İskonto', `₺${(ozet.toplam_iskonto||0).toFixed(2)}`, '🏷️'],
            ].map(([label, val, icon]) => (
              <div key={label} className="bg-white border rounded-lg p-3 text-center">
                <div className="text-lg mb-0.5">{icon}</div>
                <div className="text-lg font-bold text-gray-800">{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtreler */}
        <div className="flex gap-2 mb-3 flex-shrink-0 flex-wrap">
          <input type="date" value={filtre.baslangic} onChange={e => setFiltre(f=>({...f, baslangic:e.target.value, sayfa:1}))}
            className="border rounded-lg px-3 py-1.5 text-sm" />
          <span className="self-center text-gray-400 text-sm">—</span>
          <input type="date" value={filtre.bitis} onChange={e => setFiltre(f=>({...f, bitis:e.target.value, sayfa:1}))}
            className="border rounded-lg px-3 py-1.5 text-sm" />
          <select value={filtre.lokasyon_id} onChange={e => setFiltre(f=>({...f, lokasyon_id:e.target.value, sayfa:1}))}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Tüm Lokasyonlar</option>
            {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
          </select>
          <select value={filtre.odeme_tipi} onChange={e => setFiltre(f=>({...f, odeme_tipi:e.target.value, sayfa:1}))}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Tüm Ödemeler</option>
            <option value="nakit">Nakit</option>
            <option value="kart">Kart</option>
            <option value="havale">Havale</option>
          </select>
          <button onClick={() => setFiltre({ lokasyon_id:'', baslangic:bugun, bitis:bugun, odeme_tipi:'', sayfa:1 })}
            className="text-xs text-gray-500 hover:text-red-600 border rounded-lg px-2 py-1.5">Bugüne Dön</button>
        </div>

        {/* Tablo */}
        <div className="flex-1 bg-white rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                {['Fiş No', 'Tarih/Saat', 'Lokasyon', 'Müşteri', 'Ödeme', 'İskonto', 'Toplam', 'Durum', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={9} className="text-center py-8 text-gray-400">Yükleniyor...</td></tr>}
              {!yukleniyor && satislar.map(s => (
                <tr key={s.id} onClick={() => satisDetayAc(s.id)}
                  className={`border-b cursor-pointer hover:bg-blue-50 ${seciliSatis===s.id?'bg-blue-50':''} ${s.durum==='iptal'?'opacity-60':''}`}>
                  <td className="px-3 py-2 font-mono text-xs font-medium">{s.fis_no}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{s.tarih?.replace('T',' ').substring(0,16)}</td>
                  <td className="px-3 py-2 text-xs">{s.lokasyon_adi}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{s.musteri_adi||'—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${odemeRenk[s.odeme_tipi]||''}`}>{s.odeme_tipi}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-green-600">{s.iskonto_toplam>0?`-₺${s.iskonto_toplam?.toFixed(2)}`:'—'}</td>
                  <td className="px-3 py-2 font-semibold">₺{s.genel_toplam?.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${durumRenk[s.durum]||''}`}>{s.durum}</span>
                  </td>
                  <td className="px-2 py-2">
                    {s.durum==='tamamlandi' && (
                      <button onClick={e => { e.stopPropagation(); satisIptal(s.id) }} className="text-xs text-red-500 hover:underline">İptal</button>
                    )}
                  </td>
                </tr>
              ))}
              {!yukleniyor && satislar.length===0 && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Satış bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between mt-2 flex-shrink-0">
          <span className="text-xs text-gray-500">Toplam: {toplam} satış</span>
          <div className="flex gap-1">
            <button onClick={() => setFiltre(f=>({...f,sayfa:Math.max(1,f.sayfa-1)}))} disabled={filtre.sayfa<=1}
              className="border rounded px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50">← Önceki</button>
            <span className="px-3 py-1 text-xs self-center">Sayfa {filtre.sayfa}</span>
            <button onClick={() => setFiltre(f=>({...f,sayfa:f.sayfa+1}))} disabled={satislar.length<50}
              className="border rounded px-2 py-1 text-xs disabled:opacity-40 hover:bg-gray-50">Sonraki →</button>
          </div>
        </div>
      </div>

      {/* Sağ: detay paneli */}
      {satisDetay && (
        <div className="w-72 border-l bg-white p-4 overflow-auto flex-shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-sm">{satisDetay.fis_no}</h3>
              <p className="text-xs text-gray-500">{satisDetay.tarih?.substring(0,16)}</p>
            </div>
            <button onClick={() => { setSeciliSatis(null); setSatisDetay(null) }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          <div className="space-y-1.5 text-sm mb-3 pb-3 border-b">
            <div className="flex justify-between"><span className="text-gray-500">Lokasyon</span><span>{satisDetay.lokasyon_adi}</span></div>
            {satisDetay.musteri_adi && <div className="flex justify-between"><span className="text-gray-500">Müşteri</span><span>{satisDetay.musteri_adi}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Ödeme</span><span className="capitalize">{satisDetay.odeme_tipi}</span></div>
          </div>

          <div className="space-y-2 mb-3">
            {satisDetay.kalemler?.map(k => (
              <div key={k.id} className="text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{k.urun_adi}</span>
                  <span className="font-semibold">₺{k.toplam?.toFixed(2)}</span>
                </div>
                <div className="text-gray-500 flex gap-2">
                  <span>{k.miktar} adet × ₺{k.birim_fiyat?.toFixed(2)}</span>
                  {k.iskonto_orani > 0 && <span className="text-green-600">-%{k.iskonto_orani}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-2 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Ara Toplam</span><span>₺{satisDetay.ara_toplam?.toFixed(2)}</span></div>
            {satisDetay.iskonto_toplam > 0 && <div className="flex justify-between text-green-600"><span>İskonto</span><span>-₺{satisDetay.iskonto_toplam?.toFixed(2)}</span></div>}
            <div className="flex justify-between text-gray-500"><span>KDV</span><span>₺{satisDetay.kdv_toplam?.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>Toplam</span><span>₺{satisDetay.genel_toplam?.toFixed(2)}</span></div>
          </div>

          {satisDetay.durum === 'tamamlandi' && (
            <button onClick={() => satisIptal(satisDetay.id)} className="w-full mt-3 border border-red-300 text-red-600 py-1.5 rounded-lg text-sm hover:bg-red-50">
              Satışı İptal Et
            </button>
          )}
        </div>
      )}
    </div>
  )
}
