-- v1.2.204: Kampanya sekmesi yetkisi. "Özel" rolde toggle olarak çıkması için Supabase
-- SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).
-- Personel varsayılanı KAPALI: kampanya kaydetmek ikas'ta tüm müşterilere etki eder.
-- Kupon GÖNDERMEK ayrı (sosyal_medya_yonet) — temsilci havuzdan kupon verebilir.
insert into public.yetki_kodlari (kod, ad, grup) values
  ('kampanya_yonet','Kampanya ve kupon tanımlama (ikas)','Kampanya')
on conflict (kod) do nothing;
