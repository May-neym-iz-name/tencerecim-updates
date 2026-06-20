import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Urunler from './pages/Urunler.jsx'
import Satis from './pages/Satis.jsx'
import Musteriler from './pages/Musteriler.jsx'
import StokSayim from './pages/StokSayim.jsx'
import Stok from './pages/Stok.jsx'

const queryClient = new QueryClient()

const navItems = [
  { to: '/', label: '🛒 Satış', end: true },
  { to: '/urunler', label: '📦 Ürünler' },
  { to: '/stok', label: '📊 Stok' },
  { to: '/stok-sayim', label: '🔢 Stok Sayım' },
  { to: '/musteriler', label: '👥 Müşteriler' },
]

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          <nav className="w-48 bg-gray-900 text-white flex flex-col py-4">
            <div className="px-4 py-3 border-b border-gray-700 mb-4">
              <h1 className="text-lg font-bold">🏪 Tencerecim</h1>
            </div>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm transition-colors ${isActive ? 'bg-blue-600' : 'hover:bg-gray-700'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="flex-1 overflow-auto p-6">
            <Routes>
              <Route path="/" element={<Satis />} />
              <Route path="/urunler" element={<Urunler />} />
              <Route path="/stok" element={<Stok />} />
              <Route path="/stok-sayim" element={<StokSayim />} />
              <Route path="/musteriler" element={<Musteriler />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
