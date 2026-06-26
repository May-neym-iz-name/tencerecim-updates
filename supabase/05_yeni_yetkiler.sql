-- v1.2.53–55 ile eklenen modüllerin yetki kodları.
-- MEVCUT Supabase projesinde Kullanıcılar > "Özel" rolde toggle olarak çıkması için
-- bu dosyayı Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).
--
-- Not: yonetici / süper yönetici bu yetkileri ZATEN otomatik alır; bu ekleme
-- yalnızca "Özel" rollü kullanıcılara tek tek izin vermek (ve listede görmek) içindir.

insert into public.yetki_kodlari (kod, ad, grup) values
  ('kasa_kullan','Kasa/vardiya açma-kapatma','Kasa'),
  ('gider_yonet','Gider ekleme/yönetme','Yönetim'),
  ('mal_kabul_yonet','Mal kabul (stok girişi) yapma','Stok')
on conflict (kod) do nothing;
