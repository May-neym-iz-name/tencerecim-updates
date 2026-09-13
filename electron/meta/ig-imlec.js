// IG DM telafi imleci — "uygulama kapalıyken gelenler" sorununun saf mantığı.
//
// NEDEN VAR (ölçüldü 13.09.2026): çekim turu IG konuşma listesinin YALNIZ en üstünden
// birkaç konuşma okuyordu ve liste SON HAREKETE göre sıralı. Otomasyonun kendi giden
// kartları da hareket sayıldığından gerçek gelen DM'ler pencerenin altına düşüp bir daha
// hiç okunmuyordu. Ayrıca imleç olmadığı için PC kapalıyken gelen her şey kalıcı kayıptı:
// 12.09 18:46 → 13.09 21:09 arası 26 saat TAMAMEN boştu.
//
// Çözüm: en son görülen gelen mesajın tarihini imleç olarak sakla; açılışta konuşma
// listesinde imlecin GERİSİNE düşene kadar aşağı in. Liste recency sıralı olduğu için
// üst üste birkaç "eski" konuşma görmek listenin geri kalanının da eski olduğunu gösterir.
//
// Burası SAF: ağ/DB yok, bu yüzden testlenebilir (ig-imlec.test.js).

// Üst üste kaç "yeni mesajı yok" konuşmadan sonra taramayı bitirelim. 1 yetmez: Meta
// sıralaması ara sıra tek bir konuşmada oynayabiliyor, tek eskiye bakıp durmak erken keser.
const ARDISIK_ESKI_ESIGI = 3

// Telafi turunun tavanı. Sınırsız tarama, uzun kapalılıktan sonra turu saatlerce
// sürdürüp normal çekimi bloke ederdi.
const TELAFI_MAX_KONUSMA = 300

// created_time hem '2026-09-13T18:22:12+0000' hem '...Z' biçiminde gelir; ikisi de
// Date ile doğru çözülür. Çözülemeyen değer sıralamayı bozmasın diye atılır.
function zaman(deger) {
  if (!deger) return null
  const t = Date.parse(deger)
  return Number.isNaN(t) ? null : t
}

// Mesaj listesindeki en yeni tarihi mevcut imleçle karşılaştırıp büyüğünü döner (ISO).
// Girdi boşsa veya hepsi eskiyse mevcut imleç aynen korunur.
function imlecIlerlet(mevcut, mesajlar) {
  let enIyi = zaman(mevcut)
  let enIyiIso = mevcut || null
  for (const m of mesajlar || []) {
    const t = zaman(m && m.created_time)
    if (t != null && (enIyi == null || t > enIyi)) {
      enIyi = t
      enIyiIso = new Date(t).toISOString()
    }
  }
  return enIyiIso
}

// Bu konuşmada imleçten SONRA gelen bir mesaj var mı? İmleç yoksa (ilk kurulum)
// her konuşma "yeni" sayılır — ilk tarama doğal olarak tavana kadar iner.
function yeniMesajVarMi(mesajlar, imlec) {
  const sinir = zaman(imlec)
  if (sinir == null) return true
  for (const m of mesajlar || []) {
    const t = zaman(m && m.created_time)
    if (t != null && t > sinir) return true
  }
  return false
}

/**
 * Telafi taramasının durma kararını tutar.
 *
 * Kullanım: her konuşmanın mesajları çekildikten sonra `kaydet(mesajlar)` çağrılır;
 * `true` dönerse tarama biter. Durum dışarıda tutulmaz, bu yüzden tur yarıda kalırsa
 * (ağ hatası) bir sonraki tur temiz başlar — imleç zaten kalıcı, kayıp olmaz.
 */
function telafiTakipci({ imlec, esik = ARDISIK_ESKI_ESIGI, maxKonusma = TELAFI_MAX_KONUSMA } = {}) {
  let ardisikEski = 0
  let bakilan = 0
  return {
    kaydet(mesajlar) {
      bakilan++
      if (yeniMesajVarMi(mesajlar, imlec)) ardisikEski = 0
      else ardisikEski++
      return ardisikEski >= esik || bakilan >= maxKonusma
    },
    get bakilan() { return bakilan },
  }
}

module.exports = {
  ARDISIK_ESKI_ESIGI,
  TELAFI_MAX_KONUSMA,
  imlecIlerlet,
  yeniMesajVarMi,
  telafiTakipci,
}
