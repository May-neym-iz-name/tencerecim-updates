// YouTube modülü — IPC kanalları.
// Bağlantı katmanı + video yükleme / bilgi düzenleme + yorum okuma/yanıtlama.
// Analytics raporu sonraki fazda buraya eklenecek; hepsi client.cagir()
// üzerinden gider, token yönetimi tekrar yazılmaz.
const client = require('./client')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const kota = require('./kota')
const yukle = require('./yukle')
const yorumlar = require('./yorumlar')
const istatistik = require('./istatistik')
const { _baglantiSil } = require('../db/youtube-ayarlar')

module.exports = {
  // Ucuz durum sorgusu — ağa çıkmaz, sadece DB'ye bakar. Arayüz açılışında çağrılır.
  'youtube:durum': () => client.durum(),

  // Gerçek doğrulama: kanal bilgisini API'den çeker ve ayarlara yazar (1 birim kota).
  'youtube:tazele': async () => {
    kota.kotaKontrol('channels.list')
    const r = await client.kurulumTamamla()
    kota.harca('channels.list')
    return r
  },

  // Yetkiyi yerel olarak siler. DİKKAT: Google tarafındaki izni kaldırmaz —
  // onun için Google Hesabı → Güvenlik → Üçüncü taraf uygulamalar gerekir.
  'youtube:baglantiKes': () => { yetkiKontrol('ayarlar_duzenle'); return _baglantiSil() },

  // Bugün ne kadar kota harcandı, kaç video daha sığar.
  'youtube:kota': () => kota.durum(),

  // Video yükleme. Uzun sürer; arayüz 'youtube:yuklemeDurum' ile ilerlemeyi yoklar.
  'youtube:videoYukle': (p) => { yetkiKontrol('sosyal_medya_yonet'); return yukle.videoYukle(p || {}) },

  // Devam eden/biten yüklemelerin ilerlemesi.
  'youtube:yuklemeDurum': (id) => yukle.ilerlemeDurum(id),

  // Var olan videonun baslik/aciklama/etiketlerini gunceller (50 birim).
  'youtube:videoGuncelle': (p) => { yetkiKontrol('sosyal_medya_yonet'); return yukle.videoGuncelle(p || {}) },

  // Kanalin tum yorumlarini ceker ve sosyal_mesajlar'a yazar (sayfa basi 1 birim).
  // Meta yorumlariyla ayni tabloya gider; sekme, sizgecler ve atama hazir gelir.
  'youtube:yorumCek': (p) => { yetkiKontrol('sosyal_medya_yonet'); return yorumlar.yorumlariCek(p || {}) },

  // Bir yoruma yanit yazar (50 birim).
  'youtube:yorumYanitla': (p) => { yetkiKontrol('sosyal_medya_yonet'); return yorumlar.yorumYanitla(p || {}) },

  // Bir videonun izlenme/begeni/yorum sayisi. 6 saatten yeni kayit varsa AGA CIKMAZ
  // (0 birim); bayatsa 1 birim harcar. Sosyal Medya sag paneli her konusma acilisinda
  // cagirir, bu yuzden tazelik kapisi kotayi korumak icin sart.
  'youtube:videoIstatistik': (p) => istatistik.istatistikGetir(p && p.konu_id),
}
