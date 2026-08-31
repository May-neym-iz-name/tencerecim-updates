-- ============================================================
-- Fatura alt sistemi. ASIL nüsha burada; yerel SQLite yalnız-çekme aynasıdır.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md
-- ============================================================

create table if not exists fatura_stok (
  senk_id uuid primary key default gen_random_uuid(),
  urun_senk_id uuid not null unique,
  miktar integer not null default 0,
  senk_guncelleme timestamptz not null default now()
);

create table if not exists fatura_stok_hareketler (
  senk_id uuid primary key default gen_random_uuid(),
  urun_senk_id uuid not null,
  miktar integer not null,                    -- + giriş, − çıkış
  kaynak_tip text not null check (kaynak_tip in
    ('alis_faturasi','satis_faturasi','duzeltme','iade','telafi')),
  kaynak_senk_id uuid,
  aciklama text,
  kullanici text,
  senk_guncelleme timestamptz not null default now()
);
create index if not exists idx_fatura_hareket_urun on fatura_stok_hareketler(urun_senk_id);

create table if not exists alis_faturalari (
  senk_id uuid primary key default gen_random_uuid(),
  tedarikci_senk_id uuid,
  fatura_no text not null,
  fatura_tarihi date not null,
  ara_toplam numeric(14,2) not null default 0,
  kdv_toplam numeric(14,2) not null default 0,
  genel_toplam numeric(14,2) not null default 0,
  mal_kabul_senk_id uuid,                     -- NULL olabilir: mal/fatura ayrı gelebilir
  notlar text,
  kullanici text,
  senk_guncelleme timestamptz not null default now(),
  -- Mükerrer alış faturasını engelle: tedarikci boş bile olsa fatura_no ile kontrol et
  unique nulls not distinct (tedarikci_senk_id, fatura_no)
);

create table if not exists alis_fatura_kalemleri (
  senk_id uuid primary key default gen_random_uuid(),
  alis_fatura_senk_id uuid not null references alis_faturalari(senk_id) on delete cascade,
  urun_senk_id uuid not null,
  urun_adi text,
  miktar integer not null,
  birim_fiyat numeric(14,2) not null,
  kdv_orani integer not null default 20,
  satir_toplam numeric(14,2) not null,
  senk_guncelleme timestamptz not null default now()
);

create table if not exists kesilen_faturalar (
  senk_id uuid primary key default gen_random_uuid(),
  kanal text not null,
  kanal_siparis_id text not null,
  belge_tipi text,
  belge_tipi_kaynak text default 'tahmin',
  saglayici text not null default 'bizimhesap',
  saglayici_guid text,
  saglayici_url text,
  fatura_no text,
  toplam numeric(14,2),
  durum text not null default 'kuyrukta',
  hata_mesaji text,
  tarih timestamptz not null default now(),
  senk_guncelleme timestamptz not null default now(),
  unique (kanal, kanal_siparis_id)            -- MÜKERRER FATURA ENGELİ
);

create table if not exists kesilen_fatura_kalemleri (
  senk_id uuid primary key default gen_random_uuid(),
  kesilen_fatura_senk_id uuid not null references kesilen_faturalar(senk_id) on delete cascade,
  urun_senk_id uuid not null,
  urun_adi text,
  miktar integer not null,
  birim_fiyat numeric(14,2) not null,
  kdv_orani integer not null default 20,
  satir_toplam numeric(14,2) not null,
  set_senk_id uuid,
  senk_guncelleme timestamptz not null default now()
);

-- Alış faturasını kalemleriyle birlikte kaydeder ve fatura stoğunu ARTIRIR.
-- kalemler: [{urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam}]
create or replace function alis_faturasi_kaydet(
  p_tedarikci_senk_id uuid,
  p_fatura_no text,
  p_fatura_tarihi date,
  p_mal_kabul_senk_id uuid,
  p_notlar text,
  p_kullanici text,
  p_kalemler jsonb
) returns uuid
language plpgsql
as $$
declare
  v_fatura_id uuid;
  v_kalem jsonb;
  v_ara numeric(14,2) := 0;
  v_kdv numeric(14,2) := 0;
  v_genel numeric(14,2) := 0;
  v_satir_kdv numeric(14,2);
begin
  insert into alis_faturalari
    (tedarikci_senk_id, fatura_no, fatura_tarihi, mal_kabul_senk_id, notlar, kullanici)
  values
    (p_tedarikci_senk_id, p_fatura_no, p_fatura_tarihi, p_mal_kabul_senk_id, p_notlar, p_kullanici)
  returning senk_id into v_fatura_id;

  for v_kalem in select * from jsonb_array_elements(p_kalemler) loop
    -- Satır tutarını sunucu tarafında doğrula: miktar × birim_fiyat
    declare
      v_hesaplanan_tutar numeric(14,2);
      v_gelen_tutar numeric(14,2);
      v_fark numeric(14,2);
    begin
      v_gelen_tutar := (v_kalem->>'satir_toplam')::numeric;
      v_hesaplanan_tutar := round(
        (v_kalem->>'miktar')::numeric * (v_kalem->>'birim_fiyat')::numeric, 2
      );
      v_fark := abs(v_hesaplanan_tutar - v_gelen_tutar);

      if v_fark > 0.01 then
        raise exception 'SATIR_TOPLAM_UYUSMUYOR: "%" (beklenen %, gelen %)',
          v_kalem->>'urun_adi', v_hesaplanan_tutar, v_gelen_tutar;
      end if;
    end;

    insert into alis_fatura_kalemleri
      (alis_fatura_senk_id, urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam)
    values (
      v_fatura_id,
      (v_kalem->>'urun_senk_id')::uuid,
      v_kalem->>'urun_adi',
      (v_kalem->>'miktar')::int,
      (v_kalem->>'birim_fiyat')::numeric,
      (v_kalem->>'kdv_orani')::int,
      (v_kalem->>'satir_toplam')::numeric
    );

    -- Fatura stoğunu artır (yoksa oluştur)
    insert into fatura_stok (urun_senk_id, miktar)
    values ((v_kalem->>'urun_senk_id')::uuid, (v_kalem->>'miktar')::int)
    on conflict (urun_senk_id) do update
      set miktar = fatura_stok.miktar + excluded.miktar,
          senk_guncelleme = now();

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (
      (v_kalem->>'urun_senk_id')::uuid,
      (v_kalem->>'miktar')::int,
      'alis_faturasi',
      v_fatura_id,
      'Alış faturası ' || p_fatura_no,
      p_kullanici
    );

    -- KDV dahil fiyattan iç yüzdeyle ayrıştır (satis-hesapla.js ile aynı formül)
    v_satir_kdv := round(
      (v_kalem->>'satir_toplam')::numeric
      * (v_kalem->>'kdv_orani')::numeric
      / (100 + (v_kalem->>'kdv_orani')::numeric), 2);
    v_kdv   := v_kdv + v_satir_kdv;
    v_genel := v_genel + (v_kalem->>'satir_toplam')::numeric;
  end loop;

  v_ara := v_genel - v_kdv;
  update alis_faturalari
     set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_genel
   where senk_id = v_fatura_id;

  return v_fatura_id;
end;
$$;

-- Alış faturası RPC: yalnızca authenticated kullanıcılar çağırabilir
revoke execute on function alis_faturasi_kaydet(uuid, text, date, uuid, text, text, jsonb) from anon, public;
grant execute on function alis_faturasi_kaydet(uuid, text, date, uuid, text, text, jsonb) to authenticated;

alter table fatura_stok             enable row level security;
alter table fatura_stok_hareketler  enable row level security;
alter table alis_faturalari         enable row level security;
alter table alis_fatura_kalemleri   enable row level security;
alter table kesilen_faturalar       enable row level security;
alter table kesilen_fatura_kalemleri enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fatura_stok','fatura_stok_hareketler','alis_faturalari',
                           'alis_fatura_kalemleri','kesilen_faturalar','kesilen_fatura_kalemleri']
  loop
    execute format('drop policy if exists %I_aktif_personel on %I', t, t);
    execute format(
      'create policy %I_aktif_personel on %I for all to authenticated
       using (public.aktif_personel_mi()) with check (public.aktif_personel_mi())', t, t);
  end loop;
end $$;
