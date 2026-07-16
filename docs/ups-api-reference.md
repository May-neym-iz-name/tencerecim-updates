# UPS Türkiye Yurt İçi API Reference

Curated reference for the Tencerecim desktop app's UPS integration (SOAP 1.1, hand-rolled XML envelopes).

- **Shipping service:** `https://ws.ups.com.tr/wsCreateShipment/wsCreateShipment.asmx`
  - Namespace: `https://ws.ups.com.tr/wsCreateShipment` (**no** trailing slash)
- **Tracking service:** `https://ws.ups.com.tr/QueryPackageInfo/wsQueryPackagesInfo.asmx`
  - Namespace: `https://ws.ups.com.tr/wsPaketIslemSorgulamaEng/` (**trailing slash required**)
- **No WSDL in repo.** Namespaces were found by trial and error — see `electron/ups/soap.js:44-46`.
- **Credentials:** SQLite `ups_ayarlar` table (plaintext), **not** environment variables. Entered via Ayarlar > UPS Kargo.
- Source: `UPS KARGO ENTEGRASYONU/` folder (vendor PDFs + Excel files), transcribed here because the
  original tables are locked inside `.xls`/`.xlsx` files that code cannot read.

---

## 1. Status Codes (`StatusCode`)

Returned by `GetLastTransactionByTrackingNumber_V1` in the `StatusCode` field.
Read by `electron/ups/soap.js:274` as `durumKodu`.

**Source:** `UPS KARGO ENTEGRASYONU/Domestic Tracking API/Domestic Tracking API/WSDurumKodlari.xls`

| Code | Meaning (TR) | Notes |
|---|---|---|
| 1 | GİRİŞ SCAN EDİLDİ | Accepted into network |
| **2** | **ALICIYA TESLİM EDİLDİ** | **Delivered — the only true "delivered" code** |
| 3 | ÖZEL DURUM OLUŞTU | Exception; reason comes from the extended table in §2 |
| 4 | KURYE DAĞITMAK ÜZERE ÇIKARDI | Out for delivery |
| 5 | KURYE GERİ GETİRDİ | Courier returned it |
| 6 | ŞUBEYE GÖNDERİLDİ | Sent to branch |
| 7 | ŞUBEDEN GELDİ | Arrived from branch |
| 12 | K. KONTEYNERE KONDU | Placed in container |
| 15 | MANİFESTO FAZLASI | Manifest surplus |
| 16 | K. KONTEYNERDEN ÇIKTI | Removed from container |
| 17 | GÖNDERENE İADE AMAÇLI ÇIKIŞ | Returning to sender |
| 18 | MÜŞTERİ TOPLU GİRİŞ | Bulk customer entry |
| 19 | ŞUBEDE BEKLEYEN | Waiting at branch |
| 30 | KONSOLOSLUKTAN TESLİM ALINDI | Picked up from consulate |
| 31 | ÇAĞRI SONUCU ALINDI | Picked up on demand |
| 32 | DEPOYA GİRDİ | Entered warehouse |
| 33 | DEPODAN ÇIKTI | Left warehouse |
| 34 | EDİ BİLGİ TRANSFER | EDI data transfer |
| 35 | MÜŞTERİ DEPODA OKUNDU | Scanned at customer warehouse |
| 36 | TOPLU DAĞITIMA ÇIKIŞ | Bulk delivery dispatch |
| 37 | TRANSİT KARŞILAMA | Transit inbound |
| 38 | TRANSİT ÇIKIŞ | Transit outbound |

**Do not match on `ProcessDescription1` text.** The free text is ambiguous in both directions:
`HD` ("TESLİMAT SONRASI ALICI HASAR BİLDİRDİ") contains "teslim" but is an exception, and
`S7` ("ALICI KENDİSİ GELİP ALACAK") has no "teslim" but is not delivered either. Use `StatusCode`.

---

## 2. Extended / Exception Codes

Applies when `StatusCode = 3`. Explains why delivery did not happen.

**Source:** `UPS KARGO ENTEGRASYONU/Domestic Tracking API/Domestic Tracking API/GenisletilmisDurumKodlari.xlsx`

| Code | Meaning (TR) | Notes |
|---|---|---|
| 34 | YANLIŞ HEDEFLENMİŞ | Sent to wrong branch |
| 45 | HASARLI PAKET | Damaged beyond delivery |
| 48 | 1 UĞRAMA YETKİLİ YOK | Nobody available, attempt 1 |
| 49 | 3 UĞRAMA YETKİLİ YOK | Attempt 3 → **returned to sender** |
| 72 | PAKETLERİN TAMAMININ GELMESİ BEKLENİYOR | Multi-package split in transit |
| A7 | TAŞINMIŞ | Recipient moved |
| AC | İL/İLÇE/SEMT/MAHALLE YANLIŞ | Bad address |
| AD | BÖYLE BİR ALICI YOK | Bad address |
| AE | BÖYLE BİR SOKAK NUMARASI YOK | Bad address |
| AF | BÖYLE BİR SOKAK İSMİ YOK | Bad address |
| AG | EKSİK ADRES | Bad address |
| AH | ADRES DEĞİŞİKLİĞİ | Recipient address changed |
| AM | SİPARİŞİ İPTAL ETMİŞ | Recipient cancelled |
| AR | PAHALI OLDUĞU İÇİN İSTEMİYOR | Refused — shipping cost |
| AS | GEÇ OLDUĞU İÇİN İSTEMİYOR | Refused — arrived late |
| AT | ALICI GECİKTİRMESİ | Recipient asked to defer |
| AX | ALICI TATİLDE | Recipient on holiday |
| AY | KAPALI-3 | Closed on 3rd attempt → **returned to sender** |
| AZ | RESMİ TATİL | Public holiday |
| BI | ALIM İÇİN UĞRANDI, MÜŞTERİ KAPALI | Pickup attempt, closed |
| BQ | TELEFON CEVAP VERMİYOR | Cannot reach recipient |
| C8 | İŞİ BIRAKMIŞ | Recipient left the job |
| CG | PAKETİN ÜZERİNDE BİRDEN FAZLA TAKİP NUMARASI | Under investigation |
| CI | ALIM İÇİN UĞRANDI, GÖNDERİCİ YERİNDE YOK | Pickup attempt, sender absent |
| CO | PAKET ALIMA HAZIR DEĞİL, 1.UĞRAMA | Not ready, attempt 1 |
| DL | GERİ İADE EDİLDİ | Returned at access point → goes back to sender |
| DN | PAKET SAYISI TUTMUYOR | Count mismatch vs waybill |
| FY | İRSALİYE/FATURA YOK KABUL EDİLMİYOR | Refused — no invoice |
| G3 | KAPALI | Business closed |
| G4 | PAKET ALIMA HAZIR DEĞİL, 1.UĞRAMA | Not ready, attempt 1 |
| G5 | PAKET ALIMA HAZIR DEĞİL, 3.UĞRAMA | Not ready, attempt 3 — no further attempts |
| GI | GÖNDERİ İADE | Returned to sender |
| HA | ARAÇ KAZASI | Vehicle accident |
| HD | TESLİMAT SONRASI ALICI HASAR BİLDİRDİ | Damage reported by recipient **after** delivery |
| HE | TESLİMAT SONRASI GÖNDEREN HASAR BİLDİRDİ | Damage reported by sender after delivery |
| KG | KİMLİK GÖSTERMİYOR | ID-controlled shipment, no ID shown |
| KQ | HASARLI OLDUĞU İÇİN KABUL EDİLMİYOR | Refused — damaged |
| KR | PAKETİ HİÇBİR ŞEKİLDE KABUL EDİLMİYOR | Flatly refused |
| KS | ALICININ BÖYLE BİR SİPARİŞİ YOK | Recipient denies the order |
| KU | EKSİK KAP NEDENİYLE TESLİM EDİLEMİYOR | Missing package in multi-package set |
| KX | 2 UĞRAMA YETKİLİ YOK | Nobody available, attempt 2 |
| KY | PAKET ALIMA HAZIR DEĞİL, 2.UĞRAMA | Not ready, attempt 2 |
| M2 | MÜŞTERİNİN 2. ADRESİNE TESLİM EDİLECEK | Redirect to 2nd address |
| M3 | MÜŞTERİNİN 3. ADRESİNE TESLİM EDİLECEK | Redirect to 3rd address |
| S7 | ALICI KENDİSİ GELİP ALACAK | Recipient will collect from branch |
| SD | SÖZLEŞMEYİ DOLDURMAK İSTEMEDİ | Refused to fill contract |
| SG | SERVİS GÜNÜ BEKLENİYOR | Waiting for service day |
| ST | SOYADI TUTMUYOR | Surname mismatch — may deliver to matching relative |

**Terminal-failure codes** (shipment will not be delivered; it goes back to sender):
`49`, `AY`, `GI`, `DL`, `G5`, `45`.

---

## 3. SOAP Methods

Sessions are **not cached** — every call performs a fresh login. SessionID is valid 5 minutes.
The tracking service requires its **own** login (`Login_V1`); the shipping session does not work there.

| Method | Service | File:line | Sends | Returns |
|---|---|---|---|---|
| `Login_Type1` | Shipping | `soap.js:115` | `CustomerNumber`, `UserName`, `Password` | `ErrorCode`, `ErrorDefinition`, `SessionID` |
| `CreateShipment_Type3` | Shipping | `soap.js:200` | `SessionID`, `ShipmentInfo`, `ReturnLabelLink=true`, `ReturnLabelImage=true` | `ErrorCode`, `ShipmentNo`, `LinkForLabelPrinting`, `BarkodArrayPng` |
| `Cancel_Shipment_V1` | Shipping | `soap.js:220` | `sessionId`, `customerCode`, `waybillNumber` — **camelCase mandatory** | `ErrorCode`, `ErrorDefinition` |
| `OnDemandPickupRequest_Type1` | Shipping | `soap.js:237` | `SessionID`, `OnDemandPickupRequestInfo` | `ErrorCode`, `ShipmentNo`, `BarkodArrayPng` |
| `Login_V1` | Tracking | `soap.js:301` | `CustomerNumber`, `UserName`, `Password` | `ErrorCode`, `SessionID` |
| `GetLastTransactionByTrackingNumber_V1` | Tracking | `soap.js:263` | `SessionID`, `InformationLevel=1`, `TrackingNumber` | **`StatusCode`**, `ProcessDescription1`, `ProcessDescription2`, `OperationBranchName`, `ProcessTimeStamp` |
| `GetShipmentInfoByTrackingNumber_V1` | Tracking | `soap.js:285` | `SessionID`, `InformationLevel=1`, `TrackingNumber` | `TrackingNumber` per package (deduped) |

### `ShipmentInfo` defaults
`ServiceLevel=3`, `PaymentType=2`, `PackageType='K'`, `IdControlFlag=0`, `PhonePrealertFlag=0`,
`InsuranceValue=0`, `ValueOfGoods=0`. Note `CustomerReferance` — UPS's own typo, keep it.

One `DimensionInfo` per package, all identical; count must equal `NumberOfPackages` (`soap.js:138-148`).

---

## 4. Known Traps

- **Tracking namespace** must end in `/` and use `Login_V1`. The old `QueryPackageInfo` namespace with
  `Login_Type1` returns HTTP 500 "SOAPAction tanınmadı" (`soap.js:44-46`).
- **`Cancel_Shipment_V1` needs camelCase params.** The vendor PDF shows PascalCase, which fails with
  "Token cannot be null" (`soap.js:221-223`).
- **No global `fetch`** — Electron 22 runs Node 16, so the built-in `https` module is used (`soap.js:13`).
- **`ErrorCode` has no documented lookup table.** `'0'` means success; anything else surfaces raw with
  UPS's own `ErrorDefinition` text. Note the inconsistency: `trackLast` and `shipmentPackages` tolerate
  `null` error codes, the rest treat `null` as failure.
- **City/district codes fall back to `0` silently** when lookup fails (`soap.js:156-157, 168-169`).

---

## 5. City / District Codes

- Seed data: `electron/ups/sehir-ilce.json` (~5600 records, 360 KB)
  Format: `{"il":"ADANA","ilKodu":1,"ilce":"ABDİOĞLU","ilceKodu":1975}`
- Loaded into `ups_sehir_ilce` by `seedUpsSehirIlce()` (`database.js:473-489`), skipped if already populated.
- Derived from the vendor's `Districts.xlsx` / `UmoCityAreaCode.xls` — **the conversion script is not in the repo.**
- Lookups: `ups:iller`, `ups:ilceler(ilKodu)`, `ups:il-ilce-bul` (name → code, for ikas free-text addresses).

---

## 6. Label Printing

UPS requirement: barcode min 2 cm wide, 12 cm tall, min 200 dpi.

Layouts (`etiket-yazdir.js:10-14`): `1` = 100×150mm thermal, `2` = A4 1×2, `4` = A4 2×2.

Labels are stored as base64 PNG JSON arrays in `kargolar.barkod_png` (heavy — stripped from `kargo:detay`).
To keep the 500 MB DB limit safe, labels are offloaded to Supabase Storage (bucket `kargo-etiketleri`,
`src/lib/etiketDepo.js`) and purged after 5 months.

Note: `src/lib/kargoEtiket.js` is **not** a UPS label — it is a hand-made HTML label for ikas orders.

---

## 7. Dead Code (as of v1.2.108)

These IPC handlers are fully implemented but never called from the UI:

| Channel | File:line | Consequence |
|---|---|---|
| `kargo:takip` | `kargo.js:275` | `kargolar.son_durum` / `son_durum_tarihi` are **always empty**; `StatusCode` never evaluated |
| `kargo:pickup` | `kargo.js:303` | Courier pickup works but has no UI |
| `kargo:etiket-yazdir` | `etiket-yazdir.js` | Silent printing unused; UI always opens the preview window |
