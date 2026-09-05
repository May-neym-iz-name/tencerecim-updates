import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { youtubeApi } from '../api/ipc'

// YouTube bağlantı ayarları. Ayarlar.jsx zaten 1100+ satır olduğu için
// (yazıcı kartı gibi) ayrı bileşen; sayfa daha da şişmesin.
//
// Google Cloud projesi: tencerecim-youtube
// Client ID/Secret: Google Cloud → API'ler ve Hizmetler → Kimlik Bilgileri
//                   → "Tencerecim Masaustu Uygulamasi" (Masaüstü uygulaması)
export default function YouTubeAyarlariKarti() {
  const [ayar, setAyar] = useState(null)
  const [durum, setDurum] = useState(null)
  const [mesgul, setMesgul] = useState('')

  useEffect(() => {
    youtubeApi.ayarGetir().then(setAyar).catch(() => setAyar({}))
    youtubeApi.durum().then(setDurum).catch(() => {})
  }, [])

  function alan(anahtar, deger) { setAyar(a => ({ ...a, [anahtar]: deger })) }

  async function durumTazele() {
    try { setDurum(await youtubeApi.durum()) } catch { /* durum kritik değil */ }
  }

  async function kaydet() {
    setMesgul('kaydet')
    try {
      await youtubeApi.ayarKaydet(ayar)
      setAyar(await youtubeApi.ayarGetir())
      await durumTazele()
      toast.success('YouTube ayarları kaydedildi')
    } catch (e) { toast.error(e.message) } finally { setMesgul('') }
  }

  async function baglan() {
    setMesgul('baglan')
    try {
      await youtubeApi.ayarKaydet(ayar) // Client ID/Secret kayıtlı olmalı
      const k = await youtubeApi.girisBaslat()
      setAyar(await youtubeApi.ayarGetir())
      await durumTazele()
      toast.success(`Bağlandı: ${k.kanal_adi}`)
    } catch (e) { toast.error(e.message) } finally { setMesgul('') }
  }

  async function test() {
    setMesgul('test')
    try {
      const k = await youtubeApi.tazele()
      await durumTazele()
      toast.success(`${k.kanal_adi} — ${k.abone} abone, ${k.video_sayisi} video`)
    } catch (e) { toast.error(e.message) } finally { setMesgul('') }
  }

  async function kes() {
    setMesgul('kes')
    try {
      setAyar(await youtubeApi.baglantiKes())
      await durumTazele()
      toast.success('Bağlantı kesildi')
    } catch (e) { toast.error(e.message) } finally { setMesgul('') }
  }

  if (!ayar) return null
  const bagli = durum && durum.bagli

  return (
    <div className="bg-white rounded-xl border p-5 mb-5">
      <h3 className="font-semibold text-gray-800 mb-1">▶️ YouTube</h3>
      <p className="text-sm text-gray-500 mb-4">
        Kanal yetkisi <b>yalnızca bu bilgisayarda</b> şifreli saklanır, Supabase'e gönderilmez.
      </p>

      <div className={`rounded-lg border p-3 mb-4 text-sm ${bagli ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
        {bagli ? (
          <>
            <span className="text-green-700 font-medium">✓ Bağlı</span>
            {durum.kanal_adi && <> — kanal: <b>{durum.kanal_adi}</b></>}
          </>
        ) : (
          <span className="text-gray-600">
            Bağlı değil. Client ID/Secret girip <b>YouTube'a Bağlan</b> deyin.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Client ID</span>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={ayar.client_id || ''}
            onChange={e => alan('client_id', e.target.value)}
            placeholder="...apps.googleusercontent.com"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Client Secret</span>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={ayar.client_secret || ''}
            onChange={e => alan('client_secret', e.target.value)}
            placeholder="GOCSPX-..."
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={kaydet} disabled={!!mesgul}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50">
          {mesgul === 'kaydet' ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button onClick={baglan} disabled={!!mesgul}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {mesgul === 'baglan' ? 'Tarayıcı açıldı, bekleniyor…' : "YouTube'a Bağlan"}
        </button>
        {bagli && (
          <>
            <button onClick={test} disabled={!!mesgul}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50">
              {mesgul === 'test' ? 'Kontrol ediliyor…' : 'Bağlantıyı test et'}
            </button>
            <button onClick={kes} disabled={!!mesgul}
              className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
              {mesgul === 'kes' ? 'Kesiliyor…' : 'Bağlantıyı kes'}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4 leading-relaxed">
        <b>İlk bağlanışta</b> Google "bu uygulama doğrulanmadı" uyarısı gösterir — bu beklenen
        durumdur. <b>Gelişmiş</b> → <b>Tencerecim Magaza Programi (güvenli değil) sitesine git</b> ile
        devam edin. Yetkiyi <b>kanalın sahibi olan Google hesabıyla</b> verin; başka bir hesapla
        bağlanırsanız kanal bulunamaz.
      </p>
    </div>
  )
}
