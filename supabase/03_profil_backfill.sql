-- ============================================================
-- Eksik profilleri doldurur (trigger'dan ÖNCE oluşturulmuş hesaplar için).
-- KULLANIM: Supabase Dashboard → SQL Editor → yapıştır → Run.
-- Tekrar çalıştırılması güvenlidir (sadece eksikleri ekler).
-- ============================================================

insert into public.profiles (id, email, ad, rol, izinli_lokasyonlar)
select
  u.id,
  u.email,
  split_part(u.email, '@', 1),
  case when lower(u.email) = 'info@resiftencerecim.com' then 'super_admin' else 'personel' end,
  case when lower(u.email) = 'info@resiftencerecim.com' then null else array[]::int[] end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- info@resiftencerecim.com her durumda süper yönetici olsun
update public.profiles
set rol = 'super_admin', izinli_lokasyonlar = null, aktif = true
where lower(email) = 'info@resiftencerecim.com';

-- Kontrol: profilleri listele
select email, rol, aktif from public.profiles order by email;
