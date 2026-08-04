// Dış bağlantı yönlendirme kararı: hangi adres uygulama penceresinde açılır,
// hangisi kullanıcının varsayılan tarayıcısına gider.
//
// Ayrı dosya olmasının sebebi test edilebilirlik: main.js modül seviyesinde
// app.requestSingleInstanceLock() çağırdığı için testten require edilemiyor.

// UYGULAMA İÇİNDE açılacak siteler — liste BİLEREK kısa tutulur.
//
// Ölçüm (2026-08-04): tek bir UPS takip sayfası uygulama içinde açıkken 4 ayrı
// renderer süreci ve ~300 MB RAM ekliyordu. Sebep Chromium'un site izolasyonu:
// sayfanın kendisi bir süreç, üzerindeki her üçüncü taraf iframe (analitik, sohbet,
// recaptcha) birer süreç daha. Uygulamanın toplam belleği 330 MB'den 629 MB'ye
// bu yüzden çıkıyordu.
//
// Kural: yalnızca iş akışının TAM ORTASINDA olan, uygulamadan çıkmanın personeli
// yavaşlatacağı siteler içeride kalır. Geri kalan her şey (sosyal medya, tedarikçi
// siteleri, rastgele bağlantılar) tarayıcıya gider — orada oturum zaten açık ve
// uygulamanın belleğine hiç dokunmuyor.
const IC_PENCERE_HOSTLARI = [
  'ups.com',
  'ups.com.tr',
]

/**
 * Adres uygulama penceresinde mi açılmalı?
 *
 * Eşleşme NOKTA SINIRINDA yapılır. `host.includes('ups.com')` yazılsaydı
 * `sahte-ups.com.saldirgan.net` de "iç site" sayılıp uygulama penceresinde
 * açılırdı — bu, dış içeriği uygulamanın süreç ağacına sokan bir açık olurdu.
 */
function icerideAcilirMi(url, hostlar = IC_PENCERE_HOSTLARI) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase()
    return hostlar.some(h => host === h || host.endsWith('.' + h))
  } catch {
    return false // ayrıştırılamayan adres → içeri alma, dışarı gönder
  }
}

module.exports = { IC_PENCERE_HOSTLARI, icerideAcilirMi }
