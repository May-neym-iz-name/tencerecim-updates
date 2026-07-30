// UPS Türkiye TAKİP servisi — Cloudflare Worker portu.
//
// Kaynak: electron/ups/soap.js. Oradaki mantık BİREBİR korunmuştur; tek fark taşıma katmanı:
//   Electron tarafı  → node:https (Electron 22 / Node 16'da global fetch yoktu)
//   Worker tarafı    → fetch (Worker'da node:https YOK)
//
// Buraya YALNIZ takip fonksiyonları taşındı (trackingLogin + trackLast).
// Gönderi oluşturma / iptal / kurye Worker'a taşınmaz: onlar kullanıcının önünde
// bekleyen işler ve yerel DB'ye yazıyorlar (docs/cloudflare-plani.md §3 "altın kural").
//
// DİKKAT — burayı değiştirirken electron/ups/soap.js ile karşılaştır. İki kopya var ve
// UPS'in tuhaflıkları (namespace sondaki '/', Login_V1 adı) iki yerde de doğru olmak zorunda.

// Takip servisi: WSDL targetNamespace = wsPaketIslemSorgulamaEng/ (sonda / VAR),
// login metodu Login_V1. QueryPackageInfo/Login_Type1 UPS tarafından tanınmıyor (HTTP 500).
const TRACKING_URL = 'https://ws.ups.com.tr/QueryPackageInfo/wsQueryPackagesInfo.asmx'
const TRACKING_NS = 'https://ws.ups.com.tr/wsPaketIslemSorgulamaEng/'

const ZAMAN_ASIMI_MS = 20000

function xmlKacis(deger) {
  if (deger === null || deger === undefined) return ''
  return String(deger)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// Yanıttan ilk <tag>...</tag> içeriğini döndürür (namespace öneki olsun olmasın).
function tagOku(xml, tag) {
  const re = new RegExp(`<(?:[\\w]+:)?${tag}\\b[^>]*?(?:/>|>([\\s\\S]*?)</(?:[\\w]+:)?${tag}>)`, 'i')
  const m = xml.match(re)
  if (!m) return null
  return m[1] === undefined ? '' : m[1]
}

function xmlCoz(s) {
  if (s === null || s === undefined) return s
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

// Ham SOAP 1.1 çağrısı. soap:Body içeriğini (string) döndürür; SOAP Fault'u hata fırlatır.
async function soapCagir(url, ns, metod, govdeIc) {
  const zarf =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    '<soap:Body>' +
    `<${metod} xmlns="${ns}">${govdeIc}</${metod}>` +
    '</soap:Body></soap:Envelope>'

  // SOAPAction = namespace + metod. Namespace sonda '/' içeriyorsa çift slash olmasın.
  const soapAction = ns.endsWith('/') ? `${ns}${metod}` : `${ns}/${metod}`

  let yanit
  try {
    // Content-Length elle hesaplanmaz: fetch kendisi koyar (node:https'te şarttı).
    yanit = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': soapAction },
      body: zarf,
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    })
  } catch (err) {
    // AbortSignal.timeout TimeoutError fırlatır; adını koruyup mesajı Türkçeleştiriyoruz.
    const sebep = err?.name === 'TimeoutError' ? `zaman aşımı (${ZAMAN_ASIMI_MS / 1000}s)` : err?.message
    throw new Error(`UPS servisine bağlanılamadı: ${sebep}`)
  }

  const metin = await yanit.text()
  if (!yanit.ok) {
    const fault = tagOku(metin, 'faultstring')
    throw new Error(`UPS servis hatası (HTTP ${yanit.status})${fault ? ': ' + fault : ''}`)
  }
  const fault = tagOku(metin, 'faultstring')
  if (fault) throw new Error(`UPS SOAP hatası: ${xmlCoz(fault)}`)
  return metin
}

// Takip servisi kendi oturumunu ister (gönderi oturumu burada geçmez).
export async function trackingLogin({ musteriKodu, kullaniciKodu, sifre }) {
  if (!musteriKodu || !kullaniciKodu || !sifre) {
    throw new Error('UPS kimlik bilgileri eksik (Worker secret\'ları kurulmamış)')
  }
  const govde =
    `<CustomerNumber>${xmlKacis(musteriKodu)}</CustomerNumber>` +
    `<UserName>${xmlKacis(kullaniciKodu)}</UserName>` +
    `<Password>${xmlKacis(sifre)}</Password>`
  const yanit = await soapCagir(TRACKING_URL, TRACKING_NS, 'Login_V1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') throw new Error(`UPS takip girişi başarısız (kod ${hataKod})`)
  const sessionID = tagOku(yanit, 'SessionID')
  if (!sessionID) throw new Error('UPS oturum kimliği alınamadı')
  return sessionID
}

// Bir takip numarasının son hareketi.
export async function trackLast(session, takipNo) {
  const govde =
    `<SessionID>${xmlKacis(session)}</SessionID>` +
    '<InformationLevel>1</InformationLevel>' +
    `<TrackingNumber>${xmlKacis(takipNo)}</TrackingNumber>`
  const yanit = await soapCagir(TRACKING_URL, TRACKING_NS, 'GetLastTransactionByTrackingNumber_V1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0' && hataKod !== null) {
    throw new Error(`Takip sorgusu başarısız (kod ${hataKod}): ${xmlCoz(tagOku(yanit, 'ErrorDefinition')) || 'Bilinmeyen hata'}`)
  }
  return {
    durumKodu: tagOku(yanit, 'StatusCode'),
    aciklama: xmlCoz(tagOku(yanit, 'ProcessDescription1') || ''),
    aciklama2: xmlCoz(tagOku(yanit, 'ProcessDescription2') || ''),
    sube: xmlCoz(tagOku(yanit, 'OperationBranchName') || ''),
    zaman: tagOku(yanit, 'ProcessTimeStamp') || '',
  }
}

// Test için açığa çıkarılır (saf, ağsız).
export const _ic = { tagOku, xmlCoz, xmlKacis }
