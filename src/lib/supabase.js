import { createClient } from '@supabase/supabase-js'

// Supabase publishable (istemci) anahtarı — RLS ile korunur, istemciye gömülmesi normaldir.
const SUPABASE_URL = 'https://lnyvgrintrvjbdtzicys.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hplEuxLZ7ZwSWx9pWhLS1A_Fwov7M0a'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Oturum kalıcı olmasın: her açılışta giriş ekranı gelir.
    // "Beni hatırla" sadece e-posta+şifreyi doldurur (main process safeStorage).
    persistSession: false,
    autoRefreshToken: true,
  },
})
