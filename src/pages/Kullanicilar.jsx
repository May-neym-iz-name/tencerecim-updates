import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { lokasyonApi } from '../api/ipc'
import { yetkiVar } from '../auth/izinler'

const ROLLER = [
  { kod: 'super_admin', ad: 'Süper Yönetici' },
  { kod: 'yonetici', ad: 'Yönetici' },
  { kod: 'personel', ad: 'Personel' },
  { kod: 'ozel', ad: 'Özel (elle ayarla)' },
]

export default function Kullanicilar() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [yetkiKodlari, setYetkiKodlari] = useState([])
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [secili, setSecili] = useState(null)   // düzenlenen profil (kopya)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      const [{ data: profiller, error }, { data: kodlar }, lokler] = await Promise.all([
        supabase.from('profiles').select('*').order('email'),
        supabase.from('yetki_kodlari').select('*'),
        lokasyonApi.listele(),
      ])
      if (error) throw new Error(error.message)
      setKullanicilar(profiller || [])
      setYetkiKodlari(kodlar || [])
      setLokasyonlar(lokler || [])
    } catch (e) { toast.error('Yüklenemedi: ' + e.message) }
    setYukleniyor(false)
  }, [])

  useEffect(() => { yukle() }, [yukle])

  function sec(p) {
    setSecili({ ...p, izinler: p.izinler || {}, izinli_lokasyonlar: p.izinli_lokasyonlar || [] })
  }

  const tumLokasyonlar = !secili?.izinli_lokasyonlar || secili.izinli_lokasyonlar.length === 0

  function lokasyonDegistir(id, checked) {
    setSecili(s => {
      const mevcut = new Set(s.izinli_lokasyonlar || [])
      if (checked) mevcut.add(id); else mevcut.delete(id)
      return { ...s, izinli_lokasyonlar: [...mevcut] }
    })
  }

  function yetkiDegistir(kod, checked) {
    setSecili(s => ({ ...s, izinler: { ...s.izinler, [kod]: checked } }))
  }

  function rolVarsayilaninaDon() {
    setSecili(s => ({ ...s, izinler: {} }))
    toast.success('Yetkiler rol varsayılanına döndürüldü')
  }

  async function kaydet() {
    if (!secili) return
    setKaydediliyor(true)
    try {
      const { error } = await supabase.from('profiles').update({
        ad: secili.ad,
        rol: secili.rol,
        aktif: secili.aktif,
        izinli_lokasyonlar: secili.izinli_lokasyonlar,
        izinler: secili.izinler,
      }).eq('id', secili.id)
      if (error) throw new Error(error.message)
      toast.success('Kaydedildi')
      yukle()
    } catch (e) { toast.error('Kaydedilemedi: ' + e.message) }
    setKaydediliyor(false)
  }

  // Yetki kodlarını gruplara ayır
  const gruplar = yetkiKodlari.reduce((acc, y) => {
    (acc[y.grup] = acc[y.grup] || []).push(y); return acc
  }, {})

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol: kullanıcı listesi */}
      <div className="w-72 border-r bg-white flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b">
          <h2 className="font-bold text-gray-800">Kullanıcılar</h2>
          <p className="text-xs text-gray-500">Yeni hesap Supabase panelinden açılır</p>
        </div>
        <div className="flex-1 overflow-auto">
          {yukleniyor && <p className="p-4 text-sm text-gray-400">Yükleniyor...</p>}
          {kullanicilar.map(k => (
            <button key={k.id} onClick={() => sec(k)}
              className={`w-full text-left px-4 py-2.5 border-b hover:bg-blue-50 ${secili?.id === k.id ? 'bg-blue-50' : ''}`}>
              <div className="text-sm font-medium text-gray-800 truncate">{k.ad || k.email}</div>
              <div className="text-xs text-gray-500 truncate">{k.email}</div>
              <div className="flex gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {ROLLER.find(r => r.kod === k.rol)?.ad || k.rol}
                </span>
                {!k.aktif && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Pasif</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sağ: düzenleme */}
      <div className="flex-1 overflow-auto p-6">
        {!secili && <p className="text-gray-400">Düzenlemek için soldan bir kullanıcı seçin.</p>}
        {secili && (
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-1">{secili.email}</h3>

            <div className="grid grid-cols-2 gap-4 mb-5 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Görünen Ad</label>
                <input value={secili.ad || ''} onChange={e => setSecili(s => ({ ...s, ad: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={secili.rol} onChange={e => setSecili(s => ({ ...s, rol: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  {ROLLER.map(r => <option key={r.kod} value={r.kod}>{r.ad}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 mb-5 text-sm cursor-pointer">
              <input type="checkbox" checked={!!secili.aktif} onChange={e => setSecili(s => ({ ...s, aktif: e.target.checked }))}
                className="w-4 h-4" />
              Hesap aktif (kapatılırsa giriş yapamaz)
            </label>

            {/* Lokasyonlar */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Erişebileceği Mağazalar</label>
              <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tumLokasyonlar}
                  onChange={e => setSecili(s => ({ ...s, izinli_lokasyonlar: e.target.checked ? [] : lokasyonlar.map(l => l.id) }))}
                  className="w-4 h-4" />
                Tüm mağazalar
              </label>
              {!tumLokasyonlar && (
                <div className="flex flex-wrap gap-3 pl-6">
                  {lokasyonlar.map(l => (
                    <label key={l.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input type="checkbox" checked={secili.izinli_lokasyonlar.includes(l.id)}
                        onChange={e => lokasyonDegistir(l.id, e.target.checked)} className="w-4 h-4" />
                      {l.ad}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Yetkiler */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Yetkiler</label>
                <button onClick={rolVarsayilaninaDon} className="text-xs text-blue-600 hover:underline">
                  Rol varsayılanına dön
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(gruplar).map(([grup, kodlar]) => (
                  <div key={grup} className="border rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">{grup}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {kodlar.map(y => (
                        <label key={y.kod} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={yetkiVar(secili, y.kod)}
                            onChange={e => yetkiDegistir(y.kod, e.target.checked)}
                            disabled={secili.rol === 'super_admin'} className="w-4 h-4" />
                          <span className={secili.rol === 'super_admin' ? 'text-gray-400' : ''}>{y.ad}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {secili.rol === 'super_admin' && (
                <p className="text-xs text-gray-400 mt-2">Süper yönetici her zaman tüm yetkilere sahiptir.</p>
              )}
            </div>

            <button onClick={kaydet} disabled={kaydediliyor}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg">
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
