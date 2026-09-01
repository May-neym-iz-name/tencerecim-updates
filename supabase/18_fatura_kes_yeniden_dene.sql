-- ============================================================
-- Faz 2 düzeltmesi (01.09.2026): BAŞARISIZ denemeden sonra siparişe YENİDEN
-- fatura kesilebilsin.
--
-- Bu dosya 15_fatura_kes_rpc.sql'deki fonksiyonun AYNISIDIR; yalnız 1. adımdaki
-- sahiplenme bloğu değişti. Gövdenin geri kalanı (stok düşümü, tolerans,
-- kalem yazımı, hareket kayıtları) bilerek KOPYALANDI — yeniden yazılsaydı
-- incelemeden geçmiş mantık sessizce sapardı.
--
-- UYARI: `exception when` bloğu EKLEME. SECURITY INVOKER (varsayılan) korunur.
-- ============================================================

create or replace function fatura_kes_basla(
  p_kanal text,
  p_kanal_siparis_id text,
  p_kalemler jsonb,   -- [{urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam, set_senk_id}]
  p_kullanici text
) returns uuid
language plpgsql
set search_path = 'public'
as $$
declare
  v_fatura_id uuid;
  v_kalem jsonb;
  v_ihtiyac record;
  v_etkilenen int;
  v_toplam numeric(14,2) := 0;
  v_beklenen numeric(14,2);
  v_fark_siniri numeric(14,2);
begin
  -- 0) Boş/eksik kalem listesiyle sahiplenme YAPMA: aksi halde sıfır kalemli
  --    'kuyrukta' satırı UNIQUE(kanal, kanal_siparis_id)'yi kalıcı işgal eder
  --    ve o siparişe bir daha asla fatura kesilemez.
  if p_kalemler is null
     or jsonb_typeof(p_kalemler) <> 'array'
     or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'KALEM_YOK: fatura kalemi olmadan fatura kesilemez (%/%)',
      p_kanal, p_kanal_siparis_id;
  end if;

  -- 1) Sahiplen. Daha önce BAŞARISIZ olmuş (durum='hata') bir deneme varsa onu
  --    YENİDEN sahiplen; diğer her durumda çakışma hatası ver.
  --
  --    🔴 NEDEN (01.09.2026 canlıda yaşandı): eskiden koşulsuz INSERT vardı.
  --    İlk deneme hata alınca telafi çalışıyor, stok iade ediliyor ama satır
  --    durum='hata' olarak KALIYORDU; ikinci deneme UNIQUE ihlaliyle patlıyordu.
  --    Yani GEÇİCİ bir hata (yanlış firmId, sağlayıcı reddi) siparişi KALICI
  --    olarak faturalanamaz yapıyordu.
  --
  --    'belirsiz' BİLEREK dışarıda: sonucu doğrulanmamış faturayı yeniden kesmek
  --    gerçek mükerrer fatura üretir. Onun yolu "Kontrol Bekliyor" listesindeki
  --    insan kararıdır.
  insert into kesilen_faturalar (kanal, kanal_siparis_id, durum, kullanici)
  values (p_kanal, p_kanal_siparis_id, 'kuyrukta', p_kullanici)
  on conflict (kanal, kanal_siparis_id) do update
     set durum           = 'kuyrukta',
         kullanici       = excluded.kullanici,
         hata_mesaji     = null,
         saglayici_guid  = null,
         saglayici_url   = null,
         fatura_no       = null,
         tarih           = now(),
         senk_guncelleme = now()
   where kesilen_faturalar.durum = 'hata'
  returning senk_id into v_fatura_id;

  -- ON CONFLICT ... WHERE tutmadıysa HİÇ satır dönmez: fatura zaten kesilmiş
  -- ('tamam'), işlemde ('kuyrukta') ya da sonucu belirsiz ('belirsiz').
  if v_fatura_id is null then
    raise exception 'CAKISMA: bu siparise fatura zaten kesilmis veya islemde (%/%)',
      p_kanal, p_kanal_siparis_id;
  end if;

  -- Yeniden sahiplenmede ESKİ kalemler silinir: telafi stoğu zaten iade etti;
  -- kalsalardı fatura aynı kalemi iki kez taşır ve olası bir telafi stoğu
  -- İKİNCİ KEZ iade ederdi.
  delete from kesilen_fatura_kalemleri where kesilen_fatura_senk_id = v_fatura_id;

  -- 1.b) Her kalemin miktarı TOPLAMADAN ÖNCE kontrol edilir: +5 ve -2 gibi
  --      iki kalem toplamda 3'e düşüp aşağıdaki toplam-bazlı guard'ı atlatabilir
  --      (2. geçişteki CHECK kısıtı bunu 23514 ile yakalar ama mesaj bulanıklaşır).
  if exists (
    select 1 from jsonb_array_elements(p_kalemler) e
     where (e->>'miktar')::int <= 0
  ) then
    raise exception 'GECERSIZ_MIKTAR: kalem miktari sifir veya negatif olamaz';
  end if;

  -- 2) GEÇİŞ 1: ürün bazında topla + DETERMİNİSTİK SIRADA (urun_senk_id) düş.
  --    Sıralama, eşzamanlı iki fatura kesme çağrısının farklı sırada kilit
  --    almasını (ve dolayısıyla 40P01 deadlock'unu) imkânsız kılar. Toplama,
  --    aynı ürün iki ayrı kalemde geldiğinde (ör. set + tekil satır) doğru
  --    toplam ihtiyacı raporlar/düşer.
  for v_ihtiyac in
    select (e->>'urun_senk_id')::uuid as urun_senk_id,
           sum((e->>'miktar')::int)   as toplam_miktar,
           min(e->>'urun_adi')        as urun_adi
      from jsonb_array_elements(p_kalemler) e
     group by 1
     order by 1
  loop
    if v_ihtiyac.toplam_miktar <= 0 then
      -- Negatif/sıfır miktar guard'ı geçip `miktar >= gereken`i her zaman
      -- doğru yapardı (ör. -3 için miktar>=-3 hep doğrudur) ve UPDATE stoğu
      -- ARTIRIRDI. Açıkça reddet.
      raise exception 'GECERSIZ_MIKTAR: % (%)', v_ihtiyac.urun_adi, v_ihtiyac.toplam_miktar;
    end if;

    -- Koşullu düşüm: kontrol ve düşüm TEK ifadede.
    -- Ayrı SELECT + UPDATE yazılmaz — araya başka işlem girebilir.
    update fatura_stok
       set miktar = miktar - v_ihtiyac.toplam_miktar,
           senk_guncelleme = now()
     where urun_senk_id = v_ihtiyac.urun_senk_id
       and miktar >= v_ihtiyac.toplam_miktar;

    get diagnostics v_etkilenen = row_count;
    if v_etkilenen = 0 then
      raise exception 'YETERSIZ_STOK: % (gereken %)',
        coalesce(v_ihtiyac.urun_adi, v_ihtiyac.urun_senk_id::text), v_ihtiyac.toplam_miktar;
    end if;
  end loop;

  -- 3) GEÇİŞ 2: kalemleri ve hareketleri ORİJİNAL belge sırasında yaz.
  --    Kalemler BİRLEŞTİRİLMEZ — iki set aynı bileşeni farklı birim_fiyat ile
  --    taşıyabilir, kalem satırları belge görünümü için ayrı kalmalı.
  for v_kalem in select * from jsonb_array_elements(p_kalemler) loop
    -- satir_toplam sunucuda doğrulanır ama BİREBİR eşitlik İSTENMEZ: set
    -- fiyatı bileşenlere dağıtılırken kuruş artığı KASTEN oluşur
    -- (bkz. satis-hesapla.js). Toleransı miktarla ölçekle.
    v_beklenen := round((v_kalem->>'miktar')::numeric * (v_kalem->>'birim_fiyat')::numeric, 2);
    -- Taban 0,01 TL (tek birimlik yuvarlama payı) + miktarla ölçeklenen
    -- 0,005 TL/adet (meşru birim fiyat yuvarlaması). Önceki 0.01×miktar
    -- tavansızdı: miktar=1000 için 10 TL'ye kadar sapmayı geçirirdi.
    v_fark_siniri := greatest(0.01, 0.005 * (v_kalem->>'miktar')::numeric);
    if abs(v_beklenen - (v_kalem->>'satir_toplam')::numeric) > v_fark_siniri then
      raise exception 'SATIR_TOPLAM_UYUSMUYOR: % (beklenen ~%, gelen %)',
        coalesce(v_kalem->>'urun_adi', v_kalem->>'urun_senk_id'), v_beklenen, v_kalem->>'satir_toplam';
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
