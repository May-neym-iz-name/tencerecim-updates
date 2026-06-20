import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Satis from './pages/Satis.jsx'
import Urunler from './pages/Urunler.jsx'
import Stok from './pages/Stok.jsx'
import StokSayim from './pages/StokSayim.jsx'
import Musteriler from './pages/Musteriler.jsx'
import Ayarlar from './pages/Ayarlar.jsx'
import SatisGecmisi from './pages/SatisGecmisi.jsx'

const navItems = [
  { to: '/', label: '🛒 Satış', end: true },
  { to: '/satis-gecmisi', label: '📋 Satış Geçmişi' },
  { to: '/urunler', label: '📦 Ürünler' },
  { to: '/stok', label: '📊 Stok' },
  { to: '/stok-sayim', label: '🔢 Stok Sayım' },
  { to: '/musteriler', label: '👥 Müşteriler' },
  { to: '/ayarlar', label: '⚙️ Ayarlar' },
]

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <nav className="w-52 bg-gray-900 text-white flex flex-col flex-shrink-0">
          <div className="px-4 py-4 border-b border-gray-700">
            <h1 className="text-base font-bold text-white">🏪 Tencerecim</h1>
            <p className="text-xs text-gray-400 mt-0.5">Mağaza Yönetim Sistemi</p>
          </div>
          <div className="flex-1 py-2">
            {navItems.map(item => (
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
<div className="px-4 py-2 border-t border-gray-700">
            <p className="text-xs text-gray-500">v1.0.0</p>
          </div>
        </nav>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Satis />} />
            <Route path="/urunler" element={<Urunler />} />
            <Route path="/stok" element={<Stok />} />
            <Route path="/stok-sayim" element={<StokSayim />} />
            <Route path="/satis-gecmisi" element={<SatisGecmisi />} />
            <Route path="/musteriler" element={<Musteriler />} />
            <Route path="/ayarlar" element={<Ayarlar />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </HashRouter>
  )
}
