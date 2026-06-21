import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api/ipc'
import logo from '../assets/logo.png'

export default function Giris() {
  const { giris } = useAuth()
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [beniHatirla, setBeniHatirla] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)

  // Açılışta hatırlanan e-posta+şifreyi giriş kutularına doldur
  useEffect(() => {
    authApi.beniHatirlaGetir().then(kayit => {
      if (kayit?.email) {
        setEmail(kayit.email)
        setSifre(kayit.sifre || '')
        setBeniHatirla(true)
      }
    }).catch(() => {})
  }, [])

  async function gonder(e) {
    e.preventDefault()
    if (!email.trim() || !sifre) { toast.error('E-posta ve şifre girin'); return }
    setYukleniyor(true)
    try {
      const p = await giris(email, sifre, beniHatirla)
      toast.success(`Hoş geldiniz, ${p.ad || p.email}`)
    } catch (err) {
      toast.error(err.message)
    }
    setYukleniyor(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700">
      <form onSubmit={gonder} className="bg-white rounded-2xl shadow-2xl p-8 w-96">
        <div className="text-center mb-6">
          <img src={logo} alt="Tencerecim" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-xl font-bold text-gray-800">Tencerecim</h1>
          <p className="text-sm text-gray-500">Mağaza Yönetim Sistemi</p>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus
          className="w-full border rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="ornek@tencerecim.store" />

        <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
        <input type="password" value={sifre} onChange={e => setSifre(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="••••••••" />

        <label className="flex items-center gap-2 mb-5 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={beniHatirla} onChange={e => setBeniHatirla(e.target.checked)}
            className="w-4 h-4 rounded" />
          Beni hatırla
        </label>

        <button type="submit" disabled={yukleniyor}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
          {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  )
}
