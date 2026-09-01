import { useState, useEffect, useCallback } from 'react'
import Sayfalama from '../components/Sayfalama'
import toast from 'react-hot-toast'
import { satisApi, lokasyonApi, fisApi, sistemApi, whatsappLink, faturaStokApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { senkTetikle } from '../lib/veriSenk'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'

export default function SatisGecmisi() {
  const { yetkiVar, erisilebilirLokasyonlar } = useAuth()
  const iptalYetkisi = yetkiVar('satis_iptal')
  const raporYetkisi = yetkiVar('rapor_goruntule')
  const [satislar, setSatislar] = useState([])
  const sr = useSiralama(satislar) // görünen sayfayı sütuna göre sıralar
  const [toplam, setToplam] = useState(0)
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [ozet, setOzet] = useState(null)
  const [seciliSatis, setSeciliSatis] = useState(null)
  const [satisDetay, setSatisDetay] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [iadeModal, setIadeModal] = useState(null) // { satis, secimler: {kalemId: miktar} }

  const bugun = new Date().toISOString().split('T')[0]
  const [filtre, setFiltre] = useState({ lokasyon_id: '', baslangic: bugun, bitis: bugun, odeme_tipi: '', sayfa: 1, boyut: 50 })
  const [fisArama, setFisArama] = useState('')

  // --- FATURA (Faz 2) --------------------------------------------------------
  // Bizimhesap'a YALNIZ mağaza satışları yazılır: ikas siparişleri zaten
  // ikas→Bizimhesap entegrasyonuyla düşüyor, uygulama da yazsa mükerrer olurdu.
  // Durum BULUTTAN gelir (kesilen_faturalar), anahtar FİŞ NO — yerel id her PC'de
  // farklı olabilir, fiş no değil.
  const faturaYetkisi = yetkiVar('fatura_kes')
  const [faturaDurum, setFaturaDurum] = useState({})
  const [faturaMesgul, setFaturaMesgul] = useState('')

  const faturaDurumYukle = useCallback(async () => {
    if (!faturaYetkisi) return
    try { setFaturaDurum(await faturaStokApi.durumlar('perakende')) } catch { /* sessiz: liste yine çalışsın */ }
  }, [faturaYetkisi])
  useEffect(() => { faturaDurumYukle() }, [faturaDurumYukle])

  async function faturaKes(satis) {
    setFaturaMesgul(satis.id)
    try {
      const r = await faturaStokApi.kesSatis(satis.id)
      if (r.durum === 'tamam') toast.success(`Bizimhesap'ta fatura taslağı oluşturuldu (${satis.fis_no}).`)
      else if (r.durum === 'belirsiz') toast.error('Sonuç doğrulanamadı — Fatura Stoğu > Kontrol Bekliyor listesine düştü.')
      else toast.error('Fatura kesilemedi: ' + (r.mesaj || 'bilinmeyen hata'))
      await faturaDurumYukle()
    } catch (e) { toast.error('Fatura kesilemedi: ' + e.message) }
    finally { setFaturaMesgul('') }
  }

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      // Fiş no araması varsa tarih/lokasyon filtrelerini yok say (tüm geçmişte ara).
      const fis = fisArama.trim()
      const params = fis
        ? { fis_no: fis, sayfa: filtre.sayfa, boyut: filtre.boyut }
        : { ...filtre, lokasyon_id: filtre.lokasyon_id || undefined, odeme_tipi: filtre.odeme_tipi || undefined }
      const [r, o] = await Promise.all([
        satisApi.listele(params),
        satisApi.gunlukOzet({ lokasyon_id: filtre.lokasyon_id || undefined, tarih: filtre.baslangic === filtre.bitis ? filtre.baslangic : undefined }),
      ])
      setSatislar(r.satislar); setToplam(r.toplam); setOzet(o)
    } catch (e) { toast.error(e.message) }
    setYukleniyor(false)
  }, [filtre, fisArama])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { lokasyonApi.listele().then(lok => setLokasyonlar(erisilebilirLokasyonlar(lok))) }, [])

  async function satisDetayAc(id) {
    setSeciliSatis(id)
    try { setSatisDetay(await satisApi.getir(id)) } catch (e) { toast.error(e.message) }
  }

  async function satisIptal(id) {
    if (!confirm('Bu satışı iptal etmek istediğinize emin misiniz? Stoklar geri yüklenecek.')) return
    try { await satisApi.iptal(id); toast.success('Satış iptal edildi'); yukle(); setSeciliSatis(null); setSatisDetay(null); senkTetikle() }
    catch (e) { toast.error(e.message) }
  }

  // İade modalını aç (kalan iade edilebilir adetlerle).
  function iadeAc(detay) {
    const secimler = {}
    for (const k of (detay.kalemler || [])) {
      const kalan = (k.miktar || 0) - (k.iade_miktar || 0)
      if (kalan > 0) secimler[k.id] = 0
    }
    if (!Object.keys(secimler).length) { toast.error('Bu satışta iade edilebilir ürün kalmadı'); return }
    setIadeModal({ satis: detay, secimler })
  }

  async function iadeOnayla() {
    const kalemler = Object.entries(iadeModal.secimler)
      .map(([id, m]) => ({ satis_kalemi_id: Number(id), miktar: Number(m) || 0 }))
      .filter(x => x.miktar > 0)
    if (!kalemler.length) { toast.error('İade adedi girin'); return }
    try {
      await satisApi.iade({ satis_id: iadeModal.satis.id, kalemler })
      toast.success('İade işlendi, stok güncellendi')
      setIadeModal(null); setSeciliSatis(null); setSatisDetay(null); yukle(); senkTetikle()
    } catch (e) { toast.error(e.message) }
  }

  // Müşteriye WhatsApp ile satış/teşekkür mesajı gönder.
  function whatsappGonder(detay) {
    const link = whatsappLink(detay.musteri_telefon, `Merhaba, ${detay.fis_no} numaralı alışverişiniz için teşekkür ederiz. 🛍️`)
    if (!link) { toast.error('Müşteri telefonu yok'); return }
    sistemApi.linkAc(link).catch(e => toast.error(e.message))
  }

  const odemeRenk = { nakit: 'bg-green-100 text-green-700', kart: 'bg-blue-100 text-blue-700', havale: 'bg-purple-100 text-purple-700', karma: 'bg-teal-100 text-teal-700' }
  const durumRenk = { tamamlandi: 'bg-green-100 text-green-700', iptal: 'bg-red-100 text-red-700', iade: 'bg-orange-100 text-orange-700' }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol: liste */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-3 flex-shrink-0">Satış Geçmişi</h2>

        {/* Özet Kartları (ciro/rapor — rapor_goruntule yetkisi gerektirir) */}
        {ozet && raporYetkisi && (
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

        {/* Fiş no araması (tüm geçmişte arar; tarih/lokasyon filtrelerini yok sayar) */}
        <div className="flex gap-2 mb-2 flex-shrink-0">
          <input value={fisArama} onChange={e => setFisArama(e.target.value)}
            placeholder="🔍 Fiş numarası ile ara (tüm geçmiş)..."
            className="border rounded-lg px-3 py-1.5 text-sm flex-1" />
          {fisArama && (
            <button onClick={() => setFisArama('')}
              className="text-xs text-gray-500 hover:text-red-600 border rounded-lg px-3 py-1.5">✕ Temizle</button>
          )}
        </div>

        {/* Filtreler (fiş araması aktifken devre dışı) */}
        <div className={`flex gap-2 mb-3 flex-shrink-0 flex-wrap ${fisArama ? 'opacity-40 pointer-events-none' : ''}`}>
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
            <option value="karma">Karma (parçalı)</option>
          </select>
          <button onClick={() => setFiltre(f => ({ lokasyon_id:'', baslangic:bugun, bitis:bugun, odeme_tipi:'', sayfa:1, boyut:f.boyut }))}
            className="text-xs text-gray-500 hover:text-red-600 border rounded-lg px-2 py-1.5">Bugüne Dön</button>
        </div>

        {/* Tablo */}
        <div className="flex-1 bg-white rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <SiraliBaslik k="fis_no" {...sr}>Fiş No</SiraliBaslik>
                <SiraliBaslik k="tarih" {...sr}>Tarih/Saat</SiraliBaslik>
                <SiraliBaslik k="lokasyon_adi" {...sr}>Lokasyon</SiraliBaslik>
                <SiraliBaslik k="musteri_adi" {...sr}>Müşteri</SiraliBaslik>
                <SiraliBaslik k="odeme_tipi" {...sr}>Ödeme</SiraliBaslik>
                <SiraliBaslik k="iskonto_toplam" {...sr}>İskonto</SiraliBaslik>
                <SiraliBaslik k="genel_toplam" {...sr}>Toplam</SiraliBaslik>
                <SiraliBaslik k="durum" {...sr}>Durum</SiraliBaslik>
                <th className="px-3 py-2.5">Fatura</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {yukleniyor && <tr><td colSpan={10} className="text-center py-8 text-gray-400">Yükleniyor...</td></tr>}
              {!yukleniyor && sr.sirali.map(s => (
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
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${durumRenk[s.tip==='iade'?'iade':s.durum]||''}`}>{s.tip==='iade'?'iade':s.durum}</span>
                    {s.on_siparis === 1 && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                        🕐 Ön Sipariş
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    {(() => {
                      const f = faturaDurum[s.fis_no]
                      if (f && f.durum === 'tamam') {
                        return f.saglayici_url
                          ? <a href={f.saglayici_url} target="_blank" rel="noopener noreferrer"
                               className="text-xs text-emerald-700 hover:underline" title="Bizimhesap'ta aç">📄 Taslak var</a>
                          : <span className="text-xs text-emerald-700">📄 Taslak var</span>
                      }
                      if (f && f.durum === 'belirsiz') {
                        return <span className="text-xs text-amber-700" title="Sonuç doğrulanamadı — Kontrol Bekliyor listesinde">⚠ Kontrol bekliyor</span>
                      }
                      if (!faturaYetkisi || s.durum !== 'tamamlandi' || s.tip === 'iade') {
                        return <span className="text-xs text-gray-400">—</span>
                      }
                      return (
                        <button onClick={() => faturaKes(s)} disabled={faturaMesgul === s.id}
                          className="text-xs px-2 py-1 rounded border hover:bg-gray-100 disabled:opacity-50">
                          {faturaMesgul === s.id ? 'Kesiliyor…' : '🧾 Fatura Kes'}
                        </button>
                      )
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    {s.durum==='tamamlandi' && s.tip!=='iade' && iptalYetkisi && (
                      <button onClick={e => { e.stopPropagation(); satisIptal(s.id) }} className="text-xs text-red-500 hover:underline">İptal</button>
                    )}
                  </td>
                </tr>
              ))}
              {!yukleniyor && satislar.length===0 && <tr><td colSpan={10} className="text-center py-10 text-gray-400">Satış bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Sayfalama (sunucu taraflı) */}
        <div className="flex-shrink-0">
          <Sayfalama
            sayfa={filtre.sayfa}
            toplamSayfa={Math.max(1, Math.ceil(toplam / filtre.boyut))}
            boyut={filtre.boyut}
            toplam={toplam}
            setSayfa={(n) => setFiltre(f => ({ ...f, sayfa: n }))}
            setBoyut={(b) => setFiltre(f => ({ ...f, boyut: Number(b) || 50, sayfa: 1 }))}
          />
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
            {satisDetay.odemeler?.length > 1 && satisDetay.odemeler.map((o, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-400 pl-2">
                <span className="capitalize">↳ {o.odeme_tipi}</span><span>₺{Number(o.tutar).toFixed(2)}</span>
              </div>
            ))}
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

          <button onClick={() => fisApi.yazdir(satisDetay.id).catch(e => toast.error(`Fiş yazdırılamadı: ${e.message}`))}
            className="w-full mt-3 border border-gray-300 text-gray-700 py-1.5 rounded-lg text-sm hover:bg-gray-50">
            🖨️ Fişi Yazdır
          </button>

          {satisDetay.musteri_telefon && (
            <button onClick={() => whatsappGonder(satisDetay)}
              className="w-full mt-2 border border-green-300 text-green-700 py-1.5 rounded-lg text-sm hover:bg-green-50">
              💬 WhatsApp ile Bilgilendir
            </button>
          )}

          {satisDetay.durum === 'tamamlandi' && satisDetay.tip !== 'iade' && iptalYetkisi && (
            <>
              {satisDetay.on_siparis !== 1 && (
                <button onClick={() => iadeAc(satisDetay)} className="w-full mt-2 border border-orange-300 text-orange-600 py-1.5 rounded-lg text-sm hover:bg-orange-50">
                  ↩ Ürün İade Al
                </button>
              )}
              <button onClick={() => satisIptal(satisDetay.id)} className="w-full mt-2 border border-red-300 text-red-600 py-1.5 rounded-lg text-sm hover:bg-red-50">
                Satışı İptal Et
              </button>
            </>
          )}
        </div>
      )}

      {/* İade modalı */}
      {iadeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setIadeModal(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Ürün İade — {iadeModal.satis.fis_no}</h3>
              <button onClick={() => setIadeModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
              <p className="text-xs text-gray-500 mb-2">İade edilecek ürün adetlerini girin. Stok geri eklenir, ciro düşülür.</p>
              {(iadeModal.satis.kalemler || []).map(k => {
                const kalan = (k.miktar || 0) - (k.iade_miktar || 0)
                const birimEf = k.miktar ? (k.toplam || 0) / k.miktar : 0
                return (
                  <div key={k.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${kalan <= 0 ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{k.urun_adi}</p>
                      <p className="text-xs text-gray-400">{kalan}/{k.miktar} iade edilebilir · ₺{birimEf.toFixed(2)}/adet</p>
                    </div>
                    <input type="number" min="0" max={kalan} disabled={kalan <= 0}
                      value={iadeModal.secimler[k.id] ?? 0}
                      onChange={e => {
                        const v = Math.max(0, Math.min(kalan, parseInt(e.target.value, 10) || 0))
                        setIadeModal(m => ({ ...m, secimler: { ...m.secimler, [k.id]: v } }))
                      }}
                      className="w-16 border rounded px-2 py-1 text-sm text-center" />
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                İade Tutarı: <b className="text-orange-600">₺{
                  (iadeModal.satis.kalemler || []).reduce((t, k) => {
                    const birimEf = k.miktar ? (k.toplam || 0) / k.miktar : 0
                    return t + birimEf * (Number(iadeModal.secimler[k.id]) || 0)
                  }, 0).toFixed(2)
                }</b>
              </span>
              <button onClick={iadeOnayla}
                className="bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-700">
                İadeyi Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
