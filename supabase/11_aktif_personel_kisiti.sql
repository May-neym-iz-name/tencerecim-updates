-- ============================================================
-- GÜVENLİK: "authenticated" yetmez → "AKTİF PERSONEL" şartı
--
-- SORUN (2026-07-24 tespit): Kaynak repo PUBLIC olduğu için Supabase
-- publishable anahtarı ve proje URL'i herkesin elinde. Supabase'de kayıt
-- (sign-up) açıktı ve handle_new_user() her yeni kullanıcıya otomatik
-- 'personel' rolü + aktif=true veriyordu. RLS politikaları da yalnızca
-- `to authenticated using (true)` diyordu.
--
-- Sonuç: internetteki herhangi biri bir e-posta ile kayıt olup senk_kayitlar
-- içindeki TÜM ticari ve kişisel veriyi (müşteri telefon/TC/adres, satışlar,
-- alış fiyatları, tedarikçiler) okuyabilir — hatta değiştirebilirdi.
--
-- ÇÖZÜM (iki katman):
--   1) Yeni kayıtlar PASİF başlar → yönetici elle aktif eder
--   2) RLS "aktif profili olan kullanıcı" ister
--
-- Bu SQL Supabase SQL Editor'da bir kez çalıştırılır. (Canlı projede
-- 2026-07-24'te uygulandı; burada kayıt/tekrar kurulum amaçlı durur.)
--
-- AYRICA PANELDEN YAPILMALI: Authentication → Sign In / Providers →
-- "Allow new users to sign up" KAPAT. Bu SQL onsuz da korur, ama kapıyı
-- büsbütün kapatmak doğrusudur (derinlemesine savunma).
-- ============================================================

-- 1) Aktif personel kontrolü.
-- SECURITY DEFINER ŞART: politika içinden profiles'a bakmak RLS özyinelemesine
-- girerdi (mevcut super_admin_mi() ile aynı desen).
create or replace function public.aktif_personel_mi()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select aktif from public.profiles where id = auth.uid()), false)
$$;

-- Anonim çağrıya kapalı: giriş yapmamış birinin çağırması anlamsız.
revoke execute on function public.aktif_personel_mi() from anon, public;
grant execute on function public.aktif_personel_mi() to authenticated;

-- 2) Yeni kayıtlar PASİF başlar.
-- Süper admin e-postası istisna: ilk kurulumda sistem kilitlenmesin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, ad, rol, izinli_lokasyonlar, aktif)
  values (
    new.id, new.email, split_part(new.email,'@',1),
    case when lower(new.email) = 'info@resiftencerecim.com' then 'super_admin' else 'personel' end,
    case when lower(new.email) = 'info@resiftencerecim.com' then null else array[]::int[] end,
    case when lower(new.email) = 'info@resiftencerecim.com' then true else false end
  )
  on conflict (id) do nothing;
  return new;
end $function$;

-- 3) Veri politikaları: aktif personel şartı.
drop policy if exists senk_kayitlar_select on public.senk_kayitlar;
create policy senk_kayitlar_select on public.senk_kayitlar
  for select to authenticated using (public.aktif_personel_mi());

drop policy if exists senk_kayitlar_insert on public.senk_kayitlar;
create policy senk_kayitlar_insert on public.senk_kayitlar
  for insert to authenticated with check (public.aktif_personel_mi());

drop policy if exists senk_kayitlar_update on public.senk_kayitlar;
create policy senk_kayitlar_update on public.senk_kayitlar
  for update to authenticated using (public.aktif_personel_mi()) with check (public.aktif_personel_mi());

drop policy if exists uygulama_ayarlar_select on public.uygulama_ayarlar;
create policy uygulama_ayarlar_select on public.uygulama_ayarlar
  for select to authenticated using (public.aktif_personel_mi());

drop policy if exists uygulama_ayarlar_upsert on public.uygulama_ayarlar;
create policy uygulama_ayarlar_upsert on public.uygulama_ayarlar
  for insert to authenticated with check (public.aktif_personel_mi());

drop policy if exists uygulama_ayarlar_update on public.uygulama_ayarlar;
create policy uygulama_ayarlar_update on public.uygulama_ayarlar
  for update to authenticated using (public.aktif_personel_mi()) with check (public.aktif_personel_mi());

drop policy if exists yetki_kodlari_select on public.yetki_kodlari;
create policy yetki_kodlari_select on public.yetki_kodlari
  for select to authenticated using (public.aktif_personel_mi());

-- ============================================================
-- YENİ PERSONEL EKLEME (bundan sonra)
-- Kayıt olan hesap PASİF gelir; yönetici aktif etmeden veri göremez:
--   update public.profiles set aktif = true, izinli_lokasyonlar = array[1]
--   where email = 'yeni.personel@tencerecim.store';
-- ============================================================

-- ============================================================
-- EK SERTLEŞTİRME (aynı tarihte uygulandı)
-- SECURITY DEFINER fonksiyonlar anon tarafından RPC ile çağrılabiliyordu.
-- handle_new_user ve rls_auto_enable TRIGGER fonksiyonudur; dışarıdan
-- çağrılmaları gerekmez ve trigger olarak çalışmaları revoke'tan etkilenmez.
-- ============================================================
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

revoke execute on function public.super_admin_mi() from anon, public;
grant execute on function public.super_admin_mi() to authenticated;

-- search_path sabitlenmemiş fonksiyonlar: çağıran rolün search_path'ini
-- değiştirerek fonksiyonun hangi şemadaki nesneyi kullanacağını yönlendirmesi
-- mümkün olurdu.
alter function public.set_updated_at() set search_path to 'public';
alter function public.set_senk_yuklenme() set search_path to 'public';
