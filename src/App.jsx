import { useState, useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { uygulamaApi } from './api/ipc'
import { buluttanAl } from './lib/ayarSenk'
import { AyarlarProvider } from './ayarlar/AyarlarContext'
import GuncellemeKapisi from './guncelleme/GuncellemeKapisi'
import logo from './assets/logo.png'
import Giris from './pages/Giris.jsx'
import Panel from './pages/Panel.jsx'
import Satis from './pages/Satis.jsx'
import Urunler from './pages/Urunler.jsx'
import Stok from './pages/Stok.jsx'
import Musteriler from './pages/Musteriler.jsx'
import Kargo from './pages/Kargo.jsx'
import Ayarlar from './pages/Ayarlar.jsx'
import SatisGecmisi from './pages/SatisGecmisi.jsx'
import OnlineSiparisler from './pages/OnlineSiparisler.jsx'
import Kullanicilar from './pages/Kullanicilar.jsx'

// Raporlar ağır recharts kütüphanesini içerir → tembel yükle (yalnızca sekme açılınca).
const Raporlar = lazy(() => import('./pages/Raporlar.jsx'))

const navItems = [
  { to: '/panel', label: '🏠 Ana Ekran', yetki: 'rapor_goruntule', el: <Panel /> },
  { to: '/', label: '🛒 Satış', end: true, yetki: 'satis_yap', el: <Satis /> },
  { to: '/satis-gecmisi', label: '📋 Satış Geçmişi', yetki: 'satis_gecmisi_goruntule', el: <SatisGecmisi /> },
  { to: '/urunler', label: '📦 Ürünler', yetki: 'urun_goruntule', el: <Urunler /> },
  { to: '/stok', label: '📊 Stok', yetki: 'stok_goruntule', el: <Stok /> },
  { to: '/online-siparisler', label: '🛍️ Online Siparişler', yetki: 'online_siparis_goruntule', el: <OnlineSiparisler /> },
  { to: '/raporlar', label: '📈 Raporlar', yetki: 'rapor_goruntule', el: <Raporlar /> },
  { to: '/musteriler', label: '👥 Müşteriler', yetki: 'musteri_goruntule', el: <Musteriler /> },
  { to: '/kargo', label: '📦 Kargo', yetki: 'kargo_yonet', el: <Kargo /> },
  { to: '/ayarlar', label: '⚙️ Ayarlar', yetki: 'ayarlar_duzenle', el: <Ayarlar /> },
  { to: '/kullanicilar', label: '🔑 Kullanıcılar', yetki: 'kullanici_yonetimi', el: <Kullanicilar /> },
]

const ROL_ETIKET = { super_admin: 'Süper Yönetici', yonetici: 'Yönetici', personel: 'Personel', ozel: 'Özel' }

function Uygulama() {
  const { profil, cikis, yetkiVar } = useAuth()
  const erisilebilir = navItems.filter(i => yetkiVar(i.yetki))
  const ilkSayfa = erisilebilir[0]?.to || '/'
  const [surum, setSurum] = useState('')
  useEffect(() => { uygulamaApi.surum().then(setSurum).catch(() => {}) }, [])
  // Girişten sonra ayarları buluttan çek (PC'ler arası senkron).
  useEffect(() => { buluttanAl().catch(err => console.error('Ayar senkron (çekme):', err.message)) }, [])

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
                {item.label}
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
          <Suspense fallback={<div className="p-8 text-center text-gray-400">Yükleniyor…</div>}>
            <Routes>
              {erisilebilir.map(item => (
                <Route key={item.to} path={item.to === '/' ? '/' : item.to} element={item.el} />
              ))}
              <Route path="*" element={<Navigate to={ilkSayfa} replace />} />
            </Routes>
          </Suspense>
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
    <GuncellemeKapisi>
      <AuthProvider>
        <Kapi />
        <Toaster position="top-right" />
      </AuthProvider>
    </GuncellemeKapisi>
  )
}
