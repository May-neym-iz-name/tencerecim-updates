// IPC kanalı → asgari yetki haritası (09.09.2026 güvenlik taraması).
//
// NEDEN: yazma kanalları modül içinde yetkiKontrol ile korunuyordu ama OKUMA kanallarının
// çoğu açıktı. Saldırı denemesinde (sahte access_token ile profil düşürüldükten sonra)
// `musteriler:listele` ve `sosyal:konusmalar` hâlâ tam veri döndürdü — yani oturumu
// olmayan bir renderer müşteri ve DM verisini okuyabiliyordu. Burada listelenen kanallar
// main.js'teki IPC sarmalayıcısında, handler çağrılmadan ÖNCE denetlenir (savunma derinliği;
// modül içi kontroller de durur).
//
// KURAL: Giriş akışında (oturum kurulmadan) çağrılan kanallar BURAYA EKLENMEZ —
// `lokasyonlar:listele`, `veri-senk:*`, `ayar-senk:uygula`, `app:surum`, `auth:*`,
// `sistem:*`, `update:*`. Bkz. hafıza: ayar-senk:uygula yetkisiz KALMALI (giriş senkronu).
// Sayfaların App.jsx'teki kapı yetkisiyle AYNI kod kullanılır ki personel gördüğü sayfada
// "yetkiniz yok" yemesin.
const KANAL_YETKI = Object.freeze({
  // Müşteriler (sayfa kapısı: musteri_goruntule; satış ekranı da müşteri arar)
  'musteriler:listele': 'musteri_goruntule',
  'musteriler:getir': 'musteri_goruntule',

  // Ürün sözlükleri (Ürünler sayfası kapısı: urun_goruntule)
  'kategoriler:listele': 'urun_goruntule',
  'markalar:listele': 'urun_goruntule',
  'tedarikciler:listele': 'urun_goruntule',

  // Bildirimler
  'bildirim:liste': 'bildirim_goruntule',
  'bildirim:onemliler': 'bildirim_goruntule',
  'bildirim:sayac': 'bildirim_goruntule',
  'bildirim:okundu': 'bildirim_goruntule',
  'bildirim:tumunuOku': 'bildirim_goruntule',

  // Ana ekran / stok
  'panel:ozet': 'rapor_goruntule',
  'stok:dusuk': 'stok_goruntule',

  // Online siparişler
  'online-siparis:listele': 'online_siparis_goruntule',
  'online-siparis:getir': 'online_siparis_goruntule',

  // Sosyal medya okumaları (sayfa kapısı: sosyal_medya_yonet)
  'sosyal:liste': 'sosyal_medya_yonet',
  'sosyal:konu': 'sosyal_medya_yonet',
  'sosyal:sayac': 'sosyal_medya_yonet',
  'sosyal:sayaclar': 'sosyal_medya_yonet',
  'sosyal:sorular': 'sosyal_medya_yonet',
  'sosyal:sonUrunler': 'sosyal_medya_yonet',
  'sosyal:gonderiler': 'sosyal_medya_yonet',
  'sosyal:konusmalar': 'sosyal_medya_yonet',
  'sosyal:sablonlar': 'sosyal_medya_yonet',
  'sosyal:sablonMetin': 'sosyal_medya_yonet',
  'sosyal:gonderiOnizleme': 'sosyal_medya_yonet',
  'sosyal:magazaNumaralari': 'sosyal_medya_yonet',
  'sosyal:otomasyonGetir': 'sosyal_medya_yonet',
  'sosyal:otomasyonAdaySayisi': 'sosyal_medya_yonet',
  'sosyal:yurutucuDurum': 'sosyal_medya_yonet',
  'meta:durum': 'sosyal_medya_yonet',
  'meta:sonDurum': 'sosyal_medya_yonet',
  'meta:gorselOnbellek': 'sosyal_medya_yonet',
  'meta-ayar:getir': 'sosyal_medya_yonet',
  'meta:girisBaslat': 'ayarlar_duzenle',
  'youtube:durum': 'sosyal_medya_yonet',
  'youtube:kota': 'sosyal_medya_yonet',
  'youtube:tazele': 'sosyal_medya_yonet',
  'youtube:yuklemeDurum': 'sosyal_medya_yonet',
  'youtube:videoIstatistik': 'sosyal_medya_yonet',
  'youtube-ayar:getir': 'sosyal_medya_yonet',
  'youtube:girisBaslat': 'ayarlar_duzenle',
  'ai:hazir': 'sosyal_medya_yonet',
  'ai:yorumYanitOner': 'sosyal_medya_yonet',

  // Entegrasyon ayarları (maskeli de olsa yalnız ilgili yetkiye)
  'ikas-ayar:getir': 'ayarlar_duzenle',
  'ai-ayar:getir': 'ayarlar_duzenle',
  'ups-ayar:getir': 'kargo_yonet',

  // Yazdırma / etiket
  'fis:yazdir': 'satis_yap',
  'barkod:yazdir': 'urun_goruntule',
  'barkod:yazicilar': 'urun_goruntule',
  'kargo-etiket:onizle': 'kargo_yonet',
  'kargo-etiket:pdf': 'kargo_yonet',
})

module.exports = { KANAL_YETKI }
