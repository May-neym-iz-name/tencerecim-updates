-- v1.2.111: Sosyal medya + otomasyon yetki kodları.
-- MEVCUT Supabase projesinde Kullanıcılar > "Özel" rolde toggle olarak çıkması için
-- bu dosyayı Supabase SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).
--
-- Neden gerekli: 'sosyal_medya_yonet' kodu bugüne kadar bu tabloda HİÇ yoktu — yani
-- "Özel" rollü bir kullanıcıya sosyal medya yetkisi vermenin yolu yoktu (toggle listede
-- çıkmıyordu). Kod uygulamada kullanılıyordu ama burada kayıtlı değildi.
--
-- 'sosyal_otomasyon_yonet' AYRI bir yetki: otomasyon tek tıkla yüzlerce kişiye DM gönderir
-- (canlı ölçümde 208+ kişi). Sosyal medyayı kullanmak ile toplu DM tetiklemek aynı şey değil.
-- Personel varsayılanı: sosyal_medya_yonet AÇIK, sosyal_otomasyon_yonet KAPALI.
-- (bkz. electron/yetki.js ve src/auth/izinler.js — PERSONEL_VARSAYILAN)
--
-- Not: yonetici / süper yönetici bu yetkileri ZATEN otomatik alır; bu ekleme
-- yalnızca "Özel" rollü kullanıcılara tek tek izin vermek (ve listede görmek) içindir.

insert into public.yetki_kodlari (kod, ad, grup) values
  ('sosyal_medya_yonet','Sosyal medya (yorum/DM görüntüleme ve cevaplama)','Sosyal Medya'),
  ('sosyal_otomasyon_yonet','Otomatik yorum cevabı açma/kapatma ve şablon düzenleme','Sosyal Medya')
on conflict (kod) do nothing;
