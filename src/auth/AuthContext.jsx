import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { authApi } from '../api/ipc'
import { yetkiVar, lokasyonErisim, erisilebilirLokasyonlar } from './izinler'

const AuthContext = createContext(null)

function cevirHata(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'E-posta veya şifre hatalı'
  if (/email not confirmed/i.test(msg)) return 'E-posta henüz onaylanmamış'
  if (/network|fetch/i.test(msg)) return 'İnternet bağlantısı yok'
  return msg || 'Giriş yapılamadı'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)

  const giris = useCallback(async (email, sifre, beniHatirla) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: sifre })
    if (error) throw new Error(cevirHata(error.message))

    const { data: p, error: pErr } = await supabase
      .from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    if (pErr) throw new Error('Profil bilgisi alınamadı: ' + pErr.message)
    if (!p) {
      await supabase.auth.signOut()
      throw new Error('Hesabınızın profili bulunamadı. Yöneticinize başvurun (profil oluşturulmamış).')
    }
    if (!p.aktif) {
      await supabase.auth.signOut()
      throw new Error('Hesabınız pasif durumda. Yöneticinize başvurun.')
    }

    // Beni hatırla: e-posta+şifreyi şifreli sakla / temizle
    if (beniHatirla) await authApi.beniHatirlaKaydet(email.trim(), sifre).catch(() => {})
    else await authApi.beniHatirlaTemizle().catch(() => {})

    // Arka uca SADECE oturum jetonunu ver; rolü oradan Supabase'e sorup kendisi
    // öğrenecek. Hassas IPC'lerden ÖNCE yapılmalı.
    //
    // Hata YUTULMAZ: doğrulama başarısızsa arka uçta hiçbir yetki oluşmaz ve
    // kullanıcı ekranı görür ama her işlemde "yetkiniz yok" yer. Bunu sessizce
    // geçmek yerine girişi baştan reddediyoruz.
    const dogrulama = await authApi.profilAyarla(data.session?.access_token).catch(() => null)
    if (!dogrulama?.ok) {
      await supabase.auth.signOut()
      throw new Error(
        'Oturumunuz dogrulanamadi. Internet baglantinizi kontrol edip tekrar deneyin.',
      )
    }

    setUser(data.user)
    setProfil(p)
    return p
  }, [])

  const cikis = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    await authApi.profilTemizle().catch(() => {})
    setUser(null)
    setProfil(null)
  }, [])

  // Supabase access_token'ı ~1 saatte bir kendini tazeliyor (supabase-js
  // otomatik yapar) ama bu SADECE renderer'daki client'ı günceller — main
  // process'teki aktifJwt() haberdar olmaz. Haberdar edilmezse main'in
  // bellekteki jetonu ~1 saat sonra süresi dolar ve Fatura Stoğu gibi bulut
  // çağrısı yapan ekranlar "Oturumunuz sona erdi" hatası verir, kullanıcının
  // kurtarma yolu olmaz (çıkış yapıp tekrar girmek dışında). Bu dinleyici
  // TOKEN_REFRESHED (ve emniyet için SIGNED_IN) olayında girişteki aynı
  // profilAyarla çağrısını main'e tekrar yapar — girişteki akışın yerine
  // GEÇMEZ, ona ek çalışır. SIGNED_OUT'a dokunmuyoruz: cikis() zaten
  // profilTemizle üzerinden main'deki token'ı da temizliyor.
  useEffect(() => {
    const { data: dinleyici } = supabase.auth.onAuthStateChange((olay, session) => {
      if (olay !== 'TOKEN_REFRESHED' && olay !== 'SIGNED_IN') return
      if (!session?.access_token) return
      authApi.profilAyarla(session.access_token).catch(() => {
        // Sessizce yut: bir sonraki hassas işlemde "yetkiniz yok" ya da
        // "oturum bulunamadı" olarak zaten yüzeye çıkar, kullanıcıyı burada
        // ayrıca uyarmak (girişten bağımsız arka plan olayı) gürültü olur.
      })
    })
    return () => dinleyici?.subscription?.unsubscribe()
  }, [])

  // Bu üç fonksiyon Satis.jsx/App.jsx gibi yerlerde useEffect/useCallback BAĞIMLILIĞI olarak
  // kullanılıyor. Memoize edilmezse her render'da yeni referans üretir → ya effect'ler gereksiz
  // yeniden kurulur ya da bağımlılık listeden çıkarılıp stale closure riski doğar.
  const yetkiVarFn = useCallback((kod) => yetkiVar(profil, kod), [profil])
  const lokasyonErisimFn = useCallback((id) => lokasyonErisim(profil, id), [profil])
  const erisilebilirLokasyonlarFn = useCallback(
    (lokasyonlar) => erisilebilirLokasyonlar(profil, lokasyonlar), [profil])

  // value nesnesi de memoize: aksi halde useAuth() kullanan TÜM bileşenler
  // AuthProvider her render olduğunda gereksiz yere yeniden render olur.
  const value = useMemo(() => ({
    user,
    profil,
    girisYapildi: !!profil,
    giris,
    cikis,
    yetkiVar: yetkiVarFn,
    lokasyonErisim: lokasyonErisimFn,
    erisilebilirLokasyonlar: erisilebilirLokasyonlarFn,
  }), [user, profil, giris, cikis, yetkiVarFn, lokasyonErisimFn, erisilebilirLokasyonlarFn])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
