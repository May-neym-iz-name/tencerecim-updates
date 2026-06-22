import { createContext, useContext, useState, useCallback } from 'react'
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

    // Aktif profili arka uca bildir (backend yetki kontrolü). Hassas IPC'lerden önce yapılmalı.
    await authApi.profilAyarla({ rol: p.rol, izinler: p.izinler, izinli_lokasyonlar: p.izinli_lokasyonlar, aktif: p.aktif }).catch(() => {})

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

  const value = {
    user,
    profil,
    girisYapildi: !!profil,
    giris,
    cikis,
    yetkiVar: (kod) => yetkiVar(profil, kod),
    lokasyonErisim: (id) => lokasyonErisim(profil, id),
    erisilebilirLokasyonlar: (lokasyonlar) => erisilebilirLokasyonlar(profil, lokasyonlar),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı')
  return ctx
}
