import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { lokasyonApi, upsApi, ikasApi, lokasyonGondericiApi, yedekApi, metaApi } from '../api/ipc'
import { bulutaYukle } from '../lib/ayarSenk'
import { veriSenk } from '../lib/veriSenk'
import { useAyarlar } from '../ayarlar/AyarlarContext'
import { useAuth } from '../auth/AuthContext'
import IlIlceSecici from '../components/IlIlceSecici'
import { ETIKET_BOYUTLARI, VARSAYILAN_BOYUT } from '../lib/barkod'
import {
  BARKOD_YAZICI_KEY, BARKOD_BOYUT_KEY, KARGO_YAZICI_KEY, KARGO_OLCU_KEY,
  FIS_YAZICI_KEY, FIS_GENISLIK_KEY, fisGenisligiOku,
  yaziciAyarOku, yaziciAyarYaz, kargoSayfaBasinaOku, kargoSayfaBasinaYaz,
} from '../lib/yaziciAyarlari'

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
    { kod: 'yazici', ad: '🖨️ Yazıcılar' },
    { kod: 'ikas', ad: '🛍️ ikas' },
    { kod: 'meta', ad: '💬 Sosyal Medya' },
    { kod: 'yedek', ad: '💾 Yedekleme' },
  ]

  const [yedekMesgul, setYedekMesgul] = useState('')
  const [senkMesgul, setSenkMesgul] = useState(false)
  async function veriSenkle() {
    setSenkMesgul(true)
    try {
      const r = await veriSenk()
      toast.success(`Senkron tamam: ${r.gonderilen || 0} gönderildi, ${r.alinan || 0} alındı`)
    } catch (e) { toast.error('Senkron hatası: ' + e.message) }
    finally { setSenkMesgul(false) }
  }
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

  // Bulut köprüsü bağlantı testi. Kaydedilmiş ayarla test eder — kutuya yeni bir değer
  // yazıp KAYDETMEDEN test edilirse eski ayar denenir, bu yüzden önce kaydetmesi söylenir.
  const [bulutTest, setBulutTest] = useState(null) // null | 'deneniyor' | {ok, ...}
  async function bulutTestEt() {
    setBulutTest('deneniyor')
    try {
      setBulutTest(await upsApi.bulutTest())
    } catch (e) { setBulutTest({ ok: false, hata: e.message }) }
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
    try {
      const r = await ikasApi.stokGonder()
      if (r.kapali) toast.error('Stok gönderimi kapalı. Önce "Stok miktarı ikas\'a gönderilsin" seçeneğini açın.')
      else toast.success(`${r.gonderilen} stok kaydı ikas\'a gönderildi`)
    }
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

  // Tüm geçmişi yeniden çeker: eski siparişlerin eksik birim_fiyat'larını doldurur
  // (fiyat kaydetme özelliği eklenmeden önceki siparişlerde raporda ciro=0 çıkıyordu).
  async function ikasGecmisCek() {
    if (!confirm('Tüm geçmiş ikas siparişleri yeniden çekilecek ve eksik fiyatlar doldurulacak. Stok DÜŞÜLMEZ. Devam edilsin mi?')) return
    setIkasMesgul('gecmis')
    try {
      const r = await ikasApi.siparisGecmisCek()
      toast.success(`Geçmiş çekildi: ${r.kaydedilen || 0} yeni, ${r.guncellenen || 0} güncellendi (fiyatlar dolduruldu).`)
      await ikasDurumYenile()
    } catch (e) { toast.error('Geçmiş çekme hatası: ' + e.message) }
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

  // Meta (Facebook/Instagram) entegrasyonu
  const [meta, setMeta] = useState(null)
  const [metaDurum, setMetaDurum] = useState(null)
  const [metaMesgul, setMetaMesgul] = useState('')
  useEffect(() => {
    metaApi.ayarGetir().then(setMeta).catch(() => setMeta({}))
    metaApi.durum().then(setMetaDurum).catch(() => {})
  }, [])
  function metaAlan(anahtar, deger) { setMeta(m => ({ ...m, [anahtar]: deger })) }
  async function metaDurumYenile() {
    try { setMetaDurum(await metaApi.durum()) } catch {}
  }
  async function metaKaydet() {
    setMetaMesgul('kaydet')
    try { await metaApi.ayarKaydet(meta); bulutaYukleSessiz(); toast.success('Meta ayarları kaydedildi') }
    catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
    finally { setMetaMesgul('') }
  }
  async function metaKurulum() {
    setMetaMesgul('kurulum')
    try {
      await metaApi.ayarKaydet(meta) // önce gir (App ID/Secret/kısa token), sonra kur
      const r = await metaApi.kurulum()
      toast.success(`Kurulum tamam: ${r.sayfa_ad || r.sayfa_id}${r.ig_bagli ? ' + Instagram' : ' (Instagram bağlı değil)'}`)
      // Kısa ömürlü token backend'de temizlendi → formu tazele.
      setMeta(await metaApi.ayarGetir())
      await metaDurumYenile()
    } catch (e) { toast.error('Kurulum hatası: ' + e.message) }
    finally { setMetaMesgul('') }
  }
  // Facebook ile Bağlan — OAuth penceresi açar, token'ı otomatik alır (elle token gerekmez).
  async function metaGiris() {
    setMetaMesgul('giris')
    try {
      await metaApi.ayarKaydet(meta) // App ID + Secret kayıtlı olmalı
      const r = await metaApi.girisBaslat(meta.sayfa_id || '')
      toast.success(`Bağlandı: ${r.sayfa_ad || r.sayfa_id}${r.ig_bagli ? ' + Instagram' : ' (Instagram bağlı değil)'}`)
      setMeta(await metaApi.ayarGetir())
      await metaDurumYenile()
    } catch (e) { toast.error('Bağlantı hatası: ' + e.message) }
    finally { setMetaMesgul('') }
  }
  async function metaCek() {
    setMetaMesgul('cek')
    try {
      const r = await metaApi.cek()
      const dm = (r.fbDm || 0) + (r.igDm || 0)
      const toplam = (r.fbYorum || 0) + (r.igYorum || 0) + dm
      toast.success(`Çekildi — FB yorum: ${r.fbYorum}, IG yorum: ${r.igYorum}, DM: ${dm} (toplam ${toplam})`)
      if (r.hatalar?.length) toast.error('Bazı kaynaklar atlandı: ' + r.hatalar.join(' | '))
    } catch (e) { toast.error('Çekme hatası: ' + e.message) }
    finally { setMetaMesgul('') }
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

          {/* Nakit satış için kasa zorunluluğu */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" disabled={!yonetici}
              checked={!!ayarlar.kasa_zorunlu_nakit}
              onChange={e => ayarDegistir('kasa_zorunlu_nakit', e.target.checked)}
              className="w-4 h-4 mt-0.5" />
            <span>
              <span className="text-sm font-medium text-gray-800">Kasa açılmadan nakit satış yapılamasın</span>
              <span className="block text-xs text-gray-500">Açıkken, nakit satış için seçili mağazada açık bir kasa (vardiya) bulunması zorunludur. Kart/Havale bundan etkilenmez.</span>
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

          <p className="text-xs text-gray-400 mb-4">
            🖨️ Etiket yazıcısı ve ölçü seçimi <b>Yazıcılar</b> sekmesine taşındı.
          </p>

          <p className="text-sm font-medium text-gray-600 mb-2">☁️ Bulut Köprüsü</p>
          <p className="text-xs text-gray-400 mb-2">
            Doldurulursa kargo durumları UPS'ten <b>Cloudflare üzerinden 7/24</b> yoklanır — program kapalıyken
            teslim olan kargolar da işlenir. Ayrıca <b>ikas siparişleri ~5 saniyede</b> düşer (webhook), 90 saniye
            beklenmez. Boş bırakılırsa her ikisi de eski yönteme (program açıkken doğrudan sorma) döner.
            Her iki alan da dolu olmalı.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={ups.bulut_url || ''} onChange={e => upsAlan('bulut_url', e.target.value)}
              placeholder="Worker adresi (https://…workers.dev)" className="border rounded px-2 py-1.5 text-sm" />
            <input type="password" value={ups.bulut_anahtar || ''} onChange={e => upsAlan('bulut_anahtar', e.target.value)}
              placeholder="Paylaşılan anahtar" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={bulutTestEt} disabled={bulutTest === 'deneniyor'}
              className="border px-3 py-1 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">
              {bulutTest === 'deneniyor' ? 'Deneniyor…' : 'Bağlantıyı Test Et'}
            </button>
            {bulutTest && bulutTest !== 'deneniyor' && (
              bulutTest.ok
                ? <span className="text-xs text-green-600">
                    ✓ Bağlandı — {bulutTest.izlenenAktif ?? 0} kargo izleniyor
                    {bulutTest.sonSorgu ? ` · son yoklama ${new Date(bulutTest.sonSorgu).toLocaleString('tr-TR')}` : ' · henüz yoklama yapılmadı'}
                  </span>
                : <span className="text-xs text-red-600">✗ {bulutTest.hata || 'Bağlanılamadı'}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Not: test <b>kaydedilmiş</b> ayarla yapılır — yeni değer girdiyseniz önce kaydedin.
          </p>

          <button onClick={upsKaydet} disabled={upsKaydediliyor}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {upsKaydediliyor ? 'Kaydediliyor…' : 'UPS Ayarlarını Kaydet'}
          </button>
        </div>
      )}

      {/* Yazıcı Ayarları — cihaza özel, buluta senkronlanmaz */}
      {sekme === 'yazici' && <YaziciAyarlariKarti yazicilar={yazicilar} />}

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

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={ikas.stok_push_kapali !== '1'}
                onChange={e => ikasAlan('stok_push_kapali', e.target.checked ? '' : '1')}
                className="w-4 h-4" />
              <span className="font-medium text-gray-800">Stok miktarı ikas'a gönderilsin</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Kapatılırsa yerel stok değişiklikleri ikas paneline <b>gönderilmez</b> (ürün düzenlemesi sırasında güvenlik için).
              Sipariş çekme ve fiyat gönderimi bundan etkilenmez.
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
            <button onClick={ikasGecmisCek} disabled={!!ikasMesgul}
              title="Tüm geçmiş siparişleri yeniden çeker; eski siparişlerin eksik fiyatlarını (raporda ciro=0) doldurur. Stok düşülmez."
              className="border border-amber-600 text-amber-700 px-4 py-1.5 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50">
              {ikasMesgul === 'gecmis' ? 'Çekiliyor…' : '↻ Geçmişi Yeniden Çek (fiyat düzelt)'}
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
              <span>Stok gönderimi: {ikasDurum.stok_push_kapali ? '⛔ Kapalı' : 'Açık'}</span>
              <span>Eşleşmiş ürün: {ikasDurum.eslesmisUrun}</span>
              <span>Eşleşmiş lokasyon: {ikasDurum.eslesmisLok}/2</span>
              <span>Kayıtlı online sipariş: {ikasDurum.onlineSiparis}</span>
              <span>Son senkron: {ikasDurum.son_siparis_senk ? new Date(ikasDurum.son_siparis_senk).toLocaleString('tr-TR') : '—'}</span>
            </div>
          )}
        </div>
      )}

      {sekme === 'meta' && yonetici && meta && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-semibold mb-1">💬 Facebook & Instagram Entegrasyonu</h3>
          <p className="text-xs text-gray-400 mb-4">
            Facebook Sayfası ve Instagram yorumlarını/mesajlarını bu ekrandan yönetin. Kimlik bilgileri yalnızca bu bilgisayarda
            yerel saklanır ve <b>Supabase'e gönderilmez</b>. Kurulum için Meta Developer App bilgilerini girin.
          </p>

          <p className="text-sm font-medium text-gray-600 mb-1">Kurulum Bilgileri</p>
          <p className="text-xs text-gray-400 mb-2">
            App ID + App Secret'ı Meta App → Ayarlar → Temel'den alın. Sonra <b>"Facebook ile Bağlan"</b> ile
            izin penceresinden bağlanın — token otomatik alınır ve 60 günde bir yenilenir (elle token gerekmez).
          </p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input value={meta.app_id || ''} onChange={e => metaAlan('app_id', e.target.value)}
              placeholder="App ID" className="border rounded px-2 py-1.5 text-sm" />
            <input type="password" value={meta.app_secret || ''} onChange={e => metaAlan('app_secret', e.target.value)}
              placeholder="App Secret" className="border rounded px-2 py-1.5 text-sm" />
            <input value={meta.sayfa_id || ''} onChange={e => metaAlan('sayfa_id', e.target.value)}
              placeholder="Sayfa ID (opsiyonel — boşsa ilk sayfa)" className="border rounded px-2 py-1.5 text-sm" />
          </div>
          <details className="mb-4">
            <summary className="text-xs text-gray-400 cursor-pointer">Gelişmiş: elle token ile bağlan (opsiyonel)</summary>
            <input value={meta.kullanici_token || ''} onChange={e => metaAlan('kullanici_token', e.target.value)}
              placeholder="Kısa ömürlü Kullanıcı Token (Graph API Explorer)" className="border rounded px-2 py-1.5 text-sm w-full mt-2" />
          </details>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={meta.otomatik_senk !== '0'}
                onChange={e => metaAlan('otomatik_senk', e.target.checked ? '1' : '0')}
                className="w-4 h-4" />
              <span className="font-medium text-gray-800">Otomatik çekme açık (her 2 dakikada bir yorum/DM)</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={metaGiris} disabled={!!metaMesgul}
              className="bg-[#1877f2] text-white px-4 py-1.5 rounded-lg text-sm hover:bg-[#0f66d0] disabled:opacity-50 flex items-center gap-2">
              <span className="font-bold">f</span> {metaMesgul === 'giris' ? 'Bağlanıyor…' : 'Facebook ile Bağlan'}
            </button>
            <button onClick={metaKaydet} disabled={!!metaMesgul}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {metaMesgul === 'kaydet' ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
            </button>
            <button onClick={metaKurulum} disabled={!!metaMesgul}
              className="bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
              {metaMesgul === 'kurulum' ? 'Kuruluyor…' : 'Elle Token ile Kur'}
            </button>
            <button onClick={metaCek} disabled={!!metaMesgul || !metaDurum?.kurulu}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {metaMesgul === 'cek' ? 'Çekiliyor…' : 'Yorum & Mesajları Şimdi Çek'}
            </button>
          </div>

          {metaDurum && (
            <div className="text-xs text-gray-500 border-t pt-3 grid grid-cols-2 gap-1">
              <span>Durum: {metaDurum.kurulu ? '✅ Kurulu' : '⚠️ Kurulum bekliyor'}</span>
              <span>Sayfa: {metaDurum.sayfa_ad || metaDurum.sayfa_id || '—'}</span>
              <span>Instagram: {metaDurum.ig_bagli ? '✅ Bağlı' : '⛔ Bağlı değil'}</span>
              <span>Token kalan süre: {metaDurum.token_gun_kaldi != null ? `${metaDurum.token_gun_kaldi} gün` : '—'}</span>
            </div>
          )}
          {metaDurum?.kurulu && metaDurum.token_gun_kaldi != null && metaDurum.token_gun_kaldi < 7 && (
            <p className="text-xs text-red-500 mt-2">
              ⚠️ Token'ın süresi dolmak üzere. Graph API Explorer'dan yeni bir Kullanıcı Token alıp "Kurulumu Tamamla" ile yenileyin.
            </p>
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
          {/* Çok-PC veri senkronu */}
          <div className="border rounded-xl p-4 mb-4 bg-blue-50/40">
            <p className="text-sm font-medium text-gray-700 mb-1">🔄 Veri Senkronu (PC'ler arası)</p>
            <p className="text-xs text-gray-500 mb-3">
              Ürünler, müşteriler, stok, kategori/marka/tedarikçi bilgileri tüm bilgisayarlar arasında otomatik senkronlanır (her dakika).
              Aşağıdaki butonla hemen senkronlayabilirsiniz.
            </p>
            <button onClick={veriSenkle} disabled={senkMesgul}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {senkMesgul ? 'Senkronlanıyor…' : '🔄 Şimdi Senkronla'}
            </button>
          </div>

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

// 🖨️ Yazıcı Ayarları — TÜM yazıcı/etiket tanımları tek yerden (13.08.2026 kararı).
// Cihaza özel (localStorage): her PC'nin yazıcısı ve etiket rulosu farklıdır, buluta
// senkronlanmaz. Barkod Bas penceresi ve Kargo sayfası baskı anında buradan okur.
function YaziciAyarlariKarti({ yazicilar }) {
  const [barkodYazici, setBarkodYazici] = useState(() => yaziciAyarOku(BARKOD_YAZICI_KEY))
  const [barkodBoyut, setBarkodBoyut] = useState(() => yaziciAyarOku(BARKOD_BOYUT_KEY, VARSAYILAN_BOYUT))
  const [kargoYazici, setKargoYazici] = useState(() => yaziciAyarOku(KARGO_YAZICI_KEY))
  const [kargoOlcu, setKargoOlcu] = useState(() => yaziciAyarOku(KARGO_OLCU_KEY, '100x150'))
  const [sayfaBasina, setSayfaBasina] = useState(() => kargoSayfaBasinaOku())
  const [fisYazici, setFisYazici] = useState(() => yaziciAyarOku(FIS_YAZICI_KEY))
  const [fisGenislik, setFisGenislik] = useState(() => String(fisGenisligiOku()))

  const barkodHazir = ETIKET_BOYUTLARI.some(b => b.kod === barkodBoyut)
  const kargoStandart = kargoOlcu === '100x150'

  // "GENxYUK" metnini tek eksende günceller ("45x20", eksen 0 → genişlik).
  function olcuDegistir(mevcut, eksen, deger, yaz) {
    const p = String(mevcut).split('x')
    p[eksen] = String(Number(deger) || 0)
    yaz(p[0] + 'x' + (p[1] || '0'))
  }

  function kaydetVeBildir(key, deger, setState) {
    setState(deger)
    yaziciAyarYaz(key, deger)
    toast.success('Yazıcı ayarı kaydedildi')
  }

  const secStil = 'border rounded px-2 py-1.5 text-sm bg-white w-full'
  const mmStil = 'border rounded px-2 py-1.5 text-sm w-20'

  return (
    <div className="bg-white rounded-xl border p-5 mb-5">
      <h3 className="font-semibold mb-1">🖨️ Yazıcı Ayarları</h3>
      <p className="text-xs text-gray-400 mb-4">
        Bir kere tanımlayın — Barkod Bas ve Kargo etiketi her baskıda buradaki seçimi kullanır.
        Bu ayarlar <b>bu bilgisayara özeldir</b> (her PC'nin yazıcısı farklı olabilir), buluta senkronlanmaz.
      </p>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Satış fişi */}
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">🧾 Satış Fişi</p>
          <label className="block text-xs text-gray-500 mb-1">Yazıcı</label>
          <select value={fisYazici} className={secStil + ' mb-3'}
            onChange={e => kaydetVeBildir(FIS_YAZICI_KEY, e.target.value, setFisYazici)}>
            <option value="">Sistem yazdırma penceresi (her fişte sor)</option>
            {yazicilar.map(y => <option key={y.ad} value={y.ad}>{y.aciklama}{y.varsayilan ? ' (varsayılan)' : ''}</option>)}
          </select>
          <label className="block text-xs text-gray-500 mb-1">Fiş rulosu genişliği</label>
          <select value={fisGenislik} className={secStil}
            onChange={e => kaydetVeBildir(FIS_GENISLIK_KEY, e.target.value, setFisGenislik)}>
            <option value="80">80 mm (standart termal)</option>
            <option value="58">58 mm (dar rulo)</option>
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Yazıcı seçiliyse satış tamamlanınca fiş sorulmadan doğrudan basılır.
            Satış ve Satış &amp; Kasa ekranlarındaki fiş baskıları bu tanımı kullanır.
          </p>
        </div>

        {/* Ürün barkod etiketi */}
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">🏷️ Ürün Barkod Etiketi</p>
          <label className="block text-xs text-gray-500 mb-1">Yazıcı</label>
          <select value={barkodYazici} className={secStil + ' mb-3'}
            onChange={e => kaydetVeBildir(BARKOD_YAZICI_KEY, e.target.value, setBarkodYazici)}>
            <option value="">Sistem yazdırma penceresi (her baskıda sor)</option>
            {yazicilar.map(y => <option key={y.ad} value={y.ad}>{y.aciklama}{y.varsayilan ? ' (varsayılan)' : ''}</option>)}
          </select>
          <label className="block text-xs text-gray-500 mb-1">Etiket boyutu</label>
          <select value={barkodHazir ? barkodBoyut : 'ozel'} className={secStil + ' mb-2'}
            onChange={e => {
              const v = e.target.value
              kaydetVeBildir(BARKOD_BOYUT_KEY, v === 'ozel' ? '50x30' : v, setBarkodBoyut)
            }}>
            {ETIKET_BOYUTLARI.map(b => <option key={b.kod} value={b.kod}>{b.ad}</option>)}
            <option value="ozel">Özel ölçü…</option>
          </select>
          {!barkodHazir && (
            <div className="flex items-center gap-2 text-sm">
              <input type="number" min={10} max={300} value={barkodBoyut.split('x')[0] || ''} className={mmStil}
                onChange={e => olcuDegistir(barkodBoyut, 0, e.target.value, v => kaydetVeBildir(BARKOD_BOYUT_KEY, v, setBarkodBoyut))} />
              <span className="text-gray-400">×</span>
              <input type="number" min={10} max={300} value={barkodBoyut.split('x')[1] || ''} className={mmStil}
                onChange={e => olcuDegistir(barkodBoyut, 1, e.target.value, v => kaydetVeBildir(BARKOD_BOYUT_KEY, v, setBarkodBoyut))} />
              <span className="text-gray-500">mm (genişlik × yükseklik)</span>
            </div>
          )}
        </div>

        {/* Kargo etiketi */}
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">📦 Kargo Etiketi (UPS)</p>
          <label className="block text-xs text-gray-500 mb-1">Yazıcı</label>
          <select value={kargoYazici} className={secStil + ' mb-3'}
            onChange={e => kaydetVeBildir(KARGO_YAZICI_KEY, e.target.value, setKargoYazici)}>
            <option value="">Önizleme penceresi (elle yazdır)</option>
            {yazicilar.map(y => <option key={y.ad} value={y.ad}>{y.aciklama}{y.varsayilan ? ' (varsayılan)' : ''}</option>)}
          </select>
          <label className="block text-xs text-gray-500 mb-1">Etiket ölçüsü (termal düzen)</label>
          <select value={kargoStandart ? '100x150' : 'ozel'} className={secStil + ' mb-2'}
            onChange={e => {
              const v = e.target.value
              kaydetVeBildir(KARGO_OLCU_KEY, v === 'ozel' ? '100x180' : v, setKargoOlcu)
            }}>
            <option value="100x150">100 × 150 mm (UPS standart)</option>
            <option value="ozel">Özel ölçü…</option>
          </select>
          {!kargoStandart && (
            <div className="flex items-center gap-2 text-sm mb-2">
              <input type="number" min={50} max={300} value={kargoOlcu.split('x')[0] || ''} className={mmStil}
                onChange={e => olcuDegistir(kargoOlcu, 0, e.target.value, v => kaydetVeBildir(KARGO_OLCU_KEY, v, setKargoOlcu))} />
              <span className="text-gray-400">×</span>
              <input type="number" min={50} max={300} value={kargoOlcu.split('x')[1] || ''} className={mmStil}
                onChange={e => olcuDegistir(kargoOlcu, 1, e.target.value, v => kaydetVeBildir(KARGO_OLCU_KEY, v, setKargoOlcu))} />
              <span className="text-gray-500">mm (genişlik × yükseklik)</span>
            </div>
          )}
          <label className="block text-xs text-gray-500 mb-1">Sayfa düzeni</label>
          <select value={sayfaBasina} className={secStil}
            onChange={e => { const n = Number(e.target.value); setSayfaBasina(n); kargoSayfaBasinaYaz(n); toast.success('Yazıcı ayarı kaydedildi') }}>
            <option value={1}>1 etiket / sayfa · Termal</option>
            <option value={2}>2 etiket / sayfa · A4</option>
            <option value={4}>4 etiket / sayfa · A4</option>
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Yazıcı seçiliyse etiketler önizlemesiz doğrudan basılır. İade etiketi her zaman
            önizlemede açılır (WhatsApp'a sürüklemek için). UPS kuralı: barkod min. 2×12cm, 200dpi.
          </p>
        </div>
      </div>
    </div>
  )
}
