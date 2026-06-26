import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { raporApi, lokasyonApi } from '../api/ipc'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'

const PARA = (n) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(n) || 0)
const SAYI = (n) => new Intl.NumberFormat('tr-TR').format(Number(n) || 0)

// Grafik renk paleti (kategori/marka pasta dilimleri için).
const RENKLER = ['#d97706', '#0ea5e9', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1']

// YYYY-MM-DD (yerel saat).
function gunStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Hazır tarih aralığı kısayolları.
const TARIH_KISAYOLLARI = [
  { ad: 'Bugün', hesapla: () => { const b = gunStr(new Date()); return [b, b] } },
  { ad: 'Son 7 gün', hesapla: () => { const s = new Date(); s.setDate(s.getDate() - 6); return [gunStr(s), gunStr(new Date())] } },
  { ad: 'Son 30 gün', hesapla: () => { const s = new Date(); s.setDate(s.getDate() - 29); return [gunStr(s), gunStr(new Date())] } },
  { ad: 'Bu ay', hesapla: () => { const n = new Date(); return [gunStr(new Date(n.getFullYear(), n.getMonth(), 1)), gunStr(n)] } },
  { ad: 'Bu yıl', hesapla: () => { const n = new Date(); return [gunStr(new Date(n.getFullYear(), 0, 1)), gunStr(n)] } },
]

const SEKMELER = [
  { id: 'ozet', ad: 'Özet' },
  { id: 'urunler', ad: 'En Çok Ürünler' },
  { id: 'satilmayan', ad: 'Satılmayan Ürünler' },
  { id: 'musteri', ad: 'Müşteriler' },
  { id: 'zaman', ad: 'Zaman Trendi' },
  { id: 'kategori', ad: 'Kategori' },
  { id: 'marka', ad: 'Marka' },
]

// Üst KPI kartı.
function KpiKart({ baslik, deger, altBaslik, renk = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{baslik}</p>
      <p className={`text-2xl font-bold mt-1 ${renk}`}>{deger}</p>
      {altBaslik && <p className="text-xs text-gray-400 mt-0.5">{altBaslik}</p>}
    </div>
  )
}

export default function Raporlar() {
  // Varsayılan: son 30 gün. Lazy initializer ile yalnızca ilk render'da hesaplanır.
  const [tarihBas, setTarihBas] = useState(() => TARIH_KISAYOLLARI[2].hesapla()[0])
  const [tarihBit, setTarihBit] = useState(() => TARIH_KISAYOLLARI[2].hesapla()[1])
  const [kaynak, setKaynak] = useState('hepsi')
  const [webDurum, setWebDurum] = useState('gecerli')
  const [lokasyonId, setLokasyonId] = useState('')
  const [lokasyonlar, setLokasyonlar] = useState([])

  const [sekme, setSekme] = useState('ozet')
  const [ozet, setOzet] = useState(null)
  const [veri, setVeri] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [granularite, setGranularite] = useState('gun')
  const [urunSiralama, setUrunSiralama] = useState('adet')

  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar).catch(() => {}) }, [])

  const filtre = useMemo(() => ({
    baslangic: tarihBas || undefined,
    bitis: tarihBit || undefined,
    kaynak,
    webDurum,
    lokasyon_id: lokasyonId ? Number(lokasyonId) : undefined,
  }), [tarihBas, tarihBit, kaynak, webDurum, lokasyonId])

  // Özet KPI'ları her filtre değişiminde tazele. cancelled bayrağı: hızlı filtre
  // değişiminde geç gelen yanıtın güncel KPI'ları ezmesini önler (yarış koşulu).
  useEffect(() => {
    let cancelled = false
    raporApi.ozet(filtre)
      .then(r => { if (!cancelled) setOzet(r) })
      .catch(e => { if (!cancelled) toast.error('Özet yüklenemedi: ' + e.message) })
    return () => { cancelled = true }
  }, [filtre])

  // Aktif sekmenin verisini getir. cancelled bayrağı: sekme/filtre değişiminde
  // geç gelen yanıtın yanlış sekmenin verisini ezmesini önler.
  useEffect(() => {
    if (sekme === 'ozet') { setVeri([]); return }
    let cancelled = false
    setYukleniyor(true)
    ;(async () => {
      try {
        let r = []
        if (sekme === 'urunler') r = await raporApi.enCokUrunler({ ...filtre, siralama: urunSiralama, limit: 2000 })
        else if (sekme === 'satilmayan') r = await raporApi.satilmayanUrunler(filtre)
        else if (sekme === 'musteri') r = await raporApi.musteriSadakat({ ...filtre, limit: 2000 })
        else if (sekme === 'zaman') r = await raporApi.zamanSerisi({ ...filtre, granularite })
        else if (sekme === 'kategori') r = await raporApi.kategoriKirilim(filtre)
        else if (sekme === 'marka') r = await raporApi.markaKirilim(filtre)
        if (!cancelled) setVeri(r)
      } catch (e) { if (!cancelled) toast.error('Rapor yüklenemedi: ' + e.message) }
      finally { if (!cancelled) setYukleniyor(false) }
    })()
    return () => { cancelled = true }
  }, [sekme, filtre, granularite, urunSiralama])

  function kisayolUygula(k) {
    const [b, s] = k.hesapla()
    setTarihBas(b); setTarihBit(s)
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Raporlar</h2>
        <p className="text-sm text-gray-500">Mağaza içi ve web (ikas) satışlarının birleşik analizi</p>
      </div>

      {/* Filtre çubuğu */}
      <div className="bg-white rounded-xl border p-3 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TARIH_KISAYOLLARI.map(k => (
            <button key={k.ad} onClick={() => kisayolUygula(k)}
              className="text-xs border rounded-lg px-2.5 py-1 hover:bg-amber-50 hover:border-amber-300 text-gray-600">
              {k.ad}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-500">Başlangıç
            <input type="date" value={tarihBas} onChange={e => setTarihBas(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Bitiş
            <input type="date" value={tarihBit} onChange={e => setTarihBit(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">Kaynak
            <select value={kaynak} onChange={e => setKaynak(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="hepsi">Hepsi</option>
              <option value="magaza">Mağaza içi</option>
              <option value="web">Web (ikas)</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Web Durumu
            <select value={webDurum} onChange={e => setWebDurum(e.target.value)} disabled={kaynak === 'magaza'}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white disabled:opacity-50">
              <option value="gecerli">İptal/iade hariç</option>
              <option value="odenmis">Sadece ödenmiş</option>
              <option value="tumu">Tümü</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Lokasyon
            <select value={lokasyonId} onChange={e => setLokasyonId(e.target.value)}
              className="block border rounded-lg px-2 py-1.5 text-sm mt-0.5 bg-white">
              <option value="">Tümü</option>
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* KPI kartları */}
      {ozet && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiKart baslik="Toplam Ciro" deger={PARA(ozet.genel.ciro)} renk="text-emerald-600"
            altBaslik={`Mağaza ${PARA(ozet.magaza.ciro)} · Web ${PARA(ozet.web.ciro)}`} />
          <KpiKart baslik="İşlem Sayısı" deger={SAYI(ozet.genel.islem_sayisi)}
            altBaslik={`Mağaza ${SAYI(ozet.magaza.islem_sayisi)} · Web ${SAYI(ozet.web.islem_sayisi)}`} />
          <KpiKart baslik="Satılan Ürün" deger={SAYI(ozet.genel.urun_adedi)} altBaslik="adet" />
          <KpiKart baslik="Ortalama Sepet" deger={PARA(ozet.genel.ortalama_sepet)} altBaslik="işlem başına" />
        </div>
      )}

      {/* Sekmeler */}
      <div className="flex flex-wrap gap-1 mb-4 border-b">
        {SEKMELER.map(s => (
          <button key={s.id} onClick={() => setSekme(s.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === s.id
              ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s.ad}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-4 min-h-[280px]">
        {sekme === 'ozet' && <OzetSekmesi ozet={ozet} />}
        {sekme !== 'ozet' && yukleniyor && <div className="text-center text-gray-400 py-12">Yükleniyor…</div>}
        {sekme !== 'ozet' && !yukleniyor && (
          <>
            {sekme === 'urunler' && <UrunlerSekmesi veri={veri} siralama={urunSiralama} setSiralama={setUrunSiralama} />}
            {sekme === 'satilmayan' && <SatilmayanSekmesi veri={veri} />}
            {sekme === 'musteri' && <MusteriSekmesi veri={veri} />}
            {sekme === 'zaman' && <ZamanSekmesi veri={veri} granularite={granularite} setGranularite={setGranularite} />}
            {sekme === 'kategori' && <PastaSekmesi veri={veri} etiketAlan="kategori" />}
            {sekme === 'marka' && <PastaSekmesi veri={veri} etiketAlan="marka" />}
          </>
        )}
      </div>
    </div>
  )
}

function Bos() {
  return <div className="text-center text-gray-400 py-12">Seçilen aralıkta veri yok.</div>
}

function OzetSekmesi({ ozet }) {
  if (!ozet) return <Bos />
  const data = [
    { ad: 'Mağaza içi', ciro: ozet.magaza.ciro, islem: ozet.magaza.islem_sayisi },
    { ad: 'Web (ikas)', ciro: ozet.web.ciro, islem: ozet.web.islem_sayisi },
  ]
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Kaynak Karşılaştırması — Ciro</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="ad" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={PARA} tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v) => PARA(v)} />
          <Bar dataKey="ciro" name="Ciro" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => <Cell key={d.ad} fill={RENKLER[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function UrunlerSekmesi({ veri, siralama, setSiralama }) {
  if (!veri.length) return <Bos />
  const grafik = veri.slice(0, 12).map(u => ({
    ad: u.urun_adi?.length > 22 ? u.urun_adi.slice(0, 22) + '…' : u.urun_adi,
    deger: siralama === 'ciro' ? u.ciro : u.adet,
  }))
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">En Çok Tercih Edilen Ürünler</h3>
        <div className="flex gap-1 text-xs">
          <button onClick={() => setSiralama('adet')}
            className={`px-2.5 py-1 rounded-lg border ${siralama === 'adet' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500'}`}>Adete göre</button>
          <button onClick={() => setSiralama('ciro')}
            className={`px-2.5 py-1 rounded-lg border ${siralama === 'ciro' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500'}`}>Ciroya göre</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(260, grafik.length * 28)}>
        <BarChart data={grafik} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={siralama === 'ciro' ? PARA : SAYI} />
          <YAxis type="category" dataKey="ad" width={160} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => siralama === 'ciro' ? PARA(v) : SAYI(v)} />
          <Bar dataKey="deger" name={siralama === 'ciro' ? 'Ciro' : 'Adet'} fill="#d97706" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <SiraliTablo veri={veri} kolonlar={[
        { baslik: 'Ürün', hucre: u => u.urun_adi, deger: u => u.urun_adi },
        { baslik: 'Mağaza', sagda: true, hucre: u => SAYI(u.magaza_adet), deger: u => u.magaza_adet },
        { baslik: 'Web', sagda: true, hucre: u => SAYI(u.web_adet), deger: u => u.web_adet },
        { baslik: 'Toplam Adet', sagda: true, hucre: u => SAYI(u.adet), deger: u => u.adet },
        { baslik: 'Ciro', sagda: true, hucre: u => PARA(u.ciro), deger: u => u.ciro },
      ]} />
    </div>
  )
}

function SatilmayanSekmesi({ veri }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Satılmayan Ürünler</h3>
      <p className="text-xs text-gray-400 mb-1">
        Seçilen tarih aralığı / kaynak / lokasyon filtresinde <strong>hiç satışı olmayan</strong> aktif ürünler.
        "Hiç satılmamış" ürünler için tarih aralığını genişletin (ör. Bu yıl).
      </p>
      {!veri.length ? (
        <p className="text-center text-gray-400 py-12">Bu filtrede satılmayan ürün yok — hepsi satmış. 🎉</p>
      ) : (
        <SiraliTablo veri={veri} kolonlar={[
          { baslik: 'Ürün', hucre: u => u.urun_adi, deger: u => u.urun_adi },
          { baslik: 'Barkod / SKU', hucre: u => u.barkod || u.sku || '—' },
          { baslik: 'Marka', hucre: u => u.marka || '—', deger: u => u.marka || '' },
          { baslik: 'Kategori', hucre: u => u.kategori || '—', deger: u => u.kategori || '' },
          { baslik: 'Stok', sagda: true, hucre: u => SAYI(u.stok), deger: u => u.stok },
          { baslik: 'Satış Fiyatı', sagda: true, hucre: u => PARA(u.satis_fiyati), deger: u => u.satis_fiyati },
        ]} />
      )}
    </div>
  )
}

function MusteriSekmesi({ veri }) {
  if (!veri.length) return <Bos />
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">En Sadık Müşteriler</h3>
      <SiraliTablo veri={veri} kolonlar={[
        { baslik: 'Müşteri', hucre: m => m.musteri_adi, deger: m => m.musteri_adi },
        { baslik: 'Telefon', hucre: m => m.telefon || '—' },
        { baslik: 'Sipariş Sayısı', sagda: true, hucre: m => SAYI(m.islem_sayisi), deger: m => m.islem_sayisi },
        { baslik: 'Toplam Harcama', sagda: true, hucre: m => PARA(m.toplam_harcama), deger: m => m.toplam_harcama },
        { baslik: 'ikas Ömür Boyu', sagda: true,
          hucre: m => m.ikas_siparis_sayisi > 0 ? `${SAYI(m.ikas_siparis_sayisi)} · ${PARA(m.ikas_toplam_harcama)}` : '—',
          deger: m => m.ikas_toplam_harcama || 0 },
      ]} />
    </div>
  )
}

function ZamanSekmesi({ veri, granularite, setGranularite }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Ciro Trendi</h3>
        <div className="flex gap-1 text-xs">
          <button onClick={() => setGranularite('gun')}
            className={`px-2.5 py-1 rounded-lg border ${granularite === 'gun' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500'}`}>Günlük</button>
          <button onClick={() => setGranularite('ay')}
            className={`px-2.5 py-1 rounded-lg border ${granularite === 'ay' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-gray-500'}`}>Aylık</button>
        </div>
      </div>
      {!veri.length ? <Bos /> : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={veri}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="donem" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={PARA} tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v) => PARA(v)} />
            <Legend />
            <Line type="monotone" dataKey="magaza_ciro" name="Mağaza" stroke="#d97706" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="web_ciro" name="Web" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ciro" name="Toplam" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function PastaSekmesi({ veri, etiketAlan }) {
  if (!veri.length) return <Bos />
  const grafik = veri.slice(0, 10).map(d => ({ ad: d[etiketAlan] ?? '—', ciro: d.ciro }))
  return (
    <div className="grid md:grid-cols-2 gap-4 items-center">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={grafik} dataKey="ciro" nameKey="ad" cx="50%" cy="50%" outerRadius={110}
            label={(e) => e.ad}>
            {grafik.map((d, i) => <Cell key={d.ad} fill={RENKLER[i % RENKLER.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => PARA(v)} />
        </PieChart>
      </ResponsiveContainer>
      <SiraliTablo veri={veri} numarali={false} kolonlar={[
        { baslik: etiketAlan === 'kategori' ? 'Kategori' : 'Marka', hucre: d => d[etiketAlan] ?? '—', deger: d => d[etiketAlan] ?? '' },
        { baslik: 'Adet', sagda: true, hucre: d => SAYI(d.adet), deger: d => d.adet },
        { baslik: 'Ciro', sagda: true, hucre: d => PARA(d.ciro), deger: d => d.ciro },
      ]} />
    </div>
  )
}

// Sıralanabilir + sayfalanabilir, salt-okunur tablo. kolonlar: { baslik,
// hucre:(row)=>düğüm, deger?:(row)=>sıralama anahtarı (varsa sütun tıklanabilir),
// sagda?:bool }. Başlığa ilk tıklama artan, ikinci tıklama azalan sıralar.
// Altta sayfa başına adet seçimi + 1 2 3 … sayfa gezinme (useSayfalama).
function SiraliTablo({ kolonlar, veri, numarali = true, varsayilanBoyut = 25 }) {
  const [sira, setSira] = useState({ idx: null, yon: 'asc' })

  const siraliVeri = useMemo(() => {
    if (sira.idx == null || !kolonlar[sira.idx]?.deger) return veri
    const deger = kolonlar[sira.idx].deger
    const carpan = sira.yon === 'asc' ? 1 : -1
    return [...veri].sort((a, b) => {
      const av = deger(a), bv = deger(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * carpan
      return String(av).localeCompare(String(bv), 'tr') * carpan
    })
  }, [veri, sira, kolonlar])

  const { dilim, ...sayfalama } = useSayfalama(siraliVeri, varsayilanBoyut)
  const ofset = (sayfalama.sayfa - 1) * sayfalama.boyut // # sütununda global sıra no

  function basligaTikla(idx) {
    if (!kolonlar[idx].deger) return
    setSira(s => s.idx === idx ? { idx, yon: s.yon === 'asc' ? 'desc' : 'asc' } : { idx, yon: 'asc' })
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left text-xs">
            <tr>
              {numarali && <th className="px-3 py-2 font-medium w-10">#</th>}
              {kolonlar.map((k, i) => {
                const aktif = sira.idx === i
                const tiklanabilir = !!k.deger
                return (
                  <th key={k.baslik} onClick={() => basligaTikla(i)}
                    className={`px-3 py-2 font-medium ${k.sagda ? 'text-right' : ''} ${tiklanabilir ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}>
                    {k.baslik}{aktif ? (sira.yon === 'asc' ? ' ▲' : ' ▼') : (tiklanabilir ? ' ↕' : '')}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {dilim.map((row, r) => (
              <tr key={ofset + r} className="border-t hover:bg-gray-50">
                {numarali && <td className="px-3 py-2 text-gray-400 w-10">{ofset + r + 1}</td>}
                {kolonlar.map(k => (
                  <td key={k.baslik} className={`px-3 py-2 ${k.sagda ? 'text-right whitespace-nowrap' : ''}`}>{k.hucre(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />
    </div>
  )
}
