/*
 * TENCERECİM KAMPANYA ŞERİDİ — storefront eklentisi (deneme)
 *
 * ikas → Satış Kanalları → tencerecim.store → Eklentiler → Scriptler'e
 * <script> … </script> İÇİNDE yapıştırılır (kampanya-seridi.panel.html hazır hali).
 *
 * İLKELER
 *   • Yalnızca SAYFA eşleşince çizilir (aşağıdaki SAYFA). Diğer sayfalarda
 *     tek bir pathname karşılaştırmasıyla biter — ağ isteği YOK, DOM dokunuşu YOK.
 *   • Tüm HTML/CSS bu dosyanın içindedir: iframe yok, dış fetch yok, font
 *     yüklemesi yok (tema fontu Quicksand miras alınır).
 *   • Renkler temanın kendi CSS değişkenlerinden okunur; panelden rengi
 *     değiştirirsen şerit de değişir. Sabit hex yalnızca yedek değerdir.
 *   • Tema React/Next.js: sayfa yeniden çizilince eklediğimiz düğüm silinebilir,
 *     sayfalar arası geçiş tam yükleme olmadan olur. Bu yüzden "bir kez ekledim"
 *     damgasına DEĞİL, "şeridim hâlâ DOM'da mı + hâlâ doğru sayfada mıyım"
 *     sorusuna bakılır (akıllı aramada canlıda yaşanan ders).
 */
(function () {
  'use strict'

  /* ---- AYARLAR: yalnız bu bloğu düzenle ---- */
  // Önizleme sayfası kendi yolunu geçebilsin diye dışarıdan ezilebilir.
  var SAYFA = window.TNC_SERIT_SAYFA || ['/denem', '/deneme']   // şeridin görüneceği yollar
  var ETIKET = 'KAMPANYA'
  var METIN = 'Yeni sezon tencere setleri mağazamızda.'
  var ALT = 'Gölcük ve Pendik şubelerimizden aynı gün teslim.'
  var DUGME = 'Ürünleri İncele'
  var LINK = '/'
  /* ------------------------------------------ */

  var ID = 'tnc-kampanya-seridi'

  var stil = document.createElement('style')
  stil.textContent = [
    '#' + ID + '{',
    '  --s-bg:var(--header-background-color,#052238);',
    '  --s-renk:var(--header-text-color,#ecdf93);',
    '  --s-dugme-bg:var(--primary-button-bg,#ecdf93);',
    '  --s-dugme-renk:var(--primary-button-text,#000);',
    '  background:var(--s-bg);color:var(--s-renk);',
    /* Üstte ince krem çizgi: header ile aynı laciverte yapışmasın diye ayırıcı. */
    '  border-top:2px solid var(--s-dugme-bg);',
    '  margin:0 0 24px;padding:18px clamp(16px,4vw,48px);',
    '  display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}',
    '#' + ID + ' .tnc-s-metin{display:flex;align-items:center;gap:16px;min-width:0;flex:1 1 320px}',
    '#' + ID + ' .tnc-s-etiket{flex:0 0 auto;font-size:11px;font-weight:700;letter-spacing:.14em;',
    '  padding:5px 9px;border:1px solid var(--s-renk);border-radius:2px;opacity:.9}',
    '#' + ID + ' .tnc-s-baslik{margin:0;font-size:clamp(16px,1.6vw,20px);font-weight:700;line-height:1.25}',
    '#' + ID + ' .tnc-s-alt{margin:3px 0 0;font-size:13px;opacity:.75;line-height:1.3}',
    '#' + ID + ' .tnc-s-dugme{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;',
    '  background:var(--s-dugme-bg);color:var(--s-dugme-renk);text-decoration:none;',
    '  font-weight:700;font-size:14px;padding:12px 20px;border-radius:3px;',
    '  transition:transform .15s ease,box-shadow .15s ease}',
    '#' + ID + ' .tnc-s-dugme:hover{transform:translateY(-1px);box-shadow:0 6px 16px -6px rgba(0,0,0,.6)}',
    '#' + ID + ' .tnc-s-dugme svg{width:14px;height:14px}',
    '@media (max-width:767px){',
    '  #' + ID + '{padding:16px;gap:14px}',
    '  #' + ID + ' .tnc-s-etiket{display:none}',
    '  #' + ID + ' .tnc-s-dugme{flex:1 1 100%;justify-content:center;min-height:44px}}',
  ].join('')

  function kacis(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function seritUret() {
    var el = document.createElement('section')
    el.id = ID
    el.setAttribute('aria-label', 'Kampanya duyurusu')
    el.innerHTML =
      '<div class="tnc-s-metin">' +
        '<span class="tnc-s-etiket">' + kacis(ETIKET) + '</span>' +
        '<div><p class="tnc-s-baslik">' + kacis(METIN) + '</p>' +
        (ALT ? '<p class="tnc-s-alt">' + kacis(ALT) + '</p>' : '') + '</div>' +
      '</div>' +
      '<a class="tnc-s-dugme" href="' + kacis(LINK) + '">' + kacis(DUGME) +
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M3 8h10M9 4l4 4-4 4"/></svg></a>'
    return el
  }

  function dogruSayfa() {
    var yol = location.pathname.replace(/\/+$/, '') || '/'
    return SAYFA.indexOf(yol) !== -1
  }

  function uygula() {
    var mevcut = document.getElementById(ID)
    if (!dogruSayfa()) { if (mevcut) mevcut.remove(); return }
    if (mevcut && mevcut.isConnected) return
    var ana = document.querySelector('main')
    if (!ana) return
    if (!stil.isConnected) document.head.appendChild(stil)
    ana.insertBefore(seritUret(), ana.firstChild)
  }

  function basla() {
    uygula()
    // React yeniden çizimi + istemci tarafı sayfa geçişi için tek gözlemci.
    new MutationObserver(uygula).observe(document.body, { childList: true, subtree: true })
  }
  if (document.body) basla()
  else document.addEventListener('DOMContentLoaded', basla)
})()
