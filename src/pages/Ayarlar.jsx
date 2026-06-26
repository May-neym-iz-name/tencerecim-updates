import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { lokasyonApi, upsApi, ikasApi, lokasyonGondericiApi, yedekApi } from '../api/ipc'
import { bulutaYukle } from '../lib/ayarSenk'
import { useAyarlar } from '../ayarlar/AyarlarContext'
import { useAuth } from '../auth/AuthContext'
import IlIlceSecici from '../components/IlIlceSecici'

export default function Ayarlar() {
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [yeniLok, setYeniLok] = useState({ ad: '', adres: '', telefon: '' })
  const { ayarlar, kaydet } = useAyarlar()
  const { yetkiVar } = useAuth()
  // Tutarlılık: sayfa zaten ayarlar_duzenle ile açılıyor; iç bölümler de aynı yetkiye bağlı (rol yerine).
  const yonetici = yetkiVar('ayarlar_duzenle')
  const [sekme, setSekme] = useState('lokasyon')
  const SEKMELER = [
    { kod: 'lokasyon', ad: '🏬 Mağazalar' },
    { kod: 'satis', ad: '🛒 Satış' },
    { kod: 'kargo', ad: '📦 Kargo / UPS' },
    { kod: 'ikas', ad: '🛍️ ikas' },
    { kod: 'yedek', ad: '💾 Yedekleme' },
  ]

  const [yedekMesgul, setYedekMesgul] = useState('')
  async function yedekAl() {
    setYedekMesgul('al')
    try {
      const r = await yedekApi.olustur()
      if (r.iptal) return
      toast.success(`Yedek alındı (${(r.boyut / 1048576).toFixed(1)} MB): ${r.yol}`)
    } catch (e) { toast.error('Yedek alınamadı: ' + e.message) }
    finally { setYedekMesgul('') }
  }
  async function yedekGeriYukle() {
    setYedekMesgul('yukle')
    try {
      const r = await yedekApi.geriYukle()
      if (r.iptal) setYedekMesgul('')
      // Başarılıysa uygulama yeniden başlar; mesgul kalması önemsiz.
    } catch (e) { toast.error('Geri yükleme başarısız: ' + e.message); setYedekMesgul('') }
  }

  // Ayar kaydı sonrası buluta sessizce yükler (PC'ler arası senkron).
  function bulutaYukleSessiz() {
    bulutaYukle().catch(e => toast.error('Bulut senkronu başarısız: ' + e.message))
  }

  async function ayarDegistir(anahtar, deger) {
    try {
      await kaydet(anahtar, deger)
      // localStorage'ın güncel olduğundan emin ol, sonra buluta yükle.
      try { localStorage.setItem('tencerecim_ayarlar', JSON.stringify({ ...ayarlar, [anahtar]: deger })) } catch { /* yok say */ }
      bulutaYukleSessiz()
      toast.success('Ayar kaydedildi')
    } catch (e) { toast.error('Ayar kaydedilemedi: ' + e.message) }
  }

  useEffect(() => { lokasyonApi.listele().then(setLokasyonlar) }, [])

  // UPS kargo ayarları
  const [ups, setUps] = useState(null)
  const [yazicilar, setYazicilar] = useState([])
  const [upsKaydediliyor, setUpsKaydediliyor] = useState(false)
  useEffect(() => {
    upsApi.ayarGetir().then(setUps).catch(() => setUps({}))
    upsApi.yazicilar().then(setYazicilar).catch(() => {})
  }, [])

  function upsAlan(anahtar, deger) {
    setUps(u => ({ ...u, [anahtar]: deger }))
  }

  async function upsKaydet() {
    setUpsKaydediliyor(true)
    try {
      await upsApi.ayarKaydet(ups)
      bulutaYukleSessiz()
      toast.success('UPS ayarları kaydedildi')
    } catch (e) { toast.error('UPS ayarları kaydedilemedi: ' + e.message) }
    finally { setUpsKaydediliyor(false) }
  }

  // Mağaza-bazlı UPS gönderici adresleri
  const [gondericiler, setGondericiler] = useState({})
  const [gondericiMesgul, setGondericiMesgul] = useState(null)
  useEffect(() => { lokasyonGondericiApi.getir().then(setGondericiler).catch(() => {}) }, [])

  function gondericiAlan(lokId, anahtar, deger) {
    setGondericiler(g => ({ ...g, [lokId]: { ...(g[lokId] || {}), [anahtar]: deger } }))
  }

  async function gondericiKaydet(lokId) {
    setGondericiMesgul(lokId)
    try {
      await lokasyonGondericiApi.kaydet({ lokasyon_id: lokId, ...(gondericiler[lokId] || {}) })
      bulutaYukleSessiz()
      toast.success('Mağaza gönderici adresi kaydedildi')
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
    finally { setGondericiMesgul(null) }
  }

  // ikas entegrasyonu
  const [ikas, setIkas] = useState(null)
  const [ikasDurum, setIkasDurum] = useState(null)
  const [ikasMesgul, setIkasMesgul] = useState('')
  useEffect(() => {
    ikasApi.ayarGetir().then(setIkas).catch(() => setIkas({}))
    ikasApi.durum().then(setIkasDurum).catch(() => {})
  }, [])

  function ikasAlan(anahtar, deger) { setIkas(i => ({ ...i, [anahtar]: deger })) }

  async function ikasDurumYenile() {
    try { setIkasDurum(await ikasApi.durum()) } catch {}
  }

  async function ikasKaydet() {
    setIkasMesgul('kaydet')
    try { await ikasApi.ayarKaydet(ikas); bulutaYukleSessiz(); toast.success('ikas ayarları kaydedildi'); await ikasDurumYenile() }
    catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasTest() {
    setIkasMesgul('test')
    try {
      await ikasApi.ayarKaydet(ikas) // önce gir, sonra test et
      const r = await ikasApi.test()
      const eslesen = r.rapor.filter(x => x.eslesti).length
      toast.success(`Bağlantı başarılı. ${eslesen}/${r.rapor.length} lokasyon eşleşti.`)
      bulutaYukleSessiz() // lokasyon eşleşmesi senkronlansın
      await ikasDurumYenile()
    } catch (e) { toast.error('Bağlantı/eşleşme hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasStokGonder() {
    if (!confirm('Tüm eşleşmiş ürünlerin yerel stoğu ikas\'a yazılacak. Devam edilsin mi?')) return
    setIkasMesgul('gonder')
    try { const r = await ikasApi.stokGonder(); toast.success(`${r.gonderilen} stok kaydı ikas\'a gönderildi`) }
    catch (e) { toast.error('Gönderim hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasSiparisCek() {
    setIkasMesgul('cek')
    try {
      const r = await ikasApi.siparisCek()
      if (r.ilkKurulum) toast.success(`İlk senkron: ${r.kaydedilen} sipariş kaydedildi (stok düşülmedi).`)
      else toast.success(`${r.kaydedilen} yeni sipariş, ${r.stokDusulen} tanesi stoktan düşüldü.`)
      await ikasDurumYenile()
    } catch (e) { toast.error('Sipariş çekme hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasFiyatGonder() {
    if (!confirm('Tüm eşleşmiş ürünlerin yerel fiyatı (satış/alış) ikas\'a yazılacak. Devam edilsin mi?')) return
    setIkasMesgul('fiyat')
    try { const r = await ikasApi.fiyatGonder(); toast.success(`${r.gonderilen} ürün fiyatı ikas\'a gönderildi`) }
    catch (e) { toast.error('Fiyat gönderim hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasUrunEsle() {
    setIkasMesgul('urunEsle')
    try {
      const r = await ikasApi.urunEsle()
      toast.success(`${r.eslesen} ürün eşleşti (${r.adEslesen || 0} tanesi ürün adıyla; ikas'ta ${r.ikasToplam} varyant tarandı).`)
      await ikasDurumYenile()
    } catch (e) { toast.error('Ürün eşleştirme hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function ikasMusteriCek() {
    setIkasMesgul('musteri')
    try {
      const r = await ikasApi.musteriCek()
      toast.success(`${r.toplam} müşteri tarandı: ${r.eslesen} güncellendi, ${r.eklenen} eklendi.`)
    } catch (e) { toast.error('Müşteri çekme hatası: ' + e.message) }
    finally { setIkasMesgul('') }
  }

  async function lokasyonEkle(e) {
    e.preventDefault()
    try {
      await lokasyonApi.olustur(yeniLok)
      toast.success('Lokasyon eklendi')
      setYeniLok({ ad: '', adres: '', telefon: '' })
      lokasyonApi.listele().then(setLokasyonlar)
    } catch (e) { toast.error(e.message) }
  }

  async function lokasyonGuncelle(lok) {
    try {
      await lokasyonApi.guncelle(lok.id, { ad: lok.ad, adres: lok.adres || '', telefon: lok.telefon || '' })
      toast.success('Lokasyon güncellendi')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-5 max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Ayarlar</h2>

      <div className="flex gap-1 border-b mb-5">
        {SEKMELER.map(s => (
          <button key={s.kod} onClick={() => setSekme(s.kod)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${sekme === s.kod ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'lokasyon' && (
      <div className="bg-white rounded-xl border p-5 mb-5">
        <h3 className="font-semibold mb-3">Mağaza Lokasyonları</h3>
        <div className="space-y-3 mb-4">
          {lokasyonlar.map(lok => (
            <div key={lok.id} className="border rounded-lg p-3 bg-gray-50">
              <p className="text-xs text-gray-400 mb-2">Lokasyon #{lok.id}</p>
              <div className="grid grid-cols-3 gap-2">
                <input defaultValue={lok.ad} placeholder="Mağaza adı"
                  onBlur={e => lokasyonGuncelle({ ...lok, ad: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" />
                <input defaultValue={lok.adres || ''} placeholder="Adres"
                  onBlur={e => lokasyonGuncelle({ ...lok, adres: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" />
                <input defaultValue={lok.telefon || ''} placeholder="Telefon"
                  onBlur={e => lokasyonGuncelle({ ...lok, telefon: e.target.value })}
                  className="border rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={lokasyonEkle} className="border-t pt-4">
          <p className="text-sm font-medium mb-2 text-gray-600">Yeni Lokasyon Ekle</p>
          <div className="grid grid-cols-3 gap-2">
            <input value={yeniLok.ad} onChange={e => setYeniLok(l => ({ ...l, ad: e.target.value }))}
              placeholder="Mağaza adı *" required className="border rounded px-2 py-1.5 text-sm" />
            <input value={yeniLok.adres} onChange={e => setYeniLok(l => ({ ...l, adres: e.target.value }))}
              placeholder="Adres" className="border rounded px-2 py-1.5 text-sm" />
            <input value={yeniLok.telefon} onChange={e => setYeniLok(l => ({ ...l, telefon: e.target.value }))}
              placeholder="Telefon" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ Ekle</button>
        </form>
      </div>
      )}

      {/* Satış Ayarları (yalnızca yönetici/süper yönetici) */}
      {sekme === 'satis' && (
      <div className="bg-white rounded-xl border p-5 mb-5">
        <h3 className="font-semibold mb-1">Satış Ayarları</h3>
        {!yonetici && <p className="text-xs text-gray-400 mb-3">Bu ayarları yalnızca yöneticiler değiştirebilir.</p>}

        <div className="space-y-4 mt-3">
          {/* Müşteri zorunlu */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" disabled={!yonetici}
              checked={!!ayarlar.musteri_zorunlu}
              onChange={e => ayarDegistir('musteri_zorunlu', e.target.checked)}
              className="w-4 h-4 mt-0.5" />
            <span>
              <span className="text-sm font-medium text-gray-800">Müşteri bilgisi girilmeden satış yapılamasın</span>
              <span className="block text-xs text-gray-500">Açıkken, satışı tamamlamak için müşteri seçilmesi zorunludur.</span>
            </span>
          </label>

          <p className="text-xs text-gray-400">Genel indirim tipini (% / ₺) satış ekranındaki indirim alanının yanından değiştirebilirsiniz.</p>

          {/* Ödeme tipine göre yüzdesel fiyat farkı */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Ödeme Tipine Göre Fiyat Farkı (%)</p>
            <p className="text-xs text-gray-500 mb-3">
              Satış ekranında seçilen ödeme tipine göre toplam fiyat otomatik ayarlanır.
              <span className="text-orange-600 font-medium"> Pozitif değer = fiyat artışı</span>,
              <span className="text-green-600 font-medium"> negatif değer = indirim</span>. Örn. Kart için <b>+5</b>, Nakit için <b>-2</b>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[['odeme_oran_nakit', '💵 Nakit'], ['odeme_oran_kart', '💳 Kart'], ['odeme_oran_havale', '🏦 Havale']].map(([anahtar, etiket]) => (
                <div key={anahtar}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{etiket}</label>
                  <div className="flex items-center">
                    <input type="number" step="0.5" disabled={!yonetici}
                      value={ayarlar[anahtar] ?? 0}
                      onChange={e => ayarDegistir(anahtar, parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-l-lg px-2 py-1.5 text-sm disabled:bg-gray-100" />
                    <span className="border border-l-0 rounded-r-lg px-2.5 py-1.5 text-sm bg-gray-50 text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      )}

      {/* UPS Kargo Ayarları (yalnızca yönetici) */}
      {sekme === 'kargo' && yonetici && ups && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-semibold mb-1">📦 UPS Kargo Entegrasyonu</h3>
          <p className="text-xs text-gray-400 mb-4">
            UPS'in verdiği kimlik bilgileri ve gönderici (mağaza) bilgileri. Bu bilgiler yalnızca bu bilgisayarda yerel olarak saklanır.
          </p>

          <p className="text-sm font-medium text-gray-600 mb-2">UPS Hesap Bilgileri</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input value={ups.musteri_kodu || ''} onChange={e => upsAlan('musteri_kodu', e.target.value)}
              placeholder="Müşteri Kodu" className="border rounded px-2 py-1.5 text-sm" />
            <input value={ups.kullanici_kodu || ''} onChange={e => upsAlan('kullanici_kodu', e.target.value)}
              placeholder="Kullanıcı Kodu" className="border rounded px-2 py-1.5 text-sm" />
            <input type="password" value={ups.sifre || ''} onChange={e => upsAlan('sifre', e.target.value)}
              placeholder="Şifre" className="border rounded px-2 py-1.5 text-sm" />
          </div>

          <p className="text-sm font-medium text-gray-600 mb-2">Gönderici (Mağaza) Bilgileri</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={ups.gonderici_ad || ''} onChange={e => upsAlan('gonderici_ad', e.target.value)}
              placeholder="Gönderici / Firma Adı" className="border rounded px-2 py-1.5 text-sm" />
            <input value={ups.gonderici_yetkili || ''} onChange={e => upsAlan('gonderici_yetkili', e.target.value)}
              placeholder="Yetkili Kişi" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <input value={ups.gonderici_adres || ''} onChange={e => upsAlan('gonderici_adres', e.target.value)}
            placeholder="Açık Adres" className="border rounded px-2 py-1.5 text-sm w-full mb-2" />
          <div className="mb-2">
            <IlIlceSecici
              ilKodu={ups.gonderici_il_kodu} ilceKodu={ups.gonderici_ilce_kodu}
              onChange={({ ilKodu, il, ilceKodu, ilce }) => setUps(u => ({
                ...u, gonderici_il_kodu: ilKodu, gonderici_il: il, gonderici_ilce_kodu: ilceKodu, gonderici_ilce: ilce,
              }))} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input value={ups.gonderici_telefon || ''} onChange={e => upsAlan('gonderici_telefon', e.target.value)}
              placeholder="Sabit Telefon" className="border rounded px-2 py-1.5 text-sm" />
            <input value={ups.gonderici_cep || ''} onChange={e => upsAlan('gonderici_cep', e.target.value)}
              placeholder="Cep Telefonu" className="border rounded px-2 py-1.5 text-sm" />
            <input value={ups.gonderici_email || ''} onChange={e => upsAlan('gonderici_email', e.target.value)}
              placeholder="E-posta" className="border rounded px-2 py-1.5 text-sm" />
          </div>

          <p className="text-sm font-medium text-gray-600 mb-2">Etiket Yazıcısı</p>
          <select value={ups.etiket_yazici || ''} onChange={e => upsAlan('etiket_yazici', e.target.value)}
            className="border rounded px-2 py-1.5 text-sm w-full mb-1 bg-white">
            <option value="">Yazdırırken sor (sistem diyaloğu)</option>
            {yazicilar.map(y => <option key={y.ad} value={y.ad}>{y.aciklama}</option>)}
          </select>
          <p className="text-xs text-gray-400 mb-4">
            UPS etiketi 100×150mm boyutundadır; ürün barkodu yazıcısından (45×20mm) farklı bir kargo etiketi yazıcısı/rulosu gerektirir.
          </p>

          <button onClick={upsKaydet} disabled={upsKaydediliyor}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {upsKaydediliyor ? 'Kaydediliyor…' : 'UPS Ayarlarını Kaydet'}
          </button>
        </div>
      )}

      {/* Mağaza Gönderici Adresleri (online sipariş kargosu için) */}
      {sekme === 'kargo' && yonetici && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-semibold mb-1">🏪 Mağaza Gönderici Adresleri</h3>
          <p className="text-xs text-gray-400 mb-4">
            Online sipariş kargosu oluştururken "gönderici mağaza" seçildiğinde kullanılır. UPS hesap bilgileri ortak,
            sadece çıkış adresi mağazaya göre değişir. Boş bırakılırsa yukarıdaki genel UPS gönderici adresi kullanılır.
          </p>
          <div className="space-y-4">
            {lokasyonlar.map(lok => {
              const g = gondericiler[lok.id] || {}
              return (
                <div key={lok.id} className="border rounded-lg p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">{lok.ad}</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input value={g.ad || ''} onChange={e => gondericiAlan(lok.id, 'ad', e.target.value)}
                      placeholder="Gönderici / Firma Adı" className="border rounded px-2 py-1.5 text-sm" />
                    <input value={g.yetkili || ''} onChange={e => gondericiAlan(lok.id, 'yetkili', e.target.value)}
                      placeholder="Yetkili Kişi" className="border rounded px-2 py-1.5 text-sm" />
                  </div>
                  <input value={g.adres || ''} onChange={e => gondericiAlan(lok.id, 'adres', e.target.value)}
                    placeholder="Açık Adres" className="border rounded px-2 py-1.5 text-sm w-full mb-2" />
                  <div className="mb-2">
                    <IlIlceSecici ilKodu={g.il_kodu} ilceKodu={g.ilce_kodu}
                      onChange={({ ilKodu, il, ilceKodu, ilce }) =>
                        setGondericiler(gs => ({ ...gs, [lok.id]: { ...(gs[lok.id] || {}), il_kodu: ilKodu, il, ilce_kodu: ilceKodu, ilce } }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <input value={g.telefon || ''} onChange={e => gondericiAlan(lok.id, 'telefon', e.target.value)}
                      placeholder="Sabit Telefon" className="border rounded px-2 py-1.5 text-sm" />
                    <input value={g.cep || ''} onChange={e => gondericiAlan(lok.id, 'cep', e.target.value)}
                      placeholder="Cep Telefonu" className="border rounded px-2 py-1.5 text-sm" />
                    <input value={g.email || ''} onChange={e => gondericiAlan(lok.id, 'email', e.target.value)}
                      placeholder="E-posta" className="border rounded px-2 py-1.5 text-sm" />
                  </div>
                  <button onClick={() => gondericiKaydet(lok.id)} disabled={gondericiMesgul === lok.id}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {gondericiMesgul === lok.id ? 'Kaydediliyor…' : `${lok.ad} Gönderici Adresini Kaydet`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ikas E-Ticaret Entegrasyonu (yalnızca yönetici) */}
      {sekme === 'ikas' && yonetici && ikas && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-semibold mb-1">🛒 ikas E-Ticaret Entegrasyonu</h3>
          <p className="text-xs text-gray-400 mb-4">
            ikas Admin API kimlik bilgileri. Bu bilgiler yalnızca bu bilgisayarda yerel olarak saklanır.
            Mağaza satışları ikas stoğunu günceller; ikas online siparişleri seçtiğiniz lokasyondan düşülür.
          </p>

          <p className="text-sm font-medium text-gray-600 mb-2">API Bilgileri</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input value={ikas.store_name || ''} onChange={e => ikasAlan('store_name', e.target.value)}
              placeholder="Mağaza adı (örn. resiftencerecim)" className="border rounded px-2 py-1.5 text-sm" />
            <input value={ikas.client_id || ''} onChange={e => ikasAlan('client_id', e.target.value)}
              placeholder="Client ID" className="border rounded px-2 py-1.5 text-sm" />
            <input type="password" value={ikas.client_secret || ''} onChange={e => ikasAlan('client_secret', e.target.value)}
              placeholder="Client Secret" className="border rounded px-2 py-1.5 text-sm" />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!ikas.otomatik_senk}
                onChange={e => ikasAlan('otomatik_senk', e.target.checked ? '1' : '')}
                className="w-4 h-4" />
              <span className="font-medium text-gray-800">Otomatik senkronizasyon açık</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Online siparişler, ikas'ta hangi mağazadan düştüyse yerel olarak da o mağazadan düşülür. Müşteriler ana listeye eklenir.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={ikasKaydet} disabled={!!ikasMesgul}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {ikasMesgul === 'kaydet' ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
            </button>
            <button onClick={ikasTest} disabled={!!ikasMesgul}
              className="bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {ikasMesgul === 'test' ? 'Test ediliyor…' : 'Bağlantıyı Test Et & Lokasyon Eşle'}
            </button>
            <button onClick={ikasStokGonder} disabled={!!ikasMesgul}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
              {ikasMesgul === 'gonder' ? 'Gönderiliyor…' : 'Tüm Stoğu ikas\'a Gönder'}
            </button>
            <button onClick={ikasSiparisCek} disabled={!!ikasMesgul}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {ikasMesgul === 'cek' ? 'Çekiliyor…' : 'Siparişleri Şimdi Çek'}
            </button>
            <button onClick={ikasFiyatGonder} disabled={!!ikasMesgul}
              className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50">
              {ikasMesgul === 'fiyat' ? 'Gönderiliyor…' : 'Tüm Fiyatı ikas\'a Gönder'}
            </button>
            <button onClick={ikasUrunEsle} disabled={!!ikasMesgul}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {ikasMesgul === 'urunEsle' ? 'Eşleşiyor…' : 'Ürünleri SKU/Barkod ile Eşle'}
            </button>
            <button onClick={ikasMusteriCek} disabled={!!ikasMesgul}
              className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
              {ikasMesgul === 'musteri' ? 'Çekiliyor…' : 'Müşterileri Çek'}
            </button>
          </div>

          {ikasDurum && (
            <div className="text-xs text-gray-500 border-t pt-3 grid grid-cols-2 gap-1">
              <span>Durum: {ikasDurum.yapilandirildi ? '✅ Yapılandırıldı' : '⚠️ Eksik bilgi'}</span>
              <span>Otomatik senkron: {ikasDurum.otomatik_senk ? 'Açık' : 'Kapalı'}</span>
              <span>Eşleşmiş ürün: {ikasDurum.eslesmisUrun}</span>
              <span>Eşleşmiş lokasyon: {ikasDurum.eslesmisLok}/2</span>
              <span>Kayıtlı online sipariş: {ikasDurum.onlineSiparis}</span>
              <span>Son senkron: {ikasDurum.son_siparis_senk ? new Date(ikasDurum.son_siparis_senk).toLocaleString('tr-TR') : '—'}</span>
            </div>
          )}
        </div>
      )}

      {/* Yedekleme (yalnızca yönetici) */}
      {sekme === 'yedek' && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-semibold mb-1">💾 Veritabanı Yedekleme</h3>
          <p className="text-xs text-gray-400 mb-4">
            Tüm veriler (ürünler, satışlar, stok, müşteriler, ayarlar) bu bilgisayardaki yerel veritabanında tutulur.
            Düzenli yedek almanız önerilir; yedeği USB belleğe veya buluta kopyalayabilirsiniz.
          </p>
          {!yonetici && <p className="text-xs text-gray-400 mb-3">Bu işlemleri yalnızca yöneticiler yapabilir.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Yedek Al</p>
              <p className="text-xs text-gray-400 mb-3">Mevcut tüm verinin tek dosyalık (.db) bir kopyasını kaydeder.</p>
              <button onClick={yedekAl} disabled={!yonetici || !!yedekMesgul}
                className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
                {yedekMesgul === 'al' ? 'Alınıyor…' : '⬇️ Yedek Al'}
              </button>
            </div>
            <div className="border rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Yedekten Geri Yükle</p>
              <p className="text-xs text-red-500 mb-3">Dikkat: Mevcut tüm veriler seçilen yedekle değiştirilir, uygulama yeniden başlar.</p>
              <button onClick={yedekGeriYukle} disabled={!yonetici || !!yedekMesgul}
                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                {yedekMesgul === 'yukle' ? 'Yükleniyor…' : '⬆️ Geri Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
