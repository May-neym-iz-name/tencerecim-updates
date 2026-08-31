-- Fatura altsistemi yetki kodları.
-- MEVCUT Supabase projesinde Kullanıcılar > "Özel" rolde toggle olarak çıkması için
-- bu dosyayı Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).
--
-- Not: yonetici / süper yönetici bu yetkileri ZATEN otomatik alır; bu ekleme
-- yalnızca "Özel" rollü kullanıcılara tek tek izin vermek (ve listede görmek) içindir.

insert into public.yetki_kodlari (kod, ad, grup) values
  ('fatura_stok_goruntule', 'Fatura stoğunu görüntüle', 'Fatura'),
  ('fatura_stok_duzenle', 'Alış faturası gir / fatura stoğu düzelt', 'Fatura'),
  ('fatura_kes', 'Siparişe fatura kes', 'Fatura')
on conflict (kod) do nothing;
