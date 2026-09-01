-- ============================================================
-- Faz 2 / Task 9: fatura stoğu AÇILIŞ BAKİYESİ (Bizimhesap'tan tohumlama).
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md
--
-- NEDEN GEREKLİ: fatura stoğu sıfırdan başlarsa Faz 2 açıldığı gün HER ürün
-- "fatura stoğu yok" diye kilitlenir ve hiçbir siparişe fatura kesilemez.
-- Kullanıcının alış faturaları zaten Bizimhesap'ta; açılış oradan alınır.
--
-- KAYNAK KARARI (01.09.2026, kullanıcı): Bizimhesap rakamı. Bizimhesap stoğu
-- = (faturayla giren mal) − (faturayla çıkan mal); fişle yapılan mağaza satışı
-- oraya çıkış yazmadığı için uygulamadaki fiziksel stoktan yüksek (3.454 / 1.589).
-- Fatura stoğu kâğıt izini takip ettiği için doğru başlangıç budur.
--
-- UYARI: `exception when` bloğu EKLEME (savepoint yutması → yarım tohumlama).
-- SECURITY INVOKER (varsayılan): RLS devrede kalsın.
-- ============================================================

-- 'tohumlama' yeni bir hareket tipi: denetim izinde alış faturasından ve elle
-- düzeltmeden AYRILABİLMELİ (yoksa "bu bakiye nereden geldi" sorusu cevapsız kalır).
alter table fatura_stok_hareketler drop constraint if exists fatura_stok_hareketler_kaynak_tip_check;
alter table fatura_stok_hareketler add constraint fatura_stok_hareketler_kaynak_tip_check
  check (kaynak_tip in
    ('alis_faturasi','satis_faturasi','duzeltme','iade','telafi','tohumlama'));

-- Açılış bakiyesini yazar. p_kalemler: [{urun_senk_id, miktar}]
--
-- İDEMPOTENT: yalnız fatura_stok satırı HİÇ OLMAYAN ürüne yazar. İkinci çalıştırma
-- hiçbir bakiyeyi ikiye katlamaz; alış faturasıyla ya da elle düzeltmeyle bakiyesi
-- oluşmuş ürüne de DOKUNMAZ (gerçek hareket, tahmini açılıştan üstündür).
create or replace function fatura_stok_tohumla(
  p_kalemler jsonb,
  p_kullanici text
) returns jsonb
language plpgsql
set search_path = 'public'
as $$
declare
  v_kalem record;
  v_etkilenen int;
  v_yazilan int := 0;
  v_atlanan int := 0;
  v_toplam_adet bigint := 0;
begin
  if p_kalemler is null or jsonb_typeof(p_kalemler) <> 'array' then
    raise exception 'KALEM_YOK: tohumlanacak kalem listesi geçersiz';
  end if;

  for v_kalem in
    select (k->>'urun_senk_id')::uuid as urun_senk_id,
           (k->>'miktar')::int        as miktar
      from jsonb_array_elements(p_kalemler) k
     order by 1                       -- deadlock koruması: diğer RPC'lerle aynı sıra
  loop
    -- Sıfır/negatif açılış yazmanın anlamı yok: satır açmadan atla. (Sıfır satır
    -- açmak, sonraki gerçek alış faturasının bakiyesini bozmaz ama denetim izini
    -- anlamsız satırlarla şişirir.)
    if v_kalem.miktar is null or v_kalem.miktar <= 0 then
      v_atlanan := v_atlanan + 1;
      continue;
    end if;

    insert into fatura_stok (urun_senk_id, miktar)
    values (v_kalem.urun_senk_id, v_kalem.miktar)
    on conflict (urun_senk_id) do nothing;

    get diagnostics v_etkilenen = row_count;
    if v_etkilenen = 0 then
      -- Bakiye zaten var: tohumlama onu EZMEZ.
      v_atlanan := v_atlanan + 1;
      continue;
    end if;

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (v_kalem.urun_senk_id, v_kalem.miktar, 'tohumlama', null,
            'Bizimhesap açılış bakiyesi', p_kullanici);

    v_yazilan := v_yazilan + 1;
    v_toplam_adet := v_toplam_adet + v_kalem.miktar;
  end loop;

  return jsonb_build_object('yazilan', v_yazilan, 'atlanan', v_atlanan, 'toplam_adet', v_toplam_adet);
end;
$$;

revoke execute on function fatura_stok_tohumla(jsonb, text) from anon, public;
grant execute on function fatura_stok_tohumla(jsonb, text) to authenticated;
