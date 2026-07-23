-- Bildirim merkezi yetkisi: "Özel" rolde toggle görünmesi için yetki_kodlari'na eklenir.
-- Kurulum: Supabase SQL editöründe çalıştır (bkz. supabase/KURULUM.md).
-- Not: kategori/ad kolonlarını mevcut satırlara bakarak uyarlayın; aşağıdaki
-- INSERT var olan şemadaki kolon adlarıyla eşleşmelidir.
insert into yetki_kodlari (kod, ad, kategori)
values ('bildirim_goruntule', 'Bildirimleri Görüntüle', 'Siparişler')
on conflict (kod) do nothing;
