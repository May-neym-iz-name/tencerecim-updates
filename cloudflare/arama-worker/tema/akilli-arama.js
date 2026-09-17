/*
 * TENCERECİM AKILLI ARAMA — storefront eklentisi
 *
 * ikas temasına Storefront JS olarak eklenir. TASARIM İLKESİ: EKLENTİ, DEĞİŞTİRME.
 *   • Mevcut arama formuna dokunulmaz; Enter yine ikas'ın kendi aramasına gider.
 *   • Worker'a ulaşılamazsa panel hiç açılmaz — site bugünkü haliyle çalışır.
 *   • Renkler temanın KENDİ CSS değişkenlerinden okunur (--input-background,
 *     --input-text, --input-border, --primary-button-bg). Sabit renk yazılmaz ki
 *     panelden tema rengini değiştirdiğinizde panel de uysun.
 *   • Yazı tipi BİLEREK tanımlanmaz → tema fontu (Quicksand) miras alınır.
 */
(function () {
  'use strict'
  // Önizleme sayfası yerel sunucuyu gösterebilsin diye dışarıdan ezilebilir.
  var UC = window.TNC_ARAMA_UC || 'https://tencerecim-arama.tencerecim.workers.dev/ara'
  var BEKLEME = 150      // tuş bırakıldıktan sonra beklenen süre (ms)
  var ENAZ = 2           // bu kadar harften önce arama yapma
  var MOBIL = matchMedia('(max-width: 767px)')

  var stil = document.createElement('style')
  stil.textContent = [
    '.tnc-oneri{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:9999;',
    '  background:var(--input-background,#fff);color:var(--input-text,#000);',
    '  border:1px solid color-mix(in srgb,var(--input-text,#000) 12%,transparent);',
    '  border-radius:4px;',
    '  box-shadow:0 3px 7px rgba(128,128,128,.16),0 12px 28px -10px rgba(0,0,0,.22);',
    '  overflow:hidden;display:none}',
    '.tnc-oneri[data-acik]{display:block}',
    '.tnc-liste{list-style:none;margin:0;padding:4px 0;max-height:60vh;overflow-y:auto;',
    '  -webkit-overflow-scrolling:touch}',
    /* 44 px: parmakla güvenli isabet alanı. Mobil kritik olduğu için bu taban. */
    '.tnc-satir{display:flex;gap:10px;align-items:center;min-height:44px;padding:7px 12px;',
    '  cursor:pointer;text-decoration:none;color:inherit}',
    '.tnc-satir:hover,.tnc-satir[data-secili]{background:rgba(127,127,127,.12)}',
    /* Sabit 44×44 kutu: görsel gelmeden de yer kaplar, böylece liste
       yüklenirken zıplamaz (mobilde en rahatsız edici şey budur). */
    '.tnc-gorsel{flex:0 0 44px;width:44px;height:44px;border-radius:4px;',
    '  background:rgba(127,127,127,.10);object-fit:contain;display:block}',
    '.tnc-gorsel[data-yok]{opacity:.35}',
    '.tnc-metin{flex:1;min-width:0}',
    /* Kırpma yalnızca ADA uygulanır. Marka aynı -webkit-box içinde kalınca
       satır sonuna yapışıyordu ("...Tencere SetiFALEZ") — ayrı kutu şart. */
    '.tnc-ad{font-size:13px;line-height:1.3;overflow:hidden;',
    '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.tnc-alt{display:block;font-size:11px;opacity:.6;margin-top:3px;',
    '  text-transform:uppercase;letter-spacing:.04em}',
    '.tnc-fiyat{font-size:13px;font-weight:600;white-space:nowrap}',
    '.tnc-dip{padding:9px 12px;font-size:12px;text-align:center;cursor:pointer;',
    '  border-top:1px solid color-mix(in srgb,var(--input-text,#000) 10%,transparent);',
    '  background:var(--primary-button-bg,#ecdf93);color:var(--primary-button-text,#000);',
    '  font-weight:600}',
    '.tnc-bos{padding:16px 12px;font-size:13px;opacity:.7;text-align:center}',
    '@media (max-width:767px){.tnc-ad{-webkit-line-clamp:2;font-size:12.5px}',
    '  .tnc-liste{max-height:52vh}.tnc-fiyat{font-size:12.5px}}',
  ].join('')
  document.head.appendChild(stil)

  function para(n) {
    if (n == null) return ''
    try { return n.toLocaleString('tr-TR') + ' TL' } catch (e) { return n + ' TL' }
  }
  function kacis(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function bagla(form) {
    var girdi = form.querySelector('input[name="search"]')
    if (!girdi) return
    // ⚠️ "Bağlandı" DAMGASINA GÜVENME. Tema React tabanlı: sayfa yeniden
    // çizilince formun çocukları değişiyor ve panelimiz DOM'dan siliniyor —
    // ama damga öznitelik olarak kaldığı için kod "zaten bağlıyım" deyip
    // paneli bir daha eklemiyordu. Canlıda tam olarak bu oldu; yerel test
    // sayfasında React olmadığı için asla görülmezdi.
    // Doğru soru "bağlandım mı" değil, "PANELİM HÂLÂ ORADA MI".
    if (form._tncPanel && form._tncPanel.isConnected) return
    form.dataset.tncBagli = '1'

    var panel = document.createElement('div')
    panel.className = 'tnc-oneri'
    panel.setAttribute('role', 'listbox')
    form.appendChild(panel)
    form._tncPanel = panel

    /*
     * ikas'ın KENDİ öneri kutusu da bu formun doğrudan DIV çocuğu
     * (`absolute top-[calc(100%+1px)] left-0 right-0`). İki panel aynı anda
     * açılırsa üst üste binerler.
     *
     * Sınıf adına göre değil, YAPIYA göre hedef alıyoruz: formun bize ait
     * olmayan DIV çocukları. Sınıf adları tema güncellemesinde değişir, bu
     * yapı değişmez.
     *
     * GÜVENLİK: kalıcı gizleme YOK — yalnızca bizim panelimiz AÇIKKEN
     * gizleniyor. Worker'a ulaşılamazsa bizimki hiç açılmaz, ikas'ınki
     * kendiliğinden geri gelir. Aramayı bozmayan tek kurgu budur.
     */
    function ikasKutusu() {
      var out = []
      for (var i = 0; i < form.children.length; i++) {
        var c = form.children[i]
        if (c !== panel && c.tagName === 'DIV') out.push(c)
      }
      return out
    }
    function ikasGizle(gizle) {
      ikasKutusu().forEach(function (el) {
        if (gizle) {
          if (el.dataset.tncEski === undefined) el.dataset.tncEski = el.style.display || ''
          el.style.display = 'none'
        } else if (el.dataset.tncEski !== undefined) {
          el.style.display = el.dataset.tncEski
          delete el.dataset.tncEski
        }
      })
    }

    var zaman = null, kesici = null, secili = -1, sonuclar = []

    function kapat() { panel.removeAttribute('data-acik'); secili = -1; ikasGizle(false) }
    function ac() { panel.setAttribute('data-acik', '1'); ikasGizle(true) }

    function ciz(veri, sorgu) {
      sonuclar = veri.sonuclar || []
      if (!sonuclar.length) {
        // Sonuç yoksa da paneli açıyoruz: "bulunamadı" demek, sessizce hiçbir
        // şey yapmamaktan iyidir — müşteri yazmaya devam edip edemeyeceğini bilir.
        panel.innerHTML = '<div class="tnc-bos">Sonuç bulunamadı</div>'
        return ac()
      }
      var kac = MOBIL.matches ? 5 : 8
      var html = '<ul class="tnc-liste">'
      var kok = veri.gorselKok || ''
      sonuclar.slice(0, kac).forEach(function (u, i) {
        // 180 px kaynak, 44 px kutu → retina ekranda da net, dosya ~2 KB.
        var g = (kok && u.gorsel)
          ? '<img class="tnc-gorsel" loading="lazy" decoding="async" width="44" height="44" alt="" src="'
            + kok + kacis(u.gorsel) + '/image_180.webp">'
          : '<span class="tnc-gorsel" data-yok aria-hidden="true"></span>'
        html += '<a class="tnc-satir" role="option" data-i="' + i + '" href="/' + kacis(u.slug || '') + '">'
             +  g
             +  '<span class="tnc-metin"><span class="tnc-ad">' + kacis(u.ad) + '</span>'
             +  (u.marka ? '<span class="tnc-alt">' + kacis(u.marka) + '</span>' : '')
             +  '</span><span class="tnc-fiyat">' + para(u.fiyat) + '</span></a>'
      })
      html += '</ul><div class="tnc-dip" data-tumu="1">"' + kacis(sorgu) + '" için tüm sonuçlar</div>'
      panel.innerHTML = html
      ac()
    }

    function ara() {
      var s = girdi.value.trim()
      if (s.length < ENAZ) return kapat()
      if (kesici) kesici.abort()          // gecikmiş yanıt yenisini ezmesin
      kesici = new AbortController()
      fetch(UC + '?q=' + encodeURIComponent(s), { signal: kesici.signal })
        .then(function (r) { return r.json() })
        .then(function (v) { if (girdi.value.trim() === s) ciz(v, s) })
        .catch(function () { kapat() })   // Worker kapalıysa: sessizce yok say
    }

    girdi.addEventListener('input', function () {
      clearTimeout(zaman)
      zaman = setTimeout(ara, BEKLEME)
    })
    girdi.addEventListener('focus', function () { if (sonuclar.length) ac() })

    girdi.addEventListener('keydown', function (e) {
      if (!panel.hasAttribute('data-acik')) return
      var satirlar = panel.querySelectorAll('.tnc-satir')
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        secili += (e.key === 'ArrowDown' ? 1 : -1)
        if (secili < 0) secili = satirlar.length - 1
        if (secili >= satirlar.length) secili = 0
        satirlar.forEach(function (a, i) {
          if (i === secili) { a.setAttribute('data-secili', '1'); a.scrollIntoView({ block: 'nearest' }) }
          else a.removeAttribute('data-secili')
        })
      } else if (e.key === 'Enter' && secili >= 0) {
        e.preventDefault()
        satirlar[secili].click()
      } else if (e.key === 'Escape') kapat()
    })

    panel.addEventListener('mousedown', function (e) {
      // Dipteki "tüm sonuçlar" formu normal şekilde göndersin — ikas'ın kendi
      // arama sayfası her zaman erişilebilir kalmalı.
      if (e.target.closest('[data-tumu]')) { kapat(); form.submit() }
    })
    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) kapat()
    })
  }

  function tara() {
    document.querySelectorAll('form input[name="search"]').forEach(function (g) {
      var f = g.closest('form')
      if (f) bagla(f)
    })
  }
  tara()
  // Tema tek sayfa uygulaması: arama kutusu (mobil çekmece, sayfa geçişi) sonradan
  // DOM'a girebilir. Gözlemci olmadan mobilde hiç bağlanmama riski var.
  new MutationObserver(tara).observe(document.documentElement, { childList: true, subtree: true })
})()
