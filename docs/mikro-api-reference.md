# Mikro API — Tam Referans

> Kaynak: https://apidocs.mikro.com.tr — indirilme tarihi: 2026-08-31
> Bu dosya otomatik indirildi. Guncellemek icin: scripts/mikro-doc-indir.sh

---

# MikroAPI


MikroAPI, ERP sistemleri ile entegre çalışabilen kapsamlı bir API çözümüdür. 
Bu doküman, tüm endpoint'lerin kullanımını detaylı, açık ve net ifadelerle anlatmaktadır. 
ERP geliştiricileri bu dokümanı kullanarak herhangi bir ek destek ihtiyacı olmaksızın hızlı ve kolay şekilde entegrasyonlarını tamamlayabilirler.


Version: 1.0.0

## Servers

[object Object]
```
https://localhost:8094
```

## Download OpenAPI description

 - [MikroAPI](https://apidocs.mikro.com.tr/_bundle/apis/index.yaml)

## Login-Logoff

 - [POST /Api/APIMethods/APILogin](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogin/post.md): POST APILogin endpoint'i, ERP sisteminizde Login-Logoff ile ilgili işlemler yapmak için kullanılır. Bu endpoint, V1 endpointleri kullanımı sağlanırken Başarılı Login işlemi sonrası sizlere belirli bir
 - [GET /Api/APIMethods/HealthCheck](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1healthcheck/get.md): GET HealthCheck endpoint'i, API servivisinin kontrolü için kullanılan bir endpointidir. Servisin UP / DOWN durumu ile ilgili bilgi almak için kullanılır. Bu API endpoint'i üzerinden ilgili işlemleri
 - [GET /Api/APIMethods/HealthCheck2](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1healthcheck2/get.md): GET HealthCheck2 endpoint'i, API servivisinin kontrolü için kullanılan bir endpointidir. Servisin UP / DOWN durumu ile ilgili bilgi almak için kullanılır. Bu API endpoint'i üzerinden ilgili işlemleri
 - [GET /Api/APIMethods/LoggerDone](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1loggerdone/get.md): GET LoggerDone endpoint'i, ERP sisteminizde Login-Logoff ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçek
 - [POST /Api/apiMethods/APILogoff](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogoff/post.md): POST APILogoff endpoint'i, ERP sisteminizde Login-Logoff ile ilgili V1 endpointlerinde işlem sağlandıktan sonra sistemden logout olmak için kullanılır. V2 ve V3 endpointleri için kullanım gerektirmeme
 - [POST /Api/apiMethods/APILogoffV2](https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogoffv2/post.md): POST APILogoffV2 endpoint'i, ERP sisteminizde Login-Logoff ile ilgili V2 endpointleri kullanımı sonrasında Login olan kullanıcının sistemden Logout işlemini yapmak için kullanılır. Bu endpoint kullanı
## Adres

 - [POST /API/APIMethods/AdresDuzeltV2](https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adresduzeltv2/post.md): POST AdresDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı olan cari adresleri üzerinde Düzenleme, Güncelleme gibi işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işle
 - [POST /API/APIMethods/AdresKaydetV2](https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adreskaydetv2/post.md): POST AdresKaydetV2 endpoint'i, ERP sisteminizde kayıtlı cari Adresleri ile ilgili yeni cari adres kaydı ekleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işle
 - [POST /API/APIMethods/AdresSilV2](https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adressilv2/post.md): POST AdresSilV2 endpoint'i, ERP sisteminizde kayıtlı cari Adresleri ile ilgili adres silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli
## Alım Satım Evrakı - Fatura

 - [POST /Api/apiMethods/AlimSatimEvragiDuzeltV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragiduzeltv2/post.md): POST AlimSatimEvragiDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura ile ilgili düzenleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili i
 - [POST /Api/apiMethods/AlimSatimEvragiKaydetV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragikaydetv2/post.md): POST AlimSatimEvragiKaydetV2 endpoint'i, ERP sisteminizde stok, hizmet ve masraf kalemlerini aynı evrak içerisinde kaydetmek için kullanılır.
 - [POST /Api/apiMethods/AlimSatimEvragiSatirSilV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragisatirsilv2/post.md): POST AlimSatimEvragiSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura üzerinde satır silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndere
 - [POST /Api/apiMethods/AlimSatimEvragiSilV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragisilv2/post.md): POST AlimSatimEvragiSilV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
 - [POST /Api/apiMethods/SiparistenFaturaOlusturmaV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1siparistenfaturaolusturmav2/post.md): POST SiparistenFaturaOlusturmaV2 endpoint'i, ERP sisteminizde Kesilen siparişleri faturalaştırmak için Bu API endpoint'i üzerinden istenilen verileri Jsonda Post ederek ilgili işlemleri hızlı, güven
 - [POST /api/APIMethods/FaturaKaydetV2](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1faturakaydetv2/post.md): POST FaturaKaydetV2 endpoint'i, ERP sisteminizde Alım Satım Evrakı - Fatura ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.Post edilecek parametre bilgilerine mikro veri tabanı-tablo ala
 - [POST /api/APIMethods/FaturaKaydetV3](https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1faturakaydetv3/post.md): POST FaturaKaydetV3 endpoint'i, ERP sisteminizde Alım Satım Evrakı - Fatura ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri h
## Alınan Teklif

 - [POST /Api/apiMethods/AlinanTeklifDuzeltV2](https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifduzeltv2/post.md): POST AlinanTeklifDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif evrakı güncelleme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
 - [POST /Api/apiMethods/AlinanTeklifGuidSilV2](https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifguidsilv2/post.md): POST AlinanTeklifGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif evrakı Guid bilgisi ile evrak silme işlemi yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işle
 - [POST /Api/apiMethods/AlinanTeklifKaydetV2](https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifkaydetv2/post.md): POST AlinanTeklifKaydetV2 endpoint'i, ERP sisteminizde Alınan Teklif evrakı ekleme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güven
 - [POST /Api/apiMethods/AlinanTeklifSilV2](https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifsilv2/post.md): POST AlinanTeklifSilV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif ile ilgili evrak seri ve sira numarası ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri gönd
## Cari

 - [POST /API/APIMethods/CariGuncelleV2](https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1cariguncellev2/post.md): POST CariGuncelleV2 endpoint'i, ERP sisteminizde kayıtlı Cari bilgileri ile ilgili cari bilgileri üzerinde cari kodu cari ismi gibi alanlarda güncelleme işlemleri yapmak için kullanılır. Bu API endpoi
 - [POST /API/APIMethods/CariKaydetV2](https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carikaydetv2/post.md): POST CariKaydetV2 endpoint'i, ERP sisteminizde Cari ile ilgili yeni cari kaydı ekleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve e
 - [POST /Api/APIMethods/CariListesiV2](https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carilistesiv2/post.md): POST CariListesiV2 endpoint'i, ERP sisteminizde Listeler ile ilgili işlemler yapmak için kullanılır. Cari kayıtları listeleri, Jsonda belirtilen şartlara bağlı olarak listelenmesi sağlanır. Bu API end
 - [POST /Api/APIMethods/CariListesiV3](https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carilistesiv3/post.md): POST CariListesiV3 endpoint'i, ERP sisteminizde Listeler ile ilgili işlemler yapmak için kullanılır. Cari listeleri Jsonda belirtilen şartlara bağlı olarak listelenmesi sağlanır. Bu API endpoint'i üze
## Dekont

 - [POST /Api/apiMethods/DekontKaydetV2](https://apidocs.mikro.com.tr/apis/dekont/paths/~1api~1apimethods~1dekontkaydetv2/post.md): POST DekontKaydetV2 endpoint'i, ERP sisteminizde Dekont ile ilgili yeni dekont kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve et
 - [POST /Api/apiMethods/DekontSilV2](https://apidocs.mikro.com.tr/apis/dekont/paths/~1api~1apimethods~1dekontsilv2/post.md): POST DekontSilV2 endpoint'i, ERP sisteminizde Dekont ile ilgili kayıtlı dekont evrakı silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenl
## Depolar Arası Sipariş

 - [POST /Api/apiMethods/DepolarArasiSiparisDuzeltV2](https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparisduzeltv2/post.md): POST DepolarArasiSiparisDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Depolar Arası Sipariş evrakları ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri gönderere
 - [POST /Api/apiMethods/DepolarArasiSiparisGuidSilV2](https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparisguidsilv2/post.md): POST DepolarArasiSiparisGuidSilV2 endpoint'i, ERP sisteminizde Kayıtlı Depolar Arası Sipariş evrakı Guid bilgisi ile evrak silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden
 - [POST /Api/apiMethods/DepolarArasiSiparisKaydetV2](https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisipariskaydetv2/post.md): POST DepolarArasiSiparisKaydetV2 endpoint'i, ERP sisteminizde Depolar Arası Sipariş ile ilgili Yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işl
 - [POST /Api/apiMethods/DepolarArasiSiparisSilV2](https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparissilv2/post.md): POST DepolarArasiSiparisSilV2 endpoint'i, ERP sisteminizde Depolar Arası Sipariş evrakı, evrak seri ve sıra numarası ile evrak silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzeri
## E-Fatura işlemleri

 - [POST /API/APIMethods/FaturaPdfV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1faturapdfv2/post.md): POST FaturaPdfV2 endpoint'i, ERP sisteminizde Kayıtlı Fatura Guid bilgisi gönderimi ile BASE64 formatında fatura bilgilerini response'da sizlere sunan MikroAPI endpointidir. Bu API endpoint'i üzerind
 - [POST /API/APIMethods/GelenFaturaPdfV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturapdfv2/post.md): POST GelenFaturaPdfV2 endpoint'i, ERP sistemine gelen faturaların PDF formatında görüntülenmesi veya indirilmesi için kullanılır. Bu API üzerinden, ilgili faturaya ait UUID bilgisi gönderilerek PDF çı
 - [POST /Api/apiMethods/FaturaToEFaturaV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1faturatoefaturav2/post.md): POST FaturaToEFaturaV2 endpointi, ERP sisteminizde Kesilen faturaları Gib'e gönderimek için Bu API endpoint'i üzerinden istenilen verileri Jsonda Post ederek ilgili işlemleri hızlı, güvenli ve etkin
 - [POST /Api/apiMethods/GelenFaturalarKabulV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarkabulv2/post.md): POST GelenFaturalarKabulV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listeleme menüsünde, kabul etmek istediğiniz faturanın Guid bilgisi ile Post edilmesi halinde faturanın kabul işlemi için
 - [POST /Api/apiMethods/GelenFaturalarRedV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarredv2/post.md): POST GelenFaturalarRedV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listeleme menüsünde, Reddetmek etmek istediğiniz faturanın Guid bilgisi ile Post edilmesi halinde faturanın Red işlemi için
 - [POST /Api/apiMethods/GelenFaturalarV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarv2/post.md): POST GelenFaturalarV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listelenmesi için kullanılır Bu API endpoint'i üzerinden veri göndererek ilgili Listeleme işlemleri hızlı, güvenli ve etkin şe
 - [POST /API/APIMethods/EMukellefSorgulamaV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1emukellefsorgulamav2/post.md): `POST EMukellefSorgulamaV2` endpoint'i, e-Belge statüsü sorgulama işlemleri için kullanılır. Şu anda **e-Fatura** ve **e-Arşiv** mükellef sorgulama işlemleri desteklenmektedir. Bu endpoint ile, sorgul
 - [POST /API/APIMethods/EBelgeDurumSorgulamaV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1ebelgedurumsorgulamav2/post.md): POST EBelgeDurumSorgulamaV2 endpoint'i, GIB'e gönderilen e-Belgelerin durumunu sorgulama işlemleri için kullanılır. Şu anda **e-Fatura** ve **e-Arşiv** belgelerinin statü sorgulaması desteklenmektedir
 - [POST /API/APIMethods/EBelgeXMLV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1ebelgexmlv2/post.md): POST EBelgeXMLV2 endpoint'i, ERP sisteminizde kayıtlı gelen/gönderilen e-belgeler (e-fatura, e-arşiv, e-irsaliye) ile ilgili XML verisini sorgulamak için kullanılır. <br><br> <B>EFaturaTipi - 0 : G
 - [POST /API/APIMethods/TaslakEFaturaPdfV2](https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1taslakefaturapdfv2/post.md): POST TaslakEFaturaPdfV2 endpoint'i, ERP sisteminde oluşturulmuş taslak e-fatura, e-arşiv fatura ve e-müstahsil belgelerinin PDF formatında görüntülenmesi için kullanılır. Bu API üzerinden ilgili belge
## E-Arşiv işlemleri

 - [POST /API/APIMethods/EArsivIptalV2](https://apidocs.mikro.com.tr/apis/e-arsiv-islemleri/paths/~1api~1apimethods~1earsiviptalv2/post.md): POST EArsivIptalV2 endpoint'i, ERP sisteminde oluşturulmuş e-arşiv faturaların iptal edilmesi için kullanılır. Bu API üzerinden ilgili faturaya ait UUID bilgisi gönderilerek iptal işlemi gerçekleştiri
## E-irsaliye işlemleri

 - [POST /API/APIMethods/TaslakEIrsaliyePdfV2](https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1taslakeirsaliyepdfv2/post.md): POST TaslakEIrsaliyePdfV2 endpoint'i, ERP sisteminde oluşturulmuş taslak e-irsaliyelerin PDF formatında görüntülenmesi için kullanılır. Bu API üzerinden ilgili e-irsaliyenin seri ve sıra bilgileri ile
 - [POST /Api/apiMethods/EIrsaliyeGonderV2](https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyegonderv2/post.md): POST EIrsaliyeGonderV2 endpoint'i, ERP sisteminizde Kesilen irsaliyeleri Gib'e gönderimek için Bu API endpoint'i üzerinden istenilen verileri Jsonda Post ederek ilgili işlemleri hızlı, güvenli ve et
 - [POST /API/APIMethods/EIrsaliyePdfV2](https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyepdfv2/post.md): POST EIrsaliyePdfV2 endpoint'i, ERP sistemine gelen veya gönderilen e-irsaliyelerin PDF çıktısının alınabilmesi için kullanılır. - **EFaturaTipi = 0** → Gönderilen e-irsaliye (sth_Guid üzerinden erişi
 - [POST /API/APIMethods/EIrsaliyeListesiV2](https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyelistesiv2/post.md): POST EIrsaliyeListesiV2 endpoint'i, ERP sisteminizde kayıtlı gelen/gönderilen e-irsaliye kayıtlarını listelemek için kullanılır. EIrsaliyeTipi - 0 : Gönderilen, 1 : Gelen Bu API endpoint’i üzerinden t
## Etiket Basım Kaydet

 - [POST /Api/apiMethods/EtiketBasimKaydetV2](https://apidocs.mikro.com.tr/apis/etiket-basim-kaydet/paths/~1api~1apimethods~1etiketbasimkaydetv2/post.md): POST EtiketBasimKaydetV2 endpoint'i, ERP sisteminizde kayıtlı stok barkodlarından jsonda gönderilen stok koduna ait barkodlar için, Etiket Basım evrakı oluşturmak için kullanılır. Bu API endpoint'i üz
## Evrak Açıklamaları

 - [POST /Api/apiMethods/EvrakAciklamaDuzeltV2](https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamaduzeltv2/post.md): POST EvrakAciklamaDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Açıklamaları ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
 - [POST /Api/apiMethods/EvrakAciklamaKaydetV2](https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamakaydetv2/post.md): POST EvrakAciklamaKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Açıklamaları ile ilgili yeni açıklama kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili i
 - [POST /Api/apiMethods/EvrakAciklamaSilV2](https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamasilv2/post.md): POST EvrakAciklamaSilV2 endpoint'i, ERP sisteminizde Kayıtlı Evrak Açıklamaları ile ilgili açıklama silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
## Evrak Belge Resim

 - [POST /Api/apiMethods/EvrakBelgeResimKaydetV2](https://apidocs.mikro.com.tr/apis/evrak-belge-resim/paths/~1api~1apimethods~1evrakbelgeresimkaydetv2/post.md): POST EvrakBelgeResimKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Evraklara Belge-Resim ekleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, gü
 - [POST /Api/apiMethods/EvrakBelgeResimSilV2](https://apidocs.mikro.com.tr/apis/evrak-belge-resim/paths/~1api~1apimethods~1evrakbelgeresimsilv2/post.md): POST EvrakBelgeResimSilV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Belge Resim gibi eklentileri silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili i
## Fiyat Değişikliği

 - [POST /Api/apiMethods/FiyatDegisikligiKaydetV2](https://apidocs.mikro.com.tr/apis/fiyat-degisikligi/paths/~1api~1apimethods~1fiyatdegisikligikaydetv2/post.md): POST FiyatDegisikligiKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Fiyat Listeleri içerisinde Stok Fiyat güncelleme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndere
## Image Data

 - [POST /API/APIMethods/ImageDataGetirV2](https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatagetirv2/post.md): POST ImageDataGetirV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde g
 - [POST /API/APIMethods/ImageDataKaydetV2](https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatakaydetv2/post.md): POST ImageDataKaydetV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde
 - [POST /API/APIMethods/ImageDataSilV2](https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatasilv2/post.md): POST ImageDataSilV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde ger
## İrsaliye

 - [POST /Api/apiMethods/IrsaliyeDuzeltV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyeduzeltv2/post.md): POST IrsaliyeDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli
 - [POST /Api/apiMethods/IrsaliyeKaydetV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyekaydetv2/post.md): POST IrsaliyeKaydetV2 endpoint'i, ERP sisteminizde İrsaliye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve
 - [POST /Api/apiMethods/IrsaliyeSatirSilV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyesatirsilv2/post.md): POST IrsaliyeSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye evrakları ile ilgili evrak satır silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işleml
 - [POST /Api/apiMethods/IrsaliyeSilV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyesilv2/post.md): POST IrsaliyeSilV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güv
 - [POST /api/APIMethods/SiparistenIrsaliyeOlusturmaV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1siparistenirsaliyeolusturmav2/post.md): POST SiparistenIrsaliyeOlusturmaV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş üzerinden irsaliye evrakı oluşturma ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndere
 - [POST /API/APIMethods/IrsaliyedenFaturaOlusturmaV2](https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyedenfaturaolusturmav2/post.md): POST IrsaliyedenFaturaOlusturmaV2 endpoint'i, ERP sisteminizde kayıtlı olan irsaliyelerden hızlı ve güvenli bir şekilde fatura oluşturmak için kullanılır. Bu API endpoint'i üzerinden gönderilecek irsa
## Kasa Masraf Fişi

 - [POST /Api/apiMethods/KasaMasrafFisiKaydetV2](https://apidocs.mikro.com.tr/apis/kasa-masraf-fisi/paths/~1api~1apimethods~1kasamasraffisikaydetv2/post.md): POST KasaMasrafFisiKaydetV2 endpoint'i, ERP sisteminizde Kasa Masraf Fişi ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hız
## Listeler

 - [POST /Api/APIMethods/KullaniciListesiV2](https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1kullanicilistesiv2/post.md): POST KullaniciListesiV2 endpoint'i, ERP sisteminizde kayıtlı kullanıcılar ile ilgili kayıtlı kullanıcı bilgilerini response'da sizlere listelemek için kullanılır. Bu API endpoint'i üzerinden veri gönd
 - [POST /Api/APIMethods/KullaniciParametreleriV2](https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1kullaniciparametreleriv2/post.md): POST KullaniciParametreleriV2 endpoint'i, ERP sisteminizde Kayıtlı Jsonda post edilen kullanıcının yetkilerini sizlere response'da listelemek için kullanılır. Bu API endpoint'i üzerinden veri gönderer
 - [POST /Api/APIMethods/VergiListesiV2](https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1vergilistesiv2/post.md): POST VergiListesiV2 endpoint'i, ERP sisteminizde Kayıtlı Vergi oranlarını listelemek için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçe
## Muhasebe

 - [POST /Api/apiMethods/MuhasebeFisKaydetV2](https://apidocs.mikro.com.tr/apis/muhasebe/paths/~1api~1apimethods~1muhasebefiskaydetv2/post.md): POST MuhasebeFisKaydetV2 endpoint'i, ERP sisteminizde Muhasebe ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli
 - [POST /Api/apiMethods/MuhasebeFisSilV2](https://apidocs.mikro.com.tr/apis/muhasebe/paths/~1api~1apimethods~1muhasebefissilv2/post.md): POST MuhasebeFisSilV2 endpoint'i, ERP sisteminizde kayıtlı Muhasebe fişi ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, gü
## Operasyon Tamamlama

 - [POST /Api/apiMethods/OperasyonTamamlamaFisKaydetV2](https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafiskaydetv2/post.md): POST OperasyonTamamlamaFisKaydetV2 endpoint'i, ERP sisteminizde Operasyon Tamamlama Fişi ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı,
 - [POST /Api/apiMethods/OperasyonTamamlamaFisSilV2](https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafissilv2/post.md): POST OperasyonTamamlamaFisSilV2 endpoint'i, ERP sisteminizde kayıtlı Operasyon Tamamlama Fişi ile ilgili kayıtlı evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri gönderer
 - [POST /API/APIMethods/OperasyonTamamlamaFisDuzeltV2](https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafisduzeltv2/post.md): Bu endpoint ile üretim operasyonlarına ait fişlerde düzeltme işlemi yapılabilir. Gönderilen evraklar ve satırlar üzerinden operasyon tamamlama bilgileri güncellenir.
 - [POST /API/APIMethods/OperasyonTamamlamaFisDuzelt](https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafisduzelt/post.md): Bu endpoint ile üretim operasyonlarına ait fişlerde düzeltme işlemi yapılabilir. Her bir satır, ilgili operasyon satırını temsil eder ve miktar değerleriyle birlikte güncellenir. <br><br> **V2 Endpoin
## Personel

 - [POST /API/APIMethods/PersonelKaydetV2](https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelkaydetv2/post.md): POST PersonelKaydetV2 endpoint'i, ERP sisteminizde Personel ile ilgili yeni personel kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli
 - [POST /API/APIMethods/PersonelizinKaydetV2](https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelizinkaydetv2/post.md): POST PersonelizinKaydetV2 endpoint'i, ERP sisteminizde Personel ile ilgili izin kullanımı kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, gü
 - [POST /API/APIMethods/PersonelPuantajKaydetV2](https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelpuantajkaydetv2/post.md): POST PersonelPuantajKaydetV2 endpoint'i, ERP sisteminizdeki personel puantaj (çalışma günü, ek kazanç, sosyal yardım vb.) verilerini sisteme kaydetmek, güncellemek veya silmek için kullanılır. Bu API,
## Proforma Sipariş

 - [POST /Api/apiMethods/ProformaSiparisKaydetV2](https://apidocs.mikro.com.tr/apis/proforma-siparis/paths/~1api~1apimethods~1proformasipariskaydetv2/post.md): POST ProformaSiparisKaydetV2 endpoint'i, ERP sisteminizde Proforma Sipariş ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hı
 - [POST /Api/apiMethods/ProformaSiparisSilV2](https://apidocs.mikro.com.tr/apis/proforma-siparis/paths/~1api~1apimethods~1proformasiparissilv2/post.md): POST ProformaSiparisSilV2 endpoint'i, ERP sisteminizde kayıtlı Proforma Sipariş ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hı
## Satın Alma Şartı

 - [POST /api/APIMethods/SatinAlmaSartiKaydetV2](https://apidocs.mikro.com.tr/apis/satin-alma-sarti/paths/~1api~1apimethods~1satinalmasartikaydetv2/post.md): POST SatinAlmaSartiKaydetV2 endpoint'i, ERP sisteminizde Satın Alma Şartı ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hız
 - [POST /api/APIMethods/SatinAlmaSartiSilV2](https://apidocs.mikro.com.tr/apis/satin-alma-sarti/paths/~1api~1apimethods~1satinalmasartisilv2/post.md): POST SatinAlmaSartiSilV2 endpoint'i, ERP sisteminizde kayıtlı Satın Alma Şartı evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işleml
## Satın Alma Talep

 - [POST /api/APIMethods/SatinAlmaTalepKaydetV2](https://apidocs.mikro.com.tr/apis/satin-alma-talep/paths/~1api~1apimethods~1satinalmatalepkaydetv2/post.md): POST SatinAlmaTalepKaydetV2 endpoint'i, ERP sisteminizde Satın Alma Talep evrakı ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işleml
 - [POST /api/APIMethods/SatinAlmaTalepSilV2](https://apidocs.mikro.com.tr/apis/satin-alma-talep/paths/~1api~1apimethods~1satinalmatalepsilv2/post.md): POST SatinAlmaTalepSilV2 endpoint'i, ERP sisteminizde kayıtlı Satın Alma Talep evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işleml
## Satış Şartı

 - [POST /api/APIMethods/SatisSartiDuzeltV2](https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartiduzeltv2/post.md): POST SatisSartiDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hız
 - [POST /api/APIMethods/SatisSartiGuidSilV2](https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartiguidsilv2/post.md): POST SatisSartiGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili kayıtlı evrak Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden ver
 - [POST /api/APIMethods/SatisSartiKaydetV2](https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartikaydetv2/post.md): POST SatisSartiKaydetV2 endpoint'i, ERP sisteminizde Satış Şartı evrakı ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı
 - [POST /api/APIMethods/SatisSartiSilV2](https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartisilv2/post.md): POST SatisSartiSilV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı
## Sayım Sonuç

 - [POST /Api/apiMethods/SayimSonuclariDuzeltV2](https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclariduzeltv2/post.md): POST SayimSonuclariDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuçları ile ilgili evrak güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işleml
 - [POST /Api/apiMethods/SayimSonuclariKaydetV2](https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarikaydetv2/post.md): POST SayimSonuclariKaydetV2 endpoint'i, ERP sisteminizde Sayım Sonuç Kaydet ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri h
 - [POST /Api/apiMethods/SayimSonuclariSatirSilV2](https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarisatirsilv2/post.md): POST SayimSonuclariSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuç evrakı üzerinde satır silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgil
 - [POST /Api/apiMethods/SayimSonuclariSilV2](https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarisilv2/post.md): POST SayimSonuclariSilV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuç evrak silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, gü
 - [POST /api/apiMethods/SayimKesinlestirmeV2](https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimkesinlestirmev2/post.md): Bu endpoint, belirli bir depo ve tarih için sayım evraklarını kesinleştirmek amacıyla kullanılır.
## Sipariş

 - [POST /Api/apiMethods/SiparisDuzeltV2](https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparisduzeltv2/post.md): Sipariş güncelleme işlemi için kullanılan API. Bu API, mevcut bir sipariş kaydının bilgilerini günceller.
 - [POST /Api/apiMethods/SiparisGuidSilV2](https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparisguidsilv2/post.md): POST SiparisGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş ile ilgili Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemler
 - [POST /Api/apiMethods/SiparisKaydetV2](https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1sipariskaydetv2/post.md): POST SiparisKaydetV2 endpoint'i, Sipariş evraklarınızı APİ üzerinden ERP sisteminize Post etmek için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili Sipariş işlemlerinizi hızlı, güvenl
 - [POST /Api/apiMethods/SiparisSilV2](https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparissilv2/post.md): POST SiparisSilV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve e
## Stok

 - [POST /API/APIMethods/StokKaydetV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1stokkaydetv2/post.md): POST StokKaydetV2 endpoint'i, ERP sisteminizde Stok ile ilgili Yeni stok kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şe
 - [POST /Api/APIMethods/StokListesiV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1stoklistesiv2/post.md): POST StokListesiV2 endpoint'i, ERP sisteminizde Kayıtlı Stok bilgilerinizi sizlere Response'da listelemek için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli v
 - [POST /Api/apiMethods/DahiliStokHareketDuzeltV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketduzeltv2/post.md): POST DahiliStokHareketDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgil
 - [POST /Api/apiMethods/DahiliStokHareketGuidSilV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketguidsilv2/post.md): POST DahiliStokHareketGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden ve
 - [POST /Api/apiMethods/DahiliStokHareketKaydetV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketkaydetv2/post.md): POST DahiliStokHareketKaydetV2 endpoint'i, ERP sisteminizde Stok hareketleri evrakları ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili
 - [POST /Api/apiMethods/DahiliStokHareketSilV2](https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketsilv2/post.md): POST DahiliStokHareketSilV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili evrak tip, seri ve sıra numarası ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoin
## Tahsilat Tediye

 - [POST /Api/apiMethods/TahsilatTediyeDuzeltV2](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyeduzeltv2/post.md): POST TahsilatTediyeDuzeltV2 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili evrak güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızl
 - [POST /Api/apiMethods/TahsilatTediyeGuidSilV2](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyeguidsilv2/post.md): POST TahsilatTediyeGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Tahsilat Tediye ile ilgili evrak Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri gönde
 - [POST /Api/apiMethods/TahsilatTediyeKaydetV2](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyekaydetv2/post.md): POST TahsilatTediyeKaydetV2 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızl
 - [POST /Api/apiMethods/TahsilatTediyeKaydetV3](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyekaydetv3/post.md): POST TahsilatTediyeKaydetV3 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızl
 - [POST /Api/apiMethods/TahsilatTediyeSCKaydet](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyesckaydet/post.md): POST TahsilatTediyeSCKaydet endpoint'i, ERP sisteminizde Tahsilat Tediye evrakı ile ilgili senet çıkış işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hı
 - [POST /Api/apiMethods/TahsilatTediyeSilV2](https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyesilv2/post.md): POST TahsilatTediyeSilV2 endpoint'i, ERP sisteminizde kayıtlı Tahsilat Tediye ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızl
## Üretim

 - [POST /API/APIMethods/UretimIsEmriOlusturV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimisemriolusturv2/post.md): POST UretimIsEmriOlusturV2 endpoint'i, ERP sisteminizde Üretim İş Emri ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin
 - [POST /Api/APIMethods/UretimTalepGuidSilV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepguidsilv2/post.md): POST UretimTalepGuidSilV2 endpoint'i, ERP sisteminizde Üretim Talebi Guid bilgisi göndererek Talep silme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili
 - [POST /Api/APIMethods/UretimTalepKaydetV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepkaydetv2/post.md): POST UretimTalepKaydetV2 endpoint'i, ERP sisteminizde Üretim Talep ile ilgili Yeni üretim talebi kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hı
 - [POST /Api/APIMethods/UretimTalepSilV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepsilv2/post.md): POST UretimTalepSilV2 endpoint'i, ERP sisteminizde Üretim Talep ile ilgili Evrak Seri ve sıra bilgisi ile talep silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgi
 - [POST /Api/apiMethods/UretimRotaPlanKaydetV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimrotaplankaydetv2/post.md): POST UretimRotaPlanKaydetV2 endpoint'i, ERP sisteminizde Ürün Rota Plan ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı
 - [POST /Api/apiMethods/UretimRotaPlanSilV2](https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimrotaplansilv2/post.md): POST UretimRotaPlanSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Rota Plan evrakı ile ilgili evrak seri ve sıra numarası ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden
## Ürün Reçete

 - [POST /Api/apiMethods/UrunReceteKaydetV2](https://apidocs.mikro.com.tr/apis/urun-recete/paths/~1api~1apimethods~1urunrecetekaydetv2/post.md): POST UrunReceteKaydetV2 endpoint'i, ERP sisteminizde Ürün Reçete ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güven
 - [POST /Api/apiMethods/UrunReceteSilV2](https://apidocs.mikro.com.tr/apis/urun-recete/paths/~1api~1apimethods~1urunrecetesilv2/post.md): POST UrunReceteSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Reçete ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güven
## Ürün Rota

 - [POST /Api/apiMethods/UrunRotaKaydetV2](https://apidocs.mikro.com.tr/apis/urun-rota/paths/~1api~1apimethods~1urunrotakaydetv2/post.md): POST UrunRotaKaydetV2 endpoint'i, ERP sisteminizde Ürün Rota ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli v
 - [POST /Api/apiMethods/UrunRotaSilV2](https://apidocs.mikro.com.tr/apis/urun-rota/paths/~1api~1apimethods~1urunrotasilv2/post.md): POST UrunRotaSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Rota ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli v
## Verilen Teklif

 - [POST /Api/apiMethods/VerilenTeklifDuzeltV2](https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifduzeltv2/post.md): POST VerilenTeklifDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı ile ilgili güncelleme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemle
 - [POST /Api/apiMethods/VerilenTeklifGuidSilV2](https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifguidsilv2/post.md): POST VerilenTeklifGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili
 - [POST /Api/apiMethods/VerilenTeklifKaydetV2](https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifkaydetv2/post.md): POST VerilenTeklifKaydetV2 endpoint'i, ERP sisteminizde Verilen Teklif evrakı yeni kayıt ekleme ile ilgili işlemler yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
 - [POST /Api/apiMethods/VerilenTeklifSilV2](https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifsilv2/post.md): POST VerilenTeklifSilV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri
## SQL Sorgulama

 - [POST /Api/apiMethods/SqlVeriOkuV2](https://apidocs.mikro.com.tr/apis/sql-sorgulama/paths/~1api~1apimethods~1sqlveriokuv2/post.md): POST SqlVeriOkuV2 endpoint'i, ERP sisteminizde DB erişimini API üzerinden Sağlayarak İstediğiniz database tablolarında Select işlemleri yapmak için kullanılır. Bu API endpoint'i üzerinden veri gönde
 - [POST /API/APIMethods/KayıtOkuV2](https://apidocs.mikro.com.tr/apis/sql-sorgulama/paths/~1api~1apimethods~1kay%C4%B1tokuv2/post.md): POST KayıtOkuV2 endpointi Veri tabanı üzerinden tablo numarası ilettiğiniz tabloların veri sorgulama işlemleri için kullanılır. Bu endpoint ile, Tablo No ve Tarhi aralığı bilgisi gönderilerek, ilgili
## Kayıt Kaydet

 - [POST /Api/apiMethods/KayitKaydetTopluV2](https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1kayitkaydettopluv2/post.md): POST KayitKaydetV2 endpoint'i, ERP sisteminizde Mikro tablo numarası ile istenilen tablolara doğrudan kayıt ekleme işlemleri yapmak için kullanılır. Bu işlem özellikle tanım tabloları için uygundur. E
 - [POST /Api/apiMethods/KayitKaydetV2](https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1kayitkaydetv2/post.md): POST KayitKaydetV2 endpoint'i, ERP sisteminizde Kayıt Kaydet ile Jsonda mikro tablo numarası ile istenilen tablolara doğrudan kayıt ekleme işlemleri yapmak için kullanılır. Tanım tabloları için öneril
 - [POST /API/APIMethods/TextDataKaydetV2](https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1textdatakaydetv2/post.md): POST TextDataKaydetV2 endpoint'i, ERP sistemindeki kayıtlarla ilişkilendirilmiş metin (Text Data) bilgilerinin kaydedilmesi veya güncellenmesi için kullanılır. Bu API üzerinden ilgili kaydın UID bilgi

---

# UC NOKTA DETAYLARI


<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adresduzeltv2/post.md -->

# Adres Duzelt V2 Update

POST AdresDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı olan cari adresleri üzerinde Düzenleme, Güncelleme gibi işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/AdresDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.adresler` (array)

  - `Mikro.adresler.adr_Guid` (string)

  - `Mikro.adresler.adr_cadde` (string)

  - `Mikro.adresler.adr_mahalle` (string)

  - `Mikro.adresler.adr_sokak` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adreskaydetv2/post.md -->

# Adres kaydet V2 Save

POST AdresKaydetV2 endpoint'i, ERP sisteminizde kayıtlı cari Adresleri ile ilgili yeni cari adres kaydı ekleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/AdresKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.adresler` (array)

  - `Mikro.adresler.adr_Apt_No` (string)

  - `Mikro.adresler.adr_Daire_No` (string)

  - `Mikro.adresler.adr_Semt` (string)

  - `Mikro.adresler.adr_cadde` (string)

  - `Mikro.adresler.adr_cari_kod` (string)

  - `Mikro.adresler.adr_il` (string)

  - `Mikro.adresler.adr_ilce` (string)

  - `Mikro.adresler.adr_mahalle` (string)

  - `Mikro.adresler.adr_posta_kodu` (integer)

  - `Mikro.adresler.adr_sokak` (string)

  - `Mikro.adresler.adr_tel_bolge_kodu` (string)

  - `Mikro.adresler.adr_tel_faxno` (string)

  - `Mikro.adresler.adr_tel_no1` (string)

  - `Mikro.adresler.adr_tel_no2` (string)

  - `Mikro.adresler.adr_tel_ulke_kodu` (string)

  - `Mikro.adresler.adr_ulke` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/adres/paths/~1api~1apimethods~1adressilv2/post.md -->

# Adres Sil V2 Delete

POST AdresSilV2 endpoint'i, ERP sisteminizde kayıtlı cari Adresleri ile ilgili adres silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/AdresSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.adresler` (array)

  - `Mikro.adresler.adr_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragiduzeltv2/post.md -->

# Alım Satım Evrağı Satır Ekle V2 Add Guid

POST AlimSatimEvragiDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura ile ilgili düzenleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlimSatimEvragiDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_EArsiv_Il` (string)

  - `Mikro.evraklar.cha_EArsiv_Vkn` (string)

  - `Mikro.evraklar.cha_EArsiv_daire_adi` (string)

  - `Mikro.evraklar.cha_EArsiv_mail` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_bolge_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_no` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_ulke_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_ulke` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_ad` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_soyad` (string)

  - `Mikro.evraklar.cha_aciklama` (string)

  - `Mikro.evraklar.cha_aratoplam` (number)

  - `Mikro.evraklar.cha_cari_cins` (integer)

  - `Mikro.evraklar.cha_cinsi` (integer)

  - `Mikro.evraklar.cha_d_cins` (integer)

  - `Mikro.evraklar.cha_d_kur` (integer)

  - `Mikro.evraklar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_evrakno_sira` (integer)

  - `Mikro.evraklar.cha_ft_iskonto1` (number)

  - `Mikro.evraklar.cha_isk_mas1` (string)

  - `Mikro.evraklar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.cha_kasa_hizmet` (integer)

  - `Mikro.evraklar.cha_kod` (string)

  - `Mikro.evraklar.cha_miktari` (string)

  - `Mikro.evraklar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.cha_projekodu` (string)

  - `Mikro.evraklar.cha_satici_kodu` (string)

  - `Mikro.evraklar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.cha_subeno` (integer)

  - `Mikro.evraklar.cha_tarihi` (string)

  - `Mikro.evraklar.cha_tip` (integer)

  - `Mikro.evraklar.cha_vade` (integer)

  - `Mikro.evraklar.cha_vergipntr` (number)

  - `Mikro.evraklar.detay` (array)

  - `Mikro.evraklar.detay.sth_aciklama` (string)

  - `Mikro.evraklar.detay.sth_birim_pntr` (integer)

  - `Mikro.evraklar.detay.sth_cari_cinsi` (integer)

  - `Mikro.evraklar.detay.sth_cari_kodu` (string)

  - `Mikro.evraklar.detay.sth_cari_srm_merkezi` (string)

  - `Mikro.evraklar.detay.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.detay.sth_cins` (integer)

  - `Mikro.evraklar.detay.sth_evrakno_seri` (string)

  - `Mikro.evraklar.detay.sth_evraktip` (integer)

  - `Mikro.evraklar.detay.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.detay.sth_miktar` (integer)

  - `Mikro.evraklar.detay.sth_normal_iade` (integer)

  - `Mikro.evraklar.detay.sth_stok_kod` (string)

  - `Mikro.evraklar.detay.sth_stok_srm_merkezi` (string)

  - `Mikro.evraklar.detay.sth_subeno` (integer)

  - `Mikro.evraklar.detay.sth_tarih` (string)

  - `Mikro.evraklar.detay.sth_tip` (integer)

  - `Mikro.evraklar.detay.sth_tutar` (integer)

  - `Mikro.evraklar.detay.sth_vergi` (integer)

  - `Mikro.evraklar.detay.user_tablo` (array)

  - `Mikro.evraklar.detay.user_tablo.Craftgate_Id` (string)

  - `Mikro.evraklar.detay.user_tablo.CreditReferenceNumber` (string)

  - `Mikro.evraklar.detay.user_tablo.CreditRelationCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.IntallmentCount` (integer)

  - `Mikro.evraklar.detay.user_tablo.InterestAmount` (integer)

  - `Mikro.evraklar.detay.user_tablo.RentalCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.TransactionReferenceId` (string)

  - `Mikro.evraklar.detay.user_tablo.WebSupportCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.test` (string)

  - `Mikro.evraklar.ebelge_detay` (array)

  - `Mikro.evraklar.ebelge_detay.ebh_odeme_sekli` (integer)

  - `Mikro.evraklar.ebelge_detay.ebh_satisin_webadresi` (string)

  - `Mikro.evraklar.kdv_istisna_kodu` (string)

  - `Mikro.evraklar.odemeler` (array)

  - `Mikro.evraklar.user_tablo` (array)

  - `Mikro.evraklar.user_tablo.CreditReferenceNumber` (string)

  - `Mikro.evraklar.user_tablo.CreditRelationCustomer` (string)

  - `Mikro.evraklar.user_tablo.DetailDescription1` (string)

  - `Mikro.evraklar.user_tablo.DetailDescription2` (string)

  - `Mikro.evraklar.user_tablo.RegisteredEMailAccount` (string)

  - `Mikro.evraklar.user_tablo.RentalCustomer` (string)

  - `Mikro.evraklar.user_tablo.SubDealer` (string)

  - `Mikro.evraklar.user_tablo.WebSupportCustomer` (string)

  - `Mikro.evraklar.user_tablo.WebSupportStartDate` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragikaydetv2/post.md -->

# Alım Satım Evrağı Kaydet V2 Save

POST AlimSatimEvragiKaydetV2 endpoint'i, ERP sisteminizde stok, hizmet ve masraf kalemlerini aynı evrak içerisinde kaydetmek için kullanılır.

Endpoint: POST /Api/apiMethods/AlimSatimEvragiKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_tarihi` (string)

  - `Mikro.evraklar.cha_tip` (string)

  - `Mikro.evraklar.cha_cinsi` (string)

  - `Mikro.evraklar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.cha_evrak_tip` (string)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_evrakno_sira` (integer)

  - `Mikro.evraklar.cha_kod` (string)

  - `Mikro.evraklar.cha_aratoplam` (number)

  - `Mikro.evraklar.cha_vergipntr` (number)

  - `Mikro.evraklar.detay` (array)

  - `Mikro.evraklar.detay.sth_stok_kod` (string)

  - `Mikro.evraklar.detay.sth_miktar` (number)

  - `Mikro.evraklar.detay.sth_tutar` (number)

  - `Mikro.evraklar.detay.renk_beden` (array)

  - `Mikro.evraklar.detay.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.detay.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.detay.renk_beden.miktar` (number)

  - `Mikro.evraklar.hizmet_masraf_detay` (array)

  - `Mikro.evraklar.hizmet_masraf_detay.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.hizmet_masraf_detay.cha_kasa_hizmet` (string)

  - `Mikro.evraklar.hizmet_masraf_detay.cha_miktari` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragisatirsilv2/post.md -->

# Alım Satım Evrağı Guid Sil V2 Delete Guid

POST AlimSatimEvragiSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura üzerinde satır silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlimSatimEvragiSatirSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1alimsatimevragisilv2/post.md -->

# Alım Satım Evrağı Sil V2 Delete

POST AlimSatimEvragiSilV2 endpoint'i, ERP sisteminizde kayıtlı Alım Satım Evrakı - Fatura silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlimSatimEvragiSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_evrak_tip` (string)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_evrakno_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1faturakaydetv2/post.md -->

# Fatura Kaydet V2 Save

POST FaturaKaydetV2 endpoint'i, ERP sisteminizde Alım Satım Evrakı - Fatura ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.Post edilecek parametre bilgilerine mikro veri tabanı-tablo alan yapıları üzerinden ulaşabilirsiniz.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/FaturaKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_EArsiv_Il` (string)

  - `Mikro.evraklar.cha_EArsiv_Vkn` (string)

  - `Mikro.evraklar.cha_EArsiv_daire_adi` (string)

  - `Mikro.evraklar.cha_EArsiv_mail` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_bolge_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_no` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_ulke_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_ulke` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_ad` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_soyad` (string)

  - `Mikro.evraklar.cha_aciklama` (string)

  - `Mikro.evraklar.cha_aratoplam` (number)

  - `Mikro.evraklar.cha_cari_cins` (integer)

  - `Mikro.evraklar.cha_cinsi` (integer)

  - `Mikro.evraklar.cha_d_cins` (integer)

  - `Mikro.evraklar.cha_d_kur` (integer)

  - `Mikro.evraklar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_ft_iskonto1` (number)

  - `Mikro.evraklar.cha_isk_mas1` (string)

  - `Mikro.evraklar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.cha_kasa_hizmet` (integer)

  - `Mikro.evraklar.cha_kod` (string)

  - `Mikro.evraklar.cha_miktari` (string)

  - `Mikro.evraklar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.cha_projekodu` (string)

  - `Mikro.evraklar.cha_satici_kodu` (string)

  - `Mikro.evraklar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.cha_subeno` (integer)

  - `Mikro.evraklar.cha_tarihi` (string)

  - `Mikro.evraklar.cha_tip` (integer)

  - `Mikro.evraklar.cha_vade` (integer)

  - `Mikro.evraklar.cha_vergipntr` (number)

  - `Mikro.evraklar.detay` (array)

  - `Mikro.evraklar.detay.sth_aciklama` (string)

  - `Mikro.evraklar.detay.sth_birim_pntr` (integer)

  - `Mikro.evraklar.detay.sth_cari_cinsi` (integer)

  - `Mikro.evraklar.detay.sth_cari_kodu` (string)

  - `Mikro.evraklar.detay.sth_cari_srm_merkezi` (string)

  - `Mikro.evraklar.detay.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.detay.sth_cins` (integer)

  - `Mikro.evraklar.detay.sth_evrakno_seri` (string)

  - `Mikro.evraklar.detay.sth_evraktip` (integer)

  - `Mikro.evraklar.detay.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.detay.sth_miktar` (integer)

  - `Mikro.evraklar.detay.sth_normal_iade` (integer)

  - `Mikro.evraklar.detay.sth_stok_kod` (string)

  - `Mikro.evraklar.detay.sth_stok_srm_merkezi` (string)

  - `Mikro.evraklar.detay.sth_subeno` (integer)

  - `Mikro.evraklar.detay.sth_tarih` (string)

  - `Mikro.evraklar.detay.sth_tip` (integer)

  - `Mikro.evraklar.detay.sth_tutar` (integer)

  - `Mikro.evraklar.detay.sth_vergi` (integer)

  - `Mikro.evraklar.detay.user_tablo` (array)

  - `Mikro.evraklar.detay.user_tablo.Craftgate_Id` (string)

  - `Mikro.evraklar.detay.user_tablo.CreditReferenceNumber` (string)

  - `Mikro.evraklar.detay.user_tablo.CreditRelationCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.IntallmentCount` (integer)

  - `Mikro.evraklar.detay.user_tablo.InterestAmount` (integer)

  - `Mikro.evraklar.detay.user_tablo.RentalCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.TransactionReferenceId` (string)

  - `Mikro.evraklar.detay.user_tablo.WebSupportCustomerId` (string)

  - `Mikro.evraklar.detay.user_tablo.test` (string)

  - `Mikro.evraklar.ebelge_detay` (array)

  - `Mikro.evraklar.ebelge_detay.ebh_odeme_sekli` (integer)

  - `Mikro.evraklar.ebelge_detay.ebh_satisin_webadresi` (string)

  - `Mikro.evraklar.kdv_istisna_kodu` (string)

  - `Mikro.evraklar.odemeler` (array)

  - `Mikro.evraklar.user_tablo` (array)

  - `Mikro.evraklar.user_tablo.CreditReferenceNumber` (string)

  - `Mikro.evraklar.user_tablo.CreditRelationCustomer` (string)

  - `Mikro.evraklar.user_tablo.DetailDescription1` (string)

  - `Mikro.evraklar.user_tablo.DetailDescription2` (string)

  - `Mikro.evraklar.user_tablo.RegisteredEMailAccount` (string)

  - `Mikro.evraklar.user_tablo.RentalCustomer` (string)

  - `Mikro.evraklar.user_tablo.SubDealer` (string)

  - `Mikro.evraklar.user_tablo.WebSupportCustomer` (string)

  - `Mikro.evraklar.user_tablo.WebSupportStartDate` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1faturakaydetv3/post.md -->

# Fatura Kaydet V3 Save

POST FaturaKaydetV3 endpoint'i, ERP sisteminizde Alım Satım Evrakı - Fatura ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/FaturaKaydetV3
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_EArsiv_Il` (string)

  - `Mikro.evraklar.cha_EArsiv_Vkn` (string)

  - `Mikro.evraklar.cha_EArsiv_daire_adi` (string)

  - `Mikro.evraklar.cha_EArsiv_mail` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_bolge_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_no` (string)

  - `Mikro.evraklar.cha_EArsiv_tel_ulke_kod` (string)

  - `Mikro.evraklar.cha_EArsiv_ulke` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_ad` (string)

  - `Mikro.evraklar.cha_EArsiv_unvani_soyad` (string)

  - `Mikro.evraklar.cha_aciklama` (string)

  - `Mikro.evraklar.cha_aratoplam` (number)

  - `Mikro.evraklar.cha_cari_cins` (integer)

  - `Mikro.evraklar.cha_cinsi` (integer)

  - `Mikro.evraklar.cha_d_cins` (integer)

  - `Mikro.evraklar.cha_d_kur` (integer)

  - `Mikro.evraklar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_ft_iskonto1` (number)

  - `Mikro.evraklar.cha_isk_mas1` (string)

  - `Mikro.evraklar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.cha_kasa_hizmet` (string)

  - `Mikro.evraklar.cha_kod` (string)

  - `Mikro.evraklar.cha_miktari` (string)

  - `Mikro.evraklar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.cha_projekodu` (string)

  - `Mikro.evraklar.cha_satici_kodu` (string)

  - `Mikro.evraklar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.cha_subeno` (integer)

  - `Mikro.evraklar.cha_tarihi` (string)

  - `Mikro.evraklar.cha_tip` (integer)

  - `Mikro.evraklar.cha_vade` (integer)

  - `Mikro.evraklar.cha_vergipntr` (number)

  - `Mikro.evraklar.kdv_istisna_kodu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alim-satim-evraki-fatura/paths/~1api~1apimethods~1siparistenfaturaolusturmav2/post.md -->

# Siparisten Fatura Olusturma

POST SiparistenFaturaOlusturmaV2 endpoint'i, ERP sisteminizde Kesilen siparişleri faturalaştırmak için Bu API endpoint'i üzerinden  istenilen verileri Jsonda Post ederek  ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirmenizi sağlar.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SiparistenFaturaOlusturmaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.banka_hesap_kodu` (string)

  - `Mikro.evraklar.fatura_aciklama` (string)

  - `Mikro.evraklar.fatura_evrak_seri` (string)

  - `Mikro.evraklar.sip_cins` (integer)

  - `Mikro.evraklar.sip_evrakno_seri` (string)

  - `Mikro.evraklar.sip_evrakno_sira` (integer)

  - `Mikro.evraklar.sip_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifduzeltv2/post.md -->

# Alınan Teklif Guid Ekle V2 Add Guid

POST AlinanTeklifDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif evrakı güncelleme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlinanTeklifDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.altkl_aciklama` (string)

  - `Mikro.evraklar.satirlar.altkl_belge_no` (string)

  - `Mikro.evraklar.satirlar.altkl_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.altkl_birim_fiyati` (integer)

  - `Mikro.evraklar.satirlar.altkl_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.altkl_cari_adres_no` (integer)

  - `Mikro.evraklar.satirlar.altkl_cari_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_cari_tipi` (integer)

  - `Mikro.evraklar.satirlar.altkl_doviz_cins` (integer)

  - `Mikro.evraklar.satirlar.altkl_fiyat_liste_no` (integer)

  - `Mikro.evraklar.satirlar.altkl_hareket_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_hareket_tipi` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas1` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas10` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas2` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas3` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas4` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas5` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas6` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas7` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas8` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas9` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto1` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto2` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto3` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto4` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto5` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto6` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf1` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf2` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf3` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf4` (integer)

  - `Mikro.evraklar.satirlar.altkl_miktar` (integer)

  - `Mikro.evraklar.satirlar.altkl_paket_kod` (string)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas1` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas10` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas2` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas3` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas4` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas5` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas6` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas7` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas8` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas9` (integer)

  - `Mikro.evraklar.satirlar.altkl_sira_no` (string)

  - `Mikro.evraklar.satirlar.altkl_tarihi` (string)

  - `Mikro.evraklar.satirlar.altkl_teklif_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_teslim_turu` (string)

  - `Mikro.evraklar.satirlar.altkl_teslimat_tarihi` (string)

  - `Mikro.evraklar.satirlar.altkl_teslimdepo` (integer)

  - `Mikro.evraklar.satirlar.altkl_tutar` (integer)

  - `Mikro.evraklar.satirlar.altkl_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.altkl_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifguidsilv2/post.md -->

# Alınan Teklif Guid Sil V2 Delete Guid

POST AlinanTeklifGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif evrakı Guid bilgisi ile evrak silme işlemi yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlinanTeklifGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.altkl_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifkaydetv2/post.md -->

# Alınan Teklif Kaydet V2 Save

POST AlinanTeklifKaydetV2 endpoint'i, ERP sisteminizde Alınan Teklif evrakı ekleme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlinanTeklifKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.altkl_aciklama` (string)

  - `Mikro.evraklar.satirlar.altkl_belge_no` (string)

  - `Mikro.evraklar.satirlar.altkl_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.altkl_birim_fiyati` (integer)

  - `Mikro.evraklar.satirlar.altkl_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.altkl_cari_adres_no` (integer)

  - `Mikro.evraklar.satirlar.altkl_cari_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_cari_tipi` (integer)

  - `Mikro.evraklar.satirlar.altkl_doviz_cins` (integer)

  - `Mikro.evraklar.satirlar.altkl_fiyat_liste_no` (integer)

  - `Mikro.evraklar.satirlar.altkl_hareket_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_hareket_tipi` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas1` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas10` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas2` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas3` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas4` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas5` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas6` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas7` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas8` (integer)

  - `Mikro.evraklar.satirlar.altkl_isk_mas9` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto1` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto2` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto3` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto4` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto5` (integer)

  - `Mikro.evraklar.satirlar.altkl_iskonto6` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf1` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf2` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf3` (integer)

  - `Mikro.evraklar.satirlar.altkl_masraf4` (integer)

  - `Mikro.evraklar.satirlar.altkl_miktar` (integer)

  - `Mikro.evraklar.satirlar.altkl_paket_kod` (string)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas1` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas10` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas2` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas3` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas4` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas5` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas6` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas7` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas8` (integer)

  - `Mikro.evraklar.satirlar.altkl_sat_iskmas9` (integer)

  - `Mikro.evraklar.satirlar.altkl_tarihi` (string)

  - `Mikro.evraklar.satirlar.altkl_teklif_kodu` (string)

  - `Mikro.evraklar.satirlar.altkl_teslim_turu` (string)

  - `Mikro.evraklar.satirlar.altkl_teslimat_tarihi` (string)

  - `Mikro.evraklar.satirlar.altkl_teslimdepo` (integer)

  - `Mikro.evraklar.satirlar.altkl_tutar` (integer)

  - `Mikro.evraklar.satirlar.altkl_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.altkl_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/alinan-teklif/paths/~1api~1apimethods~1alinanteklifsilv2/post.md -->

# Alınan Teklif Sil V2 Delete

POST AlinanTeklifSilV2 endpoint'i, ERP sisteminizde kayıtlı Alınan Teklif ile ilgili evrak seri ve sira numarası ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/AlinanTeklifSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.altkl_sira_no` (integer)

  - `Mikro.evraklar.satirlar.altkl_teklif_kodu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1cariguncellev2/post.md -->

# Cari Güncelle V2 Update

POST CariGuncelleV2 endpoint'i, ERP sisteminizde kayıtlı Cari bilgileri ile ilgili cari bilgileri üzerinde cari kodu cari ismi gibi alanlarda güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/CariGuncelleV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.cariler` (array)

  - `Mikro.cariler.cari_Guid` (string)

  - `Mikro.cariler.cari_unvan2` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carikaydetv2/post.md -->

# Cari Kaydet V2 Save

POST CariKaydetV2 endpoint'i, ERP sisteminizde Cari ile ilgili yeni cari kaydı ekleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/CariKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.cariler` (array)

  - `Mikro.cariler.adres` (array)

  - `Mikro.cariler.adres.adr_Apt_No` (string)

  - `Mikro.cariler.adres.adr_Daire_No` (string)

  - `Mikro.cariler.adres.adr_Semt` (string)

  - `Mikro.cariler.adres.adr_cadde` (string)

  - `Mikro.cariler.adres.adr_il` (string)

  - `Mikro.cariler.adres.adr_ilce` (string)

  - `Mikro.cariler.adres.adr_mahalle` (string)

  - `Mikro.cariler.adres.adr_posta_kodu` (integer)

  - `Mikro.cariler.adres.adr_sokak` (string)

  - `Mikro.cariler.adres.adr_tel_bolge_kodu` (string)

  - `Mikro.cariler.adres.adr_tel_faxno` (string)

  - `Mikro.cariler.adres.adr_tel_no1` (string)

  - `Mikro.cariler.adres.adr_tel_no2` (string)

  - `Mikro.cariler.adres.adr_tel_ulke_kodu` (string)

  - `Mikro.cariler.adres.adr_ulke` (string)

  - `Mikro.cariler.adres.yetkili` (array)

  - `Mikro.cariler.adres.yetkili.mye_cep_telno` (string)

  - `Mikro.cariler.adres.yetkili.mye_dahili_telno` (string)

  - `Mikro.cariler.adres.yetkili.mye_email_adres` (string)

  - `Mikro.cariler.adres.yetkili.mye_isim` (string)

  - `Mikro.cariler.adres.yetkili.mye_soyisim` (string)

  - `Mikro.cariler.cari_CepTel` (string)

  - `Mikro.cariler.cari_EMail` (string)

  - `Mikro.cariler.cari_KurHesapSekli` (integer)

  - `Mikro.cariler.cari_def_efatura_cinsi` (integer)

  - `Mikro.cariler.cari_doviz_cinsi1` (integer)

  - `Mikro.cariler.cari_doviz_cinsi2` (integer)

  - `Mikro.cariler.cari_doviz_cinsi3` (integer)

  - `Mikro.cariler.cari_efatura_baslangic_tarihi` (string)

  - `Mikro.cariler.cari_efatura_fl` (integer)

  - `Mikro.cariler.cari_fatura_adres_no` (integer)

  - `Mikro.cariler.cari_kod` (string)

  - `Mikro.cariler.cari_muh_kod2` (string)

  - `Mikro.cariler.cari_sevk_adres_no` (integer)

  - `Mikro.cariler.cari_unvan1` (string)

  - `Mikro.cariler.cari_unvan2` (string)

  - `Mikro.cariler.cari_vade_fark_yuz` (integer)

  - `Mikro.cariler.cari_vdaire_adi` (string)

  - `Mikro.cariler.cari_vdaire_no` (string)

  - `Mikro.cariler.cari_vergidairekodu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carilistesiv2/post.md -->

# Cari Listesi V2

POST CariListesiV2 endpoint'i, ERP sisteminizde Listeler ile ilgili işlemler yapmak için kullanılır. Cari kayıtları listeleri, Jsonda belirtilen şartlara bağlı olarak listelenmesi sağlanır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/CariListesiV2
Version: 1.0.0

## Request fields (application/json):

  - `FieldName` (string)

  - `Index` (integer)

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Size` (string)

  - `Sort` (string)

  - `WhereStr` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/cari/paths/~1api~1apimethods~1carilistesiv3/post.md -->

# Cari Listesi V3

POST CariListesiV3 endpoint'i, ERP sisteminizde Listeler ile ilgili işlemler yapmak için kullanılır. Cari listeleri Jsonda belirtilen şartlara bağlı olarak listelenmesi sağlanır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/CariListesiV3
Version: 1.0.0

## Request fields (application/json):

  - `CariKod` (string)

  - `CariVKNTCNo` (string)

  - `IlkTarih` (string)

  - `Index` (integer)

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Size` (string)

  - `SonTarih` (string)

  - `Sort` (string)

  - `TarihTipi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/dekont/paths/~1api~1apimethods~1dekontkaydetv2/post.md -->

# Kasalar Arası Virman Dekontu Kaydet V2 Save

POST DekontKaydetV2 endpoint'i, ERP sisteminizde Dekont ile ilgili yeni dekont kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DekontKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_cari_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_d_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kur` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kurtar` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_kod` (string)

  - `Mikro.evraklar.satirlar.cha_meblag` (string)

  - `Mikro.evraklar.satirlar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.satirlar.cha_projekodu` (string)

  - `Mikro.evraklar.satirlar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_tarihi` (string)

  - `Mikro.evraklar.satirlar.cha_tip` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.TransactionReferenceId ` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/dekont/paths/~1api~1apimethods~1dekontsilv2/post.md -->

# Dekont Sil V2 Delete

POST DekontSilV2 endpoint'i, ERP sisteminizde Dekont ile ilgili kayıtlı dekont evrakı silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DekontSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (string)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_evrakno_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparisduzeltv2/post.md -->

# Depolar Arası Sipariş Guid Ekle V2 Add Guid

POST DepolarArasiSiparisDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Depolar Arası Sipariş evrakları ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DepolarArasiSiparisDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_no` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_no` (integer)

  - `Mikro.evraklar.satirlar.ssip_aciklama` (string)

  - `Mikro.evraklar.satirlar.ssip_b_fiyat` (integer)

  - `Mikro.evraklar.satirlar.ssip_belgeno` (string)

  - `Mikro.evraklar.satirlar.ssip_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.ssip_cikdepo` (integer)

  - `Mikro.evraklar.satirlar.ssip_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.ssip_evrakno_siRA` (integer)

  - `Mikro.evraklar.satirlar.ssip_girdepo` (integer)

  - `Mikro.evraklar.satirlar.ssip_miktar` (integer)

  - `Mikro.evraklar.satirlar.ssip_projekodu` (string)

  - `Mikro.evraklar.satirlar.ssip_sormerkezi` (string)

  - `Mikro.evraklar.satirlar.ssip_stok_kod` (string)

  - `Mikro.evraklar.satirlar.ssip_tarih` (string)

  - `Mikro.evraklar.satirlar.ssip_tutar` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparisguidsilv2/post.md -->

# Depolar Arası Sipariş Guid sil V2 Delete Guid

POST DepolarArasiSiparisGuidSilV2 endpoint'i, ERP sisteminizde Kayıtlı Depolar Arası Sipariş evrakı Guid bilgisi ile evrak silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DepolarArasiSiparisGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.ssip_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisipariskaydetv2/post.md -->

# Depolar Arası Sipariş Kaydet V2 Save

POST DepolarArasiSiparisKaydetV2 endpoint'i, ERP sisteminizde Depolar Arası Sipariş ile ilgili Yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DepolarArasiSiparisKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.seriler` (string)

  - `Mikro.evraklar.satirlar.ssip_aciklama` (string)

  - `Mikro.evraklar.satirlar.ssip_b_fiyat` (integer)

  - `Mikro.evraklar.satirlar.ssip_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.ssip_belgeno` (string)

  - `Mikro.evraklar.satirlar.ssip_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.ssip_cikdepo` (integer)

  - `Mikro.evraklar.satirlar.ssip_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.ssip_gecerlilik_tarihi` (string)

  - `Mikro.evraklar.satirlar.ssip_girdepo` (integer)

  - `Mikro.evraklar.satirlar.ssip_miktar` (integer)

  - `Mikro.evraklar.satirlar.ssip_projekodu` (string)

  - `Mikro.evraklar.satirlar.ssip_sormerkezi` (string)

  - `Mikro.evraklar.satirlar.ssip_stok_kod` (string)

  - `Mikro.evraklar.satirlar.ssip_tarih` (string)

  - `Mikro.evraklar.satirlar.ssip_teslim_tarih` (string)

  - `Mikro.evraklar.satirlar.ssip_tutar` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/depolar-arasi-siparis/paths/~1api~1apimethods~1depolararasisiparissilv2/post.md -->

# Depolar Arası Sipariş Sil V2 Delete

POST DepolarArasiSiparisSilV2 endpoint'i, ERP sisteminizde Depolar Arası Sipariş evrakı, evrak seri ve sıra numarası ile evrak silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DepolarArasiSiparisSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.ssip_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.ssip_evrakno_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-arsiv-islemleri/paths/~1api~1apimethods~1earsiviptalv2/post.md -->

# E-Arşiv Fatura İptal V2

POST EArsivIptalV2 endpoint'i, ERP sisteminde oluşturulmuş e-arşiv faturaların iptal edilmesi için kullanılır.
Bu API üzerinden ilgili faturaya ait UUID bilgisi gönderilerek iptal işlemi gerçekleştirilir.<br>
<b>- Gönderilen parametreler doğrultusunda e-arşiv fatura iptali yapılır.
İptal açıklaması ve tarih bilgisi zorunlu olarak gönderilmelidir.</b>

Endpoint: POST /API/APIMethods/EArsivIptalV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.EArsiv` (object)

  - `Mikro.EArsiv.UUID` (string)

  - `Mikro.EArsiv.IptalTarihi` (string)

  - `Mikro.EArsiv.IptalAciklamasi` (string)

  - `Mikro.EArsiv.FaturaSilinsin` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1ebelgedurumsorgulamav2/post.md -->

# E-Belge Durum Sorgulama

POST EBelgeDurumSorgulamaV2 endpoint'i, GIB'e gönderilen e-Belgelerin durumunu sorgulama işlemleri için kullanılır.
Şu anda **e-Fatura** ve **e-Arşiv** belgelerinin statü sorgulaması desteklenmektedir.
Bu endpoint ile, belge türü ve UUID bilgisi gönderilerek, ilgili belgenin durum kodu (örneğin 1300, 1200 vb.) ve durumu sorgulanabilir.

Endpoint: POST /API/APIMethods/EBelgeDurumSorgulamaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object, required)

  - `Mikro.FirmaKodu` (string, required)
    İlgili firmanın kodu
    Example: MikroFLY

  - `Mikro.CalismaYili` (integer, required)
    İşlem yapılan yıl
    Example: 2025

  - `Mikro.KullaniciKodu` (string, required)
    API kullanıcısının kodu
    Example: SRV

  - `Mikro.Sifre` (string, required)
    API şifresi (MD5 formatında Günün tarihi ile hashlenmiş)
    Example: 5c3f2964996a220cdcfa48f8798622ff

  - `Mikro.ApiKey` (string, required)

  - `Mikro.EBelge` (object, required)

  - `Mikro.EBelge.EFaturaTipi` (integer, required)
    0: Gönderilen, 1: Gelen
    Enum: 0, 1

  - `Mikro.EBelge.EBelgeTipi` (integer, required)
    0: EFatura, 1: EArsiv
    Enum: 0, 1

  - `Mikro.EBelge.UUID` (string, required)
    Belgenin benzersiz kimliği
    Example: 381EF1A7-BE66-44E6-A3C2-65D75D05C78A

## Response 200 fields (application/json):

  - `status` (string)
    Example: success

  - `data` (object)
    EBelge durum bilgisi


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1ebelgexmlv2/post.md -->

# EBelge XML V2 Sorgulama

POST EBelgeXMLV2 endpoint'i, ERP sisteminizde kayıtlı gelen/gönderilen
e-belgeler (e-fatura, e-arşiv, e-irsaliye) ile ilgili XML verisini
sorgulamak için kullanılır. <br><br>
<B>EFaturaTipi -    0 : Gönderilen, 1 : Gelen <br></B>
<B>EBelgeTipi  -    0 : EFatura, 1 : EArsiv, 2 : EIrsaliye <br></B>
Bu API endpoint’i üzerinden UUID değeri gönderilerek ilgili belgeye
ait XML bilgisine hızlı ve güvenli şekilde erişebilirsiniz.

Endpoint: POST /API/APIMethods/EBelgeXMLV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.EBelge` (object)

  - `Mikro.EBelge.EFaturaTipi` (integer)
    0: Gönderilen, 1: Gelen

  - `Mikro.EBelge.EBelgeTipi` (integer)
    0: EFatura, 1: EArsiv, 2: EIrsaliye

  - `Mikro.EBelge.UUID` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1emukellefsorgulamav2/post.md -->

# E-Belge Mükellef Sorgulama

`POST EMukellefSorgulamaV2` endpoint'i, e-Belge statüsü sorgulama işlemleri için kullanılır.
Şu anda **e-Fatura** ve **e-Arşiv** mükellef sorgulama işlemleri desteklenmektedir.
Bu endpoint ile, sorgulamak istediğiniz VKN/TCKN bilgisini göndererek, mükellef e-belge sistemlerine kayıtlı mı, değil mi bilgisini alabilirsiniz.

Endpoint: POST /API/APIMethods/EMukellefSorgulamaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)
    Example: MikroFLY

  - `Mikro.CalismaYili` (integer)
    Example: 2025

  - `Mikro.KullaniciKodu` (string)
    Example: SRV

  - `Mikro.Sifre` (string)
    MD5 formatında şifre
    Example: 5c3f2964996a220cdcfa48f8798622ff

  - `Mikro.ApiKey` (string)

  - `Mikro.EMukellef` (object)

  - `Mikro.EMukellef.VKN_TCKN` (string)
    Example: 11111111111


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1faturapdfv2/post.md -->

# Fatura PDF V2

POST FaturaPdfV2 endpoint'i, ERP sisteminizde  Kayıtlı Fatura Guid bilgisi gönderimi ile BASE64 formatında fatura bilgilerini response'da sizlere sunan MikroAPI endpointidir.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/FaturaPdfV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.Fatura_Guid` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1faturatoefaturav2/post.md -->

# Fatura To E-Fatura

POST FaturaToEFaturaV2 endpointi, ERP sisteminizde Kesilen faturaları Gib'e gönderimek için Bu API endpoint'i üzerinden  istenilen verileri Jsonda Post ederek  ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir. FaturaToEFaturaV2 endpointine IslemTipi parametresi eklendi bu alan 1:sadece gönder, 2:sadece bağla şeklinde çalışmaktadır. 2 nolu parametre ile gönderilen faturaların bağlaması yapılmaktadır. Bağlama yapılabilmesi için faturanın gönderilmiş olması gerekmektedir. desktop tarafında 360015'den kontrol edebilrsiniz.

Endpoint: POST /Api/apiMethods/FaturaToEFaturaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.cha_evrakno_sira` (integer)

  - `Mikro.evraklar.IslemTipi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarkabulv2/post.md -->

# GelenFaturalarKabulV2

POST GelenFaturalarKabulV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listeleme menüsünde, kabul etmek istediğiniz faturanın Guid bilgisi ile Post edilmesi halinde faturanın kabul işlemi için kullanılır
Bu API endpoint'i üzerinden veri göndererek ilgili Fatura Kabul işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/GelenFaturalarKabulV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.EBelge` (array)

  - `Mikro.EBelge.UUID` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarredv2/post.md -->

# GelenFaturalarRedV2

POST GelenFaturalarRedV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listeleme menüsünde, Reddetmek etmek istediğiniz faturanın Guid bilgisi ile Post edilmesi halinde faturanın Red işlemi için kullanılır
Bu API endpoint'i üzerinden veri göndererek ilgili Fatura Red işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/GelenFaturalarRedV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.EBelge` (array)

  - `Mikro.EBelge.RedNedeni` (string)

  - `Mikro.EBelge.UUID` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturalarv2/post.md -->

# GelenFaturalarV2

POST GelenFaturalarV2 endpoint'i, Gib üzerinden kesilen E faturalarınızın listelenmesi için kullanılır
Bu API endpoint'i üzerinden veri göndererek ilgili Listeleme işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/GelenFaturalarV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.GIBFaturaNo` (string)

  - `Mikro.IlkTarih` (string)

  - `Mikro.Index` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.Size` (integer)

  - `Mikro.SonTarih` (string)

  - `Mikro.VKNo` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1gelenfaturapdfv2/post.md -->

# Gelen Fatura PDF V2

POST GelenFaturaPdfV2 endpoint'i, ERP sistemine gelen faturaların PDF formatında
görüntülenmesi veya indirilmesi için kullanılır.
Bu API üzerinden, ilgili faturaya ait UUID bilgisi gönderilerek PDF çıktısı alınabilir.<br>
<b>- Gönderilen parametreler doğrultusunda ilgili e-faturaların PDF formatında çıktısı alınır.
V17 05a sürümü ile kullanıma sunulacaktır.</b>

Endpoint: POST /API/APIMethods/GelenFaturaPdfV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.UUID` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-fatura-islemleri/paths/~1api~1apimethods~1taslakefaturapdfv2/post.md -->

# Taslak E-Fatura PDF V2

POST TaslakEFaturaPdfV2 endpoint'i, ERP sisteminde oluşturulmuş taslak e-fatura, e-arşiv fatura ve e-müstahsil belgelerinin PDF formatında görüntülenmesi için kullanılır.
Bu API üzerinden ilgili belgenin türü, seri ve sıra bilgileri gönderilerek PDF çıktısı alınabilir.<br>
<b>- EBelgeTipi parametresi ile belge türü seçilir.
Gönderilen parametreler doğrultusunda ilgili taslak e-belgenin PDF çıktısı döner.
0: E-Fatura
1: E-Arşiv Fatura
3: E-Müstahsil
</b>

Endpoint: POST /API/APIMethods/TaslakEFaturaPdfV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.EBelge` (object)

  - `Mikro.EBelge.EBelgeTipi` (integer)
    0: E-Fatura
1: E-Arşiv Fatura
3: E-Müstahsil

  - `Mikro.EBelge.EvrakSeri` (string)

  - `Mikro.EBelge.EvrakSira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyegonderv2/post.md -->

# E-Irsaliye Gönder V2

POST EIrsaliyeGonderV2 endpoint'i, ERP sisteminizde Kesilen irsaliyeleri Gib'e gönderimek için Bu API endpoint'i üzerinden  istenilen verileri Jsonda Post ederek  ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EIrsaliyeGonderV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.sth_evrakno_sira` (integer)

  - `Mikro.evraklar.sth_evraktip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyelistesiv2/post.md -->

# E-Irsaliye Listesi V2

POST EIrsaliyeListesiV2 endpoint'i, ERP sisteminizde kayıtlı gelen/gönderilen
e-irsaliye kayıtlarını listelemek için kullanılır.
EIrsaliyeTipi - 0 : Gönderilen, 1 : Gelen
Bu API endpoint’i üzerinden tarih aralığı, sayfalama bilgileri ve irsaliye tipi
gönderilerek ilgili e-irsaliye kayıtlarına hızlı ve güvenli şekilde erişebilirsiniz.

Endpoint: POST /API/APIMethods/EIrsaliyeListesiV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.ApiKey` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.IlkTarih` (string)

  - `Mikro.SonTarih` (string)

  - `Mikro.Size` (integer)

  - `Mikro.Index` (integer)

  - `Mikro.EIrsaliyeTipi` (integer)
    0: Gönderilen, 1: Gelen


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1eirsaliyepdfv2/post.md -->

# E-İrsaliye PDF V2

POST EIrsaliyePdfV2 endpoint'i, ERP sistemine gelen veya gönderilen e-irsaliyelerin
PDF çıktısının alınabilmesi için kullanılır.
- **EFaturaTipi = 0** → Gönderilen e-irsaliye (sth_Guid üzerinden erişim)
- **EFaturaTipi = 1** → Gelen e-irsaliye (UUID üzerinden erişim)

Gönderilen parametreler doğrultusunda ilgili e-irsaliyenin PDF formatında çıktısı alınır.
V17 05a sürümü ile kullanıma sunulacaktır.

Endpoint: POST /API/APIMethods/EIrsaliyePdfV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.Apikey` (string)

  - `Mikro.EFaturaTipi` (integer)
    0 = Gönderilen, 1 = Gelen

  - `Mikro.Id` (string)
    Gönderilen irsaliye için sth_Guid, gelen irsaliye için UUID


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/e-irsaliye-islemleri/paths/~1api~1apimethods~1taslakeirsaliyepdfv2/post.md -->

# Taslak E-İrsaliye PDF V2

POST TaslakEIrsaliyePdfV2 endpoint'i, ERP sisteminde oluşturulmuş taslak e-irsaliyelerin PDF formatında görüntülenmesi için kullanılır.
Bu API üzerinden ilgili e-irsaliyenin seri ve sıra bilgileri ile birlikte PDF çıktısı alınabilir.<br>
<b>- Tablo tipine göre stok, konsinye, demirbaş veya atık irsaliyeleri destekler.
Gönderilen parametreler doğrultusunda taslak e-irsaliye PDF çıktısı döner.</b>

Endpoint: POST /API/APIMethods/TaslakEIrsaliyePdfV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.EBelge` (object)

  - `Mikro.EBelge.TabloTip` (integer)

  - `Mikro.EBelge.EvrakTip` (integer)

  - `Mikro.EBelge.KonsinyeTip` (integer)

  - `Mikro.EBelge.KonsinyeNormalIade` (integer)

  - `Mikro.EBelge.EvrakSeri` (string)

  - `Mikro.EBelge.EvrakSira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/etiket-basim-kaydet/paths/~1api~1apimethods~1etiketbasimkaydetv2/post.md -->

# Etiket Basım Kaydet V2 Save

POST EtiketBasimKaydetV2 endpoint'i, ERP sisteminizde kayıtlı stok barkodlarından jsonda gönderilen stok koduna ait barkodlar için, Etiket Basım evrakı oluşturmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EtiketBasimKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.Etkb_BasilacakMiktar` (integer)

  - `Mikro.evraklar.satirlar.Etkb_BasimAdet` (integer)

  - `Mikro.evraklar.satirlar.Etkb_BasimTipi` (integer)

  - `Mikro.evraklar.satirlar.Etkb_DepoNo` (integer)

  - `Mikro.evraklar.satirlar.Etkb_EtiketTip` (integer)

  - `Mikro.evraklar.satirlar.Etkb_StokKodu` (string)

  - `Mikro.evraklar.satirlar.Etkb_aciklama` (string)

  - `Mikro.evraklar.satirlar.Etkb_belge_no` (string)

  - `Mikro.evraklar.satirlar.Etkb_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.Etkb_evrak_tarihi` (string)

  - `Mikro.evraklar.satirlar.Etkb_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamaduzeltv2/post.md -->

# Evrak Açıklama Düzelt V2 Update

POST EvrakAciklamaDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Açıklamaları ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EvrakAciklamaDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evrak_aciklamalari` (array)

  - `Mikro.evrak_aciklamalari.egk_dosyano` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_seri` (string)

  - `Mikro.evrak_aciklamalari.egk_evr_sira` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_tip` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_ustkod` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik3` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik4` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik6` (string)

  - `Mikro.evrak_aciklamalari.egk_hareket_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamakaydetv2/post.md -->

# Evrak Açıklama Kaydet V2 Save

POST EvrakAciklamaKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Açıklamaları ile ilgili yeni açıklama kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EvrakAciklamaKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evrak_aciklamalari` (array)

  - `Mikro.evrak_aciklamalari.egk_dosyano` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_seri` (string)

  - `Mikro.evrak_aciklamalari.egk_evr_sira` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_tip` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_ustkod` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik1` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik2` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik3` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik4` (string)

  - `Mikro.evrak_aciklamalari.egk_evracik5` (string)

  - `Mikro.evrak_aciklamalari.egk_hareket_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/evrak-aciklamalari/paths/~1api~1apimethods~1evrakaciklamasilv2/post.md -->

# Evrak Açıklama Sil V2 Delete

POST EvrakAciklamaSilV2 endpoint'i, ERP sisteminizde Kayıtlı Evrak Açıklamaları ile ilgili açıklama silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EvrakAciklamaSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evrak_aciklamalari` (array)

  - `Mikro.evrak_aciklamalari.egk_dosyano` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_seri` (string)

  - `Mikro.evrak_aciklamalari.egk_evr_sira` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_tip` (integer)

  - `Mikro.evrak_aciklamalari.egk_evr_ustkod` (string)

  - `Mikro.evrak_aciklamalari.egk_hareket_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/evrak-belge-resim/paths/~1api~1apimethods~1evrakbelgeresimkaydetv2/post.md -->

# Evrak Belge Resim Kaydet V2 Save

POST EvrakBelgeResimKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Evraklara  Belge-Resim ekleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EvrakBelgeResimKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evrak_resimleri` (array)

  - `Mikro.evrak_resimleri.ei_aciklama` (string)

  - `Mikro.evrak_resimleri.ei_dosyano` (integer)

  - `Mikro.evrak_resimleri.ei_evr_seri` (string)

  - `Mikro.evrak_resimleri.ei_evr_sira` (integer)

  - `Mikro.evrak_resimleri.ei_evr_tip` (integer)

  - `Mikro.evrak_resimleri.ei_evr_ustkod` (string)

  - `Mikro.evrak_resimleri.ei_hareket_tip` (integer)

  - `Mikro.evrak_resimleri.ei_image` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/evrak-belge-resim/paths/~1api~1apimethods~1evrakbelgeresimsilv2/post.md -->

# Evrak Belge Resim Sil V2 Delete

POST EvrakBelgeResimSilV2 endpoint'i, ERP sisteminizde kayıtlı Evrak Belge Resim gibi eklentileri silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/EvrakBelgeResimSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evrak_resimleri` (array)

  - `Mikro.evrak_resimleri.ei_Key` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/fiyat-degisikligi/paths/~1api~1apimethods~1fiyatdegisikligikaydetv2/post.md -->

# Fiyat Değişikliği Kaydet V2 Save

POST FiyatDegisikligiKaydetV2 endpoint'i, ERP sisteminizde kayıtlı Fiyat Listeleri içerisinde Stok Fiyat güncelleme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/FiyatDegisikligiKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.fid_belge_no` (string)

  - `Mikro.evraklar.satirlar.fid_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.fid_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.fid_depo_no` (integer)

  - `Mikro.evraklar.satirlar.fid_evrak_seri_no` (string)

  - `Mikro.evraklar.satirlar.fid_evrak_tarih` (string)

  - `Mikro.evraklar.satirlar.fid_fiyat_deg_neden` (integer)

  - `Mikro.evraklar.satirlar.fid_fiyat_no` (integer)

  - `Mikro.evraklar.satirlar.fid_saat` (integer)

  - `Mikro.evraklar.satirlar.fid_stok_kod` (string)

  - `Mikro.evraklar.satirlar.fid_tarih` (string)

  - `Mikro.evraklar.satirlar.fid_yenifiy_tutar` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatagetirv2/post.md -->

# ImageDataGetirV2

POST ImageDataGetirV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/ImageDataGetirV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.Image` (object)

  - `Mikro.Image.RecordUid` (string)

  - `Mikro.Image.TableID` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatakaydetv2/post.md -->

# ImageDataKaydetV2

POST ImageDataKaydetV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/ImageDataKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.Image` (object)

  - `Mikro.Image.ImageData` (string)

  - `Mikro.Image.RecordUid` (string)

  - `Mikro.Image.TableID` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/image-data/paths/~1api~1apimethods~1imagedatasilv2/post.md -->

# ImageDataSilV2

POST ImageDataSilV2 endpoint'i, ERP sisteminizde Image Data ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/ImageDataSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.Image` (object)

  - `Mikro.Image.RecordUid` (string)

  - `Mikro.Image.TableID` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyedenfaturaolusturmav2/post.md -->

# İrsaliyeden Fatura Oluşturma V2

POST IrsaliyedenFaturaOlusturmaV2 endpoint'i, ERP sisteminizde kayıtlı olan irsaliyelerden
hızlı ve güvenli bir şekilde fatura oluşturmak için kullanılır.
Bu API endpoint'i üzerinden gönderilecek irsaliye bilgileri doğru formatta olmalıdır.
Gönderilen veriler doğrultusunda sistem fatura kaydını üretir.

Endpoint: POST /API/APIMethods/IrsaliyedenFaturaOlusturmaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.ApiKey` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.sth_evrakno_sira` (integer)

  - `Mikro.evraklar.sth_evraktip` (integer)

  - `Mikro.evraklar.sth_normal_iade` (integer)

  - `Mikro.evraklar.Fatura_Tipi` (integer)

  - `Mikro.evraklar.Kapayan_Hesap_Kodu` (string)

  - `Mikro.evraklar.Fatura_Evrakno_seri` (string)

  - `Mikro.evraklar.Fatura_Belge_No` (string)

  - `Mikro.evraklar.Fatura_Tarihi` (string)

  - `Mikro.evraklar.Tevkifat_Uygulama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyeduzeltv2/post.md -->

# Irsaliye Düzelt Guid Ekle V2 Add Guid

POST IrsaliyeDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/IrsaliyeDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.e_irsaliye_detaylari` (object)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_arac_tipi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_asama_no` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_baslama_zamani` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_bayi_firma_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_bitis_zamani` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_detay_bilgi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_eirs_olrk_gonderilsin` (integer)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_guzergah_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_kargo_no` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_matbu_belgeno` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_matbu_tarih` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_adi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_soyadi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_tckn` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_adi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_soyadi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_tckn` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasima_yontemi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_arac_plaka` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_dorse_plaka1` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_dorse_plaka2` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_firma_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_toptanci_firma_kodu` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_no` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_no` (integer)

  - `Mikro.evraklar.satirlar.seriler` (string)

  - `Mikro.evraklar.satirlar.sth_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_cari_cinsi` (string)

  - `Mikro.evraklar.satirlar.sth_cari_kodu` (string)

  - `Mikro.evraklar.satirlar.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_cins` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_sira` (integer)

  - `Mikro.evraklar.satirlar.sth_evraktip` (string)

  - `Mikro.evraklar.satirlar.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_isk_mas1` (string)

  - `Mikro.evraklar.satirlar.sth_isk_mas2` (string)

  - `Mikro.evraklar.satirlar.sth_iskonto1` (number)

  - `Mikro.evraklar.satirlar.sth_iskonto2` (number)

  - `Mikro.evraklar.satirlar.sth_malkbl_sevk_tarihi` (string)

  - `Mikro.evraklar.satirlar.sth_miktar` (integer)

  - `Mikro.evraklar.satirlar.sth_normal_iade` (string)

  - `Mikro.evraklar.satirlar.sth_stok_kod` (string)

  - `Mikro.evraklar.satirlar.sth_tarih` (string)

  - `Mikro.evraklar.satirlar.sth_tip` (string)

  - `Mikro.evraklar.satirlar.sth_tutar` (integer)

  - `Mikro.evraklar.satirlar.sth_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.sth_yetkili_uid` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyekaydetv2/post.md -->

# IrsaliyeKaydet V2 (Perakende İade Çıkış) Save

POST IrsaliyeKaydetV2 endpoint'i, ERP sisteminizde İrsaliye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/IrsaliyeKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.e_irsaliye_detaylari` (object)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_arac_tipi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_asama_no` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_baslama_zamani` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_bayi_firma_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_bitis_zamani` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_detay_bilgi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_eirs_olrk_gonderilsin` (integer)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_guzergah_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_kargo_no` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_matbu_belgeno` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_matbu_tarih` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_adi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_soyadi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor2_tckn` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_adi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_soyadi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_sofor_tckn` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasima_yontemi` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_arac_plaka` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_dorse_plaka1` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_dorse_plaka2` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_tasiyici_firma_kodu` (string)

  - `Mikro.evraklar.e_irsaliye_detaylari.eir_toptanci_firma_kodu` (string)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.seriler` (string)

  - `Mikro.evraklar.satirlar.sth_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_cari_cinsi` (string)

  - `Mikro.evraklar.satirlar.sth_cari_kodu` (string)

  - `Mikro.evraklar.satirlar.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_cins` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sth_evraktip` (string)

  - `Mikro.evraklar.satirlar.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_isk_mas1` (string)

  - `Mikro.evraklar.satirlar.sth_isk_mas2` (string)

  - `Mikro.evraklar.satirlar.sth_iskonto1` (number)

  - `Mikro.evraklar.satirlar.sth_iskonto2` (number)

  - `Mikro.evraklar.satirlar.sth_miktar` (number)

  - `Mikro.evraklar.satirlar.sth_normal_iade` (string)

  - `Mikro.evraklar.satirlar.sth_pos_satis` (integer)

  - `Mikro.evraklar.satirlar.sth_stok_kod` (string)

  - `Mikro.evraklar.satirlar.sth_tarih` (string)

  - `Mikro.evraklar.satirlar.sth_tip` (string)

  - `Mikro.evraklar.satirlar.sth_tutar` (number)

  - `Mikro.evraklar.satirlar.sth_vergi` (number)

  - `Mikro.evraklar.satirlar.sth_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyesatirsilv2/post.md -->

# Irsaliye Satır Sil V2 Delete Guid

POST IrsaliyeSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye evrakları ile ilgili evrak satır silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/IrsaliyeSatirSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sth_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1irsaliyesilv2/post.md -->

# Irsaliye Sil V2 Delete

POST IrsaliyeSilV2 endpoint'i, ERP sisteminizde kayıtlı İrsaliye evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/IrsaliyeSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.sth_evrakno_sira` (integer)

  - `Mikro.evraklar.sth_evraktip` (integer)

  - `Mikro.evraklar.sth_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/irsaliye/paths/~1api~1apimethods~1siparistenirsaliyeolusturmav2/post.md -->

# Siparişten İrsaliye Oluşturma V2 Save

POST SiparistenIrsaliyeOlusturmaV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş üzerinden irsaliye evrakı oluşturma ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SiparistenIrsaliyeOlusturmaV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.irsaliye_evrak_seri` (string)

  - `Mikro.evraklar.sip_cins` (integer)

  - `Mikro.evraklar.sip_evrakno_seri` (string)

  - `Mikro.evraklar.sip_evrakno_sira` (integer)

  - `Mikro.evraklar.sip_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/kasa-masraf-fisi/paths/~1api~1apimethods~1kasamasraffisikaydetv2/post.md -->

# Kasa Masraf Fişi Kaydet V2 Save

POST KasaMasrafFisiKaydetV2 endpoint'i, ERP sisteminizde Kasa Masraf Fişi ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/KasaMasrafFisiKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_aciklama` (string)

  - `Mikro.evraklar.satirlar.cha_aratoplam` (integer)

  - `Mikro.evraklar.satirlar.cha_d_cins` (string)

  - `Mikro.evraklar.satirlar.cha_d_kur` (string)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.satirlar.cha_kod` (string)

  - `Mikro.evraklar.satirlar.cha_miktari` (string)

  - `Mikro.evraklar.satirlar.cha_projekodu` (string)

  - `Mikro.evraklar.satirlar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_tarihi` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1kayitkaydettopluv2/post.md -->

# Kayıt Kaydet Toplu V2 Save

POST KayitKaydetV2 endpoint'i, ERP sisteminizde Mikro tablo numarası ile istenilen tablolara doğrudan kayıt ekleme işlemleri yapmak için kullanılır. Bu işlem özellikle tanım tabloları için uygundur. Evrak işlem tabloları için doğrudan ilgili endpointlerin kullanılması önerilmektedir. <br> "Kayıt Tipi" Alanı için Parametreler ; <br><br> - **0:** İnsert <br> - **1:** Update <br> - **2:** Delete <br> <br>
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/KayitKaydetTopluV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.Kayit` (array)

  - `Mikro.Kayit.KayitTipi` (string)

  - `Mikro.Kayit.TabloNo` (string)

  - `Mikro.Kayit.cari_fatura_adres_no` (integer)

  - `Mikro.Kayit.cari_kod` (string)

  - `Mikro.Kayit.cari_per_adi` (string)

  - `Mikro.Kayit.cari_per_kod` (string)

  - `Mikro.Kayit.cari_sevk_adres_no` (integer)

  - `Mikro.Kayit.cari_unvan1` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1kayitkaydetv2/post.md -->

# Kayıt Kaydet V2 Save

POST KayitKaydetV2 endpoint'i, ERP sisteminizde Kayıt Kaydet ile Jsonda mikro tablo numarası ile istenilen tablolara doğrudan kayıt ekleme işlemleri yapmak için kullanılır. Tanım tabloları için önerilmektedir. Evrak işlem tabloları için doğrudan ilgili endpointlerin kullanılması önerilmektedir.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı,<br><br>  - **0:** İnsert <br>   - **1:** Update <br>   - **2:** Delete <br> <br>  güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.  Silme Güncelleme ve Kayıt ekleme işlemleri için aynı endponti kullanabilirsiniz.

Endpoint: POST /Api/apiMethods/KayitKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.Kayit` (array)

  - `Mikro.Kayit.cari_per_kod` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.Tablo` (array)

  - `Mikro.Tablo.KayitTipi` (string)

  - `Mikro.Tablo.No` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/kayit-kaydet/paths/~1api~1apimethods~1textdatakaydetv2/post.md -->

# Text Data Kaydet V2

POST TextDataKaydetV2 endpoint'i, ERP sistemindeki kayıtlarla ilişkilendirilmiş metin (Text Data) bilgilerinin kaydedilmesi veya güncellenmesi için kullanılır.
Bu API üzerinden ilgili kaydın UID bilgisi gönderilerek metin verisi eklenebilir veya güncellenebilir.<br>
<b>- Gönderilen parametreler doğrultusunda belirtilen tablo ve kayda ait Text Data bilgisi kaydedilir.</b>

Endpoint: POST /API/APIMethods/TextDataKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.TextData` (object)

  - `Mikro.TextData.TableID` (integer)

  - `Mikro.TextData.RecordUid` (string)

  - `Mikro.TextData.TextData` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1kullanicilistesiv2/post.md -->

# KullaniciListesiV2

POST KullaniciListesiV2 endpoint'i, ERP sisteminizde kayıtlı kullanıcılar ile ilgili kayıtlı kullanıcı bilgilerini response'da sizlere listelemek için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/KullaniciListesiV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1kullaniciparametreleriv2/post.md -->

# Kullanıcı Parametreleri V2

POST KullaniciParametreleriV2 endpoint'i, ERP sisteminizde Kayıtlı Jsonda post edilen kullanıcının yetkilerini sizlere response'da listelemek için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/KullaniciParametreleriV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/listeler/paths/~1api~1apimethods~1vergilistesiv2/post.md -->

# VergiListesiV2

POST VergiListesiV2 endpoint'i, ERP sisteminizde Kayıtlı Vergi oranlarını listelemek için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/VergiListesiV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogin/post.md -->

# MikroApiUp

POST APILogin endpoint'i, ERP sisteminizde Login-Logoff ile ilgili işlemler yapmak için kullanılır. Bu endpoint, V1 endpointleri kullanımı sağlanırken Başarılı Login işlemi sonrası sizlere belirli bir süre V1 endpointlerinde işlem yapabilmeniz için yetkilendirme sağlar. V2 ve V3 endpointleri için gerekli değildir.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/APILogin
Version: 1.0.0

## Request fields (application/json):

  - `ApiKey` (string)
    Sizlere iletilen Mikro Apikey bilgisi

  - `CalismaYili` (string)

  - `FirmaKodu` (string)
    (Mikro FLY uygulamasında giriş yapılan Firma kodunuz)

  - `FirmaNo` (integer)

  - `KullaniciKodu` (string)
    (Mikro FLY kullanıcı kodunuz)
    Example: SRV

  - `Sifre` (string)
    (MD5 Formatında Günün tarihi + Boşluk + Şifre ile hashli) Şifreniz hergün Günün tarihi ile birlikte yeniden hashlenmelidir.
    Example: 6108ce713e280fdfcf4eb5befed8e184

  - `SubeNo` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogoff/post.md -->

# Logoff

POST APILogoff endpoint'i, ERP sisteminizde Login-Logoff ile ilgili V1 endpointlerinde işlem sağlandıktan sonra sistemden logout olmak için kullanılır. V2 ve V3 endpointleri için kullanım gerektirmemektedir.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/APILogoff
Version: 1.0.0

---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1apilogoffv2/post.md -->

# Logoff V2

POST APILogoffV2 endpoint'i, ERP sisteminizde Login-Logoff ile ilgili V2 endpointleri kullanımı sonrasında Login olan kullanıcının sistemden Logout işlemini yapmak için kullanılır. Bu endpoint kullanımı sağlanmasa bile V2 ve V3 endpointlerinde kullanıcı, işlem sonrasında logout edilir.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/APILogoffV2
Version: 1.0.0

---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1healthcheck/get.md -->

# HealthCheck

GET HealthCheck endpoint'i, API servivisinin  kontrolü için kullanılan bir endpointidir. Servisin UP / DOWN durumu ile ilgili bilgi almak için kullanılır.
Bu API endpoint'i üzerinden ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.

Endpoint: GET /Api/APIMethods/HealthCheck
Version: 1.0.0

---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1healthcheck2/get.md -->

# HealthCheck2

GET HealthCheck2 endpoint'i, API servivisinin  kontrolü için kullanılan bir endpointidir. Servisin UP / DOWN durumu ile ilgili bilgi almak için kullanılır.
Bu API endpoint'i üzerinden ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.

Endpoint: GET /Api/APIMethods/HealthCheck2
Version: 1.0.0

---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/login-logoff/paths/~1api~1apimethods~1loggerdone/get.md -->

# LoggerDone-Get

GET LoggerDone endpoint'i, ERP sisteminizde Login-Logoff ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: GET /Api/APIMethods/LoggerDone
Version: 1.0.0

---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/muhasebe/paths/~1api~1apimethods~1muhasebefiskaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/muhasebe/paths/~1api~1apimethods~1muhasebefissilv2/post.md -->

# Muhasebe Fişi Sil V2 Delete

POST MuhasebeFisSilV2 endpoint'i, ERP sisteminizde kayıtlı Muhasebe fişi ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/MuhasebeFisSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.fis_sira_no` (integer)

  - `Mikro.evraklar.satirlar.fis_tarih` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafisduzelt/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafisduzeltv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafiskaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/operasyon-tamamlama/paths/~1api~1apimethods~1operasyontamamlamafissilv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelizinkaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelkaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/personel/paths/~1api~1apimethods~1personelpuantajkaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/proforma-siparis/paths/~1api~1apimethods~1proformasipariskaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/proforma-siparis/paths/~1api~1apimethods~1proformasiparissilv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satin-alma-sarti/paths/~1api~1apimethods~1satinalmasartikaydetv2/post.md -->


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satin-alma-sarti/paths/~1api~1apimethods~1satinalmasartisilv2/post.md -->

# Satın Alma Şartı Sil V2 Delete

POST SatinAlmaSartiSilV2 endpoint'i, ERP sisteminizde kayıtlı Satın Alma Şartı evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatinAlmaSartiSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sas_evrak_no_seri` (string)

  - `Mikro.evraklar.satirlar.sas_evrak_no_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satin-alma-talep/paths/~1api~1apimethods~1satinalmatalepkaydetv2/post.md -->

# Satın Alma Talep V2 Save

POST SatinAlmaTalepKaydetV2 endpoint'i, ERP sisteminizde Satın Alma Talep evrakı ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatinAlmaTalepKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.stl_Satici_Kodu` (string)

  - `Mikro.evraklar.satirlar.stl_Sor_Merk` (string)

  - `Mikro.evraklar.satirlar.stl_Stok_kodu` (string)

  - `Mikro.evraklar.satirlar.stl_belge_no` (string)

  - `Mikro.evraklar.satirlar.stl_belge_tarihi` (string)

  - `Mikro.evraklar.satirlar.stl_cagrilabilir_fl` (integer)

  - `Mikro.evraklar.satirlar.stl_evrak_seri` (string)

  - `Mikro.evraklar.satirlar.stl_lot_no` (integer)

  - `Mikro.evraklar.satirlar.stl_miktari` (integer)

  - `Mikro.evraklar.satirlar.stl_parti_kodu` (string)

  - `Mikro.evraklar.satirlar.stl_projekodu` (string)

  - `Mikro.evraklar.satirlar.stl_talep_eden` (string)

  - `Mikro.evraklar.satirlar.stl_tarihi` (string)

  - `Mikro.evraklar.satirlar.stl_teslim_miktari` (integer)

  - `Mikro.evraklar.satirlar.stl_teslim_tarihi` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satin-alma-talep/paths/~1api~1apimethods~1satinalmatalepsilv2/post.md -->

# Satın Alma Talep Sil V2 Delete

POST SatinAlmaTalepSilV2 endpoint'i, ERP sisteminizde kayıtlı Satın Alma Talep evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatinAlmaTalepSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.stl_evrak_seri` (string)

  - `Mikro.evraklar.satirlar.stl_evrak_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartiduzeltv2/post.md -->

# Satış Şartı Guid Ekle V2 Add Guid

POST SatisSartiDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatisSartiDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sat_basla_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_belge_no` (string)

  - `Mikro.evraklar.satirlar.sat_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_bitis_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_brut_fiyat` (integer)

  - `Mikro.evraklar.satirlar.sat_cari_kod` (string)

  - `Mikro.evraklar.satirlar.sat_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde3` (integer)

  - `Mikro.evraklar.satirlar.sat_doviz_cinsi` (integer)

  - `Mikro.evraklar.satirlar.sat_evrak_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sat_evrakno_sira` (integer)

  - `Mikro.evraklar.satirlar.sat_miktar` (integer)

  - `Mikro.evraklar.satirlar.sat_miktar_tip` (integer)

  - `Mikro.evraklar.satirlar.sat_odeme_plan` (integer)

  - `Mikro.evraklar.satirlar.sat_proje_kodu` (string)

  - `Mikro.evraklar.satirlar.sat_srmmrk_kodu` (string)

  - `Mikro.evraklar.satirlar.sat_stok_kod` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartiguidsilv2/post.md -->

# Satış Şartı Guid Sil V2 Delete Guid

POST SatisSartiGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili kayıtlı evrak Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatisSartiGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sat_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartikaydetv2/post.md -->

# Satış Şartı Kaydet V2 Save

POST SatisSartiKaydetV2 endpoint'i, ERP sisteminizde Satış Şartı evrakı ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatisSartiKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sat_basla_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_belge_no` (string)

  - `Mikro.evraklar.satirlar.sat_belge_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_bitis_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_brut_fiyat` (integer)

  - `Mikro.evraklar.satirlar.sat_cari_kod` (string)

  - `Mikro.evraklar.satirlar.sat_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_uyg3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_isk_yuzde3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_uyg3` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde1` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde2` (integer)

  - `Mikro.evraklar.satirlar.sat_det_mas_yuzde3` (integer)

  - `Mikro.evraklar.satirlar.sat_doviz_cinsi` (integer)

  - `Mikro.evraklar.satirlar.sat_evrak_tarih` (string)

  - `Mikro.evraklar.satirlar.sat_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sat_miktar` (integer)

  - `Mikro.evraklar.satirlar.sat_miktar_tip` (integer)

  - `Mikro.evraklar.satirlar.sat_odeme_plan` (integer)

  - `Mikro.evraklar.satirlar.sat_proje_kodu` (string)

  - `Mikro.evraklar.satirlar.sat_srmmrk_kodu` (string)

  - `Mikro.evraklar.satirlar.sat_stok_kod` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/satis-sarti/paths/~1api~1apimethods~1satissartisilv2/post.md -->

# Satış Şartı Sil V2 Delete

POST SatisSartiSilV2 endpoint'i, ERP sisteminizde kayıtlı Satış Şartı evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /api/APIMethods/SatisSartiSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sat_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sat_evrakno_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimkesinlestirmev2/post.md -->

# Sayım Kesinleştirme V2

Bu endpoint, belirli bir depo ve tarih için sayım evraklarını kesinleştirmek amacıyla kullanılır.

Endpoint: POST /api/apiMethods/SayimKesinlestirmeV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.ApiKey` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.sym_tarihi` (string)

  - `Mikro.evraklar.sym_depono` (string)

  - `Mikro.evraklar.sym_evrakno` (string)

  - `Mikro.evraklar.SayimGirisGiderKodu` (string)

  - `Mikro.evraklar.SayimGirisEvragiSeri` (string)

  - `Mikro.evraklar.SayimCikisGiderKodu` (string)

  - `Mikro.evraklar.SayimCikisEvragiSeri` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclariduzeltv2/post.md -->

# Sayım Sonuç Guid Ekle V2 Add Guid

POST SayimSonuclariDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuçları ile ilgili evrak güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SayimSonuclariDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sym_Stokkodu` (string)

  - `Mikro.evraklar.satirlar.sym_barkod` (string)

  - `Mikro.evraklar.satirlar.sym_bedenno` (integer)

  - `Mikro.evraklar.satirlar.sym_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sym_depono` (integer)

  - `Mikro.evraklar.satirlar.sym_evrakno` (integer)

  - `Mikro.evraklar.satirlar.sym_koridorkodu` (string)

  - `Mikro.evraklar.satirlar.sym_lot_no` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar1` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar2` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar3` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar4` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar5` (integer)

  - `Mikro.evraklar.satirlar.sym_parti_kodu` (string)

  - `Mikro.evraklar.satirlar.sym_rafkodu` (string)

  - `Mikro.evraklar.satirlar.sym_renkno` (integer)

  - `Mikro.evraklar.satirlar.sym_reyonkodu` (string)

  - `Mikro.evraklar.satirlar.sym_serino` (string)

  - `Mikro.evraklar.satirlar.sym_tarihi` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarikaydetv2/post.md -->

# Sayım Sonuç Kaydet V2 Save

POST SayimSonuclariKaydetV2 endpoint'i, ERP sisteminizde Sayım Sonuç Kaydet ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SayimSonuclariKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sym_Stokkodu` (string)

  - `Mikro.evraklar.satirlar.sym_barkod` (string)

  - `Mikro.evraklar.satirlar.sym_bedenno` (integer)

  - `Mikro.evraklar.satirlar.sym_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sym_depono` (integer)

  - `Mikro.evraklar.satirlar.sym_koridorkodu` (string)

  - `Mikro.evraklar.satirlar.sym_lot_no` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar1` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar2` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar3` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar4` (integer)

  - `Mikro.evraklar.satirlar.sym_miktar5` (integer)

  - `Mikro.evraklar.satirlar.sym_parti_kodu` (string)

  - `Mikro.evraklar.satirlar.sym_rafkodu` (string)

  - `Mikro.evraklar.satirlar.sym_renkno` (integer)

  - `Mikro.evraklar.satirlar.sym_reyonkodu` (string)

  - `Mikro.evraklar.satirlar.sym_serino` (string)

  - `Mikro.evraklar.satirlar.sym_tarihi` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarisatirsilv2/post.md -->

# Sayım Sonuç Guid Sil V2 Delete Guid

POST SayimSonuclariSatirSilV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuç evrakı üzerinde satır silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SayimSonuclariSatirSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sym_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sayim-sonuc/paths/~1api~1apimethods~1sayimsonuclarisilv2/post.md -->

# Sayım Sonuç Sil V2 Delete

POST SayimSonuclariSilV2 endpoint'i, ERP sisteminizde kayıtlı Sayım Sonuç evrak silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SayimSonuclariSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sym_depono` (integer)

  - `Mikro.evraklar.satirlar.sym_evrakno` (integer)

  - `Mikro.evraklar.satirlar.sym_tarihi` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparisduzeltv2/post.md -->

# Sipariş Guid Ekle V2 Add Guid

Sipariş güncelleme işlemi için kullanılan API. Bu API, mevcut bir sipariş kaydının bilgilerini günceller.

Endpoint: POST /Api/apiMethods/SiparisDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `ApiKey` (string)

  - `CalismaYili` (integer)

  - `FirmaKodu` (string)

  - `FirmaNo` (integer)

  - `KullaniciKodu` (string)

  - `Mikro` (string)

  - `Sifre` (string)

  - `SubeNo` (integer)

  - `evraklar` (array)

  - `evraklar.evrak_aciklamalari` (array)

  - `evraklar.evrak_aciklamalari.aciklama` (string)

  - `evraklar.satirlar` (array)

  - `evraklar.satirlar.seriler` (string)

  - `evraklar.satirlar.sip_b_fiyat` (integer)

  - `evraklar.satirlar.sip_birim_pntr` (integer)

  - `evraklar.satirlar.sip_cins` (string)

  - `evraklar.satirlar.sip_depono` (integer)

  - `evraklar.satirlar.sip_evrakno_seri` (string)

  - `evraklar.satirlar.sip_evrakno_sira` (integer)

  - `evraklar.satirlar.sip_miktar` (integer)

  - `evraklar.satirlar.sip_musteri_kod` (string)

  - `evraklar.satirlar.sip_stok_kod` (string)

  - `evraklar.satirlar.sip_stok_sormerk` (string)

  - `evraklar.satirlar.sip_tarih` (string)

  - `evraklar.satirlar.sip_tip` (string)

  - `evraklar.satirlar.sip_tutar` (integer)

  - `evraklar.satirlar.sip_vergi_pntr` (integer)

  - `evraklar.satirlar.sip_vergisiz_fl` (integer)

  - `evraklar.satirlar.user_tablo` (array)

  - `evraklar.satirlar.user_tablo.aciklama` (string)

  - `evraklar.satirlar.varyant` (array)

  - `evraklar.satirlar.varyant.miktar` (integer)

  - `evraklar.satirlar.varyant.varyant_kirilim_kodu_1` (string)

  - `evraklar.satirlar.varyant.varyant_kirilim_kodu_2` (string)

  - `evraklar.satirlar.varyant.varyant_kirilim_kodu_3` (string)

  - `evraklar.satirlar.varyant.varyant_kirilim_kodu_4` (string)

  - `evraklar.satirlar.varyant.varyant_kirilim_kodu_5` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparisguidsilv2/post.md -->

# Sipariş Guid Sil V2 Delete Guid

POST SiparisGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş ile ilgili Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SiparisGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sip_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1sipariskaydetv2/post.md -->

# Siparis KaydetV2

POST SiparisKaydetV2 endpoint'i, Sipariş evraklarınızı  APİ üzerinden ERP sisteminize Post etmek için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili Sipariş işlemlerinizi hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SiparisKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.seriler` (string)

  - `Mikro.evraklar.satirlar.sip_b_fiyat` (integer)

  - `Mikro.evraklar.satirlar.sip_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sip_cins` (string)

  - `Mikro.evraklar.satirlar.sip_depono` (integer)

  - `Mikro.evraklar.satirlar.sip_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sip_miktar` (integer)

  - `Mikro.evraklar.satirlar.sip_musteri_kod` (string)

  - `Mikro.evraklar.satirlar.sip_stok_kod` (string)

  - `Mikro.evraklar.satirlar.sip_stok_sormerk` (string)

  - `Mikro.evraklar.satirlar.sip_tarih` (string)

  - `Mikro.evraklar.satirlar.sip_tip` (string)

  - `Mikro.evraklar.satirlar.sip_tutar` (integer)

  - `Mikro.evraklar.satirlar.sip_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.sip_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)

  - `Mikro.evraklar.satirlar.varyant` (array)

  - `Mikro.evraklar.satirlar.varyant.miktar` (integer)

  - `Mikro.evraklar.satirlar.varyant.varyant_kirilim_kodu_1` (string)

  - `Mikro.evraklar.satirlar.varyant.varyant_kirilim_kodu_2` (string)

  - `Mikro.evraklar.satirlar.varyant.varyant_kirilim_kodu_3` (string)

  - `Mikro.evraklar.satirlar.varyant.varyant_kirilim_kodu_4` (string)

  - `Mikro.evraklar.satirlar.varyant.varyant_kirilim_kodu_5` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/siparis/paths/~1api~1apimethods~1siparissilv2/post.md -->

# Sipariş Sil V2 Delete

POST SiparisSilV2 endpoint'i, ERP sisteminizde kayıtlı Sipariş ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SiparisSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sip_cins` (integer)

  - `Mikro.evraklar.satirlar.sip_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sip_evrakno_sira` (integer)

  - `Mikro.evraklar.satirlar.sip_tip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sql-sorgulama/paths/~1api~1apimethods~1kay%C4%B1tokuv2/post.md -->

# Kayıt Oku V2

POST KayıtOkuV2 endpointi Veri tabanı üzerinden  tablo numarası ilettiğiniz tabloların veri sorgulama işlemleri için kullanılır.
Bu endpoint ile, Tablo No ve Tarhi aralığı bilgisi gönderilerek, ilgili tablodaki gönderilen tarih aralığındaki veriler sorgulanabilir.

Endpoint: POST /API/APIMethods/KayıtOkuV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.FirmaKodu` (string)
    İlgili firmanın kodu
    Example: MikroFLY

  - `Mikro.CalismaYili` (integer)
    İşlem yapılan yıl
    Example: 2025

  - `Mikro.KullaniciKodu` (string)
    API kullanıcısının kodu
    Example: SRV

  - `Mikro.Sifre` (string)
    API şifresi (MD5 formatında Günün tarihi ile hashlenmiş)
    Example: 5c3f2964996a220cdcfa48f8798622ff

  - `Mikro.ApiKey` (string)

  - `Mikro.TableNo` (integer)
    Example: 31

  - `Mikro.ChangeStartDate` (string)
    Example: 2024-07-01

  - `Mikro.ChangeEndDate` (string)
    Example: 2024-07-31

  - `Mikro.Size` (integer)
    Kayıt sayısı belirtilmezse ilk 100 kayıt gelecektir. Maksimum sınır 500'dür
    Example: 5

  - `Mikro.Index` (integer)
    Example: 0

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/sql-sorgulama/paths/~1api~1apimethods~1sqlveriokuv2/post.md -->

# SQL Sorgulama

POST SqlVeriOkuV2 endpoint'i, ERP sisteminizde DB erişimini API üzerinden Sağlayarak İstediğiniz database tablolarında  Select  işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/SqlVeriOkuV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `SQLSorgu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketduzeltv2/post.md -->

# Dahili Stok Hareket Guid Ekle V2 Add Guid

POST DahiliStokHareketDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DahiliStokHareketDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sth_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_cins` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_siRA` (integer)

  - `Mikro.evraklar.satirlar.sth_evraktip` (string)

  - `Mikro.evraklar.satirlar.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_isk_mas1` (string)

  - `Mikro.evraklar.satirlar.sth_isk_mas2` (string)

  - `Mikro.evraklar.satirlar.sth_miktar` (integer)

  - `Mikro.evraklar.satirlar.sth_normal_iade` (string)

  - `Mikro.evraklar.satirlar.sth_stok_kod` (string)

  - `Mikro.evraklar.satirlar.sth_tarih` (string)

  - `Mikro.evraklar.satirlar.sth_tip` (string)

  - `Mikro.evraklar.satirlar.sth_tutar` (integer)

  - `Mikro.evraklar.satirlar.sth_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_vergisiz_fl` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketguidsilv2/post.md -->

# Dahili Stok Hareket Guid Sil V2 Delete Guid

POST DahiliStokHareketGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DahiliStokHareketGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sth_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketkaydetv2/post.md -->

# Dahili Stok Hareket Kaydet V2 Save

POST DahiliStokHareketKaydetV2 endpoint'i, ERP sisteminizde Stok hareketleri evrakları ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DahiliStokHareketKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.sth_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_cari_cinsi` (string)

  - `Mikro.evraklar.satirlar.sth_cari_kodu` (string)

  - `Mikro.evraklar.satirlar.sth_cikis_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_cins` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sth_evraktip` (string)

  - `Mikro.evraklar.satirlar.sth_giris_depo_no` (integer)

  - `Mikro.evraklar.satirlar.sth_isk_mas1` (string)

  - `Mikro.evraklar.satirlar.sth_isk_mas2` (string)

  - `Mikro.evraklar.satirlar.sth_miktar` (number)

  - `Mikro.evraklar.satirlar.sth_normal_iade` (string)

  - `Mikro.evraklar.satirlar.sth_stok_kod` (string)

  - `Mikro.evraklar.satirlar.sth_tarih` (string)

  - `Mikro.evraklar.satirlar.sth_tip` (string)

  - `Mikro.evraklar.satirlar.sth_tutar` (number)

  - `Mikro.evraklar.satirlar.sth_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.sth_vergisiz_fl` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1dahilistokhareketsilv2/post.md -->

# Dahili Stok Hareket Sil V2 Delete

POST DahiliStokHareketSilV2 endpoint'i, ERP sisteminizde kayıtlı Stok hareketleri evrakları ile ilgili evrak tip, seri ve sıra numarası ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/DahiliStokHareketSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.sth_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.sth_evrakno_sira` (integer)

  - `Mikro.evraklar.satirlar.sth_evraktip` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1stokkaydetv2/post.md -->

# Stok Kaydet V2 Save

POST StokKaydetV2 endpoint'i, ERP sisteminizde Stok ile ilgili Yeni stok kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/StokKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.stoklar` (array)

  - `Mikro.stoklar.barkodlar` (array)

  - `Mikro.stoklar.barkodlar.bar_barkodtipi` (integer)

  - `Mikro.stoklar.barkodlar.bar_birimpntr` (integer)

  - `Mikro.stoklar.barkodlar.bar_kodu` (string)

  - `Mikro.stoklar.barkodlar.bar_master` (integer)

  - `Mikro.stoklar.satis_fiyatlari` (array)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_birim_pntr` (integer)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_deposirano` (integer)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_doviz` (integer)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_fiyati` (number)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_listesirano` (integer)

  - `Mikro.stoklar.satis_fiyatlari.sfiyat_odemeplan` (integer)

  - `Mikro.stoklar.sto_birim1_ad` (string)

  - `Mikro.stoklar.sto_cins` (integer)

  - `Mikro.stoklar.sto_doviz_cinsi` (integer)

  - `Mikro.stoklar.sto_isim` (string)

  - `Mikro.stoklar.sto_kisa_ismi` (string)

  - `Mikro.stoklar.sto_kod` (string)

  - `Mikro.stoklar.sto_perakende_vergi` (integer)

  - `Mikro.stoklar.sto_toptan_vergi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/stok/paths/~1api~1apimethods~1stoklistesiv2/post.md -->

# Stok Listesi V2

POST StokListesiV2 endpoint'i, ERP sisteminizde Kayıtlı Stok bilgilerinizi sizlere Response'da listelemek için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/StokListesiV2
Version: 1.0.0

## Request fields (application/json):

  - `IlkTarih` (string)

  - `Index` (integer)

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Size` (string)

  - `SonTarih` (string)

  - `Sort` (string)

  - `StokKod` (string)

  - `TarihTipi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyeduzeltv2/post.md -->

# Tahsilat Tediye Düzelt V2 Update

POST TahsilatTediyeDuzeltV2 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili evrak güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_Guid` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (string)

  - `Mikro.evraklar.satirlar.cha_meblag` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyeguidsilv2/post.md -->

# Tahsilat Tediye Guid Sil V2 Delete Guid

POST TahsilatTediyeGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Tahsilat Tediye ile ilgili evrak Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_Guid` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyekaydetv2/post.md -->

# Tahsilat Tediye Kaydet V2 Save

POST TahsilatTediyeKaydetV2 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.FirmaNo` (integer)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.SubeNo` (integer)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_cari_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_cinsi` (integer)

  - `Mikro.evraklar.satirlar.cha_d_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kur` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kurtar` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizmet` (integer)

  - `Mikro.evraklar.satirlar.cha_kod` (string)

  - `Mikro.evraklar.satirlar.cha_meblag` (string)

  - `Mikro.evraklar.satirlar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.satirlar.cha_projekodu` (string)

  - `Mikro.evraklar.satirlar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_tarihi` (string)

  - `Mikro.evraklar.satirlar.cha_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_vade` (string)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi` (object)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Firma_taksit_sayisi` (integer)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Kart_cekim_tarihi` (string)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Kart_sahip_tipi` (integer)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Kredi_kart_no` (integer)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Musteri_taksit_sayisi` (integer)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Sorumluluk_merkezi` (string)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Toplam_tutar` (string)

  - `Mikro.evraklar.satirlar.kredi_karti_taksit_bilgisi.Uye_isyeri_no` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.TransactionReferenceId ` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyekaydetv3/post.md -->

# Tahsilat Tediye Kaydet V3 Çek Giriş Save

POST TahsilatTediyeKaydetV3 endpoint'i, ERP sisteminizde Tahsilat Tediye ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeKaydetV3
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_cari_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_cinsi` (integer)

  - `Mikro.evraklar.satirlar.cha_d_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kur` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kurtar` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_karsisrmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizmet` (integer)

  - `Mikro.evraklar.satirlar.cha_kod` (string)

  - `Mikro.evraklar.satirlar.cha_meblag` (string)

  - `Mikro.evraklar.satirlar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.satirlar.cha_projekodu` (string)

  - `Mikro.evraklar.satirlar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_tarihi` (string)

  - `Mikro.evraklar.satirlar.cha_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_vade` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri` (object)

  - `Mikro.evraklar.satirlar.odeme_emirleri.Sck_TCMB_Banka_kodu` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.Sck_TCMB_Sube_kodu` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.Sck_TCMB_il_kodu` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.sck_banka_adres1` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.sck_hesapno_sehir` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.sck_kesideyeri` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.sck_no` (string)

  - `Mikro.evraklar.satirlar.odeme_emirleri.sck_sube_adres2` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.TransactionReferenceId` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyesckaydet/post.md -->

# Tahsilat Tediye Senet Çıkış Bordrosu Kaydet Save

POST TahsilatTediyeSCKaydet endpoint'i, ERP sisteminizde Tahsilat Tediye evrakı ile ilgili senet çıkış işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeSCKaydet
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_cari_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_cinsi` (integer)

  - `Mikro.evraklar.satirlar.cha_d_cins` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kur` (integer)

  - `Mikro.evraklar.satirlar.cha_d_kurtar` (string)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizkod` (string)

  - `Mikro.evraklar.satirlar.cha_kasa_hizmet` (integer)

  - `Mikro.evraklar.satirlar.cha_kod` (string)

  - `Mikro.evraklar.satirlar.cha_normal_Iade` (integer)

  - `Mikro.evraklar.satirlar.cha_projekodu` (string)

  - `Mikro.evraklar.satirlar.cha_srmrkkodu` (string)

  - `Mikro.evraklar.satirlar.cha_tarihi` (string)

  - `Mikro.evraklar.satirlar.cha_tip` (integer)

  - `Mikro.evraklar.satirlar.cha_trefno` (string)

  - `Mikro.evraklar.satirlar.cha_vade` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.TransactionReferenceId ` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/tahsilat-tediye/paths/~1api~1apimethods~1tahsilattediyesilv2/post.md -->

# Tahsilat Tediye Sil V2 Delete

POST TahsilatTediyeSilV2 endpoint'i, ERP sisteminizde kayıtlı Tahsilat Tediye ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/TahsilatTediyeSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.cha_evrak_tip` (string)

  - `Mikro.evraklar.satirlar.cha_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.cha_evrakno_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimisemriolusturv2/post.md -->

# Üretim İş Emri Oluştur V2 Save

POST UretimIsEmriOlusturV2 endpoint'i, ERP sisteminizde Üretim İş Emri ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /API/APIMethods/UretimIsEmriOlusturV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.satirlar` (array)

  - `Mikro.satirlar.uretilecek_miktar` (number)

  - `Mikro.satirlar.urun_kodu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimrotaplankaydetv2/post.md -->

# Ürün Rota Plan Kaydet V2 Save

POST UretimRotaPlanKaydetV2 endpoint'i, ERP sisteminizde Ürün Rota Plan ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UretimRotaPlanKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.RtP_Aciklama` (string)

  - `Mikro.evraklar.satirlar.RtP_IsEmriKodu` (string)

  - `Mikro.evraklar.satirlar.RtP_OperasyonKodu` (string)

  - `Mikro.evraklar.satirlar.RtP_OperasyonSafhaNo` (integer)

  - `Mikro.evraklar.satirlar.RtP_PlanlananIsMerkezi` (string)

  - `Mikro.evraklar.satirlar.RtP_PlanlananKalipKodu` (string)

  - `Mikro.evraklar.satirlar.RtP_PlanlananMiktar` (integer)

  - `Mikro.evraklar.satirlar.RtP_PlanlananSure` (integer)

  - `Mikro.evraklar.satirlar.RtP_TamamlananMiktar` (integer)

  - `Mikro.evraklar.satirlar.RtP_TamamlananSure` (integer)

  - `Mikro.evraklar.satirlar.RtP_UrunKodu` (string)

  - `Mikro.evraklar.satirlar.Rtp_PlanlananBaslamaTarihi` (string)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.user_deger` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimrotaplansilv2/post.md -->

# Ürün Rota Plan Sil V2 Delete

POST UretimRotaPlanSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Rota Plan evrakı ile ilgili evrak seri ve sıra numarası ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UretimRotaPlanSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.RtP_IsEmriKodu` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepguidsilv2/post.md -->

# Üretim Talep Guid Sil V2 Delete Guid

POST UretimTalepGuidSilV2 endpoint'i, ERP sisteminizde Üretim Talebi Guid bilgisi göndererek Talep silme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/UretimTalepGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.utl_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepkaydetv2/post.md -->

# Üretim Talep Kaydet V2 Save

POST UretimTalepKaydetV2 endpoint'i, ERP sisteminizde Üretim Talep ile ilgili Yeni üretim talebi kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/UretimTalepKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.renk_beden` (array)

  - `Mikro.evraklar.satirlar.renk_beden.beden_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.renk_beden.miktar` (integer)

  - `Mikro.evraklar.satirlar.renk_beden.renk_kirilim_kodu` (string)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)

  - `Mikro.evraklar.satirlar.utl_Sor_Merk` (string)

  - `Mikro.evraklar.satirlar.utl_Stok_kodu` (string)

  - `Mikro.evraklar.satirlar.utl_belge_no` (string)

  - `Mikro.evraklar.satirlar.utl_belge_tarihi` (string)

  - `Mikro.evraklar.satirlar.utl_depo_no` (integer)

  - `Mikro.evraklar.satirlar.utl_evrak_seri` (string)

  - `Mikro.evraklar.satirlar.utl_miktari` (integer)

  - `Mikro.evraklar.satirlar.utl_projekodu` (string)

  - `Mikro.evraklar.satirlar.utl_tarihi` (string)

  - `Mikro.evraklar.satirlar.utl_teslim_tarihi` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/uretim/paths/~1api~1apimethods~1uretimtalepsilv2/post.md -->

# Üretim Talep Sil V2 Delete

POST UretimTalepSilV2 endpoint'i, ERP sisteminizde Üretim Talep ile ilgili Evrak Seri ve sıra bilgisi ile talep silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/APIMethods/UretimTalepSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.utl_evrak_seri` (string)

  - `Mikro.evraklar.satirlar.utl_evrak_sira` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/urun-recete/paths/~1api~1apimethods~1urunrecetekaydetv2/post.md -->

# Ürün Reçete Kaydet V2 Save

POST UrunReceteKaydetV2 endpoint'i, ERP sisteminizde Ürün Reçete ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UrunReceteKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.rec_alt_tukkod1` (string)

  - `Mikro.evraklar.satirlar.rec_anabirim` (integer)

  - `Mikro.evraklar.satirlar.rec_anakod` (string)

  - `Mikro.evraklar.satirlar.rec_anamiktar` (integer)

  - `Mikro.evraklar.satirlar.rec_anatipi` (integer)

  - `Mikro.evraklar.satirlar.rec_cinsi` (integer)

  - `Mikro.evraklar.satirlar.rec_eklenme_sarti` (integer)

  - `Mikro.evraklar.satirlar.rec_tuketim_birim` (integer)

  - `Mikro.evraklar.satirlar.rec_tuketim_kod` (string)

  - `Mikro.evraklar.satirlar.rec_tuketim_miktar` (integer)

  - `Mikro.evraklar.satirlar.rec_tuketim_recete_cinsi` (integer)

  - `Mikro.evraklar.satirlar.rec_tuketim_tur` (integer)

  - `Mikro.evraklar.satirlar.recete_kriterler` (array)

  - `Mikro.evraklar.satirlar.recete_kriterler.rk_alan_adi` (string)

  - `Mikro.evraklar.satirlar.recete_kriterler.rk_islem` (integer)

  - `Mikro.evraklar.satirlar.recete_kriterler.rk_stringdata` (string)

  - `Mikro.evraklar.satirlar.recete_kriterler.rk_tablo` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/urun-recete/paths/~1api~1apimethods~1urunrecetesilv2/post.md -->

# Ürün Reçete Sil V2 Delete

POST UrunReceteSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Reçete ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UrunReceteSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.revizyon_aciklamasi` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.rec_anakod` (string)

  - `Mikro.evraklar.satirlar.rec_anatipi` (integer)

  - `Mikro.evraklar.satirlar.rec_cinsi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/urun-rota/paths/~1api~1apimethods~1urunrotakaydetv2/post.md -->

# Ürün Rota Kaydet V2 Save

POST UrunRotaKaydetV2 endpoint'i, ERP sisteminizde Ürün Rota ile ilgili yeni evrak kayıt işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UrunRotaKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.URt_BagliRotaID` (integer)

  - `Mikro.evraklar.satirlar.URt_ID` (integer)

  - `Mikro.evraklar.satirlar.URt_OpKod` (string)

  - `Mikro.evraklar.satirlar.URt_RotaUrunKodu` (string)

  - `Mikro.evraklar.satirlar.URt_cinsi` (integer)

  - `Mikro.evraklar.satirlar.rota_detaylar` (array)

  - `Mikro.evraklar.satirlar.rota_detaylar.urd_IsmerkeziveyaGrupKod` (string)

  - `Mikro.evraklar.satirlar.rota_detaylar.urd_KriterDegeri1` (integer)

  - `Mikro.evraklar.satirlar.rota_detaylar.urd_MaxDeger1` (integer)

  - `Mikro.evraklar.satirlar.rota_detaylar.urd_MinDeger1` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/urun-rota/paths/~1api~1apimethods~1urunrotasilv2/post.md -->

# Ürün Rota Sil V2 Delete

POST UrunRotaSilV2 endpoint'i, ERP sisteminizde kayıtlı Ürün Rota ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/UrunRotaSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (string)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.revizyon_aciklamasi` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.URt_RotaUrunKodu` (string)

  - `Mikro.evraklar.satirlar.URt_cinsi` (integer)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifduzeltv2/post.md -->

# Verilen Teklif Guid Ekle V2 Add Guid

POST VerilenTeklifDuzeltV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı ile ilgili güncelleme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/VerilenTeklifDuzeltV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.tkl_Aciklama` (string)

  - `Mikro.evraklar.satirlar.tkl_Alisfiyati` (integer)

  - `Mikro.evraklar.satirlar.tkl_ProjeKodu` (string)

  - `Mikro.evraklar.satirlar.tkl_baslangic_tarihi` (string)

  - `Mikro.evraklar.satirlar.tkl_belge_no` (string)

  - `Mikro.evraklar.satirlar.tkl_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.tkl_cari_kod` (string)

  - `Mikro.evraklar.satirlar.tkl_cari_sormerk` (string)

  - `Mikro.evraklar.satirlar.tkl_cari_tipi` (string)

  - `Mikro.evraklar.satirlar.tkl_evrak_tarihi` (string)

  - `Mikro.evraklar.satirlar.tkl_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.tkl_evrakno_sira` (string)

  - `Mikro.evraklar.satirlar.tkl_harekettipi` (integer)

  - `Mikro.evraklar.satirlar.tkl_karorani` (integer)

  - `Mikro.evraklar.satirlar.tkl_miktar` (integer)

  - `Mikro.evraklar.satirlar.tkl_stok_kod` (string)

  - `Mikro.evraklar.satirlar.tkl_stok_sormerk` (string)

  - `Mikro.evraklar.satirlar.tkl_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifguidsilv2/post.md -->

# Verilen Teklif Guid Sil V2 Delete Guid

POST VerilenTeklifGuidSilV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı Guid bilgisi ile evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/VerilenTeklifGuidSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.tkl_Guid` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifkaydetv2/post.md -->

# Verilen Teklif Kaydet V2 Save

POST VerilenTeklifKaydetV2 endpoint'i, ERP sisteminizde Verilen Teklif evrakı yeni kayıt ekleme ile ilgili işlemler yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/VerilenTeklifKaydetV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.evrak_aciklamalari` (array)

  - `Mikro.evraklar.evrak_aciklamalari.aciklama` (string)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.tkl_Aciklama` (string)

  - `Mikro.evraklar.satirlar.tkl_Alisfiyati` (integer)

  - `Mikro.evraklar.satirlar.tkl_ProjeKodu` (string)

  - `Mikro.evraklar.satirlar.tkl_baslangic_tarihi` (string)

  - `Mikro.evraklar.satirlar.tkl_belge_no` (string)

  - `Mikro.evraklar.satirlar.tkl_birim_pntr` (integer)

  - `Mikro.evraklar.satirlar.tkl_cari_kod` (string)

  - `Mikro.evraklar.satirlar.tkl_cari_sormerk` (string)

  - `Mikro.evraklar.satirlar.tkl_cari_tipi` (string)

  - `Mikro.evraklar.satirlar.tkl_evrak_tarihi` (string)

  - `Mikro.evraklar.satirlar.tkl_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.tkl_harekettipi` (integer)

  - `Mikro.evraklar.satirlar.tkl_karorani` (integer)

  - `Mikro.evraklar.satirlar.tkl_miktar` (integer)

  - `Mikro.evraklar.satirlar.tkl_stok_kod` (string)

  - `Mikro.evraklar.satirlar.tkl_stok_sormerk` (string)

  - `Mikro.evraklar.satirlar.tkl_vergi_pntr` (integer)

  - `Mikro.evraklar.satirlar.user_tablo` (array)

  - `Mikro.evraklar.satirlar.user_tablo.aciklama` (string)


---

<!-- KAYNAK: https://apidocs.mikro.com.tr/apis/verilen-teklif/paths/~1api~1apimethods~1verilenteklifsilv2/post.md -->

# Verilen Teklif Sil V2 Delete

POST VerilenTeklifSilV2 endpoint'i, ERP sisteminizde kayıtlı Verilen Teklif evrakı ile ilgili evrak silme işlemleri yapmak için kullanılır.
Bu API endpoint'i üzerinden veri göndererek ilgili işlemleri hızlı, güvenli ve etkin şekilde gerçekleştirebilirsiniz.
Entegrasyon sırasında gönderilecek verilerin formatı ve içerik doğruluğuna dikkat edilmesi gerekmektedir.

Endpoint: POST /Api/apiMethods/VerilenTeklifSilV2
Version: 1.0.0

## Request fields (application/json):

  - `Mikro` (object)

  - `Mikro.ApiKey` (string)

  - `Mikro.CalismaYili` (integer)

  - `Mikro.FirmaKodu` (string)

  - `Mikro.KullaniciKodu` (string)

  - `Mikro.Sifre` (string)

  - `Mikro.evraklar` (array)

  - `Mikro.evraklar.satirlar` (array)

  - `Mikro.evraklar.satirlar.tkl_evrakno_seri` (string)

  - `Mikro.evraklar.satirlar.tkl_evrakno_sira` (integer)


---
