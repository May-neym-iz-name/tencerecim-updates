// YouTube modülü — IPC kanalları.
// Bu dosya şu an YALNIZCA BAĞLANTI katmanını açar (kur / durum / tazele / kes).
// Video yükleme, yorum yönetimi ve Analytics raporu sonraki fazlarda buraya eklenecek;
// hepsi client.cagir() üzerinden gider, token yönetimini tekrar yazmaya gerek yoktur.
const client = require('./client')
const { _baglantiSil } = require('../db/youtube-ayarlar')

module.exports = {
  // Ucuz durum sorgusu — ağa çıkmaz, sadece DB'ye bakar. Arayüz açılışında çağrılır.
  'youtube:durum': () => client.durum(),

  // Gerçek doğrulama: kanal bilgisini API'den çeker ve ayarlara yazar (1 birim kota).
  // "Bağlantıyı test et" düğmesi bunu çağırır.
  'youtube:tazele': () => client.kurulumTamamla(),

  // Yetkiyi yerel olarak siler. DİKKAT: Google tarafındaki izni kaldırmaz —
  // onun için Google Hesabı → Güvenlik → Üçüncü taraf uygulamalar gerekir.
  'youtube:baglantiKes': () => _baglantiSil(),
}
