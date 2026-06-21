-- ============================================================
-- Uygulama ayarları (her iki mağazada ortak iş kuralları).
-- KULLANIM: Supabase Dashboard → SQL Editor → yapıştır → Run.
-- ============================================================

create table if not exists public.ayarlar (
  anahtar text primary key,
  deger jsonb not null,
  guncelleme timestamptz not null default now()
);

-- Varsayılan ayarlar
insert into public.ayarlar (anahtar, deger) values
  ('musteri_zorunlu', 'false'::jsonb),   -- müşteri seçmeden satış yapılamasın mı?
  ('iskonto_tipi', '"oran"'::jsonb)       -- 'oran' (%) | 'tutar' (₺)
on conflict (anahtar) do nothing;

-- Yönetici/süper yönetici mi? (ayar yazma izni için)
create or replace function public.yonetici_mi()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select rol in ('super_admin','yonetici') from public.profiles
                   where id = auth.uid() and aktif = true), false)
$$;

alter table public.ayarlar enable row level security;

-- Giriş yapan herkes ayarları okuyabilir
drop policy if exists ayarlar_select on public.ayarlar;
create policy ayarlar_select on public.ayarlar
  for select to authenticated using (true);

-- Sadece yönetici/süper yönetici yazabilir
drop policy if exists ayarlar_insert on public.ayarlar;
create policy ayarlar_insert on public.ayarlar
  for insert to authenticated with check (public.yonetici_mi());

drop policy if exists ayarlar_update on public.ayarlar;
create policy ayarlar_update on public.ayarlar
  for update to authenticated using (public.yonetici_mi()) with check (public.yonetici_mi());
