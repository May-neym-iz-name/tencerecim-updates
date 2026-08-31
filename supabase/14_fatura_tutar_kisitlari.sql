-- ============================================================
-- Fatura kalemlerinde tutar bütünlüğü: veritabanı seviyesinde CHECK kısıtları.
--
-- GEREKÇE (Task 8 code review, 31.08.2026): İstemci tarafı (AlisFaturaFormu.jsx)
-- ve RPC (alis_faturasi_kaydet) doğrulaması var, ama veritabanı seviyesinde
-- hiçbir kısıt yoktu — ileride başka bir yazma yolu (elle SQL, farklı bir
-- istemci, gelecekteki "fatura kes" akışı) miktar<=0, negatif fiyat veya
-- aralık dışı KDV oranı yazabilirdi. Son savunma katmanı burada.
--
-- KAPSAM: alis_fatura_kalemleri + kesilen_fatura_kalemleri (ikisi de aynı
-- üç alanı taşıyor: miktar, birim_fiyat, kdv_orani — bkz. 12_fatura_semasi.sql).
--
-- GÜVENLİ UYGULAMA: Bu iki tablo şu an (31.08.2026 itibarıyla) BOŞ — henüz
-- canlı veri girilmedi, bu yüzden kısıt eklemek mevcut satırları bozma
-- riski taşımıyor. İdempotent yazıldı (drop + create), tekrar çalıştırmak
-- güvenlidir.
-- ============================================================

alter table alis_fatura_kalemleri drop constraint if exists alis_fatura_kalemleri_miktar_pozitif;
alter table alis_fatura_kalemleri add constraint alis_fatura_kalemleri_miktar_pozitif check (miktar > 0);

alter table alis_fatura_kalemleri drop constraint if exists alis_fatura_kalemleri_fiyat_negatif_degil;
alter table alis_fatura_kalemleri add constraint alis_fatura_kalemleri_fiyat_negatif_degil check (birim_fiyat >= 0);

alter table alis_fatura_kalemleri drop constraint if exists alis_fatura_kalemleri_kdv_araligi;
alter table alis_fatura_kalemleri add constraint alis_fatura_kalemleri_kdv_araligi check (kdv_orani between 0 and 100);

alter table kesilen_fatura_kalemleri drop constraint if exists kesilen_fatura_kalemleri_miktar_pozitif;
alter table kesilen_fatura_kalemleri add constraint kesilen_fatura_kalemleri_miktar_pozitif check (miktar > 0);

alter table kesilen_fatura_kalemleri drop constraint if exists kesilen_fatura_kalemleri_fiyat_negatif_degil;
alter table kesilen_fatura_kalemleri add constraint kesilen_fatura_kalemleri_fiyat_negatif_degil check (birim_fiyat >= 0);

alter table kesilen_fatura_kalemleri drop constraint if exists kesilen_fatura_kalemleri_kdv_araligi;
alter table kesilen_fatura_kalemleri add constraint kesilen_fatura_kalemleri_kdv_araligi check (kdv_orani between 0 and 100);
