import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { malKabulApi, lokasyonApi, tedarikciApi, urunlerApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { useSiralama } from '../hooks/useSiralama'
import SiraliBaslik from '../components/SiraliBaslik'
import AranabilirSecici from '../components/AranabilirSecici'
import { useBarkodTarama } from '../hooks/useBarkodTarama'
import AlisFaturaFormu from '../components/AlisFaturaFormu'

// Bir mal kabul kaydının kalemlerini alış faturası formuna devrederken aynı
// ürün birden çok satırda gelmişse (aynı ürün iki kez mal kabul edilmişse)
// miktarları TEK satırda toplarız — aksi halde form iki aynı kalemi birden
// gösterir ve AlisFaturaFormu'nun mükerrer kontrolü (kalemEkle) yalnız ELLE
// eklemede çalıştığı için bu durumu yakalamaz.
function malKabulKalemleriniBirlestir(kalemler) {
  const map = new Map()
  for (const k of kalemler) {
    const onceki = map.get(k.urun_id)
    if (onceki) {
      onceki.miktar += k.miktar
    } else {
      map.set(k.urun_id, {
        urun_id: k.urun_id, urun_adi: k.urun_adi,
        miktar: k.miktar, birim_fiyat: k.birim_maliyet || 0, kdv_orani: 20,
      })
    }
  }
  return [...map.values()]
}

const PARA = (n) => `₺${(Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const TARIH = (t) => t ? new Date(t).toLocaleString('tr-TR') : '—'

export default function MalKabul() {
  const { profil, erisilebilirLokasyonlar, yetkiVar } = useAuth()
  const kullanici = profil?.ad || profil?.email || ''
  const faturaDuzenleYetkisi = yetkiVar('fatura_stok_duzenle')
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [lokId, setLokId] = useState(null)
  const [tedarikciId, setTedarikciId] = useState('')
  const [faturaNo, setFaturaNo] = useState('')
  const [notlar, setNotlar] = useState('')
  const [kalemler, setKalemler] = useState([]) // { urun_id, ad, miktar, birim_maliyet }
  const [arama, setArama] = useState('')
  const [sonuc, setSonuc] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const [gecmis, setGecmis] = useState([])
  // Geçmiş kaydın kalemleri: liste sorgusu yalnız kalem SAYISINI getirir (N+1 olmasın),
  // hangi ürünler olduğu ayrı sorguyla tıklanınca çekilir.
  const [detay, setDetay] = useState(null)          // { kayit } | null
  const [detayYukleniyor, setDetayYukleniyor] = useState(false)

  // Mal kabulden alış faturası devralma: form yalnız devralınacak kayıt
  // kesinleşince (faturaBaslangic dolunca) mount edilir — AlisFaturaFormu
  // `baslangic`'i sadece İLK render'da useState ile okur, prop sonradan
  // değişirse state güncellenmez. Koşullu mount + `key` ile her açılışta
  // bileşen sıfırdan kurulur, önceki mal kabulün kalemleri sızmaz.
  const [faturaBaslangic, setFaturaBaslangic] = useState(null)
  const [faturaFormVeriYukleniyor, setFaturaFormVeriYukleniyor] = useState(false)
  const [faturaUrunler, setFaturaUrunler] = useState(null)
  const sr = useSiralama(gecmis)
  const aramaRef = useRef()

  useEffect(() => {
    lokasyonApi.listele().then(l => { const er = erisilebilirLokasyonlar(l); setLokasyonlar(er); if (er.length) setLokId(er[0].id) })
    tedarikciApi.listele().then(setTedarikciler).catch(() => {})
  }, [])

  const gecmisYukle = useCallback(async () => {
    try { const r = await malKabulApi.listele({ boyut: 20 }); setGecmis(r.kayitlar) } catch {}
  }, [])
  useEffect(() => { gecmisYukle() }, [gecmisYukle])

  // Geçmiş kaydın detayını aç. Hata yutulmaz: kalemleri göremeden kapanan bir modal
  // "kayıt boş" izlenimi verir — asıl sebep söylenmeli.
  async function detayAc(id) {
    setDetayYukleniyor(true)
    try {
      const kayit = await malKabulApi.getir(id)
      if (!kayit) { toast.error('Mal kabul kaydı bulunamadı'); return }
      setDetay(kayit)
    } catch (e) { toast.error('Detay açılamadı: ' + e.message) }
    finally { setDetayYukleniyor(false) }
  }

  // Mal kabul kaydından alış faturası devralma: tedarikçi/fatura no ve
  // kalemler mal kabulden gelir, kullanıcı yalnız fiyat/KDV teyit eder.
  // Çağıran, detay modalında zaten yüklenmiş `detay` kaydını verir — bu
  // kaydın kalemleri `mal-kabul:getir`in `urunler` ile JOIN ettiği veridir
  // (urun_adi dahil), ayrı bir IPC kanalına gerek yok.
  async function faturaFormunuAc(kayit) {
    setFaturaFormVeriYukleniyor(true)
    try {
      if (!faturaUrunler) {
        const r = await urunlerApi.listele({ boyut: 0 })
        setFaturaUrunler(r.urunler)
      }
      setFaturaBaslangic({
        tedarikci_id: kayit.tedarikci_id || '',
        fatura_no: kayit.fatura_no || '',
        mal_kabul_id: kayit.id,
        kalemler: malKabulKalemleriniBirlestir(kayit.kalemler || []),
      })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setFaturaFormVeriYukleniyor(false)
    }
  }

  const araFn = useCallback(async (deger) => {
    setArama(deger)
    if (deger.length < 2) { setSonuc([]); return }
    try { const r = await urunlerApi.listele({ arama: deger, boyut: 8 }); setSonuc(r.urunler) } catch {}
  }, [])

  // Barkod okuyucu: kutuya tıklamadan okutulabilsin, her okutmada eskisi silinsin.
  // araFn hem state'i yazar hem aramayı çalıştırır — okunan kod doğrudan ona verilir.
  // (araFn'in ALTINDA olmalı: yukarıda çağrılsa TDZ'ye yakın kırılgan bir bağ olurdu.)
  useBarkodTarama({ ref: aramaRef, onKod: araFn })

  function kalemEkle(urun) {
    setKalemler(prev => {
      if (prev.some(k => k.urun_id === urun.id)) return prev
      return [...prev, { urun_id: urun.id, ad: urun.ad, miktar: 1, birim_maliyet: urun.alis_fiyati || 0 }]
    })
    setArama(''); setSonuc([]); aramaRef.current?.focus()
  }
  function kalemGuncelle(urun_id, alan, deger) {
    setKalemler(prev => prev.map(k => k.urun_id === urun_id ? { ...k, [alan]: deger } : k))
  }
  function kalemSil(urun_id) { setKalemler(prev => prev.filter(k => k.urun_id !== urun_id)) }

  const toplam = kalemler.reduce((t, k) => t + (parseFloat(k.miktar) || 0) * (parseFloat(k.birim_maliyet) || 0), 0)

  async function kaydet() {
    if (!lokId) { toast.error('Mağaza seçin'); return }
    if (!kalemler.length) { toast.error('En az bir ürün ekleyin'); return }
    setMesgul(true)
    try {
      await malKabulApi.olustur({
        lokasyon_id: lokId, tedarikci_id: tedarikciId || null, fatura_no: faturaNo || null, notlar, kullanici,
        kalemler: kalemler.map(k => ({ urun_id: k.urun_id, miktar: parseInt(k.miktar, 10) || 0, birim_maliyet: parseFloat(k.birim_maliyet) || 0 })),
      })
      toast.success('Mal kabul kaydedildi, stok güncellendi')
      setKalemler([]); setFaturaNo(''); setNotlar(''); setTedarikciId('')
      await gecmisYukle()
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Mal Kabul (Stok Girişi)</h2>

      <div className="bg-white rounded-2xl border p-4 space-y-4">
        {/* Başlık alanları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mağaza *</label>
            <select value={lokId || ''} onChange={e => setLokId(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi</label>
            <AranabilirSecici secenekler={tedarikciler.map(t => ({ deger: t.id, etiket: t.ad }))}
              deger={tedarikciId} onChange={v => setTedarikciId(v)} placeholder="Tedarikçi ara / seç" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fatura/İrsaliye No</label>
            <input value={faturaNo} onChange={e => setFaturaNo(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
            <input value={notlar} onChange={e => setNotlar(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>

        {/* Ürün ara/ekle */}
        <div className="relative">
          <input ref={aramaRef} value={arama} onChange={e => araFn(e.target.value)}
            placeholder="🔍 Ürün adı / barkod ile ara, eklemek için tıkla..."
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {sonuc.length > 0 && (
            <div className="absolute z-20 left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-56 overflow-auto">
              {sonuc.map(u => (
                <button key={u.id} onClick={() => kalemEkle(u)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between">
                  <span>{u.ad}</span>
                  <span className="text-gray-400 text-xs">{u.barkod || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kalemler */}
        {kalemler.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ürün</th>
                  <th className="text-center px-3 py-2 font-medium w-24">Miktar</th>
                  <th className="text-center px-3 py-2 font-medium w-32">Birim Maliyet</th>
                  <th className="text-right px-3 py-2 font-medium w-28">Tutar</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map(k => (
                  <tr key={k.urun_id} className="border-t">
                    <td className="px-3 py-1.5">{k.ad}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" min="1" value={k.miktar}
                        onChange={e => kalemGuncelle(k.urun_id, 'miktar', e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" step="0.01" value={k.birim_maliyet}
                        onChange={e => kalemGuncelle(k.urun_id, 'birim_maliyet', e.target.value)}
                        className="w-28 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium">{PARA((parseFloat(k.miktar) || 0) * (parseFloat(k.birim_maliyet) || 0))}</td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => kalemSil(k.urun_id)} className="text-gray-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam Maliyet</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-800">{PARA(toplam)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <button onClick={kaydet} disabled={mesgul || !kalemler.length}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
          {mesgul ? 'Kaydediliyor…' : '✓ Mal Kabul Et & Stoğa Ekle'}
        </button>
      </div>

      {/* Geçmiş */}
      <div className="bg-white rounded-2xl border p-4">
        <h3 className="font-semibold text-gray-700 mb-3">
          Son Mal Kabuller
          <span className="ml-2 text-xs font-normal text-gray-400">— ürünleri görmek için satıra tıklayın</span>
        </h3>
        {gecmis.length === 0 ? <p className="text-sm text-gray-400 py-3 text-center">Kayıt yok.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <SiraliBaslik k="tarih" {...sr}>Tarih</SiraliBaslik>
                <SiraliBaslik k="lokasyon_adi" {...sr}>Mağaza</SiraliBaslik>
                <SiraliBaslik k="tedarikci_adi" {...sr}>Tedarikçi</SiraliBaslik>
                <SiraliBaslik k="fatura_no" {...sr}>Fatura No</SiraliBaslik>
                <SiraliBaslik k="kalem_sayisi" align="center" {...sr}>Kalem</SiraliBaslik>
                <SiraliBaslik k="toplam_maliyet" align="right" {...sr}>Maliyet</SiraliBaslik>
              </tr>
            </thead>
            <tbody>
              {sr.sirali.map(m => (
                <tr key={m.id} onClick={() => detayAc(m.id)}
                  className="border-t cursor-pointer hover:bg-blue-50" title="Ürünleri görmek için tıklayın">
                  <td className="px-3 py-1.5 text-gray-500">{TARIH(m.tarih)}</td>
                  <td className="px-3 py-1.5">{m.lokasyon_adi}</td>
                  <td className="px-3 py-1.5 text-gray-500">{m.tedarikci_adi || '—'}</td>
                  <td className="px-3 py-1.5 text-gray-500">{m.fatura_no || '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{m.kalem_sayisi}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">{PARA(m.toplam_maliyet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detayYukleniyor && !detay && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 text-sm text-gray-600">Detay yükleniyor…</div>
        </div>
      )}

      {/* Mal kabul detayı: hangi ürünler, kaç adet, hangi maliyetle girildi. */}
      {detay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetay(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Mal Kabul #{detay.id}
                  {detay.fatura_no && <span className="ml-2 text-sm font-normal text-gray-500">· {detay.fatura_no}</span>}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {TARIH(detay.tarih)} · {detay.lokasyon_adi}
                  {detay.tedarikci_adi && ` · ${detay.tedarikci_adi}`}
                  {detay.kullanici && ` · ${detay.kullanici}`}
                </p>
                {detay.notlar && <p className="text-xs text-gray-500 mt-1">Not: {detay.notlar}</p>}
              </div>
              <div className="flex items-center gap-2">
                {faturaDuzenleYetkisi && detay.kalemler?.length > 0 && (
                  <button onClick={() => faturaFormunuAc(detay)} disabled={faturaFormVeriYukleniyor}
                    className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    {faturaFormVeriYukleniyor ? 'Yükleniyor…' : '🧾 Alış Faturası Oluştur'}
                  </button>
                )}
                <button onClick={() => setDetay(null)} className="text-gray-300 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
            </div>

            <div className="p-5">
              {!detay.kalemler?.length ? (
                <p className="text-sm text-gray-400 py-4 text-center">Bu kayıtta ürün kalemi yok.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Ürün</th>
                      <th className="text-left px-3 py-2 font-medium w-36">Barkod</th>
                      <th className="text-center px-3 py-2 font-medium w-20">Miktar</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Birim Maliyet</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detay.kalemler.map(k => (
                      <tr key={k.id} className="border-t">
                        <td className="px-3 py-1.5">{k.urun_adi}</td>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{k.barkod || '—'}</td>
                        <td className="px-3 py-1.5 text-center font-medium">{k.miktar}</td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{PARA(k.birim_maliyet)}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{PARA((k.miktar || 0) * (k.birim_maliyet || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={2} className="px-3 py-2 text-gray-500 text-xs">
                        {detay.kalemler.length} kalem · {detay.kalemler.reduce((t, k) => t + (k.miktar || 0), 0)} adet
                      </td>
                      <td colSpan={2} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam Maliyet</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">{PARA(detay.toplam_maliyet)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Maliyeti 0 olan giriş: stok arttı ama maliyet kaydı yok — kâr raporu
                  bu kalemleri sıfır maliyetli sayar. Sessiz kalmak yanıltıcı olur. */}
              {!Number(detay.toplam_maliyet) && detay.kalemler?.length > 0 && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Bu mal kabulde birim maliyet girilmemiş (toplam 0). Stok arttı, ancak kâr/maliyet
                  raporlarında bu ürünler sıfır maliyetli görünür.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {faturaDuzenleYetkisi && faturaBaslangic && (
        <AlisFaturaFormu
          key={faturaBaslangic.mal_kabul_id}
          acik={true}
          kapat={() => setFaturaBaslangic(null)}
          kaydedildi={() => setFaturaBaslangic(null)}
          baslangic={faturaBaslangic}
          urunler={faturaUrunler || []}
          tedarikciler={tedarikciler}
        />
      )}
    </div>
  )
}
