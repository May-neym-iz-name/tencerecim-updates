import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { onlineSiparisApi, ikasApi, lokasyonGondericiApi, lokasyonApi } from '../api/ipc'
import KargoFormu from '../components/KargoFormu'

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

const ODEME_ETIKET = {
  PAID: 'Ödendi', PENDING: 'Bekliyor', WAITING: 'Bekliyor', PARTIALLY_PAID: 'Kısmen Ödendi',
  REFUNDED: 'İade Edildi', PARTIALLY_REFUNDED: 'Kısmen İade', FAILED: 'Başarısız', CANCELLED: 'İptal',
}
const odemeRengi = (d) => d === 'PAID' ? 'bg-emerald-100 text-emerald-700'
  : (d === 'REFUNDED' || d === 'FAILED' || d === 'CANCELLED') ? 'bg-red-100 text-red-700'
  : 'bg-amber-100 text-amber-700'

export default function OnlineSiparisler() {
  const [siparisler, setSiparisler] = useState([])
  const [toplam, setToplam] = useState(0)
  const [arama, setArama] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [secili, setSecili] = useState(null)
  const [cekiliyor, setCekiliyor] = useState(false)
  const [kargoAcik, setKargoAcik] = useState(false)
  const [kargoBaslangic, setKargoBaslangic] = useState(null)
  const [islemMesgul, setIslemMesgul] = useState('')
  const [adresDuzenle, setAdresDuzenle] = useState(null) // { siparis, shipping }
  const [lokasyonlar, setLokasyonlar] = useState([])

  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar).catch(() => {}) }, [])

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

  async function kargoOlustur(s) {
    // Teslimat il/ilçe adını UPS koduna çevir (bulunamazsa kullanıcı formdan seçer).
    let ilIlce = { ilKodu: null, il: s.teslimat_il || '', ilceKodu: null, ilce: s.teslimat_ilce || '' }
    try { ilIlce = await lokasyonGondericiApi.ilIlceBul(s.teslimat_il, s.teslimat_ilce) } catch {}
    // Varsayılan gönderici mağaza: kalemlerin düştüğü ilk lokasyon.
    const ilkLok = (s.kalemler || []).find(k => k.lokasyon_id)?.lokasyon_id || null
    setKargoBaslangic({
      aliciAd: s.musteri_ad || '',
      aliciTelefon: s.musteri_telefon || '',
      aliciEmail: s.musteri_email || '',
      aliciAdres: s.teslimat_adres || '',
      ilKodu: ilIlce.ilKodu, il: ilIlce.il, ilceKodu: ilIlce.ilceKodu, ilce: ilIlce.ilce,
      odemeTipi: 2, // gönderici öder (ücretsiz kargo)
      aciklama: `Online sipariş #${s.siparis_no}`,
      referans: s.siparis_no || '',
      musteriId: s.musteri_id || null,
      onlineSiparisId: s.id,
      gondericiLokasyonId: ilkLok,
    })
    setKargoAcik(true)
  }

  // ikas'a "kargolandı" + takip no bildir (siparişin oluşturulmuş kargosundan).
  async function ikasKargola(s) {
    const takip = (s.kargolar || []).find(k => k.durum !== 'iptal' && k.takip_no)?.takip_no || s.kargo_takip_no
    if (!takip) { toast.error('Önce bu sipariş için kargo oluşturun.'); return }
    setIslemMesgul('kargola')
    try {
      await ikasApi.siparisKargola({ id: s.id, takipNo: takip, kargoFirma: 'UPS', bildir: true })
      toast.success('ikas siparişi kargolandı olarak işaretlendi, müşteriye bildirildi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('ikas bildirimi başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function ikasIptal(s) {
    if (!confirm(`#${s.siparis_no} siparişi ikas'ta iptal edilecek ve stok geri eklenecek. Emin misiniz?`)) return
    setIslemMesgul('iptal')
    try {
      await ikasApi.siparisIptal({ id: s.id, restock: true })
      toast.success('Sipariş iptal edildi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('İptal başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function ikasIade(s) {
    if (!confirm(`#${s.siparis_no} siparişi iade edilecek (stok geri eklenir). Para iadesini ikas/banka tarafında ayrıca kontrol edin. Devam?`)) return
    setIslemMesgul('iade')
    try {
      await ikasApi.siparisIade({ id: s.id, restock: true, refundShipping: false, bildir: true })
      toast.success('İade işlendi.')
      await detayAc(s.id); await yukle()
    } catch (e) { toast.error('İade başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function adresAc(s) {
    setIslemMesgul('adres')
    try {
      const { shippingAddress } = await ikasApi.siparisAdresGetir(s.id)
      setAdresDuzenle({ siparis: s, shipping: shippingAddress || {} })
    } catch (e) { toast.error('Adres alınamadı: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function adresKaydet() {
    setIslemMesgul('adres-kaydet')
    try {
      await ikasApi.siparisAdres({ id: adresDuzenle.siparis.id, shippingAddress: adresDuzenle.shipping })
      toast.success('Adres güncellendi.')
      setAdresDuzenle(null)
      if (secili) await detayAc(secili.id)
      await yukle()
    } catch (e) { toast.error('Adres güncellenemedi: ' + e.message) }
    finally { setIslemMesgul('') }
  }

  async function kalemLokasyonDegistir(kalem, lokasyonId) {
    try {
      await onlineSiparisApi.kalemLokasyon(kalem.id, lokasyonId ? Number(lokasyonId) : null)
      toast.success('Çıkış mağazası güncellendi.')
      if (secili) await detayAc(secili.id)
    } catch (e) { toast.error('Mağaza değiştirilemedi: ' + e.message) }
  }

  async function siparisTazele(s) {
    setIslemMesgul('tazele')
    try {
      const r = await ikasApi.siparisTazele(s.id)
      toast.success(`Sipariş tazelendi (${r.kalemSayisi} kalem).`)
      await detayAc(s.id)
    } catch (e) { toast.error('Tazeleme başarısız: ' + e.message) }
    finally { setIslemMesgul('') }
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
              <th className="px-4 py-2.5 font-medium">Ödeme</th>
              <th className="px-4 py-2.5 font-medium">Durum</th>
              <th className="px-4 py-2.5 font-medium text-right">Tutar</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : siparisler.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${odemeRengi(s.odeme_durumu)}`}>
                    {ODEME_ETIKET[s.odeme_durumu] || s.odeme_durumu || '—'}
                  </span>
                  {s.odeme_yontemi && <span className="block text-[10px] text-gray-400 mt-0.5">{s.odeme_yontemi}</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.durum === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {DURUM_ETIKET[s.durum] || s.durum}
                  </span>
                  {!s.stok_dusuldu && <span className="block text-[10px] text-gray-400 mt-0.5">stok düşülmedi</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">{PARA(s.toplam, s.para_birimi)}</td>
                <td className="px-4 py-2.5 text-right">
                  {s.kargo_takip_no && <span className="block text-[10px] text-emerald-600 mb-0.5" title="Kargo takip no">📦 {s.kargo_takip_no}</span>}
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
              <p>
                <span className="text-gray-500">Ödeme:</span>{' '}
                <span className={`text-xs px-2 py-0.5 rounded-full ${odemeRengi(secili.odeme_durumu)}`}>
                  {ODEME_ETIKET[secili.odeme_durumu] || secili.odeme_durumu || '—'}
                </span>
                {secili.odeme_yontemi && <span className="text-gray-600"> · {secili.odeme_yontemi}</span>}
              </p>
              {(secili.fatura_unvan || secili.fatura_vergi_no || secili.fatura_tc) && (
                <p><span className="text-gray-500">Fatura:</span>{' '}
                  {[secili.fatura_unvan,
                    secili.fatura_vergi_no && `VN: ${secili.fatura_vergi_no}`,
                    secili.fatura_vergi_dairesi,
                    secili.fatura_tc && `TC: ${secili.fatura_tc}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
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
                    <td className="py-2">
                      <select
                        value={k.lokasyon_id || ''}
                        onChange={e => kalemLokasyonDegistir(k, e.target.value)}
                        className="border rounded px-1.5 py-1 text-xs text-gray-700 bg-white">
                        <option value="">— Seçilmedi —</option>
                        {lokasyonlar.map(l => (
                          <option key={l.id} value={l.id}>{l.ad}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-right">{PARA(k.birim_fiyat, secili.para_birimi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold mt-3">Toplam: {PARA(secili.toplam, secili.para_birimi)}</div>

            <div className="border-t mt-4 pt-3 flex items-center justify-between">
              <div className="text-sm">
                {(secili.kargolar || []).filter(k => k.durum !== 'iptal').length > 0 ? (
                  <span className="text-emerald-700">
                    📦 Kargo: {secili.kargolar.filter(k => k.durum !== 'iptal').map(k => k.takip_no).join(', ')}
                  </span>
                ) : (
                  <span className="text-gray-400">Henüz kargo oluşturulmadı</span>
                )}
              </div>
              <button onClick={() => kargoOlustur(secili)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">
                📦 Kargo Oluştur
              </button>
            </div>

            <div className="border-t mt-3 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">ikas Sipariş İşlemleri</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => siparisTazele(secili)} disabled={!!islemMesgul}
                  className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-slate-700 disabled:opacity-50"
                  title="Kalem bilgilerini ikas'tan yeniden çeker (iptal/iade için kalem ID'lerini doldurur)">
                  🔁 Siparişi Tazele
                </button>
                <button onClick={() => ikasKargola(secili)} disabled={!!islemMesgul}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50">
                  🚚 Kargolandı Bildir (takip no)
                </button>
                <button onClick={() => adresAc(secili)} disabled={!!islemMesgul}
                  className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50">
                  ✏️ Adres Düzenle
                </button>
                <button onClick={() => ikasIptal(secili)} disabled={!!islemMesgul}
                  className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-orange-700 disabled:opacity-50">
                  ✖ Siparişi İptal Et
                </button>
                <button onClick={() => ikasIade(secili)} disabled={!!islemMesgul}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 disabled:opacity-50">
                  ↩ İade Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adresDuzenle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setAdresDuzenle(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Teslimat Adresi Düzenle</h3>
            <p className="text-xs text-gray-400 mb-3">İl/ilçe ikas'taki haliyle korunur ({adresDuzenle.shipping.city?.name} / {adresDuzenle.shipping.district?.name}). Metin alanlarını düzenleyebilirsiniz.</p>
            {['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'postalCode'].map(alan => (
              <input key={alan} value={adresDuzenle.shipping[alan] || ''}
                onChange={e => setAdresDuzenle(a => ({ ...a, shipping: { ...a.shipping, [alan]: e.target.value } }))}
                placeholder={{ firstName: 'Ad', lastName: 'Soyad', phone: 'Telefon', addressLine1: 'Adres', addressLine2: 'Adres 2', postalCode: 'Posta Kodu' }[alan]}
                className="border rounded px-2 py-1.5 text-sm w-full mb-2" />
            ))}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setAdresDuzenle(null)} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
              <button onClick={adresKaydet} disabled={islemMesgul === 'adres-kaydet'}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {islemMesgul === 'adres-kaydet' ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <KargoFormu acik={kargoAcik} baslangic={kargoBaslangic}
        kapat={() => setKargoAcik(false)}
        onTamam={async (kargo) => {
          setKargoAcik(false)
          // Online sipariş kargosuysa takip no'yu ikas'a bildir (kargolandı + müşteri bildirimi).
          const sipId = kargoBaslangic?.onlineSiparisId
          if (sipId && kargo?.takip_no) {
            try {
              await ikasApi.siparisKargola({ id: sipId, takipNo: kargo.takip_no, kargoFirma: 'UPS', bildir: true })
              toast.success('Takip no ikas siparişine işlendi, müşteriye bildirildi.')
            } catch (e) { toast.error('ikas bildirimi yapılamadı (kargo yine de oluştu): ' + e.message) }
          }
          if (secili) await detayAc(secili.id)
          await yukle()
        }} />
    </div>
  )
}
