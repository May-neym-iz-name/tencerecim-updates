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

## 3. SQL şemalarını çalıştır (SIRAYLA)
SQL Editor → **New query** → her dosyanın içeriğini yapıştır → **Run** (bu klasördeki dosyalar):
1. `01_auth_rbac.sql` — yetki/rol şeması (kullanıcılardan ÖNCE)
2. `04_ayar_senk.sql` — ayar senkronu tablosu
3. `05_yeni_yetkiler.sql` — yeni modül yetki kodları (kasa/gider/mal kabul)
4. `06_veri_senk.sql` — **çok-PC veri senkronu tablosu (ürün/müşteri/stok/satış/kasa/gider/mal kabul). Bu olmadan PC'ler arası veri senkronu çalışmaz.**

> (`03_profil_backfill.sql` yalnızca mevcut kullanıcıları geriye dönük profillemek için; gerekiyorsa çalıştır.)
> Tüm dosyalar tekrar çalıştırılabilir (idempotent) — güvenli.

## 4. Kullanıcı hesaplarını oluştur
Authentication → **Users → Add user**. Her birinde **"Auto Confirm User"** işaretle:

| E-posta | Rol (otomatik/sonra ayarlanır) |
|---------|-------------------------------
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
