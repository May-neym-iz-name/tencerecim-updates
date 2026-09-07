// Görünen ad sadeleştirme.
//
// YouTube artık kanal adını TANITICI (handle) olarak döndürüyor: "@MevlutGunay-c7p".
// Gelen kutusunda okunması zor ve gereksiz uzun; listede adın belirgin olması
// gerekiyor. Bu modül tanıtıcıyı insan okunur bir ada çevirir.
//
// SAF: I/O yok. Tahmin içerir, bu yüzden KAYITLI VERİYİ DEĞİŞTİRMEZ — yalnız
// görüntülemede kullanılır. Yanlış bölünen bir ad yüzünden kimlik kaybolmasın.

// YouTube tanıtıcılarına eklediği ayırt edici son ek: "-c7p", "-m7e", "-d8k6f".
// Harf VE rakam karışımı olmasını şart koşuyoruz; "-oglu" gibi gerçek ad
// parçaları böylece korunur.
const SONEK = /-(?=[a-z0-9]{2,6}$)(?=[a-z]*[0-9])[a-z0-9]{2,6}$/

/** Bitişik yazılmış büyük harfli kelimeleri ayırır: "MevlutGunay" → "Mevlut Gunay". */
function kelimeleriAyir(s) {
  // Türkçe büyük harfler de sınır sayılır (İ, Ş, Ğ, Ü, Ö, Ç).
  return s.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2')
}

/** Her kelimenin ilk harfini büyütür (Türkçe kurallarıyla). */
function basHarfleriBuyut(s) {
  return s.split(' ').map(k => (
    k ? k[0].toLocaleUpperCase('tr') + k.slice(1) : k
  )).join(' ')
}

/**
 * Tanıtıcıyı okunur ada çevirir. Çevrilemiyorsa GİRDİYİ AYNEN döndürür —
 * boş ya da bozuk bir ad, uzun bir addan daha kötüdür.
 *
 * @param {string} ham  "@MevlutGunay-c7p" | "Ayşe Yılmaz" | "@tencerecimstore"
 * @param {number} enFazla  Bu uzunluğu aşarsa sonu "…" ile kırpılır (0 = kırpma).
 */
function adSadelestir(ham, enFazla = 0) {
  const g = String(ham || '').trim()
  if (!g) return ''

  // Zaten boşluk içeriyorsa gerçek addır (Instagram/Facebook) — dokunma.
  if (/\s/.test(g)) return kirp(g, enFazla)

  let s = g.replace(/^@/, '')
  // SIRA ÖNEMLİ: önce ayırt edici son ek, sonra ayraçlar, EN SON rakamlar.
  // Ayraçlar rakamlardan önce temizlenmezse "wasabi44." sondaki noktaya takılır
  // ve rakamlar kalır.
  s = s.replace(SONEK, '')
  // Nokta, alt çizgi ve TİRE ayraçtır. Tire buraya SONEK kuralından SONRA gelir:
  // "@ahmet-oglu" gerçek bir addır, "-c7p" ise rastgele ektir.
  s = s.replace(/[._-]+/g, ' ').trim()
  // Sondaki rakam yığını: "sukrankara117" → "sukrankara". Adın TAMAMI rakamsa
  // dokunma (o zaman geriye hiçbir şey kalmaz).
  if (/[^0-9\s]/.test(s)) s = s.replace(/[0-9]+$/, '')
  s = kelimeleriAyir(s).replace(/\s+/g, ' ').trim()
  if (!s) return kirp(g, enFazla)
  return kirp(basHarfleriBuyut(s), enFazla)
}

function kirp(s, enFazla) {
  if (!enFazla || s.length <= enFazla) return s
  return s.slice(0, enFazla - 1).trimEnd() + '…'
}

/** Avatar harfi — sadeleşmiş addan alınır ki "@" hiç görünmesin. */
function adBasHarfi(ham) {
  const s = adSadelestir(ham)
  return s ? s[0].toLocaleUpperCase('tr') : '?'
}

export { adSadelestir, adBasHarfi, kelimeleriAyir }
