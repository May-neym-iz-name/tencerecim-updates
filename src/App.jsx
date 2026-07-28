import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { uygulamaApi, sosyalApi, bildirimApi } from './api/ipc'
import { buluttanAl } from './lib/ayarSenk'
import { veriSenk } from './lib/veriSenk'
import { eskiEtiketleriTemizle } from './lib/etiketDepo'
import { bildirimSesiCal } from './lib/bildirimSes'
import { AyarlarProvider, useAyarlar } from './ayarlar/AyarlarContext'
import GuncellemeKapisi from './guncelleme/GuncellemeKapisi'
import HataSiniri from './components/HataSiniri'
import logo from './assets/logo.png'
import Giris from './pages/Giris.jsx'
import Panel from './pages/Panel.jsx'
import Satis from './pages/Satis.jsx'
import Urunler from './pages/Urunler.jsx'
import StokYonetim from './pages/StokYonetim.jsx'
import Musteriler from './pages/Musteriler.jsx'
import Kargo from './pages/Kargo.jsx'
import Ayarlar from './pages/Ayarlar.jsx'
import SatisFinans from './pages/SatisFinans.jsx'
import OnlineSiparisler from './pages/OnlineSiparisler.jsx'
import Bildirimler from './pages/Bildirimler.jsx'
import SosyalMedya from './pages/SosyalMedya.jsx'
import Kullanicilar from './pages/Kullanicilar.jsx'

// Raporlar ağır recharts kütüphanesini içerir → tembel yükle (yalnızca sekme açılınca).
const Raporlar = lazy(() => import('./pages/Raporlar.jsx'))

const navItems = [
  { to: '/panel', label: '🏠 Ana Ekran', yetki: 'rapor_goruntule', el: <Panel /> },
  { to: '/', label: '🛒 Satış', end: true, yetki: 'satis_yap', el: <Satis /> },
  { to: '/satis-gecmisi', label: '📋 Satış & Kasa', yetkiler: ['satis_gecmisi_goruntule', 'kasa_kullan', 'gider_yonet'], el: <SatisFinans /> },
  { to: '/urunler', label: '📦 Ürünler', yetki: 'urun_goruntule', el: <Urunler /> },
  { to: '/stok', label: '📊 Stok', yetkiler: ['stok_goruntule', 'mal_kabul_yonet'], el: <StokYonetim /> },
  { to: '/online-siparisler', label: '🛍️ Online Siparişler', yetki: 'online_siparis_goruntule', el: <OnlineSiparisler /> },
  { to: '/bildirimler', label: '🔔 Bildirimler', yetki: 'bildirim_goruntule', el: <Bildirimler /> },
  { to: '/sosyal-medya', label: '💬 Sosyal Medya', yetki: 'sosyal_medya_yonet', el: <SosyalMedya /> },
  { to: '/raporlar', label: '📈 Raporlar', yetki: 'rapor_goruntule', el: <Raporlar /> },
  { to: '/musteriler', label: '👥 Müşteriler', yetki: 'musteri_goruntule', el: <Musteriler /> },
  { to: '/kargo', label: '📦 Kargo', yetki: 'kargo_yonet', el: <Kargo /> },
  { to: '/ayarlar', label: '⚙️ Ayarlar', yetki: 'ayarlar_duzenle', el: <Ayarlar /> },
  { to: '/kullanicilar', label: '🔑 Kullanıcılar', yetki: 'kullanici_yonetimi', el: <Kullanicilar /> },
]

const ROL_ETIKET = { super_admin: 'Süper Yönetici', yonetici: 'Yönetici', personel: 'Personel', ozel: 'Özel' }

function Uygulama() {
  const { profil, cikis, yetkiVar } = useAuth()
  const { yenile: ayarlariYenile } = useAyarlar()
  // Bir menü öğesi tek `yetki` ya da `yetkiler` (herhangi biri) ile görünür.
  const erisilebilir = navItems.filter(i => i.yetkiler ? i.yetkiler.some(y => yetkiVar(y)) : yetkiVar(i.yetki))
  const ilkSayfa = erisilebilir[0]?.to || '/'
  const [surum, setSurum] = useState('')
  useEffect(() => { uygulamaApi.surum().then(setSurum).catch(() => {}) }, [])

  // Sosyal medya okunmamış rozeti: yetki varsa 30 sn'de bir yeni yorum/DM sayısını
  // çeker. Personel sekmeyi açmadan da bekleyen mesaj olduğunu görür.
  const [sosyalRozet, setSosyalRozet] = useState(0)
  useEffect(() => {
    if (!yetkiVar('sosyal_medya_yonet')) return
    const yukle = () => sosyalApi.sayac().then(setSosyalRozet).catch(() => {})
    yukle()
    const i = setInterval(yukle, 30 * 1000)
    return () => clearInterval(i)
  }, [yetkiVar])

  // Bildirim okunmamış rozeti: 30 sn'de bir sayaç (emniyet ağı) + yoklayıcıdan gelen
  // 'bildirim:yeni' olayıyla ANINDA tazeleme ve köşe kutusu. Ses YALNIZ yüksek önemli
  // okunmamış sayısı artınca çalar (iptal/iade talebi, kargo sorunu); rutin teslimler
  // sessiz rozet. İlk yüklemede çalmaz.
  const [bildirimRozet, setBildirimRozet] = useState(0)
  const oncekiBildirimSayac = useRef(null)
  useEffect(() => {
    if (!yetkiVar('bildirim_goruntule')) return
    const yukle = () => bildirimApi.sayac().then(s => {
      setBildirimRozet(s?.toplam || 0)
      const yuksek = s?.yuksek || 0
      const onceki = oncekiBildirimSayac.current
      if (onceki !== null && yuksek > onceki) bildirimSesiCal()
      oncekiBildirimSayac.current = yuksek
    }).catch(() => {})
    yukle()
    const i = setInterval(yukle, 30 * 1000)
    // Yoklayıcı yeni bildirim yazdığı anda: rozet/ses tazele + köşede kutu göster.
    window.api.on('bildirim:yeni', (veri) => {
      yukle()
      const ilk = veri?.ornekler?.[0]
      if (!ilk) return
      toast.custom((t) => (
        <div
          onClick={() => {
            // Metin seçiliyorsa (kopyalamak için) tıklama sayma — kutu kapanıp sayfa değişmesin.
            if (String(window.getSelection?.() || '').trim()) return
            window.location.hash = '#/bildirimler'; toast.dismiss(t.id)
          }}
          className={`cursor-pointer select-text bg-white border shadow-lg rounded-xl px-4 py-3 max-w-sm
            ${ilk.onem === 'yuksek' ? 'border-red-300' : 'border-gray-200'}
            ${t.visible ? 'animate-in fade-in' : 'opacity-0'}`}
        >
          <p className="text-sm font-semibold text-gray-900">{ilk.baslik}</p>
          {ilk.mesaj && <p className="text-xs text-gray-500 mt-0.5 truncate">{ilk.mesaj}</p>}
          {veri.adet > 1 && <p className="text-[11px] text-gray-400 mt-1">+{veri.adet - 1} bildirim daha — görmek için tıkla</p>}
        </div>
      ), { duration: 8000, position: 'top-right' })
    })
    return () => { clearInterval(i); window.api.removeAllListeners('bildirim:yeni') }
  }, [yetkiVar])
  // Girişten sonra ayarları buluttan çek (PC'ler arası senkron) ve state'i tazele
  // ki senkronlanan ayarlar (ödeme oranı, kasa zorunlu vb.) anında etkili olsun.
  useEffect(() => {
    buluttanAl()
      .then(() => ayarlariYenile())
      .catch(err => console.error('Ayar senkron (çekme):', err.message))
  }, [ayarlariYenile])

  // Çok-PC veri senkronu: girişten ~15 sn sonra ve her 60 sn'de bir (ürün,
  // müşteri, stok, kategori, marka, tedarikçi). Hata olursa sessizce yeniden dener.
  useEffect(() => {
    const calistir = () => veriSenk().catch(err => console.error('Veri senkron:', err.message))
    const t = setTimeout(calistir, 15 * 1000)
    const i = setInterval(calistir, 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [])

  // Etiket deposu bakımı: açılıştan 40 sn sonra 5 aydan eski etiketleri Storage'dan
  // siler (depoyu ~725MB bandında tutar). Oturum başına bir kez yeterli.
  useEffect(() => {
    const t = setTimeout(() => eskiEtiketleriTemizle().catch(() => {}), 40 * 1000)
    return () => clearTimeout(t)
  }, [])

  if (erisilebilir.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-3">
        <p className="text-gray-600">Hesabınıza henüz bir yetki tanımlanmamış.</p>
        <p className="text-sm text-gray-400">Lütfen yöneticinize başvurun.</p>
        <button onClick={cikis} className="text-sm text-blue-600 hover:underline">Çıkış Yap</button>
      </div>
    )
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <nav className="w-52 bg-gray-900 text-white flex flex-col flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-700 flex items-center gap-2.5">
            <img src={logo} alt="Tencerecim" className="w-9 h-9 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Tencerecim</h1>
              <p className="text-[11px] text-gray-400">Mağaza Yönetim Sistemi</p>
            </div>
          </div>
          <div className="flex-1 py-2 overflow-auto">
            {erisilebilir.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`
                }
              >
                <span className="flex-1">{item.label}</span>
                {item.to === '/sosyal-medya' && sosyalRozet > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                    {sosyalRozet > 99 ? '99+' : sosyalRozet}
                  </span>
                )}
                {item.to === '/bildirimler' && bildirimRozet > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                    {bildirimRozet > 99 ? '99+' : bildirimRozet}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-700">
            <p className="text-xs text-white font-medium truncate">{profil?.ad || profil?.email}</p>
            <p className="text-[11px] text-gray-400 mb-2">{ROL_ETIKET[profil?.rol] || profil?.rol}</p>
            <button onClick={cikis} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
              ⏻ Çıkış Yap
            </button>
            {surum && <p className="text-[10px] text-gray-500 mt-2">Sürüm v{surum}</p>}
          </div>
        </nav>

        <main className="flex-1 overflow-auto">
          <HataSiniri>
            <Suspense fallback={<div className="p-8 text-center text-gray-400">Yükleniyor…</div>}>
              <Routes>
                {erisilebilir.map(item => (
                  <Route key={item.to} path={item.to === '/' ? '/' : item.to} element={item.el} />
                ))}
                <Route path="*" element={<Navigate to={ilkSayfa} replace />} />
              </Routes>
            </Suspense>
          </HataSiniri>
        </main>
      </div>
    </HashRouter>
  )
}

function Kapi() {
  const { girisYapildi } = useAuth()
  return girisYapildi ? (
    <AyarlarProvider>
      <Uygulama />
    </AyarlarProvider>
  ) : <Giris />
}

export default function App() {
  return (
    <HataSiniri>
    <GuncellemeKapisi>
      <AuthProvider>
        <Kapi />
        <Toaster position="top-right" />
      </AuthProvider>
    </GuncellemeKapisi>
    </HataSiniri>
  )
}
