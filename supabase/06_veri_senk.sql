-- ============================================================
-- ÇOK-PC VERİ SENKRONU (operasyonel veri aynası)
-- Tek genel tablo: her senkron satırı (tablo, senk_id) anahtarıyla tutulur.
-- veri = jsonb (satırın alanları + FK'lar senk_id olarak). Küçük metin/sayı —
-- Supabase'i şişirmez. Bu SQL'i Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

create table if not exists public.senk_kayitlar (
  tablo text not null,
  senk_id text not null,
  veri jsonb not null,
  guncelleme text not null,           -- yerel UTC ms ISO (kaynak PC üretir)
  yuklenme timestamptz not null default now(),
  primary key (tablo, senk_id)
);

-- Pull imleci yuklenme'ye göre ilerler → sıralı çekim için indeks.
create index if not exists idx_senk_kayitlar_yuklenme on public.senk_kayitlar (yuklenme);

alter table public.senk_kayitlar enable row level security;

drop policy if exists senk_kayitlar_select on public.senk_kayitlar;
create policy senk_kayitlar_select on public.senk_kayitlar
  for select to authenticated using (true);

drop policy if exists senk_kayitlar_insert on public.senk_kayitlar;
create policy senk_kayitlar_insert on public.senk_kayitlar
  for insert to authenticated with check (true);

drop policy if exists senk_kayitlar_update on public.senk_kayitlar;
create policy senk_kayitlar_update on public.senk_kayitlar
  for update to authenticated using (true) with check (true);
