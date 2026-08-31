-- ============================================================
-- Faz 2: fatura kesme sahiplenmesi + fatura stoğu düşümü, TEK transaction.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md §⑤
-- Mükerrer fatura uygulama kontrolüyle DEĞİL, UNIQUE kısıtıyla engellenir.
-- ============================================================

create or replace function fatura_kes_basla(
  p_kanal text,
  p_kanal_siparis_id text,
  p_kalemler jsonb,   -- [{urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam, set_senk_id}]
  p_kullanici text
) returns uuid
language plpgsql
as $$
declare
  v_fatura_id uuid;
  v_kalem jsonb;
  v_etkilenen int;
  v_toplam numeric(14,2) := 0;
begin
  -- 1) Sahiplen. UNIQUE(kanal, kanal_siparis_id) ihlali => 23505 => çağıran 'cakisma' görür.
  insert into kesilen_faturalar (kanal, kanal_siparis_id, durum, kullanici)
  values (p_kanal, p_kanal_siparis_id, 'kuyrukta', p_kullanici)
  returning senk_id into v_fatura_id;

  for v_kalem in select * from jsonb_array_elements(p_kalemler) loop
    -- 2) Koşullu düşüm: kontrol ve düşüm TEK ifadede.
    --    Ayrı SELECT + UPDATE yazılmaz — araya başka işlem girebilir.
    update fatura_stok
       set miktar = miktar - (v_kalem->>'miktar')::int,
           senk_guncelleme = now()
     where urun_senk_id = (v_kalem->>'urun_senk_id')::uuid
       and miktar >= (v_kalem->>'miktar')::int;

    get diagnostics v_etkilenen = row_count;
    if v_etkilenen = 0 then
      raise exception 'YETERSIZ_STOK: % (gereken %)',
        coalesce(v_kalem->>'urun_adi', v_kalem->>'urun_senk_id'), v_kalem->>'miktar';
    end if;

    insert into kesilen_fatura_kalemleri
      (kesilen_fatura_senk_id, urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam, set_senk_id)
    values (
      v_fatura_id,
      (v_kalem->>'urun_senk_id')::uuid,
      v_kalem->>'urun_adi',
      (v_kalem->>'miktar')::int,
      (v_kalem->>'birim_fiyat')::numeric,
      (v_kalem->>'kdv_orani')::int,
      (v_kalem->>'satir_toplam')::numeric,
      nullif(v_kalem->>'set_senk_id','')::uuid
    );

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (
      (v_kalem->>'urun_senk_id')::uuid,
      -((v_kalem->>'miktar')::int),
      'satis_faturasi',
      v_fatura_id,
      'Fatura ' || p_kanal || '/' || p_kanal_siparis_id,
      p_kullanici
    );

    v_toplam := v_toplam + (v_kalem->>'satir_toplam')::numeric;
  end loop;

  update kesilen_faturalar set toplam = v_toplam where senk_id = v_fatura_id;
  return v_fatura_id;
end;
$$;

revoke execute on function fatura_kes_basla(text, text, jsonb, text) from anon, public;
grant execute on function fatura_kes_basla(text, text, jsonb, text) to authenticated;

-- ============================================================
-- Fatura sağlayıcıda oluşmadığı KESİN olduğunda stoğu iade eder.
-- Ağ hatasında ÇAĞRILMAZ (sonuç belirsiz) — yalnız iş hatasında (ör. sağlayıcı
-- açıkça reddetti) çağrılır.
-- ============================================================
create or replace function fatura_kes_telafi(p_fatura_senk_id uuid, p_hata text)
returns void
language plpgsql
as $$
declare v_kalem record;
begin
  for v_kalem in
    select urun_senk_id, miktar from kesilen_fatura_kalemleri
     where kesilen_fatura_senk_id = p_fatura_senk_id
  loop
    update fatura_stok set miktar = miktar + v_kalem.miktar, senk_guncelleme = now()
     where urun_senk_id = v_kalem.urun_senk_id;

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama)
    values (v_kalem.urun_senk_id, v_kalem.miktar, 'telafi', p_fatura_senk_id,
            'Fatura başarısız, stok iade edildi');
  end loop;

  update kesilen_faturalar
     set durum = 'hata', hata_mesaji = p_hata
   where senk_id = p_fatura_senk_id;
end;
$$;

revoke execute on function fatura_kes_telafi(uuid, text) from anon, public;
grant execute on function fatura_kes_telafi(uuid, text) to authenticated;

-- ============================================================
-- kesilen_faturalar.durum için CHECK kısıtı — Faz 1'de bilerek ertelenmişti,
-- durum makinesi bu fazda netleşiyor.
-- ============================================================
alter table kesilen_faturalar drop constraint if exists kesilen_faturalar_durum_gecerli;
alter table kesilen_faturalar add constraint kesilen_faturalar_durum_gecerli
  check (durum in ('kuyrukta','saglayici_ok','pdf_alindi','pazaryeri_yuklendi','tamam','hata','belirsiz'));
