import { useState } from 'react'

// Sosyal medya görselleri için ortak yükleyici.
//
// Meta'nın görsel adresleri süreli olduğundan <img src={ham_url}> eski gönderilerde
// kırık çıkıyordu (ölçüm: 2022-2025 kayıtları HTTP 403). Görseller ana süreçte bir kez
// diske indirilir; buradan `sosyal-gorsel://` protokolüyle DOĞRUDAN diskten okunur.
//
// NEDEN PROTOKOL (2026-08-04 performans ölçümü): burası eskiden her görseli IPC ile
// base64 olarak alıp `atob` + bayt bayt döngüyle blob'a çeviriyordu. Sol liste 700
// satıra kadar çıktığı ve her satır bir görsel istediği için sekmeye tıklamak
// uygulamayı donduruyordu — tek açılışta ~42 MB senkron disk okuması, ~57 MB base64
// IPC trafiği ve renderer'da ~42 milyon döngü adımı. Üstelik elde tutulan LRU tavanı
// (150) listedeki satır sayısının ALTINDA kaldığı için hâlâ ekranda duran görsellerin
// blob adresleri iptal ediliyor, aşağı inildikçe görseller kırılıyordu.
//
// Protokole geçince base64, IPC yükü, çözme döngüsü ve blob ömrü yönetimi birden
// ortadan kalktı: Chromium dosyayı kendisi okur ve kendi önbelleğinde tutar.
const SEMA = 'sosyal-gorsel://img/'

// tur: 'gonderi' | 'profil'   boyut: 'kucuk' (liste/avatar) | 'tam' (detay görseli)
function adres(konuId, tur, boyut) {
  return `${SEMA}?t=${tur}&b=${boyut}&id=${encodeURIComponent(konuId)}`
}

// Görsel yoksa (silinmiş gönderi, indirilemedi, Messenger profil fotoğrafı izni yok)
// protokol hata döner → onError ile `yedek` içeriğe düşülür.
//
// Yükleme `loading="lazy"` ile ertelenir: Chromium yalnız görünüm alanına yaklaşan
// satırların görselini ister, 700 satırlık listede ~700 değil ~30 istek olur.
// Elle IntersectionObserver yazmaya gerek yok (kapsayıcı içi kaydırmada da çalışır).
export default function SosyalGorsel({ konuId, tur = 'gonderi', boyut = 'kucuk', className, yedek = null }) {
  // Hatayı konuId ile birlikte tut: satır geri dönüştürülüp başka konuya bağlanınca
  // eski hatanın yeni görseli gizlemesini engeller (effect'e gerek kalmadan sıfırlanır).
  const [hataliKonu, setHataliKonu] = useState(null)

  if (!konuId || hataliKonu === konuId) return yedek

  return (
    <img
      src={adres(konuId, tur, boyut)}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHataliKonu(konuId)}
    />
  )
}
