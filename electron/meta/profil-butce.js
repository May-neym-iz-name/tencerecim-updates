// IG profil fotoğrafı çekiminin hız-sınırı koruması — saf mantık (ağ/DB yok).
//
// NEDEN VAR (ölçüldü 15.09.2026, Meta geliştirici panelinden):
// Uygulama seviyesi hız sınırını dolduran tek uç nokta `gr:get:IGBusinessScopedID`
// (24 saatte 902 çağrı) ve kodda tek karşılığı DM avatarı (index.js profilFotografi).
// Ölçüm: 7.306 benzersiz IG göndereninin 3.660'ının (%50,1) fotoğrafı HİÇ alınamıyor.
// Eski davranışta başarısızlık yalnız 30 dk ve YALNIZ BELLEKTE hatırlanıyordu →
// aynı 3.660 kişi gün boyu, her yeniden başlatmada baştan soruluyordu.
//
// İki koruma:
//   1) Kalıcı olumsuz önbellek + artan bekleme (aşağıdaki kademeler)
//   2) Saatlik tavan: tepe anlarda (gelen kutusu açılıp kaydırılınca) sayaç %100'e
//      fırlıyordu; tavan dolunca avatar sessizce harf-avatara düşer, mesaj akışı
//      ETKİLENMEZ — bu yalnız süslemedir.

const GUN_MS = 24 * 3600 * 1000

// Kaçıncı başarısızlıkta ne kadar susulacağı. Artan bekleme, çünkü bir hesabın
// fotoğrafı bir kez alınamıyorsa (silinmiş/gizli/izinsiz) yarın da alınamaması
// çok olası; ama "asla" demiyoruz — hesap düzelirse en geç 30 günde yakalanır.
const BEKLEME_KADEMELERI = [1 * GUN_MS, 7 * GUN_MS, 30 * GUN_MS]

// Saatte en fazla kaç profil çağrısı. Panel penceresi KAYAN 1 SAAT olduğu için
// tavan da saatlik.
//
// 60 SEÇİLDİ, daha yüksek değil: asıl risk ilk doldurma turu. Olumsuz önbellek boşken
// 3.660 kişinin her biri bir kez denenecek; tavan 120 olsaydı ~30 saat boyunca
// KESİNTİSİZ 120/saat sürerdi. Tam saatlik tavanı bilmiyoruz (panel yüzde gösteriyor,
// mutlak sayı değil) — ölçülen 902/gün zaten %100'e değdiriyordu, o yüzden sürekli
// yüksek bir taban almıyoruz. 60 ile backlog ~61 saatte (2,5 gün) erir ve bu GÖRÜNMEZ:
// başarıyla önbelleğe alınmış 3.590 avatar zaten diskte, anında çiziliyor.
const SAATLIK_TAVAN = 60
const PENCERE_MS = 3600 * 1000

function zaman(deger) {
  if (!deger) return null
  const t = Date.parse(deger)
  return Number.isNaN(t) ? null : t
}

// Kaçıncı denemeden sonra ne kadar beklenecek (ms). Kademe listesinin sonundan
// sonrası hep son kademe.
function sonrakiBekleme(deneme) {
  const i = Math.max(0, Math.min(BEKLEME_KADEMELERI.length - 1, (deneme || 1) - 1))
  return BEKLEME_KADEMELERI[i]
}

/**
 * Bu gönderenin profili yeniden denenebilir mi?
 * kayit: { deneme, son_deneme } — hiç denenmemişse null/undefined.
 * Kayıt yoksa DENENİR (yeni kişi). Kayıt varsa bekleme süresi dolduysa denenir.
 */
function denenebilirMi(kayit, simdi = Date.now()) {
  if (!kayit) return true
  const son = zaman(kayit.son_deneme)
  if (son == null) return true // bozuk tarih kalıcı engel olmasın
  return simdi - son >= sonrakiBekleme(kayit.deneme)
}

/**
 * Saatlik çağrı bütçesi. Damgalar bellekte tutulur: yeniden başlatmada sıfırlanır,
 * bu SORUN DEĞİL — tavanın amacı ani tepeyi kırmak, günlük muhasebe tutmak değil.
 */
function butce({ tavan = SAATLIK_TAVAN, pencereMs = PENCERE_MS } = {}) {
  let damgalar = []
  const temizle = (simdi) => { damgalar = damgalar.filter(t => simdi - t < pencereMs) }
  return {
    izinVar(simdi = Date.now()) {
      temizle(simdi)
      return damgalar.length < tavan
    },
    // Çağrı YAPILDIKTAN sonra işaretlenir (başarılı da olsa başarısız da olsa —
    // hız sınırını tüketen şey çağrının kendisidir, sonucu değil).
    dusur(simdi = Date.now()) {
      temizle(simdi)
      damgalar.push(simdi)
      return damgalar.length
    },
    get kullanilan() { temizle(Date.now()); return damgalar.length },
  }
}

module.exports = {
  GUN_MS,
  BEKLEME_KADEMELERI,
  SAATLIK_TAVAN,
  PENCERE_MS,
  sonrakiBekleme,
  denenebilirMi,
  butce,
}
