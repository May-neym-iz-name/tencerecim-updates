-- Ön sipariş yetkisi: stok düşürmeden peşin ödemeli satış alma.
-- "Özel" rolde toggle çıkması için bu kaydın Supabase'de bulunması ŞART.
insert into public.yetki_kodlari (kod, ad, grup) values
  ('on_siparis_yap', 'Ön sipariş alma (stok düşmeden satış)', 'Satış')
on conflict (kod) do nothing;
