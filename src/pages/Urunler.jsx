import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { urunlerApi, markaApi, tedarikciApi, kategoriApi, excelApi, setApi, ikasApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import BarkodModal from '../components/BarkodModal'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { useSiralama } from '../hooks/useSiralama'
import { useDebounce } from '../hooks/useDebounce'
import { useBarkodTarama } from '../hooks/useBarkodTarama'
import { usePersistentState } from '../hooks/usePersistentState'
import SiraliBaslik from '../components/SiraliBaslik'
import KategoriYonetim from '../components/KategoriYonetim'
import MarkaYonetim from '../components/MarkaYonetim'
import SetYonetim from '../components/SetYonetim'
import AranabilirSecici from '../components/AranabilirSecici'
import { kdvDahil, paraYaz } from '../utils/kdv'

// Kategori ağacını girintili etiketlerle aranabilir seçici seçeneklerine çevirir.
const kategoriSecenekleri = (kategoriler) =>
  kategoriHiyerarsik(kategoriler).map(k => ({ deger: k.id, etiket: '   '.repeat(k.derinlik) + k.ad }))

const BOSH = { ad: '', barkod: '', sku: '', marka_id: '', kategori_id: '', tedarikci_id: '', aciklama: '', alis_fiyati: '', satis_fiyati: '', kdv_orani: 20, web_link: '' }

// Kategorileri ağaç sırasına dizip her birinin derinliğini (girinti için) hesaplar.
function kategoriHiyerarsik(kategoriler) {
  return [...kategoriler]
    .sort((a, b) => (a.tam_yol || a.ad).localeCompare(b.tam_yol || b.ad, 'tr'))
    .map(k => ({ ...k, derinlik: ((k.tam_yol || '').match(/>/g) || []).length }))
}

function InlineEkle({ label, onEkle }) {
  const [deger, setDeger] = useState('')
  async function submit() {
    if (!deger.trim()) return
    await onEkle(deger.trim())
    setDeger('')
  }
  // İç içe <form> HTML'de geçersiz (dış ürün formunun içindeyiz); bu yüzden form değil
  // div + type="button" kullanıyoruz. Enter'ı elle yakalayıp dış formun submit'ini engelliyoruz.
  return (
    <div className="flex gap-1 mt-1">
      <input value={deger} onChange={e => setDeger(e.target.value)} placeholder={`Yeni ${label}...`}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
        className="flex-1 border rounded px-2 py-1 text-xs" />
      <button type="button" onClick={submit} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">+</button>
    </div>
  )
}

export default function Urunler() {
  const { yetkiVar } = useAuth()
  const duzenleYetkisi = yetkiVar('urun_duzenle')
  const silYetkisi = yetkiVar('urun_sil')
  const fiyatYetkisi = yetkiVar('fiyat_degistir')
  const excelYetkisi = yetkiVar('excel_ice_aktar')
  const [urunler, setUrunler] = useState([])
  const [toplam, setToplam] = useState(0)
  // Arama/filtreler KALICI: sekmeler arasında gezinince sıfırlanmaz (cihaza özel).
  const [arama, setArama] = usePersistentState('urunler_arama', '')
  // Barkod okutulunca: kutuyu seç + eski içeriği tamamen yenisiyle değiştir.
  // Ürün formu açıkken kapalı — orada barkod alanına elle yazılıyor olabilir.
  const aramaRef = useRef(null)
  const [filtreMarka, setFiltreMarka] = usePersistentState('urunler_filtre_marka', '')
  const [filtreKategori, setFiltreKategori] = usePersistentState('urunler_filtre_kategori', '')
  const [formAcik, setFormAcik] = useState(false)
  const [form, setForm] = useState(BOSH)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [markalar, setMarkalar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [excelYukleniyor, setExcelYukleniyor] = useState(false)
  const [webLinkMesgul, setWebLinkMesgul] = useState(false)
  const [webLinkSonuc, setWebLinkSonuc] = useState(null)
  const [excelSonuc, setExcelSonuc] = useState(null)
  const [barkodUrun, setBarkodUrun] = useState(null)
  const [sekme, setSekme] = useState('urunler')
  const [bulunanSetler, setBulunanSetler] = useState([])
  // 'aktif' | 'pasif' — pasif ürünler YALNIZCA burada listelenir (satış/stok görmez).
  const [durum, setDurum] = useState('aktif')
  // Ek barkodlar (takma adlar): yalnız düzenleme modunda gösterilir.
  const [ekBarkodlar, setEkBarkodlar] = useState([])
  const [ekBarkod, setEkBarkod] = useState('')
  const [ekBarkodAciklama, setEkBarkodAciklama] = useState('')

  // Arama DEBOUNCE'lu: doğrudan `arama` bağımlılıkta olsaydı her tuş vuruşu ayrı bir tam
  // tablo sorgusu (2755 ürün + 3 JOIN) tetiklerdi. better-sqlite3 senkron olduğu için bu
  // sorguların her biri main process'i bloklar → UI donar. 300 ms'de tek sorgu yeterli.
  const geciktirilmisArama = useDebounce(arama, 300)

  const yukle = useCallback(async () => {
    try {
      const r = await urunlerApi.listele({ arama: geciktirilmisArama, marka_id: filtreMarka || undefined, kategori_id: filtreKategori || undefined, boyut: 0, durum })
      setUrunler(r.urunler); setToplam(r.toplam)
    } catch (e) { toast.error(e.message) }
  }, [geciktirilmisArama, filtreMarka, filtreKategori, durum])

  // Sütun sıralaması: türetilmiş alanlar (marka/kategori adı, sayısal fiyat) için deger().
  const sr = useSiralama(urunler, {
    deger: (u, k) => k === 'marka_adi' ? u.marka_adi
      : k === 'kategori_yol' ? u.kategori_yol
      : k === 'tedarikci_adi' ? u.tedarikci_adi
      : u[k],
  })
  const { dilim: sayfaUrunler, ...sayfalama } = useSayfalama(sr.sirali, 50)

  // Setler ürün tablosunda GÖRÜNMEZ (ayrı tablo, stok/barkod tutmaz) — ama aranınca
  // bulunmalı: kullanıcı "ürün havuzunda çıkmıyor" diye bildirdi (2026-08-11).
  // Yalnız ARAMA modunda ve yalnız aktif ürünlerde gösterilir (marka/kategori filtresi
  // setlere uygulanamaz; pasif görünümü setleri ilgilendirmez).
  const setleriGoster = durum === 'aktif' && !!geciktirilmisArama.trim()
  useEffect(() => {
    if (!setleriGoster) { setBulunanSetler([]); return }
    let iptal = false
    setApi.listele({ arama: geciktirilmisArama.trim() })
      .then(r => { if (!iptal) setBulunanSetler(r) })
      .catch(() => { if (!iptal) setBulunanSetler([]) })
    return () => { iptal = true }
  }, [setleriGoster, geciktirilmisArama])

  const yukleYardimcilar = useCallback(async () => {
    const [m, t, k] = await Promise.all([markaApi.listele(), tedarikciApi.listele(), kategoriApi.listele()])
    setMarkalar(m); setTedarikciler(t); setKategoriler(k)
  }, [])

  useEffect(() => { yukle() }, [yukle])
  useEffect(() => { yukleYardimcilar() }, [yukleYardimcilar])

  // Ek barkod listesi: düzenlenen ürün değişince yeniden yüklenir, yeni ürün eklerken boş.
  const ekBarkodlariYukle = useCallback(async () => {
    if (!duzenlenenId) { setEkBarkodlar([]); return }
    try {
      const liste = await urunlerApi.barkodListe(duzenlenenId)
      setEkBarkodlar(liste)
    } catch (e) { toast.error(e.message) }
  }, [duzenlenenId])

  useEffect(() => { ekBarkodlariYukle() }, [ekBarkodlariYukle])

  // Barkod okuyucu: kutuya tıklamadan okutulabilsin, her okutmada eskisi silinsin.
  // Form/modal açıkken kapalı — o sırada barkod alanına elle yazılıyor olabilir.
  useBarkodTarama({ ref: aramaRef, aktif: !formAcik, onKod: setArama })

  function handleDuzenle(u) {
    setForm({ ad: u.ad||'', barkod: u.barkod||'', sku: u.sku||'', marka_id: u.marka_id||'', kategori_id: u.kategori_id||'', tedarikci_id: u.tedarikci_id||'', aciklama: u.aciklama||'', alis_fiyati: u.alis_fiyati||'', satis_fiyati: u.satis_fiyati||'', kdv_orani: u.kdv_orani||20, web_link: u.web_link||'' })
    setDuzenlenenId(u.id); setFormAcik(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const veri = { ...form, marka_id: form.marka_id || null, kategori_id: form.kategori_id || null, tedarikci_id: form.tedarikci_id || null, alis_fiyati: parseFloat(form.alis_fiyati)||0, satis_fiyati: parseFloat(form.satis_fiyati), kdv_orani: parseInt(form.kdv_orani)||20 }
    try {
      if (duzenlenenId) await urunlerApi.guncelle(duzenlenenId, veri)
      else await urunlerApi.olustur(veri)
      toast.success(duzenlenenId ? 'Ürün güncellendi' : 'Ürün eklendi')
      setFormAcik(false); setDuzenlenenId(null); setForm(BOSH); yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleBarkodUret(u) {
    try {
      await urunlerApi.barkodUret(u.id)
      toast.success('Barkod üretildi')
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleEkBarkodEkle() {
    if (!ekBarkod.trim()) return
    try {
      await urunlerApi.barkodEkle({ urun_id: duzenlenenId, barkod: ekBarkod.trim(), aciklama: ekBarkodAciklama.trim() })
      toast.success('Ek barkod eklendi')
      setEkBarkod(''); setEkBarkodAciklama('')
      ekBarkodlariYukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleEkBarkodSil(id) {
    try {
      await urunlerApi.barkodSil(id)
      toast.success('Ek barkod silindi')
      ekBarkodlariYukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleSil(id) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    try { await urunlerApi.sil(id); toast.success('Ürün silindi'); yukle() } catch (e) { toast.error(e.message) }
  }

  async function handleAktiflik(u, aktif) {
    try {
      const r = await urunlerApi.aktiflik(u.id, aktif)
      toast.success(r.mesaj)
      yukle()
    } catch (e) { toast.error(e.message) }
  }

  async function handleExcelYukle() {
    setExcelYukleniyor(true); setExcelSonuc(null)
    try {
      const dosya = await excelApi.dosyaSec()
      if (!dosya) { setExcelYukleniyor(false); return }
      toast('Excel dosyası içe aktarılıyor...', { icon: '⏳' })
      const sonuc = await excelApi.urunYukle(dosya)
      setExcelSonuc(sonuc)
      toast.success(`${sonuc.eklenen} ürün eklendi, ${sonuc.guncellenen} güncellendi`)
      yukle(); yukleYardimcilar()
    } catch (e) { toast.error(e.message) }
    setExcelYukleniyor(false)
  }

  // ikas'taki ürün sayfalarının linklerini (metaData.slug) stok kodu eşleşmesiyle toplu doldurur.
  // Eşleşmeyenler SESSİZCE geçilmez — sayısı toast'ta, listesi konsolda görünür, çünkü linksiz
  // kalan ürün sosyal medya otomasyonunda sipariş linki olmadan gider.
  async function handleWebLinkCek() {
    setWebLinkMesgul(true); setWebLinkSonuc(null)
    try {
      toast("ikas urun sayfalari taraniyor...", { icon: "⏳" })
      const r = await ikasApi.webLinkCek()
      setWebLinkSonuc(r)
      toast.success(`${r.eslesen} urun + ${r.setEslesen} set eslesti, ${r.yazilan + r.setYazilan} link guncellendi.`)
      yukle()
    } catch (e) { toast.error(e.message) }
    setWebLinkMesgul(false)
  }

  async function markaEkle(ad) {
    try { await markaApi.olustur(ad); await yukleYardimcilar(); toast.success('Marka eklendi') } catch (e) { toast.error(e.message) }
  }
  async function tedarikciEkle(ad) {
    try { await tedarikciApi.olustur({ ad }); await yukleYardimcilar(); toast.success('Tedarikçi eklendi') } catch (e) { toast.error(e.message) }
  }
  async function kategoriEkle(ad) {
    try { await kategoriApi.olustur({ ad }); await yukleYardimcilar(); toast.success('Kategori eklendi') } catch (e) { toast.error(e.message) }
  }

  const sekmeler = (
    <div className="flex gap-1 mb-4 flex-shrink-0 border-b">
      {[['urunler', 'Ürünler'], ['setler', '🎁 Setler'], ['kategoriler', 'Kategoriler'], ['markalar', 'Markalar']].map(([k, l]) => (
        <button key={k} onClick={() => setSekme(k)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          {l}
        </button>
      ))}
    </div>
  )

  if (sekme !== 'urunler') {
    return (
      <div className="p-4 h-full flex flex-col">
        {sekmeler}
        {sekme === 'setler' ? <SetYonetim baslangicArama={arama} /> : sekme === 'kategoriler' ? <KategoriYonetim /> : <MarkaYonetim />}
      </div>
    )
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {sekmeler}
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Ürünler</h2>
          {/* Aktif / Pasif görünümü: pasifler yalnız burada, başka hiçbir ekranda görünmez. */}
          <div className="flex gap-1">
            <button onClick={() => setDurum('aktif')}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${durum === 'aktif' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              Aktif
            </button>
            <button onClick={() => setDurum('pasif')}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${durum === 'pasif' ? 'bg-gray-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
              🚫 Pasif Ürünler
            </button>
          </div>
          <span className="text-xs text-gray-400">{toplam} ürün</span>
        </div>
        <div className="flex gap-2">
          {excelYetkisi && (
            <button onClick={handleExcelYukle} disabled={excelYukleniyor}
              className="flex items-center gap-1.5 border border-green-600 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 text-sm disabled:opacity-50">
              {excelYukleniyor ? '⏳ Yükleniyor...' : '📥 Excel İçe Aktar'}
            </button>
          )}
          {duzenleYetkisi && (
            <button onClick={handleWebLinkCek} disabled={webLinkMesgul}
              title="ikas'taki ürün sayfalarının linklerini stok kodu eşleşmesiyle toplu doldurur"
              className="flex items-center gap-1.5 border border-violet-600 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50 text-sm disabled:opacity-50">
              {webLinkMesgul ? '⏳ Çekiliyor...' : '🔗 Web Linklerini Çek'}
            </button>
          )}
          {duzenleYetkisi && (
            <button onClick={() => { setForm(BOSH); setDuzenlenenId(null); setFormAcik(true) }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">
              + Yeni Ürün
            </button>
          )}
        </div>
      </div>

      {/* Web link çekme sonucu. Sitede olmayan ürünler UYARI DEĞİL (katalogda 2800+ ürün var,
          sitede ~400'ü satılıyor); asıl düzeltilebilir eksikler ikas'taki slug/stok kodu boşlukları. */}
      {webLinkSonuc && (
        <div className="mb-3 bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-medium">Web linkleri güncellendi:</span>{' '}
              {webLinkSonuc.eslesen} ürün sitede eşleşti, {webLinkSonuc.yazilan} linki değişti.
              {webLinkSonuc.setEslesen > 0 && (
                <> Ayrıca {webLinkSonuc.setEslesen} set eşleşti, {webLinkSonuc.setYazilan} set linki değişti.</>
              )}
              <div className="text-xs text-gray-500 mt-0.5">
                ikas'ta {webLinkSonuc.ikasToplam} ürün var, {webLinkSonuc.ikasSku} stok kodu okundu.
                Kalan {webLinkSonuc.sitedeYokSayi} ürün sitede satılmıyor — linksiz olmaları normal.
              </div>
              {webLinkSonuc.skusuz?.length > 0 && (
                <details className="mt-1 text-amber-800">
                  <summary className="cursor-pointer text-xs underline">
                    ikas'ta {webLinkSonuc.skusuz.length} ürünün stok kodu yok — eşleşemedi
                  </summary>
                  <ul className="text-xs mt-1 max-h-40 overflow-auto list-disc pl-4">
                    {webLinkSonuc.skusuz.map(x => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              )}
              {webLinkSonuc.slugsuz?.length > 0 && (
                <details className="mt-1 text-amber-800">
                  <summary className="cursor-pointer text-xs underline">
                    ikas'ta {webLinkSonuc.slugsuz.length} ürünün sayfa adresi tanımsız
                  </summary>
                  <ul className="text-xs mt-1 max-h-40 overflow-auto list-disc pl-4">
                    {webLinkSonuc.slugsuz.map(x => <li key={x}>{x}</li>)}
                  </ul>
                </details>
              )}
            </div>
            <button onClick={() => setWebLinkSonuc(null)} className="text-gray-400 hover:text-gray-700">✕</button>
          </div>
        </div>
      )}

      {excelSonuc && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex-shrink-0">
          <span className="font-medium">İçe aktarma tamamlandı:</span> {excelSonuc.eklenen} eklendi, {excelSonuc.guncellenen} güncellendi
          {excelSonuc.hatali > 0 && <span className="text-red-600 ml-2">, {excelSonuc.hatali} hatalı</span>}
          <button onClick={() => setExcelSonuc(null)} className="ml-3 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 mb-3 flex-shrink-0 flex-wrap">
        <input ref={aramaRef} value={arama} onChange={e => setArama(e.target.value)}
          placeholder="Ürün, barkod veya SKU ara..." className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-40" />
        <AranabilirSecici className="w-44" secenekler={markalar.map(m => ({ deger: m.id, etiket: m.ad }))}
          deger={filtreMarka} onChange={v => setFiltreMarka(v)} placeholder="Tüm Markalar" />
        <AranabilirSecici className="w-56" secenekler={kategoriSecenekleri(kategoriler)}
          deger={filtreKategori} onChange={v => setFiltreKategori(v)} placeholder="Tüm Kategoriler" />
        {(filtreMarka || filtreKategori || arama) && (
          <button onClick={() => { setFiltreMarka(''); setFiltreKategori(''); setArama('') }} className="text-xs text-gray-500 hover:text-red-600 px-2">✕ Temizle</button>
        )}
      </div>

      {/* Aramayla eşleşen SETLER — ürün tablosunun üstünde ayrı bölüm.
          Setler ürün değildir (stok/barkod yok), bu yüzden tabloya karıştırılmaz. */}
      {bulunanSetler.length > 0 && (
        <div className="mb-3 flex-shrink-0 bg-purple-50 border border-purple-200 rounded-lg p-2">
          <div className="text-xs font-semibold text-purple-800 mb-1.5 px-1">
            🎁 Eşleşen Setler ({bulunanSetler.length}) — setler ürün listesinde yer almaz, "🎁 Setler" sekmesinden yönetilir
          </div>
          <div className="space-y-1">
            {bulunanSetler.map(s => (
              <div key={s.id} className="bg-white border border-purple-100 rounded px-3 py-1.5 flex items-center gap-3">
                <span className="font-medium text-gray-800 text-sm">🎁 {s.ad}</span>
                <span className="font-bold text-green-700 text-sm whitespace-nowrap">₺{Number(s.fiyat).toFixed(2)}</span>
                <span className="text-xs text-gray-500 flex-1 truncate"
                  title={s.bilesenler.map(b => `${b.ad}${b.miktar > 1 ? ` ×${b.miktar}` : ''}`).join(' + ')}>
                  {s.bilesenler.map(b => `${b.ad}${b.miktar > 1 ? ` ×${b.miktar}` : ''}`).join(' + ') || '—'}
                </span>
                <button onClick={() => setSekme('setler')}
                  className="text-purple-700 hover:underline text-xs whitespace-nowrap">Setlerde aç →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="bg-white rounded-lg border overflow-auto flex-1">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <SiraliBaslik k="ad" {...sr}>Ürün Adı</SiraliBaslik>
              <SiraliBaslik k="sku" {...sr}>Stok Kodu</SiraliBaslik>
              <SiraliBaslik k="barkod" {...sr}>Barkod</SiraliBaslik>
              <SiraliBaslik k="marka_adi" {...sr}>Marka</SiraliBaslik>
              <SiraliBaslik k="kategori_yol" {...sr}>Kategori</SiraliBaslik>
              <SiraliBaslik k="tedarikci_adi" {...sr}>Tedarikçi</SiraliBaslik>
              <SiraliBaslik k="alis_fiyati" {...sr}>Alış</SiraliBaslik>
              <SiraliBaslik k="satis_fiyati" {...sr}>Satış</SiraliBaslik>
              <SiraliBaslik k="toplam_stok" {...sr}>Stok</SiraliBaslik>
              <SiraliBaslik k="kdv_orani" {...sr}>KDV</SiraliBaslik>
              {/* Sabit genişlik: aktif/pasif işlem sütunu aynı kalsın → başlık satırı kaymaz. */}
              <th className="px-3 py-2.5 w-[230px]"></th>
            </tr>
          </thead>
          <tbody>
            {sayfaUrunler.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium max-w-xs truncate" title={u.ad}>{u.ad}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{u.sku||'—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">
                  {u.barkod
                    ? u.barkod
                    : duzenleYetkisi
                      ? <button onClick={() => handleBarkodUret(u)}
                          className="text-indigo-600 hover:underline whitespace-nowrap"
                          title="Otomatik benzersiz barkod üret (EAN-13, mağaza içi)">＋ Barkod üret</button>
                      : '—'}
                </td>
                <td className="px-3 py-2 text-xs">{u.marka_adi||'—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[160px] truncate" title={u.kategori_yol}>{u.kategori_yol||'—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{u.tedarikci_adi||'—'}</td>
                {/* Alış KDV HARİÇ tutulur; kullanıcı kararı gereği KDV dahil
                    karşılığı da hep görünür (ürünün kendi kdv_orani ile türetilir). */}
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                  {u.alis_fiyati > 0 ? (
                    <>
                      <div>{paraYaz(u.alis_fiyati)}</div>
                      <div className="text-[11px] text-gray-400" title={`KDV %${u.kdv_orani ?? 20} dahil`}>
                        {paraYaz(kdvDahil(u.alis_fiyati, u.kdv_orani))} <span className="text-gray-300">dhl</span>
                      </div>
                    </>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 font-semibold text-green-700 whitespace-nowrap">₺{u.satis_fiyati?.toFixed(2)}</td>
                <td className={`px-3 py-2 font-semibold whitespace-nowrap ${(u.toplam_stok || 0) > 0 ? 'text-blue-700' : 'text-gray-300'}`}>{u.toplam_stok || 0}</td>
                <td className="px-3 py-2 text-gray-500">%{u.kdv_orani}</td>
                <td className="px-3 py-2 whitespace-nowrap w-[230px]">
                  {durum === 'pasif' ? (
                    // Pasif görünüm: yalnızca aktifleştirme (pasif ürün düzenlenmez/satılmaz).
                    duzenleYetkisi && (
                      <button onClick={() => handleAktiflik(u, true)}
                        className="text-emerald-600 hover:underline text-xs font-medium">✔ Aktifleştir</button>
                    )
                  ) : (
                    <>
                      <button onClick={() => setBarkodUrun(u)} className="text-gray-600 hover:underline text-xs mr-2" title="Barkod etiketi bas">🏷️ Barkod</button>
                      {duzenleYetkisi && (
                        <button onClick={() => handleDuzenle(u)} className="text-blue-600 hover:underline text-xs mr-2">Düzenle</button>
                      )}
                      {duzenleYetkisi && (
                        <button onClick={() => handleAktiflik(u, false)}
                          className="text-amber-600 hover:underline text-xs mr-2" title="Ürünü pasife al (satışta ve listelerde görünmez)">Pasife Al</button>
                      )}
                      {silYetkisi && (
                        <button onClick={() => handleSil(u.id)} className="text-red-500 hover:underline text-xs">Sil</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {urunler.length === 0 && (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">
                {durum === 'pasif' ? 'Pasif ürün yok.'
                  : bulunanSetler.length > 0 ? 'Ürün bulunamadı — yalnızca yukarıdaki set(ler) eşleşti.'
                  : 'Ürün bulunamadı'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Sayfalama {...sayfalama} />

      {/* Form Modal */}
      {formAcik && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">{duzenlenenId ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ürün Adı *</label>
                  <input required value={form.ad} onChange={e => setForm(f=>({...f,ad:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>

                {/* Marka */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marka</label>
                  <AranabilirSecici secenekler={markalar.map(m => ({ deger: m.id, etiket: m.ad }))}
                    deger={form.marka_id} onChange={v => {
                      setForm(f=>({...f,marka_id:v}))
                      // Yeni ürün + SKU boş → markanın TNC.XXX.NNNNN şablonundan sonraki kodu öner.
                      if (!duzenlenenId && v) {
                        urunlerApi.sonrakiStokKodu(v).then(kod => {
                          if (kod) setForm(f => f.sku ? f : ({ ...f, sku: kod }))
                        }).catch(() => {})
                      }
                    }} placeholder="Marka seç" />
                  <InlineEkle label="marka" onEkle={markaEkle} />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                  <AranabilirSecici secenekler={kategoriSecenekleri(kategoriler)}
                    deger={form.kategori_id} onChange={v => setForm(f=>({...f,kategori_id:v}))} placeholder="Kategori seç" />
                  <InlineEkle label="kategori" onEkle={kategoriEkle} />
                </div>

                {/* Tedarikçi */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi</label>
                  <AranabilirSecici secenekler={tedarikciler.map(t => ({ deger: t.id, etiket: t.ad }))}
                    deger={form.tedarikci_id} onChange={v => setForm(f=>({...f,tedarikci_id:v}))} placeholder="Tedarikçi seç" />
                  <InlineEkle label="tedarikçi" onEkle={tedarikciEkle} />
                </div>

                {[['barkod','Barkod','text'],['sku','SKU Kodu','text'],['alis_fiyati','Alış Fiyatı (₺)','number'],['satis_fiyati','Satış Fiyatı (₺) *','number'],['kdv_orani','KDV Oranı (%)','number']].map(([name,label,type]) => {
                  // Mevcut ürünü düzenlerken satış fiyatı, fiyat_degistir yetkisi yoksa kilitli.
                  const fiyatKilitli = name === 'satis_fiyati' && duzenlenenId && !fiyatYetkisi
                  return (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}{fiyatKilitli && ' 🔒'}</label>
                    <input type={type} step={type==='number'?'0.01':undefined} required={name==='satis_fiyati'}
                      disabled={fiyatKilitli} title={fiyatKilitli ? 'Fiyat değiştirme yetkiniz yok' : undefined}
                      value={form[name]} onChange={e => setForm(f=>({...f,[name]:e.target.value}))}
                      className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                    {/* Alış fiyatı KDV HARİÇ girilir; dahil karşılığı anında altta gösterilir
                        (KDV oranı alanı değişince de kendiliğinden güncellenir). */}
                    {name === 'alis_fiyati' && kdvDahil(form.alis_fiyati, form.kdv_orani) != null && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        KDV %{form.kdv_orani || 20} dahil: <strong>{paraYaz(kdvDahil(form.alis_fiyati, form.kdv_orani))}</strong>
                      </p>
                    )}
                  </div>
                )})}

                <div className="col-span-2">
                  {/* Web sitesi (ikas storefront) linki. Sosyal medya otomasyonunda DM'e
                      "Online Sipariş Hattı" satırı olarak gider. Ürünler ekranındaki
                      "Web linklerini çek" ile ikas slug'larından toplu doldurulabilir. */}
                  <label className="block text-xs font-medium text-gray-600 mb-1">Web Sitesi Linki</label>
                  <input type="url" placeholder="https://tencerecim.store/urun-adi"
                    value={form.web_link} onChange={e => setForm(f=>({...f,web_link:e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                  <textarea value={form.aciklama} onChange={e => setForm(f=>({...f,aciklama:e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Ek Barkodlar: yalnız düzenleme modunda (ürün id'si yoksa iç içe form kurmayı gerektirirdi). */}
              {duzenlenenId && (
                <div className="mt-4 border-t pt-3">
                  <label className="block text-xs font-medium text-gray-600">Ek Barkodlar</label>
                  <p className="text-xs text-gray-400 mb-2">Bu ürün bu barkodlarla da okutulabilir. Etikete her zaman ana barkod basılır. Silinen bir ek barkod diğer mağazada da kalkar.</p>

                  {ekBarkodlar.length === 0 ? (
                    <p className="text-xs text-gray-400 mb-2">Ek barkod tanımlı değil.</p>
                  ) : (
                    <ul className="mb-2 space-y-1">
                      {ekBarkodlar.map(b => (
                        <li key={b.id} className="flex items-center justify-between text-xs bg-gray-50 border rounded px-2 py-1">
                          <span>
                            <span className="font-mono">{b.barkod}</span>
                            {b.aciklama && <span className="text-gray-400 ml-2">{b.aciklama}</span>}
                          </span>
                          <button type="button" onClick={() => handleEkBarkodSil(b.id)} className="text-gray-400 hover:text-red-600 ml-2">✕</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-1">
                    <input value={ekBarkod} onChange={e => setEkBarkod(e.target.value)} placeholder="Barkod"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEkBarkodEkle() } }}
                      className="flex-1 border rounded px-2 py-1 text-xs" />
                    <input value={ekBarkodAciklama} onChange={e => setEkBarkodAciklama(e.target.value)} placeholder="Açıklama (opsiyonel)"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEkBarkodEkle() } }}
                      className="flex-1 border rounded px-2 py-1 text-xs" />
                    <button type="button" onClick={handleEkBarkodEkle} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Ekle</button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">{duzenlenenId ? 'Güncelle' : 'Ekle'}</button>
                <button type="button" onClick={() => { setFormAcik(false); setDuzenlenenId(null) }} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {barkodUrun && (
        <BarkodModal urun={barkodUrun} onKapat={() => setBarkodUrun(null)} />
      )}
    </div>
  )
}
