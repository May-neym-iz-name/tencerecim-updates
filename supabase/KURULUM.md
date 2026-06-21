# Supabase Kurulum Adımları

> Proje: **tencerecim-magaza** (Frankfurt). Aşağıdaki adımları sırayla yap.

## 1. API anahtarlarını al (bana gönder)
Supabase Dashboard → **Project Settings (⚙️) → API**:
- **Project URL** (örn: `https://xxxx.supabase.co`)
- **anon public** anahtarı (uzun bir metin)

Bu ikisini bana ver — uygulamaya bunları gömeceğim.

⚠️ **service_role** anahtarını ASLA paylaşma/uygulamaya koyma. O sadece sunucu içindir.

## 2. Kayıt olmayı kapat (sadece yönetici kullanıcı açsın)
Authentication → **Sign In / Up → Email** sağlayıcısı:
- E-posta (Email) açık olsun
- **"Allow new users to sign up"** seçeneğini **KAPAT** (dışarıdan kimse kayıt olamasın)

## 3. Yetki şemasını çalıştır
SQL Editor → **New query** → `01_auth_rbac.sql` dosyasının içeriğini yapıştır → **Run**.
(Bu dosya bu klasörde. Kullanıcıları oluşturmadan ÖNCE çalıştır.)

## 4. Kullanıcı hesaplarını oluştur
Authentication → **Users → Add user**. Her birinde **"Auto Confirm User"** işaretle:

| E-posta | Rol (otomatik/sonra ayarlanır) |
|---------|-------------------------------|
| `info@resiftencerecim.com` | **Süper yönetici** (otomatik atanır) |
| `info@tencerecim.store` | Yönetici (uygulamadan yetki verilecek) |
| `golcukmagaza@tencerecim.store` | Gölcük personeli (uygulamadan yetki verilecek) |

Şifreleri sen belirle. (İstediğin kadar kullanıcı sonradan eklenebilir.)

## 5. Kontrol
Table Editor → **profiles** tablosunda 3 satır görünmeli ve
`info@resiftencerecim.com` satırının `rol` değeri **super_admin** olmalı.

---

Bunlar bitince **Project URL + anon key**'i bana ver; uygulamaya giriş ekranı,
"beni hatırla", yetki sistemi ve veri senkronunu kodlayacağım.
