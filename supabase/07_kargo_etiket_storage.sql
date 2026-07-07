-- Kargo etiketleri için Supabase Storage kurulumu.
-- Amaç: PC'ler arası etiket basımı. Etiket PNG'leri DB'yi (500MB limit) şişirmesin diye
-- AYRI Storage bucket'ında saklanır; DB'ye sadece minik dosya yolu (etiket_storage_yol) yazılır.
-- Saklama politikası: uygulama 5 aydan eski etiketleri otomatik siler (depo ~725MB'de sabit kalır).
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run.

-- 1) Özel bucket (public = false; sadece giriş yapmış kullanıcılar erişir).
insert into storage.buckets (id, name, public)
values ('kargo-etiketleri', 'kargo-etiketleri', false)
on conflict (id) do nothing;

-- 2) RLS politikaları: authenticated kullanıcılar bu bucket'ta CRUD yapabilir.
drop policy if exists "kargo_etiket_select" on storage.objects;
create policy "kargo_etiket_select" on storage.objects
  for select to authenticated using (bucket_id = 'kargo-etiketleri');

drop policy if exists "kargo_etiket_insert" on storage.objects;
create policy "kargo_etiket_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'kargo-etiketleri');

drop policy if exists "kargo_etiket_update" on storage.objects;
create policy "kargo_etiket_update" on storage.objects
  for update to authenticated using (bucket_id = 'kargo-etiketleri') with check (bucket_id = 'kargo-etiketleri');

drop policy if exists "kargo_etiket_delete" on storage.objects;
create policy "kargo_etiket_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'kargo-etiketleri');
