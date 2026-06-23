-- ============================================================
-- UYGULAMA AYAR SENKRONU
-- Ayarları PC'ler arasında senkronlar. Küçük tutulur: her ayar grubu
-- tek bir satır (jsonb). En fazla ~5 satır → Supabase'i şişirmez.
-- Büyük operasyonel veri (ürün/satış/stok/sipariş) burada TUTULMAZ.
-- ============================================================

create table if not exists public.uygulama_ayarlar (
  anahtar text primary key,            -- 'ups' | 'ikas' | 'gonderici' | 'lokasyon_ikas' | 'genel'
  deger jsonb not null default '{}',
  guncelleme timestamptz not null default now()
);

alter table public.uygulama_ayarlar enable row level security;

-- Giriş yapmış herkes okuyabilir/yazabilir (tek mağaza ekibi).
drop policy if exists uygulama_ayarlar_select on public.uygulama_ayarlar;
create policy uygulama_ayarlar_select on public.uygulama_ayarlar
  for select to authenticated using (true);

drop policy if exists uygulama_ayarlar_upsert on public.uygulama_ayarlar;
create policy uygulama_ayarlar_upsert on public.uygulama_ayarlar
  for insert to authenticated with check (true);

drop policy if exists uygulama_ayarlar_update on public.uygulama_ayarlar;
create policy uygulama_ayarlar_update on public.uygulama_ayarlar
  for update to authenticated using (true) with check (true);
