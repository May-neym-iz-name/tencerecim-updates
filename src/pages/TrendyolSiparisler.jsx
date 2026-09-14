import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { trendyolSiparisApi, sistemApi, whatsappLink } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import { tutarOzeti, kalemDustuMu, kalemToplami } from '../utils/trendyolTutar'
import Sayfalama from '../components/Sayfalama'
import SiraliBaslik from '../components/SiraliBaslik'
import { useSayfalama } from '../hooks/useSayfalama'
import { useSiralama } from '../hooks/useSiralama'
import { useDebounce } from '../hooks/useDebounce'
import { usePersistentState } from '../hooks/usePersistentState'

// Trendyol siparişleri — ikas siparişlerinden AYRI alan (kullanıcı kararı 13.09.2026).
// Ekran DÜZENİ bilerek Online Siparişler'in aynısıdır (kullanıcı kararı 14.09.2026):
// aynı başlık bloğu, aynı süzgeç şeridi, aynı sıralanabilir tablo, aynı detay modalı,
// aynı gruplu alt eylem çubuğu. Personel iki sekme arasında yeniden öğrenmesin.
//
// KANALDAN GELEN FARKLAR (ikas'ta karşılığı olmayan / başka anlama gelen alanlar):
//  1. Birim SİPARİŞ değil PAKETtir. Bir sipariş çok pakete bölünür, her paket ayrı
//     kargolanır ve ayrı statü taşır → birincil anahtar paket_id.
//  2. ÖDEME SÜTUNU YOKTUR. Parayı Trendyol tahsil eder; bizde ödeme durumu diye bir şey
//     yok. ikas'taki "Ödeme" sütununun yerini FATURA durumu aldı.
//  3. Statü tek yönlüdür: Created → Picking → Invoiced → Shipped. Geri gidiş YOK.
//  4. FATURA BU EKRANDAN KESİLMEZ — Bizimhesap'ın kendi Trendyol entegrasyonu otomatik
//     E-Arşiv kesiyor. Fatura sütunu yalnız TRENDYOL'un kaydını gösterir (okunur bilgi).

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
  UnPacked: 'bg-gray-100 text-gray-600',
  Repack: 'bg-gray-100 text-gray-600',
}

// Trendyol'un izin verdiği ileri geçişler. Geri gidiş yoktur.
const SONRAKI_STATU = { Created: 'Picking', Picking: 'Invoiced', Invoiced: 'Shipped' }

// Üstte rozet olarak gösterilecek statüler — iş kuyruğu sırası. Hepsini göstermek
// gürültü olurdu; kapanmış statüler süzgeç listesinden zaten seçilebiliyor.
const KUYRUK = ['Created', 'Picking', 'Invoiced', 'Shipped', 'Delivered']

// Artık elimizde olmayan paketler — eylem düğmeleri gizlenir.
const KAPANMIS = new Set(['Delivered', 'Cancelled', 'Returned', 'UnSupplied'])

const PARA = (n, b = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: b || 'TRY' }).format(Number(n) || 0)

const TARIH = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('tr-TR') } catch { return iso }
}

// 🔴 FATURAYI BU UYGULAMA KESMEZ (karar 14.09.2026).
// Bizimhesap'ın KENDİ Trendyol entegrasyonu siparişleri otomatik E-Arşiv faturalıyor
// (panelde görüldü: TNA serisi, iki paketin ikisi de faturalanmış). Uygulamadan ayrıca
// fatura kesmek MÜKERRER kayıt yaratır ve Trendyol'a resmi belge yerine numarasız bir
// çıktı gönderir. Ayrıntı: hafıza "bizimhesap-trendyol-zaten-faturaliyor".
//
// Bu yüzden doğruluk kaynağı BİZİM `fatura_gonderildi` bayrağımız DEĞİL, TRENDYOL'un
// kendi kaydı (`ty_fatura_durum` / `ty_fatura_link`). Ölçüldü: her iki pakette de
// ty_fatura_durum = "Invoiced". Kendi bayrağımıza bakmak her paketi yanlışlıkla
// "faturasız" gösterirdi — bilerek kullanılmıyor.
function faturaGoster(s) {
  if (s.ty_fatura_durum || s.ty_fatura_link) {
    return { etiket: 'Faturalı', renk: 'bg-emerald-100 text-emerald-700' }
  }
  if (KAPANMIS.has(s.durum)) return { etiket: '—', renk: 'bg-gray-100 text-gray-500' }
  return { etiket: 'Fatura görünmüyor', renk: 'bg-amber-100 text-amber-700' }
}

// Trendyol tarafında faturası GÖRÜNMEYEN, hâlâ elimizdeki paketler. Bunlar bizim
// kesmemiz gereken faturalar değil — Bizimhesap'ın otomatik akışının ATLADIĞI
// paketlerdir; yani panelden elle bakılması gereken bir ARIZA işaretidir.
function faturaBekliyorMu(s) {
  return !s.ty_fatura_durum && !s.ty_fatura_link && !KAPANMIS.has(s.durum)
}

export default function TrendyolSiparisler() {
  const { yetkiVar } = useAuth()
  const kargoYetkisi = yetkiVar('kargo_yonet')

  const [durumlar, setDurumlar] = useState({})
  const [sayaclar, setSayaclar] = useState({})
  const [satirlar, setSatirlar] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [cekiliyor, setCekiliyor] = useState(false)
  const [secili, setSecili] = useState(null)

  const [durum, setDurum] = usePersistentState('ty_siparis_durum', '')
  const [arama, setArama] = usePersistentState('ty_siparis_arama', '')
  const [tarihBas, setTarihBas] = useState('')
  const [tarihBit, setTarihBit] = useState('')
  const [faturaFiltre, setFaturaFiltre] = useState('')   // '' | 'yok' | 'tamam'
  const [kargoFiltre, setKargoFiltre] = useState('')
  // Fatura bildirim şeridi: ikas'taki iptal/iade talebi şeridinin karşılığı.
  const [faturaSerit, setFaturaSerit] = useState(false)

  // Arama DEBOUNCE'lu: her tuş vuruşunda ayrı IPC + SQL koşmasın (sorgu kalem alt
  // sorgusu içeriyor ve main process senkron bloklanıyor).
  const geciktirilmisArama = useDebounce(arama, 300)

  const yukle = useCallback(async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true)
    try {
      const [l, s] = await Promise.all([
        trendyolSiparisApi.listele({ durum: durum || undefined, arama: geciktirilmisArama || undefined }),
        trendyolSiparisApi.sayaclar(),
      ])
      setSatirlar(l); setSayaclar(s)
    } catch (e) {
      if (!sessiz) toast.error('Siparişler yüklenemedi: ' + e.message)
    } finally { if (!sessiz) setYukleniyor(false) }
  }, [durum, geciktirilmisArama])

  useEffect(() => { trendyolSiparisApi.durumListesi().then(setDurumlar).catch(() => {}) }, [])
  useEffect(() => { yukle() }, [yukle])
  // Arka plan turu (main.js) yazdıkça ekran da tazelensin — YEREL okuma, ağ isteği değil.
  // Sessiz: kullanıcı bir şey istemedi, spinner titremesi ve hata toast'ı yağmuru olmasın.
  useEffect(() => {
    const t = setInterval(() => yukle(true), 60000)
    return () => clearInterval(t)
  }, [yukle])

  // İstemci tarafı süzgeçler (durum + arama sunucuda, geri kalanı burada).
  // useMemo ŞART: her tuş vuruşunda yüzlerce satır üzerinde filter koşuyor.
  const filtreli = useMemo(() => satirlar.filter(s => {
    if (tarihBas || tarihBit) {
      const gun = (s.siparis_tarihi || '').slice(0, 10)
      if (tarihBas && gun < tarihBas) return false
      if (tarihBit && gun > tarihBit) return false
    }
    if (kargoFiltre && s.kargo_firma !== kargoFiltre) return false
    const faturali = !!(s.ty_fatura_durum || s.ty_fatura_link)
    if (faturaFiltre === 'yok' && faturali) return false
    if (faturaFiltre === 'tamam' && !faturali) return false
    if (faturaSerit && !faturaBekliyorMu(s)) return false
    return true
  }), [satirlar, tarihBas, tarihBit, kargoFiltre, faturaFiltre, faturaSerit])

  const faturaBekleyen = useMemo(() => satirlar.filter(faturaBekliyorMu).length, [satirlar])
  const kargoSecenekleri = useMemo(
    () => [...new Set(satirlar.map(s => s.kargo_firma).filter(Boolean))], [satirlar])
  const toplamAdet = useMemo(() => Object.values(sayaclar).reduce((a, b) => a + b, 0), [sayaclar])

  const sr = useSiralama(filtreli, {
    deger: (s, k) => k === 'teslimat' ? [s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ') : s[k],
  })
  const { dilim, ...sayfalama } = useSayfalama(sr.sirali, 50)

  const filtreVar = tarihBas || tarihBit || faturaFiltre || kargoFiltre || faturaSerit || durum

  async function detayAc(paketId) {
    try { setSecili(await trendyolSiparisApi.getir(paketId)) }
    catch (e) { toast.error('Detay açılamadı: ' + e.message) }
  }

  async function simdiCek() {
    setCekiliyor(true)
    try {
      const r = await trendyolSiparisApi.cek(14)
      if (r.hatalar?.length) r.hatalar.forEach(h => toast.error(h))
      toast.success(`${r.yeni} yeni, ${r.guncellenen} güncellenen paket.`)
      await yukle()
    } catch (e) { toast.error('Sipariş çekme hatası: ' + e.message) }
    finally { setCekiliyor(false) }
  }

  async function statuIlerlet(s) {
    const hedef = SONRAKI_STATU[s.durum]
    if (!hedef) return
    setCekiliyor(true)
    try {
      const r = await trendyolSiparisApi.statu(s.paket_id, hedef)
      toast.success(`${s.siparis_no || s.paket_id} → ${durumlar[hedef] || hedef}`)
      if (r.siparis) setSecili(g => (g && g.paket_id === s.paket_id ? r.siparis : g))
      await yukle()
    } catch (e) { toast.error('Statü güncellenemedi: ' + e.message) }
    finally { setCekiliyor(false) }
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Trendyol Siparişleri</h2>
          <p className="text-sm text-gray-500">
            Trendyol pazaryerinden gelen sipariş paketleri — toplam {toplamAdet}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={simdiCek} disabled={cekiliyor}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
            title="Siparişler zaten arka planda 10 dakikada bir çekiliyor; bu düğme beklemek istemeyenler için.">
            {cekiliyor ? 'Çekiliyor…' : '🔄 Siparişleri Çek'}
          </button>
        </div>
      </div>

      {/* Fatura bildirim şeridi — ikas'taki iptal/iade talebi şeridinin karşılığı.
          YALNIZ Trendyol tarafında faturası görünmeyen paket varsa çıkar: varlığı tek
          başına uyarıdır. Burada uyarının anlamı "biz fatura kesmeliyiz" DEĞİL,
          "Bizimhesap'ın otomatik faturalaması bu paketi atlamış olabilir"dir. */}
      {faturaBekleyen > 0 && (
        <button onClick={() => setFaturaSerit(v => !v)}
          className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 mb-4 text-left transition-colors ${
            faturaSerit
              ? 'bg-amber-600 border-amber-700 text-white'
              : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
          }`}>
          <span className="text-xl">🧾</span>
          <span className="flex-1">
            <span className="font-bold">{faturaBekleyen} pakette Trendyol tarafında fatura görünmüyor</span>
            <span className={`block text-xs ${faturaSerit ? 'text-amber-100' : 'text-amber-700'}`}>
              Faturalar Bizimhesap'ta otomatik kesiliyor — bunlar atlanmış olabilir, panelden kontrol edin
            </span>
          </span>
        </button>
      )}

      {/* Statü kuyruğu — Trendyol'a ÖZGÜ. ikas'ta karşılığı yok: orada durum bir
          rapor alanı, burada bir İŞ KUYRUĞU (Yeni → Hazırlanıyor → Faturalandı →
          Kargolandı). Süzgeç görevini de bu şerit görür, ayrıca select konmadı. */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => setDurum('')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${!durum ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-gray-50'}`}>
          Tümü <span className="opacity-70">({toplamAdet})</span>
        </button>
        {KUYRUK.filter(k => sayaclar[k]).map(k => (
          <button key={k} onClick={() => setDurum(k)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${durum === k ? 'bg-orange-600 text-white border-orange-600' : 'bg-white hover:bg-gray-50'}`}>
            {durumlar[k] || k} <span className="opacity-70">({sayaclar[k]})</span>
          </button>
        ))}
        {/* Kuyrukta olmayan ama verisi olan statüler (İptal, İade, Teslim edilemedi…) */}
        {Object.keys(sayaclar).filter(k => !KUYRUK.includes(k) && sayaclar[k]).map(k => (
          <button key={k} onClick={() => setDurum(k)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${durum === k ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {durumlar[k] || k} <span className="opacity-70">({sayaclar[k]})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <input value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Sipariş no, müşteri, ürün, stok kodu veya takip no ara…"
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-md" />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">Başlangıç
            <input type="date" value={tarihBas} onChange={e => setTarihBas(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Bitiş
            <input type="date" value={tarihBit} onChange={e => setTarihBit(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Fatura
            <select value={faturaFiltre} onChange={e => setFaturaFiltre(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              <option value="yok">Fatura görünmüyor</option>
              <option value="tamam">Faturalı</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Kargo Firması
            <select value={kargoFiltre} onChange={e => setKargoFiltre(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              {kargoSecenekleri.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          {filtreVar && (
            <button onClick={() => { setTarihBas(''); setTarihBit(''); setFaturaFiltre(''); setKargoFiltre(''); setFaturaSerit(false); setDurum('') }}
              className="text-xs text-gray-500 border rounded-lg px-2 py-1.5 hover:bg-gray-50">Temizle</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <SiraliBaslik k="siparis_no" {...sr}>Sipariş No</SiraliBaslik>
              <SiraliBaslik k="siparis_tarihi" {...sr}>Tarih</SiraliBaslik>
              <SiraliBaslik k="musteri_ad" {...sr}>Müşteri</SiraliBaslik>
              <SiraliBaslik k="teslimat" {...sr}>Teslimat</SiraliBaslik>
              {/* ikas'ta burası "Ödeme" — Trendyol'da ödeme bizde değil, yerine Fatura. */}
              <SiraliBaslik k="ty_fatura_durum" {...sr}>Fatura</SiraliBaslik>
              <SiraliBaslik k="durum" {...sr}>Durum</SiraliBaslik>
              <SiraliBaslik k="toplam" align="right" {...sr}>Tutar</SiraliBaslik>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Yükleniyor…</td></tr>
            ) : !dilim.length ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                {!satirlar.length
                  ? 'Henüz sipariş çekilmedi — arka plan turu birkaç dakika içinde dolduracak, ya da "Siparişleri Çek" deyin.'
                  : 'Filtreyle eşleşen sipariş yok.'}
              </td></tr>
            ) : dilim.map(s => {
              const f = faturaGoster(s)
              return (
                <tr key={s.paket_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">
                    {s.siparis_no || s.paket_id}
                    <span className="block text-[10px] text-gray-400">paket {s.paket_id}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{TARIH(s.siparis_tarihi)}</td>
                  <td className="px-4 py-2.5">
                    <div>{s.musteri_ad || '—'}</div>
                    <div className="text-xs text-gray-400">{s.teslimat_telefon}</div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.renk}`}>{f.etiket}</span>
                    {/* Kapıda ödeme Trendyol'a özgü: koli tahsilatlı çıkar, personel bilmeli. */}
                    {!!s.kapida_odeme && <span className="block text-[10px] text-orange-600 mt-0.5">kapıda ödeme</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DURUM_RENK[s.durum] || 'bg-gray-100 text-gray-600'}`}>
                      {durumlar[s.durum] || s.durum}
                    </span>
                    {!s.stok_dusuldu && <span className="block text-[10px] text-gray-400 mt-0.5">stok düşülmedi</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                    {/* Listede kalemler YOK → paket toplamı gösterilir. Düşen kalem
                        bilgisi ancak detayda hesaplanabilir (bkz. utils/trendyolTutar). */}
                    {PARA(s.toplam, s.para_birimi)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {s.kargo_takip_no && (
                      <span className="block text-[10px] text-emerald-600 mb-0.5" title="Kargo takip no">📦 {s.kargo_takip_no}</span>
                    )}
                    {kargoYetkisi && SONRAKI_STATU[s.durum] && (
                      <button onClick={() => statuIlerlet(s)} disabled={cekiliyor}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-40 mr-2"
                        title="Paketi bir sonraki statüye ilerletir (geri gidiş yoktur)">
                        {durumlar[SONRAKI_STATU[s.durum]] || SONRAKI_STATU[s.durum]} →
                      </button>
                    )}
                    <button onClick={() => detayAc(s.paket_id)} className="text-blue-600 hover:underline text-xs">Detay</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {secili && (
        <SiparisDetay
          siparis={secili} durumlar={durumlar}
          onKapat={() => setSecili(null)}
          onYenile={(guncel) => { if (guncel) setSecili(guncel); yukle() }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detay modalı — düzen Online Siparişler'in aynısı: başlık + rozetler, bilgi
// kartları, ürün tablosu + toplam, kargo bölümü, gruplu alt eylem çubuğu.
// ---------------------------------------------------------------------------
function SiparisDetay({ siparis: s, durumlar, onKapat, onYenile }) {
  const { yetkiVar } = useAuth()
  const kargoYetkisi = yetkiVar('kargo_yonet')
  const iptalYetkisi = yetkiVar('kargo_iptal')

  const [takipNo, setTakipNo] = useState(s.kargo_takip_no || '')
  const [islemMesgul, setIslemMesgul] = useState('')
  const [koliModal, setKoliModal] = useState(null)      // { desi, koli_adedi }
  const [sureModal, setSureModal] = useState(null)      // { tarih }
  const [tedarikModal, setTedarikModal] = useState(null) // { secimler }

  const kapanmis = KAPANMIS.has(s.durum)
  const oz = tutarOzeti(s, s.kalemler)
  const f = faturaGoster(s)

  // Her yazma ucu { sonuc, siparis } döner: siparis TRENDYOL'DAN TAZE OKUNMUŞ hâldir.
  // "Hata vermedi" doğrulama değildir — ekran daima geri okunan hâli gösterir.
  async function calistir(anahtar, fn, basariMesaji) {
    setIslemMesgul(anahtar)
    try {
      const r = await fn()
      if (basariMesaji) toast.success(basariMesaji)
      onYenile(r?.siparis || null)
      return r
    } catch (e) { toast.error(e.message); return null }
    finally { setIslemMesgul('') }
  }

  function tedarikAc() {
    const secimler = {}
    for (const k of s.kalemler || []) if (!kalemDustuMu(k)) secimler[k.kalem_id] = 0
    setTedarikModal({ secimler })
  }

  async function tedarikOnayla() {
    const kalemler = Object.entries(tedarikModal.secimler)
      .map(([lineId, miktar]) => ({ lineId, quantity: Number(miktar) || 0 }))
      .filter(x => x.quantity > 0)
    if (!kalemler.length) { toast.error('En az bir ürün ve adet seçin.'); return }
    setTedarikModal(null)
    await calistir('tedarik',
      () => trendyolSiparisApi.tedarikEdilemedi(s.paket_id, kalemler),
      'Tedarik edilemedi bildirildi — stok geri verildi.')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onKapat}>
      <div className="bg-gray-50 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Başlık */}
        <div className="flex items-start justify-between px-6 py-4 bg-white border-b">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-gray-800">Sipariş #{s.siparis_no || s.paket_id}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DURUM_RENK[s.durum] || 'bg-gray-100 text-gray-600'}`}>
                {durumlar[s.durum] || s.durum}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${f.renk}`}>{f.etiket}</span>
              {!!s.kapida_odeme && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Kapıda ödeme</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Paket {s.paket_id} · {TARIH(s.siparis_tarihi)}
              {s.kararlastirilan_teslim && ` · termin ${TARIH(s.kararlastirilan_teslim)}`}
            </p>
          </div>
          <button onClick={onKapat} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>

        {/* Gövde */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Müşteri</p>
              <p className="text-sm font-medium text-gray-800">{s.musteri_ad || '—'}</p>
              {s.teslimat_telefon && <p className="text-xs text-gray-500">{s.teslimat_telefon}</p>}
              {s.musteri_email && <p className="text-xs text-gray-500 break-all">{s.musteri_email}</p>}
            </div>
            <div className="bg-white rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Teslimat</p>
              <p className="text-sm text-gray-700">{s.teslimat_adres || '—'}</p>
              <p className="text-xs text-gray-500">{[s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' / ')}</p>
            </div>
            <div className="bg-white rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Fatura</p>
              <p className="text-sm text-gray-700">{s.fatura_unvan || s.musteri_ad || '—'}</p>
              {s.ticari
                ? <p className="text-xs text-gray-500">VKN: {s.fatura_vergi_no} {s.fatura_vergi_dairesi && `· ${s.fatura_vergi_dairesi}`}</p>
                : <p className="text-xs text-gray-500">Bireysel{s.fatura_tc ? ` · TC: ${s.fatura_tc}` : ''}</p>}
              {/* Fatura Bizimhesap'ın Trendyol entegrasyonunca otomatik kesiliyor;
                  burada yalnız TRENDYOL'un kaydı gösterilir, bizim bayrağımız değil. */}
              {(s.ty_fatura_durum || s.ty_fatura_link)
                ? <p className="text-xs text-emerald-600 mt-1">
                    ✓ Trendyol'da faturalı{s.ty_fatura_durum ? ` (${s.ty_fatura_durum})` : ''}
                    {s.ty_fatura_no ? ` · No ${s.ty_fatura_no}` : ''}
                  </p>
                : <p className="text-xs text-amber-600 mt-1">Trendyol tarafında fatura görünmüyor</p>}
              {s.ty_fatura_link && (
                <a href={s.ty_fatura_link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs">faturayı aç ↗</a>
              )}
            </div>
            <div className="bg-white rounded-xl border p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Kargo</p>
              <p className="text-sm text-gray-700">{s.kargo_firma || '—'}</p>
              {s.kargo_takip_no && <p className="text-xs text-gray-500">Takip: {s.kargo_takip_no}</p>}
              {s.kargo_desi > 0 && <p className="text-xs text-gray-500">{s.kargo_desi} desi</p>}
              {s.kargo_takip_link && (
                <a href={s.kargo_takip_link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs">takip et ↗</a>
              )}
              {s.kargo_takip_no && s.teslimat_telefon && (
                <button onClick={() => {
                  const mesaj = `Merhaba, ${s.siparis_no || ''} numaralı siparişiniz kargoya verildi. ` +
                    `${s.kargo_firma || 'Kargo'} takip no: ${s.kargo_takip_no}`
                  const link = whatsappLink(s.teslimat_telefon, mesaj)
                  if (link) sistemApi.linkAc(link).catch(e => toast.error(e.message))
                }} className="block mt-1 text-green-700 hover:underline text-xs font-medium">
                  💬 WhatsApp ile gönder
                </button>
              )}
            </div>
          </div>

          {/* Ürünler */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 font-medium text-center w-14">Adet</th>
                  <th className="px-3 py-2 font-medium text-right w-24">Birim</th>
                  <th className="px-3 py-2 font-medium text-right w-28">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {(s.kalemler || []).map(k => {
                  const dustu = kalemDustuMu(k)
                  return (
                    <tr key={k.id} className={`border-t ${dustu ? 'bg-purple-50' : ''}`}>
                      <td className="px-3 py-2">
                        <span className={dustu ? 'line-through text-gray-400' : ''}>{k.urun_adi}</span>
                        {dustu && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 align-middle">
                            {durumlar[k.kalem_durum] || k.kalem_durum}
                            {k.iptal_sebep ? ` · ${k.iptal_sebep}` : ''}
                          </span>
                        )}
                        <span className="block text-[10px] text-gray-400">
                          {k.sku || 'SKU yok'}
                          {!k.urun_id && <span className="text-amber-600"> · ⚠ yerel ürün eşleşmedi</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{k.miktar}</td>
                      {/* birim_fiyat BİRİM fiyattır; satır toplamı için miktarla ÇARPILIR. */}
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${dustu ? 'line-through text-gray-400' : ''}`}>
                        {PARA(k.birim_fiyat, s.para_birimi)}
                      </td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap font-medium ${dustu ? 'line-through text-gray-400' : ''}`}>
                        {PARA(kalemToplami(k), s.para_birimi)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {!oz.dusenVar ? (
                  <tr className="border-t bg-gray-50">
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Toplam</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">{PARA(oz.toplam, s.para_birimi)}</td>
                  </tr>
                ) : (
                  <>
                    <tr className="border-t bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right text-gray-500">Paket toplamı</td>
                      <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{PARA(oz.toplam, s.para_birimi)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right text-purple-700">İptal / iade edilen</td>
                      <td className="px-3 py-2 text-right text-purple-700 whitespace-nowrap">−{PARA(oz.dusen, s.para_birimi)}</td>
                    </tr>
                    <tr className="bg-gray-50 border-t">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-600">Kalan tutar</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800 whitespace-nowrap">{PARA(oz.kalan, s.para_birimi)}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>

          {/* Kargo takip no bildirimi */}
          {kargoYetkisi && !kapanmis && (
            <div className="bg-white rounded-xl border p-3 flex items-end gap-2">
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Kargo Takip Numarası</p>
                <input value={takipNo} onChange={e => setTakipNo(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm w-full" placeholder="Takip no" />
              </div>
              <button
                onClick={() => calistir('takip',
                  () => trendyolSiparisApi.takipNo(s.paket_id, takipNo.trim()),
                  'Takip numarası Trendyol\'a bildirildi.')}
                disabled={!!islemMesgul || !takipNo.trim() || takipNo.trim() === (s.kargo_takip_no || '')}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap">
                {islemMesgul === 'takip' ? '…' : 'Trendyol\'a bildir'}
              </button>
            </div>
          )}
        </div>

        {/* Alt eylem çubuğu */}
        <div className="px-6 py-3 bg-white border-t">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Trendyol Sipariş İşlemleri</p>
          {kapanmis ? (
            <p className="text-xs text-gray-400 py-1">
              Bu paket kapandı ({durumlar[s.durum] || s.durum}) — üzerinde işlem yapılamaz.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {kargoYetkisi && SONRAKI_STATU[s.durum] && (
                  <button
                    onClick={() => calistir('statu',
                      () => trendyolSiparisApi.statu(s.paket_id, SONRAKI_STATU[s.durum]),
                      `Paket → ${durumlar[SONRAKI_STATU[s.durum]] || SONRAKI_STATU[s.durum]}`)}
                    disabled={!!islemMesgul}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50"
                    title="Paketi bir sonraki statüye ilerletir. Trendyol'da geri gidiş yoktur.">
                    {islemMesgul === 'statu' ? '…' : `➡ ${durumlar[SONRAKI_STATU[s.durum]] || SONRAKI_STATU[s.durum]}`}
                  </button>
                )}
                {kargoYetkisi && (
                  <button onClick={() => setKoliModal({ desi: s.kargo_desi || '', koli_adedi: 1 })}
                    disabled={!!islemMesgul}
                    className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-slate-700 disabled:opacity-50"
                    title="Paketin desi ve koli adedini Trendyol'a bildirir (kargo ücretini etkiler).">
                    📦 Koli / Desi
                  </button>
                )}
                {kargoYetkisi && (
                  <button onClick={() => setSureModal({ tarih: '' })} disabled={!!islemMesgul}
                    className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50"
                    title="Ek tedarik süresi ister. Paket uzatmaya kapalıysa Trendyol reddeder.">
                    ⏱ Süre Uzat
                  </button>
                )}
              </div>

              {/* Fatura düğmesi BİLEREK YOK (14.09.2026). Bizimhesap'ın kendi Trendyol
                  entegrasyonu siparişleri otomatik E-Arşiv faturalıyor; buradan ayrıca
                  kesmek mükerrer kayıt yaratır ve Trendyol'a resmi belge yerine numarasız
                  bir çıktı gönderirdi. Uç (`fatura:kes-trendyol`) ve adaptör duruyor,
                  yalnız arayüzden çağrılmıyor — karar değişirse geri açılır. */}
              <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                🧾 Fatura bu ekrandan kesilmez — Trendyol siparişlerini Bizimhesap otomatik faturalıyor.
              </p>

              {/* Geri alınamaz işlemler — ikas'taki gibi ayraçla ayrı tutulur. */}
              {iptalYetkisi && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 self-center mr-1">Geri alınamaz:</span>
                  <button onClick={tedarikAc} disabled={!!islemMesgul}
                    className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-orange-700 disabled:opacity-50"
                    title="Ürün elimizde yok: kalem iptal edilir, müşteriye iade açılır, stok geri verilir.">
                    {islemMesgul === 'tedarik' ? '…' : '⛔ Tedarik Edilemedi'}
                  </button>
                  <button
                    onClick={() => {
                      if (!takipNo.trim()) { toast.error('Önce kargo takip numarasını girin.'); return }
                      if (!confirm(`${s.siparis_no || s.paket_id} paketi Trendyol'da "teslim edildi" olarak işaretlenecek. Emin misiniz?`)) return
                      calistir('manuel-teslim',
                        () => trendyolSiparisApi.manuelTeslim({ paket_id: s.paket_id, takip_no: takipNo.trim() }),
                        'Paket teslim edildi olarak işaretlendi.')
                    }}
                    disabled={!!islemMesgul}
                    className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-800 disabled:opacity-50">
                    {islemMesgul === 'manuel-teslim' ? '…' : '✅ Manuel Teslim'}
                  </button>
                  <button
                    onClick={() => {
                      if (!takipNo.trim()) { toast.error('Önce kargo takip numarasını girin.'); return }
                      if (!confirm(`${s.siparis_no || s.paket_id} paketi Trendyol'da "iade edildi" olarak işaretlenecek. Emin misiniz?`)) return
                      calistir('manuel-iade',
                        () => trendyolSiparisApi.manuelIade({ paket_id: s.paket_id, takip_no: takipNo.trim() }),
                        'Paket iade edildi olarak işaretlendi.')
                    }}
                    disabled={!!islemMesgul}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-700 disabled:opacity-50">
                    {islemMesgul === 'manuel-iade' ? '…' : '↩ Manuel İade'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Koli / desi */}
      {koliModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setKoliModal(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Koli / Desi Bilgisi</h3>
            <p className="text-xs text-gray-400 mb-3">Trendyol kargo ücretini bu bilgiden hesaplar.</p>
            <label className="text-xs text-gray-500 block mb-2">Desi
              <input type="number" min={0} step="0.1" value={koliModal.desi}
                onChange={e => setKoliModal(m => ({ ...m, desi: e.target.value }))}
                className="block border rounded-lg px-3 py-1.5 text-sm w-full mt-0.5" />
            </label>
            <label className="text-xs text-gray-500 block mb-3">Koli adedi
              <input type="number" min={1} value={koliModal.koli_adedi}
                onChange={e => setKoliModal(m => ({ ...m, koli_adedi: e.target.value }))}
                className="block border rounded-lg px-3 py-1.5 text-sm w-full mt-0.5" />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setKoliModal(null)} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">Vazgeç</button>
              <button
                onClick={() => {
                  const { desi, koli_adedi } = koliModal
                  setKoliModal(null)
                  calistir('koli', () => trendyolSiparisApi.koli(s.paket_id, Number(desi) || 0, Number(koli_adedi) || 1),
                    'Koli bilgisi Trendyol\'a bildirildi.')
                }}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Süre uzatma */}
      {sureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setSureModal(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Ek Tedarik Süresi</h3>
            <p className="text-xs text-gray-400 mb-3">
              Yeni termin tarihi. Paket uzatmaya kapalıysa Trendyol isteği reddeder — hata mesajı aynen gösterilir.
            </p>
            <input type="date" value={sureModal.tarih}
              onChange={e => setSureModal({ tarih: e.target.value })}
              className="border rounded-lg px-3 py-1.5 text-sm w-full mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSureModal(null)} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">Vazgeç</button>
              <button disabled={!sureModal.tarih}
                onClick={() => {
                  const ms = new Date(sureModal.tarih).getTime()
                  setSureModal(null)
                  calistir('sure', () => trendyolSiparisApi.sureUzat(s.paket_id, ms), 'Süre uzatma isteği gönderildi.')
                }}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40">Gönder</button>
            </div>
          </div>
        </div>
      )}

      {/* Tedarik edilemedi — kalem seçimi (ikas'taki iade modalının karşılığı).
          Varsayılan seçim SIFIR: personel yanlışlıkla tüm siparişi iptal etmesin. */}
      {tedarikModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setTedarikModal(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Tedarik Edilemedi — #{s.siparis_no || s.paket_id}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Elimizde olmayan ürünleri ve adetlerini seçin. Seçilen kalemler Trendyol'da iptal edilir,
                müşteriye iadesi açılır ve stok geri verilir. <b>Geri alınamaz.</b>
              </p>
            </div>
            <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
              {(s.kalemler || []).filter(k => !kalemDustuMu(k)).map(k => {
                const max = Number(k.miktar) || 0
                const sec = Number(tedarikModal.secimler[k.kalem_id]) || 0
                return (
                  <div key={k.kalem_id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800 truncate">{k.urun_adi}</div>
                      <div className="text-xs text-gray-400">{k.sku} · {PARA(k.birim_fiyat, s.para_birimi)} × {max} adet</div>
                    </div>
                    <input type="number" min={0} max={max} value={sec}
                      onChange={e => {
                        const v = Math.max(0, Math.min(max, Number(e.target.value) || 0))
                        setTedarikModal(m => ({ ...m, secimler: { ...m.secimler, [k.kalem_id]: v } }))
                      }}
                      className="w-16 border rounded-lg px-2 py-1 text-sm text-center" />
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setTedarikModal(null)} className="px-4 py-1.5 rounded-lg text-sm border hover:bg-gray-50">Vazgeç</button>
              <button onClick={tedarikOnayla}
                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-700">
                ⛔ Tedarik Edilemedi Bildir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
