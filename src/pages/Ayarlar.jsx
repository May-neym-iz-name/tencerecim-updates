import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { lokasyonApi, upsApi } from '../api/ipc'
import { useAyarlar } from '../ayarlar/AyarlarContext'
import { useAuth } from '../auth/AuthContext'
import IlIlceSecici from '../components/IlIlceSecici'

export default function Ayarlar() {
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [yeniLok, setYeniLok] = useState({ ad: '', adres: '', telefon: '' })
  const { ayarlar, kaydet } = useAyarlar()
  const { profil } = useAuth()
  const yonetici = profil?.rol === 'super_admin' || profil?.rol === 'yonetici'

  async function ayarDegistir(anahtar, deger) {
    try { await kaydet(anahtar, deger); toast.success('Ayar kaydedildi') }
    catch (e) { toast.error('Ayar kaydedilemedi: ' + e.message) }
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
      toast.success('UPS ayarları kaydedildi')
    } catch (e) { toast.error('UPS ayarları kaydedilemedi: ' + e.message) }
    finally { setUpsKaydediliyor(false) }
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
    <div className="p-5 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Ayarlar</h2>

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

      {/* Satış Ayarları (yalnızca yönetici/süper yönetici) */}
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
        </div>
      </div>

      {/* UPS Kargo Ayarları (yalnızca yönetici) */}
      {yonetici && ups && (
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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">⚠️ Yakında Eklenecek</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Supabase bulut senkronizasyonu</li>
          <li>• ikas e-ticaret entegrasyonu</li>
          <li>• Barkod yazıcı desteği</li>
          <li>• Otomatik güncelleme ayarları</li>
        </ul>
      </div>
    </div>
  )
}
