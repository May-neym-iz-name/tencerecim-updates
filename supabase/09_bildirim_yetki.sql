-- Bildirim merkezi yetkisi: "Özel" rolde toggle görünmesi için yetki_kodlari'na eklenir.
-- Kurulum: Supabase SQL editöründe çalıştır (bkz. supabase/KURULUM.md).
-- Şema: yetki_kodlari(kod text, ad text, grup text). Kolon adı "kategori" DEĞİL "grup" —
-- bu dosya 2026-07-29'a kadar "kategori" yazdığı için çalıştırılamıyordu (42703).
-- Grup adı mevcut satırlarla tutarlı olmalı: online_siparis_goruntule "Satış" grubunda.
insert into yetki_kodlari (kod, ad, grup)
values ('bildirim_goruntule', 'Bildirimleri görüntüleme', 'Satış')
on conflict (kod) do nothing;
