// YouTube modülü — IPC kanalları.
// Bağlantı katmanı + video yükleme / bilgi düzenleme + yorum okuma/yanıtlama.
// Analytics raporu sonraki fazda buraya eklenecek; hepsi client.cagir()
// üzerinden gider, token yönetimi tekrar yazılmaz.
const client = require('./client')
const kota = require('./kota')
const yukle = require('./yukle')
const yorumlar = require('./yorumlar')
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
  'youtube:baglantiKes': () => _baglantiSil(),

  // Bugün ne kadar kota harcandı, kaç video daha sığar.
  'youtube:kota': () => kota.durum(),

  // Video yükleme. Uzun sürer; arayüz 'youtube:yuklemeDurum' ile ilerlemeyi yoklar.
  'youtube:videoYukle': (p) => yukle.videoYukle(p || {}),

  // Devam eden/biten yüklemelerin ilerlemesi.
  'youtube:yuklemeDurum': (id) => yukle.ilerlemeDurum(id),

  // Var olan videonun baslik/aciklama/etiketlerini gunceller (50 birim).
  'youtube:videoGuncelle': (p) => yukle.videoGuncelle(p || {}),

  // Kanalin tum yorumlarini ceker ve sosyal_mesajlar'a yazar (sayfa basi 1 birim).
  // Meta yorumlariyla ayni tabloya gider; sekme, sizgecler ve atama hazir gelir.
  'youtube:yorumCek': (p) => yorumlar.yorumlariCek(p || {}),

  // Bir yoruma yanit yazar (50 birim).
  'youtube:yorumYanitla': (p) => yorumlar.yorumYanitla(p || {}),
}
