// UPS Türkiye yurt içi SOAP istemcisi (Node fetch + elle XML zarfı).
// Servisler ASMX (SOAP 1.1). Namespace ve element isimleri UPS örnek zarflarından alındı.
//
// İki ayrı servis:
//  - Gönderi:  https://ws.ups.com.tr/wsCreateShipment/wsCreateShipment.asmx  (ns: .../wsCreateShipment)
//  - Takip:    https://ws.ups.com.tr/QueryPackageInfo/wsQueryPackagesInfo.asmx (ns: .../QueryPackageInfo)
//
// Oturum: Login_Type1 → 36 haneli SessionID (5 dk timeout). Her gönderi çağrısında taze login alırız.

const SHIPMENT_URL = 'https://ws.ups.com.tr/wsCreateShipment/wsCreateShipment.asmx'
const SHIPMENT_NS = 'https://ws.ups.com.tr/wsCreateShipment'
const TRACKING_URL = 'https://ws.ups.com.tr/QueryPackageInfo/wsQueryPackagesInfo.asmx'
const TRACKING_NS = 'https://ws.ups.com.tr/QueryPackageInfo'

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

// Belirli bir tag'in tüm tekrarlarını dizi olarak döndürür.
function tumTaglar(xml, tag) {
  const re = new RegExp(`<(?:[\\w]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w]+:)?${tag}>`, 'gi')
  const sonuc = []
  let m
  while ((m = re.exec(xml)) !== null) sonuc.push(m[1])
  return sonuc
}

function xmlCoz(s) {
  if (s === null || s === undefined) return s
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

// Ham SOAP 1.1 çağrısı yapar; soap:Body içeriğini (string) döndürür. SOAP Fault'u hata fırlatır.
async function soapCagir(url, ns, metod, govdeIc) {
  const zarf =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
    '<soap:Body>' +
    `<${metod} xmlns="${ns}">${govdeIc}</${metod}>` +
    '</soap:Body></soap:Envelope>'

  let yanit
  try {
    yanit = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${ns}/${metod}`,
      },
      body: zarf,
    })
  } catch (err) {
    throw new Error(`UPS servisine bağlanılamadı: ${err.message}`)
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

// Oturum açar, SessionID döndürür.
async function login({ musteriKodu, kullaniciKodu, sifre }) {
  if (!musteriKodu || !kullaniciKodu || !sifre) {
    throw new Error('UPS kimlik bilgileri eksik. Ayarlar > UPS Kargo bölümünden giriniz.')
  }
  const govde =
    `<CustomerNumber>${xmlKacis(musteriKodu)}</CustomerNumber>` +
    `<UserName>${xmlKacis(kullaniciKodu)}</UserName>` +
    `<Password>${xmlKacis(sifre)}</Password>`
  const yanit = await soapCagir(SHIPMENT_URL, SHIPMENT_NS, 'Login_Type1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') {
    throw new Error(`UPS girişi başarısız (kod ${hataKod}): ${xmlCoz(tagOku(yanit, 'ErrorDefinition')) || 'Kimlik bilgilerini kontrol edin'}`)
  }
  const sessionID = tagOku(yanit, 'SessionID')
  if (!sessionID) throw new Error('UPS oturum kimliği alınamadı')
  return sessionID
}

// ShipmentInfo XML'ini kurar. veri: gönderici + alıcı + paket bilgileri.
function shipmentInfoXml(v) {
  const koliAdedi = Math.max(1, parseInt(v.koliAdedi, 10) || 1)
  // Her koli için bir DimensionInfo gerekli (adet eşit olmalı).
  const agirlik = Number(v.agirlik) || 1
  let boyutlar = ''
  for (let i = 0; i < koliAdedi; i++) {
    boyutlar +=
      '<DimensionInfo>' +
      `<DescriptionOfGoods>${xmlKacis(v.aciklama || 'Koli')}</DescriptionOfGoods>` +
      `<Length>${Number(v.uzunluk) || 0}</Length>` +
      `<Height>${Number(v.yukseklik) || 0}</Height>` +
      `<Width>${Number(v.genislik) || 0}</Width>` +
      `<Weight>${agirlik}</Weight>` +
      '</DimensionInfo>'
  }

  return (
    '<ShipmentInfo>' +
    `<ShipperAccountNumber>${xmlKacis(v.gondericiHesapNo || v.musteriKodu || '')}</ShipperAccountNumber>` +
    `<ShipperName>${xmlKacis(v.gondericiAd)}</ShipperName>` +
    `<ShipperContactName>${xmlKacis(v.gondericiYetkili || v.gondericiAd)}</ShipperContactName>` +
    `<ShipperAddress>${xmlKacis(v.gondericiAdres)}</ShipperAddress>` +
    `<ShipperCityCode>${parseInt(v.gondericiIlKodu, 10) || 0}</ShipperCityCode>` +
    `<ShipperAreaCode>${parseInt(v.gondericiIlceKodu, 10) || 0}</ShipperAreaCode>` +
    `<ShipperPostalCode>${xmlKacis(v.gondericiPostaKodu || '')}</ShipperPostalCode>` +
    `<ShipperPhoneNumber>${xmlKacis(v.gondericiTelefon || '')}</ShipperPhoneNumber>` +
    '<ShipperPhoneExtension />' +
    `<ShipperMobilePhoneNumber>${xmlKacis(v.gondericiCep || '')}</ShipperMobilePhoneNumber>` +
    `<ShipperEMail>${xmlKacis(v.gondericiEmail || '')}</ShipperEMail>` +
    '<ShipperExpenseCode />' +
    '<ConsigneeAccountNumber />' +
    `<ConsigneeName>${xmlKacis(v.aliciAd)}</ConsigneeName>` +
    `<ConsigneeContactName>${xmlKacis(v.aliciYetkili || v.aliciAd)}</ConsigneeContactName>` +
    `<ConsigneeAddress>${xmlKacis(v.aliciAdres)}</ConsigneeAddress>` +
    `<ConsigneeCityCode>${parseInt(v.aliciIlKodu, 10) || 0}</ConsigneeCityCode>` +
    `<ConsigneeAreaCode>${parseInt(v.aliciIlceKodu, 10) || 0}</ConsigneeAreaCode>` +
    `<ConsigneePostalCode>${xmlKacis(v.aliciPostaKodu || '')}</ConsigneePostalCode>` +
    `<ConsigneePhoneNumber>${xmlKacis(v.aliciTelefon || '')}</ConsigneePhoneNumber>` +
    '<ConsigneePhoneExtension />' +
    `<ConsigneeMobilePhoneNumber>${xmlKacis(v.aliciCep || v.aliciTelefon || '')}</ConsigneeMobilePhoneNumber>` +
    `<ConsigneeEMail>${xmlKacis(v.aliciEmail || '')}</ConsigneeEMail>` +
    '<ConsigneeExpenseCode />' +
    `<ServiceLevel>${parseInt(v.servisSeviyesi, 10) || 3}</ServiceLevel>` +
    `<PaymentType>${parseInt(v.odemeTipi, 10) || 2}</PaymentType>` +
    `<PackageType>${xmlKacis(v.paketTipi || 'K')}</PackageType>` +
    `<NumberOfPackages>${koliAdedi}</NumberOfPackages>` +
    `<CustomerReferance>${xmlKacis(v.referans || '')}</CustomerReferance>` +
    `<CustomerInvoiceNumber>${xmlKacis(v.faturaNo || '')}</CustomerInvoiceNumber>` +
    `<DeliveryNotificationEmail>${xmlKacis(v.bildirimEmail || '')}</DeliveryNotificationEmail>` +
    '<IdControlFlag>0</IdControlFlag>' +
    '<PhonePrealertFlag>0</PhonePrealertFlag>' +
    '<SmsToShipper>0</SmsToShipper>' +
    `<SmsToConsignee>${v.aliciSms ? 1 : 0}</SmsToConsignee>` +
    '<InsuranceValue>0</InsuranceValue>' +
    '<InsuranceValueCurrency />' +
    '<ValueOfGoods>0</ValueOfGoods>' +
    '<ValueOfGoodsCurrency />' +
    '<ValueOfGoodsPaymentType>0</ValueOfGoodsPaymentType>' +
    '<ThirdPartyAccountNumber />' +
    '<ThirdPartyExpenseCode />' +
    `<PackageDimensions>${boyutlar}</PackageDimensions>` +
    '</ShipmentInfo>'
  )
}

// Gönderi oluşturur. Dönüş: { shipmentNo, etiketLink, barkodPng[] }
async function createShipment(session, veri) {
  const govde =
    `<SessionID>${xmlKacis(session)}</SessionID>` +
    shipmentInfoXml(veri) +
    '<ReturnLabelLink>true</ReturnLabelLink>' +
    '<ReturnLabelImage>true</ReturnLabelImage>'
  const yanit = await soapCagir(SHIPMENT_URL, SHIPMENT_NS, 'CreateShipment_Type3', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') {
    throw new Error(`Kargo oluşturulamadı (kod ${hataKod}): ${xmlCoz(tagOku(yanit, 'ErrorDefinition')) || 'Bilinmeyen hata'}`)
  }
  const dizi = tagOku(yanit, 'BarkodArrayPng') || ''
  return {
    shipmentNo: tagOku(yanit, 'ShipmentNo'),
    etiketLink: xmlCoz(tagOku(yanit, 'LinkForLabelPrinting') || ''),
    barkodPng: tumTaglar(dizi, 'string').map(s => s.trim()),
  }
}

// Gönderi iptali. customerCode = UPS müşteri kodu, waybill = takip no.
async function cancelShipment(session, customerCode, waybill) {
  const govde =
    `<SessionID>${xmlKacis(session)}</SessionID>` +
    `<CustomerCode>${xmlKacis(customerCode)}</CustomerCode>` +
    `<WaybillNumber>${xmlKacis(waybill)}</WaybillNumber>`
  const yanit = await soapCagir(SHIPMENT_URL, SHIPMENT_NS, 'Cancel_Shipment_V1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') {
    throw new Error(`İptal başarısız (kod ${hataKod}): ${xmlCoz(tagOku(yanit, 'ErrorDefinition')) || 'Bilinmeyen hata'}`)
  }
  return { iptal: true }
}

// Kurye çağırma (on-demand pickup). LabelSource=1 → etiket UPS'te basılır.
async function pickupRequest(session, veri) {
  // RequestedBoxList: seçilen kutu tipleri [{ kod, adet }]
  let kutular = ''
  for (const k of (veri.kutular || [])) {
    kutular += `<BoxType><BoxTypeCode>${parseInt(k.kod, 10)}</BoxTypeCode><BoxCount>${parseInt(k.adet, 10) || 1}</BoxCount></BoxType>`
  }
  const govde =
    `<SessionID>${xmlKacis(session)}</SessionID>` +
    '<OnDemandPickupRequestInfo>' +
    '<LabelSource>1</LabelSource>' +
    `<PickupRequestDay>${xmlKacis(veri.tarih)}</PickupRequestDay>` +
    `<RequestedBoxList>${kutular}</RequestedBoxList>` +
    shipmentInfoXml(veri) +
    '</OnDemandPickupRequestInfo>'
  const yanit = await soapCagir(SHIPMENT_URL, SHIPMENT_NS, 'OnDemandPickupRequest_Type1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') {
    throw new Error(`Kurye talebi başarısız (kod ${hataKod}): ${xmlCoz(tagOku(yanit, 'ErrorDefinition')) || 'Bilinmeyen hata'}`)
  }
  return {
    shipmentNo: tagOku(yanit, 'ShipmentNo'),
    barkodPng: tumTaglar(tagOku(yanit, 'BarkodArrayPng') || '', 'string').map(s => s.trim()),
  }
}

// Takip: bir takip numarasının son hareketini sorgular.
async function trackLast(session, takipNo) {
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

// Takip için ayrı login (takip servisi kendi oturumunu ister).
async function trackingLogin({ musteriKodu, kullaniciKodu, sifre }) {
  const govde =
    `<CustomerNumber>${xmlKacis(musteriKodu)}</CustomerNumber>` +
    `<UserName>${xmlKacis(kullaniciKodu)}</UserName>` +
    `<Password>${xmlKacis(sifre)}</Password>`
  const yanit = await soapCagir(TRACKING_URL, TRACKING_NS, 'Login_Type1', govde)
  const hataKod = tagOku(yanit, 'ErrorCode')
  if (hataKod !== '0') {
    throw new Error(`UPS takip girişi başarısız (kod ${hataKod})`)
  }
  return tagOku(yanit, 'SessionID')
}

module.exports = {
  login, createShipment, cancelShipment, pickupRequest, trackLast, trackingLogin,
}
