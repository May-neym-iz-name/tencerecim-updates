-- ============================================================
-- Tencerecim Mağaza — Supabase Kimlik Doğrulama + Yetkilendirme (RBAC)
-- KULLANIM: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run.
-- ÖNEMLİ: Bu SQL'i, kullanıcı hesaplarını OLUŞTURMADAN ÖNCE çalıştırın
--         (trigger sayesinde kullanıcı eklenince profil otomatik açılır).
-- ============================================================

-- 1) PROFİL TABLOSU (auth.users'ı genişletir) -----------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  ad text,
  rol text not null default 'personel'
    check (rol in ('super_admin','yonetici','personel','ozel')),
  izinli_lokasyonlar int[],                      -- null/boş = TÜM lokasyonlar
  izinler jsonb not null default '{}'::jsonb,     -- granüler izin override'ları {kod: true/false}
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) YETKİ KODLARI (uygulamadaki izin editörü bunları listeler) -
create table if not exists public.yetki_kodlari (
  kod text primary key,
  ad text not null,
  grup text
);

insert into public.yetki_kodlari (kod, ad, grup) values
  ('satis_yap','Satış yapma','Satış'),
  ('satis_gecmisi_goruntule','Satış geçmişini görüntüleme','Satış'),
  ('satis_iptal','Satış iptal etme','Satış'),
  ('urun_goruntule','Ürünleri görüntüleme','Ürün'),
  ('urun_duzenle','Ürün ekleme/düzenleme','Ürün'),
  ('urun_sil','Ürün silme','Ürün'),
  ('fiyat_degistir','Fiyat değiştirme','Ürün'),
  ('stok_goruntule','Stok görüntüleme','Stok'),
  ('stok_duzenle','Stok düzenleme','Stok'),
  ('stok_sayim','Stok sayımı yapma','Stok'),
  ('musteri_goruntule','Müşterileri görüntüleme','Müşteri'),
  ('musteri_duzenle','Müşteri ekleme/düzenleme','Müşteri'),
  ('musteri_sil','Müşteri silme','Müşteri'),
  ('rapor_goruntule','Raporları/ciroyu görüntüleme','Yönetim'),
  ('ayarlar_duzenle','Ayarları düzenleme','Yönetim'),
  ('excel_ice_aktar','Excel ile ürün içe aktarma','Yönetim'),
  ('kullanici_yonetimi','Kullanıcı ve yetki yönetimi','Yönetim')
on conflict (kod) do nothing;

-- 3) updated_at OTOMATİK GÜNCELLEME ---------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4) YENİ KULLANICI → OTOMATİK PROFİL -------------------------
--    info@resiftencerecim.com otomatik SÜPER YÖNETİCİ olur.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, email, ad, rol, izinli_lokasyonlar)
  values (
    new.id, new.email, split_part(new.email,'@',1),
    case when lower(new.email) = 'info@resiftencerecim.com' then 'super_admin' else 'personel' end,
    case when lower(new.email) = 'info@resiftencerecim.com' then null else array[]::int[] end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) YARDIMCI FONKSİYON: süper yönetici mi? -------------------
create or replace function public.super_admin_mi()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select rol = 'super_admin' from public.profiles
                   where id = auth.uid() and aktif = true), false)
$$;

-- 6) RLS (Row Level Security) ---------------------------------
alter table public.profiles enable row level security;
alter table public.yetki_kodlari enable row level security;

-- Giriş yapmış herkes yetki kodlarını okuyabilir
drop policy if exists yetki_kodlari_select on public.yetki_kodlari;
create policy yetki_kodlari_select on public.yetki_kodlari
  for select to authenticated using (true);

-- Kullanıcı kendi profilini görür; süper yönetici hepsini görür
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.super_admin_mi());

-- Profil ekleme/güncelleme/silme: SADECE süper yönetici
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (public.super_admin_mi());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.super_admin_mi()) with check (public.super_admin_mi());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated using (public.super_admin_mi());

-- ============================================================
-- BİTTİ. Şimdi Authentication → Users'tan kullanıcıları oluşturun
-- ("Auto Confirm User" işaretli). Profiller otomatik açılacak.
-- ============================================================
