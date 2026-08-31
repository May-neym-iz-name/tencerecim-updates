-- ============================================================
-- Faz 2: fatura kesme sahiplenmesi + fatura stoğu düşümü, TEK transaction.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md §⑤
-- Mükerrer fatura uygulama kontrolüyle DEĞİL, UNIQUE kısıtıyla engellenir.
--
-- 31.08.2026 Task 2 kod incelemesi sonrası (bkz. task-2-report.md): telafi
-- idempotent hale getirildi, boş kalem listesi guard'landı, deadlock sırası +
-- doğru toplam mesajı için iki geçişli döngüye geçildi, satir_toplam sunucuda
-- toleranslı doğrulanıyor.
--
-- UYARI 1: Bu fonksiyonlara `exception when ...` bloğu EKLEME — plpgsql'de
-- EXCEPTION bloğu bir subtransaction (savepoint) açar; içindeki hatayı
-- yutarsan dışarıdaki `insert into kesilen_faturalar` (sahiplenme satırı)
-- COMMIT edilmiş kalır ama stok/kalem/hareket asla yazılmaz — yetim ve tutarsız
-- bir "kuyrukta" satırı kalır. Hata her zaman dışarı, çağırana raise edilmeli.
--
-- UYARI 2: Bu transaction'ların içine dış servis çağrısı (Bizimhesap, Trendyol,
-- http vb.) EKLEME. `fatura_stok` satırları üzerinde satır kilidi tutulurken
-- dış bir HTTP isteğinin gecikmesi kilit penceresini saniyelerden onlarca
-- saniyeye çıkarır ve eşzamanlı fatura kesme akışını kilitler.
--
-- SECURITY INVOKER (varsayılan, bilinçli seçim): fonksiyonlar çağıranın
-- yetkisiyle çalışır, böylece `kesilen_faturalar` vb. üzerindeki RLS politikaları
-- (aktif_personel_mi()) DEVREDE kalır. "42501 alıyoruz, SECURITY DEFINER yapalım"
-- diye değiştirme — bu RLS'i tamamen bypass eder ve pasif/yetkisiz kullanıcıların
-- da fatura kesip stok değiştirmesine izin verir. 42501 alınıyorsa sorun RLS
-- politikasında veya çağıranın oturumunda, fonksiyonun güvenlik modelinde değil.
-- ============================================================

-- kesilen_faturalar denetim izi: fatura_stok_hareketler.kullanici zaten yazılıyor,
-- başlıkta da tutulması için kolon eklenir (12_fatura_semasi.sql'de yoktu).
alter table kesilen_faturalar add column if not exists kullanici text;

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

  -- 1) Sahiplen. UNIQUE(kanal, kanal_siparis_id) ihlali => 23505 => çağıran 'cakisma' görür.
  insert into kesilen_faturalar (kanal, kanal_siparis_id, durum, kullanici)
  values (p_kanal, p_kanal_siparis_id, 'kuyrukta', p_kullanici)
  returning senk_id into v_fatura_id;

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

-- ============================================================
-- Fatura sağlayıcıda oluşmadığı KESİN olduğunda stoğu iade eder.
-- Ağ hatasında ÇAĞRILMAZ (sonuç belirsiz) — yalnız iş hatasında (ör. sağlayıcı
-- açıkça reddetti) çağrılır.
--
-- İdempotent: durum güncellemesi 'durum in (kuyrukta, saglayici_ok)' koşuluyla
-- EN BAŞTA yapılır ve bir compare-and-swap gibi davranır. Bu UPDATE satır
-- kilidini alır; eşzamanlı ikinci çağrı bloklanır, ilk COMMIT olduktan sonra
-- WHERE'i YENİDEN değerlendirir (EvalPlanQual), durum artık 'hata' olduğu
-- için 0 satır etkiler ve stok İKİNCİ KEZ iade edilmez. 'tamam' ve 'belirsiz'
-- durumundaki faturalar beyaz listede YOK — asla telafi edilmez ('belirsiz'de
-- spec §⑤ gereği stok iade EDİLMEZ, insan karar verir).
--
-- Önceki (uuid, text) imzası kaldırıldı — eski sürüm public'e açık kalmasın.
-- ============================================================
drop function if exists fatura_kes_telafi(uuid, text);

create or replace function fatura_kes_telafi(
  p_fatura_senk_id uuid,
  p_hata text,
  p_kullanici text default null
) returns boolean
language plpgsql
set search_path = 'public'
as $$
declare
  v_kalem record;
  v_etkilenen int;
begin
  -- SAHİPLEN: yalnız telafi edilebilir bir durumdan çık.
  update kesilen_faturalar
     set durum = 'hata', hata_mesaji = p_hata
   where senk_id = p_fatura_senk_id
     and durum in ('kuyrukta','saglayici_ok');

  get diagnostics v_etkilenen = row_count;
  if v_etkilenen = 0 then
    return false;   -- zaten telafi edilmiş / telafi edilemez durumda: sessiz ve güvenli
  end if;

  for v_kalem in
    select urun_senk_id, sum(miktar) as miktar
      from kesilen_fatura_kalemleri
     where kesilen_fatura_senk_id = p_fatura_senk_id
     group by urun_senk_id
     order by urun_senk_id                      -- deadlock koruması, fatura_kes_basla ile aynı sıra
  loop
    update fatura_stok
       set miktar = miktar + v_kalem.miktar, senk_guncelleme = now()
     where urun_senk_id = v_kalem.urun_senk_id;

    -- Satır yoksa hareket defteri "+3" der ama bakiye değişmez; defter ile
    -- bakiye kalıcı olarak ayrışır. Sessiz kayıp yerine hata.
    get diagnostics v_etkilenen = row_count;
    if v_etkilenen = 0 then
      raise exception 'TELAFI_STOK_SATIRI_YOK: %', v_kalem.urun_senk_id;
    end if;

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (v_kalem.urun_senk_id, v_kalem.miktar, 'telafi', p_fatura_senk_id,
            'Fatura başarısız, stok iade edildi', p_kullanici);
  end loop;

  return true;
end;
$$;

revoke execute on function fatura_kes_telafi(uuid, text, text) from anon, public;
grant execute on function fatura_kes_telafi(uuid, text, text) to authenticated;

-- ============================================================
-- kesilen_faturalar.durum için CHECK kısıtı — Faz 1'de bilerek ertelenmişti,
-- durum makinesi bu fazda netleşiyor.
-- ============================================================
alter table kesilen_faturalar drop constraint if exists kesilen_faturalar_durum_gecerli;
alter table kesilen_faturalar add constraint kesilen_faturalar_durum_gecerli
  check (durum in ('kuyrukta','saglayici_ok','pdf_alindi','pazaryeri_yuklendi','tamam','hata','belirsiz'));

-- kesilen_fatura_kalemleri, kesilen_fatura_senk_id ile sık sorgulanır
-- (fatura_kes_telafi ve UI listesi) — indekssiz sıralı taramayı önle.
create index if not exists idx_kesilen_kalem_fatura on kesilen_fatura_kalemleri(kesilen_fatura_senk_id);
