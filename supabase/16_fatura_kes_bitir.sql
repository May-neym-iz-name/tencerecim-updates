-- ============================================================
-- Faz 2 / Task 4A: fatura kesme sonucunu durum makinesine yazar.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md §⑤
--
-- BOŞLUK: 15_fatura_kes_rpc.sql sahiplenmeyi (fatura_kes_basla → 'kuyrukta') ve
-- iş hatasında geri almayı (fatura_kes_telafi → 'hata') kuruyordu, ama sağlayıcı
-- guid döndürdükten sonra satırı 'tamam'a taşıyan bir yol YOKTU. O yol olmadan
-- her başarılı fatura sonsuza dek 'kuyrukta' görünür.
--
-- UYARI 1: `exception when` bloğu EKLEME — plpgsql'de EXCEPTION bloğu bir
-- subtransaction açar; hatayı yutarsan satır yarı güncellenmiş kalır.
-- UYARI 2: Bu fonksiyonun içine dış servis çağrısı (Bizimhesap, http) EKLEME.
-- SECURITY INVOKER (varsayılan, bilinçli): RLS (aktif_personel_mi()) devrede kalsın.
-- ============================================================

-- Sağlayıcı sonucunu yazar. İki geçerli varış durumu vardır:
--   'tamam'    → sağlayıcı faturayı KESİN olarak oluşturdu (guid elimizde)
--   'belirsiz' → ağ/zaman aşımı; fatura oluşmuş OLABİLİR. Stok İADE EDİLMEZ
--                (spec §⑤), satır "Kontrol Bekliyor" listesine düşer ve kararı
--                insan verir. Buraya 'hata' YAZILMAZ — o fatura_kes_telafi'nin işi.
create or replace function fatura_kes_bitir(
  p_fatura_senk_id uuid,
  p_durum text,
  p_guid text default null,
  p_url text default null,
  p_fatura_no text default null,
  p_belge_tipi text default null,
  p_belge_tipi_kaynak text default 'tahmin',
  p_hata text default null
) returns boolean
language plpgsql
set search_path = 'public'
as $$
declare
  v_etkilenen int;
begin
  if p_durum is null or p_durum not in ('tamam','belirsiz') then
    raise exception 'GECERSIZ_DURUM: fatura_kes_bitir yalnız tamam/belirsiz yazar (%)', p_durum;
  end if;

  -- 'tamam' iddiası kanıt ister: guid'siz "tamam" yazılırsa fatura hiç oluşmamış
  -- olsa bile sipariş faturalanmış görünür ve UNIQUE kısıtı yüzünden bir daha
  -- denenemez. Kanıt yoksa çağıran 'belirsiz' yazmalı.
  if p_durum = 'tamam' and coalesce(p_guid, '') = '' then
    raise exception 'GUID_YOK: tamam durumu sağlayıcı kimliği olmadan yazılamaz (%)', p_fatura_senk_id;
  end if;

  -- COMPARE-AND-SWAP: yalnız henüz sonuçlanmamış bir faturayı sonuçlandır.
  -- Bu UPDATE satır kilidini alır; iki PC aynı anda çağırırsa ikincisi bloklanır,
  -- birinci COMMIT'ten sonra WHERE'i YENİDEN değerlendirir (EvalPlanQual), durum
  -- artık 'tamam' olduğu için 0 satır eder ve sonuç İKİNCİ KEZ yazılmaz.
  -- 'hata' ve 'tamam' beyaz listede YOK: telafi edilmiş bir fatura buradan
  -- diriltilemez, tamamlanmış bir fatura 'belirsiz'e geri düşürülemez.
  update kesilen_faturalar
     set durum          = p_durum,
         saglayici_guid = coalesce(p_guid, saglayici_guid),
         saglayici_url  = coalesce(p_url, saglayici_url),
         fatura_no      = coalesce(p_fatura_no, fatura_no),
         -- belge_tipi ilk sürümde vergi kimliğinden TAHMİN ediliyor; kaynağı
         -- birlikte yazılır ki rapor "tahmin"i kesin bilgi gibi göstermesin.
         belge_tipi     = coalesce(p_belge_tipi, belge_tipi),
         belge_tipi_kaynak = coalesce(p_belge_tipi_kaynak, belge_tipi_kaynak),
         hata_mesaji    = case when p_durum = 'belirsiz' then p_hata else hata_mesaji end,
         senk_guncelleme = now()
   where senk_id = p_fatura_senk_id
     and durum in ('kuyrukta','saglayici_ok');

  get diagnostics v_etkilenen = row_count;
  -- 0 satır: fatura zaten sonuçlanmış (başka PC yazdı) ya da telafi edilmiş.
  -- Sessiz ve güvenli — çağıran bunu hata olarak göstermez, idempotenttir.
  return v_etkilenen > 0;
end;
$$;

revoke execute on function fatura_kes_bitir(uuid, text, text, text, text, text, text, text) from anon, public;
grant execute on function fatura_kes_bitir(uuid, text, text, text, text, text, text, text) to authenticated;

-- "Kontrol Bekliyor" listesi (durum = 'belirsiz') her açılışta sorgulanacak.
-- Kısmi indeks: tablo büyüse de bu liste küçük kalır.
create index if not exists idx_kesilen_faturalar_belirsiz
  on kesilen_faturalar(tarih desc) where durum = 'belirsiz';
