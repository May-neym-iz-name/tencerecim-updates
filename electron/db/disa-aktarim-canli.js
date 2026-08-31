// disa-aktarim-log.js'in uygulama bağlantısı: aktif DB + giriş yapmış kullanıcı.
// Çağrı noktaları (yedek.js, istek-pdf.js) tek satırla kayıt düşebilsin diye.
const { getDb } = require('./database')
const log = require('./disa-aktarim-log')

/** Aktif kullanıcıyla birlikte bir dışa aktarımı kaydeder. Hata fırlatmaz. */
function kaydet({ tur, kapsam, kayit_sayisi, dosya_adi }) {
  try {
    const kimlik = require('../yetki')._aktifKimlik()
    log.yaz(getDb(), {
      tur,
      kullanici_email: kimlik.eposta,
      uid: kimlik.uid,
      kapsam,
      kayit_sayisi,
      dosya_adi,
    })
  } catch (e) {
    // Denetim kaydı asla asıl işi çökertmez.
    console.error('[denetim] kayit atlandi:', e.message)
  }
}

module.exports = {
  // `_` öneki ŞART: main.js bu modülün TÜM dışa verilen anahtarlarını IPC
  // kanalı olarak kaydeder, `_` ile başlayanlar hariç. Öneksiz bırakılırsa
  // renderer doğrudan `kaydet` çağırıp sahte denetim kaydı üretebilirdi.
  _kaydet: kaydet,
  _TURLER: log.TURLER,

  // Ayarlar > Güvenlik ekranı için. Yetki: ayarlar_duzenle.
  'disa-aktarim-log:listele': (limit) => {
    require('../yetki')._yetkiKontrol('ayarlar_duzenle')
    return log.listele(getDb(), limit)
  },
}
