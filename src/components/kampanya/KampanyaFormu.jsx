// ikas panelindeki "İndirim Kodu Ekle" formunun bölüm sırası (09.09.2026 panel ölçümü):
// Başlık · İndirim Türü · İndirim Oranı · Koşullar · Gereksinimler · Kullanım Limitleri ·
// Müşteriler · Ayarlar · Aktif Tarihler. X Al Y Kazan'da Koşullar+Gereksinimler yerine
// "Müşterinin Aldıkları" / "Müşterinin Kazandıkları". Kuponlar ayrı panelde (KuponPaneli).
//
// BOS_FORM electron/ikas/kampanya-donustur.js bosForm() ile BİREBİR aynı olmalı
// (renderer main modülünü import edemez). Alan eklerken ikisini de güncelle.
import { useState } from 'react'
import UrunSuzgecSecici from './UrunSuzgecSecici'

export const BOS_FORM = () => ({
  id: null, baslik: '', kuponlu: true, tur: 'yuzde', oran: '', kargoUcretsiz: false,
  kosulTum: true, suzgec: { tur: 'urun', idler: [] }, indirimliDahil: false,
  tutarSinir: { acik: false, min: '', max: '' }, adetSinir: { acik: false, min: '', max: '' },
  toplamLimit: '', musteriLimit: '', yalnizHesap: false, birlesir: false,
  satisKanallari: [], baslangic: '', bitis: '', uygulananFiyat: 'SELL_PRICE',
  xaly: { alKip: 'adet', alMiktar: '', alMaks: '', alSuzgec: { tur: 'urun', idler: [] },
    kazanAdet: '', kazanOran: '100', kazanSuzgec: { tur: 'urun', idler: [] }, otomatikEkle: false, siparisLimit: '' },
})

const TURLER = [['yuzde', '％ Yüzdelik'], ['sabit', '₺ Sabit Tutar'], ['kargo', '🚚 Ücretsiz Kargo'], ['xaly', '🎁 X Al Y Kazan']]

function Bolum({ baslik, not, children }) {
  return (
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <div><h3 className="font-bold text-marka-900">{baslik}</h3>{not && <p className="text-xs text-gray-500">{not}</p>}</div>
      {children}
    </section>
  )
}
const Kutucuk = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />{children}</label>
)
const Sayi = ({ value, onChange, placeholder, className = '' }) => (
  <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`border rounded-lg px-3 py-1.5 text-sm w-28 ${className}`} />
)
function Aralik({ sinir, onChange, etiket, not }) {
  return (
    <div>
      <Kutucuk checked={sinir.acik} onChange={acik => onChange({ ...sinir, acik })}><span className="font-medium">{etiket}</span></Kutucuk>
      <p className="text-xs text-gray-500 ml-6">{not}</p>
      {sinir.acik && (
        <div className="flex gap-2 ml-6 mt-1 items-center text-sm">
          Min <Sayi value={sinir.min} onChange={min => onChange({ ...sinir, min })} />
          Maks <Sayi value={sinir.max} onChange={max => onChange({ ...sinir, max })} placeholder="sınırsız" />
        </div>
      )}
    </div>
  )
}

export default function KampanyaFormu({ form, setForm, sozlukler }) {
  const f = form
  const set = (k, v) => setForm(o => ({ ...o, [k]: v }))
  const setX = (k, v) => setForm(o => ({ ...o, xaly: { ...o.xaly, [k]: v } }))
  const xaly = f.tur === 'xaly'

  return (
    <div className="space-y-4">
      <Bolum baslik="Başlık" not="Müşteriler bu başlığı sepette ve ödeme sırasında görür.">
        <input value={f.baslik} onChange={e => set('baslik', e.target.value)} placeholder="ör. Hoş geldin indirimi"
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={f.kuponlu} onChange={() => set('kuponlu', true)} /> İndirim kodu (kuponla)</label>
          <label className="flex items-center gap-1"><input type="radio" checked={!f.kuponlu} onChange={() => set('kuponlu', false)} /> Otomatik indirim (sepette kendiliğinden)</label>
        </div>
      </Bolum>

      <Bolum baslik="İndirim Türü">
        <div className="grid grid-cols-4 gap-2">
          {TURLER.map(([k, l]) => (
            <button key={k} type="button" onClick={() => set('tur', k)}
              className={`border rounded-xl px-3 py-3 text-sm text-left ${f.tur === k ? 'border-marka-900 bg-krem-200 font-semibold' : 'hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </Bolum>

      {!xaly && f.tur !== 'kargo' && (
        <Bolum baslik={f.tur === 'yuzde' ? 'İndirim Oranı' : 'İndirim Tutarı'}>
          <div className="flex items-center gap-2 text-sm">
            <Sayi value={f.oran} onChange={v => set('oran', v)} placeholder={f.tur === 'yuzde' ? '15' : '250'} /> {f.tur === 'yuzde' ? '%' : 'TL'}
          </div>
          <Kutucuk checked={f.kargoUcretsiz} onChange={v => set('kargoUcretsiz', v)}>Kargo ücretsiz olsun (ek indirim)</Kutucuk>
        </Bolum>
      )}

      {!xaly ? (<>
        <Bolum baslik="Koşullar">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={f.kosulTum} onChange={() => set('kosulTum', true)} /> Tüm ürünler</label>
            <label className="flex items-center gap-1"><input type="radio" checked={!f.kosulTum} onChange={() => set('kosulTum', false)} /> Belirli ürünler</label>
          </div>
          {!f.kosulTum && <UrunSuzgecSecici deger={f.suzgec} onChange={v => set('suzgec', v)} sozlukler={sozlukler} />}
          <Kutucuk checked={f.indirimliDahil} onChange={v => set('indirimliDahil', v)}>İndirimli ürünleri kampanyaya dahil et</Kutucuk>
        </Bolum>
        <Bolum baslik="Gereksinimler" not="Kampanya, sepet aşağıdaki şartları sağlarsa uygulanır.">
          <Aralik sinir={f.tutarSinir} onChange={v => set('tutarSinir', v)} etiket="Satın alma tutarını sınırla" not="Sepet toplamına uygulanacak sınır (TL)." />
          <Aralik sinir={f.adetSinir} onChange={v => set('adetSinir', v)} etiket="Ürün adetini sınırla" not="Sepetteki toplam ürün adedine uygulanacak sınır." />
        </Bolum>
      </>) : (<>
        <Bolum baslik="Müşterinin Aldıkları" not="Kampanya, sepet aşağıdaki şartı sağlayınca geçerli olur.">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.alKip === 'adet'} onChange={() => setX('alKip', 'adet')} /> Minimum ürün adedi</label>
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.alKip === 'tutar'} onChange={() => setX('alKip', 'tutar')} /> Minimum satın alma tutarı</label>
          </div>
          <div className="flex items-center gap-2 text-sm">{f.xaly.alKip === 'adet' ? 'Adet' : 'Tutar (TL)'} <Sayi value={f.xaly.alMiktar} onChange={v => setX('alMiktar', v)} /></div>
          <UrunSuzgecSecici deger={f.xaly.alSuzgec} onChange={v => setX('alSuzgec', v)} sozlukler={sozlukler} etiket="Hangi ürünlerden" />
          <Kutucuk checked={f.indirimliDahil} onChange={v => set('indirimliDahil', v)}>İndirimli ürünleri kampanyaya dahil et</Kutucuk>
        </Bolum>
        <Bolum baslik="Müşterinin Kazandıkları" not="Şart sağlanınca kazanılacaklar.">
          <div className="flex items-center gap-2 text-sm">Adet <Sayi value={f.xaly.kazanAdet} onChange={v => setX('kazanAdet', v)} /></div>
          <UrunSuzgecSecici deger={f.xaly.kazanSuzgec} onChange={v => setX('kazanSuzgec', v)} sozlukler={sozlukler} etiket="Hangi ürünler" />
          <div className="flex gap-4 text-sm items-center">
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.kazanOran === '100'} onChange={() => setX('kazanOran', '100')} /> Ücretsiz</label>
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.kazanOran !== '100'} onChange={() => setX('kazanOran', '50')} /> Yüzdelik indirim</label>
            {f.xaly.kazanOran !== '100' && <><Sayi value={f.xaly.kazanOran} onChange={v => setX('kazanOran', v)} /> %</>}
          </div>
          <Kutucuk checked={f.xaly.otomatikEkle} onChange={v => setX('otomatikEkle', v)}>Şartlar sağlanırsa ürünü otomatik olarak sepete ekle</Kutucuk>
        </Bolum>
      </>)}

      <Bolum baslik="Kullanım Limitleri">
        <div className="flex items-center gap-2 text-sm">Toplam kullanım limiti <Sayi value={f.toplamLimit} onChange={v => set('toplamLimit', v)} placeholder="sınırsız" /></div>
        <div className="flex items-center gap-2 text-sm">Kullanıcı başına limit <Sayi value={f.musteriLimit} onChange={v => set('musteriLimit', v)} placeholder="sınırsız" /></div>
        {xaly && <div className="flex items-center gap-2 text-sm">Sipariş başına limit <Sayi value={f.xaly.siparisLimit} onChange={v => setX('siparisLimit', v)} placeholder="sınırsız" /></div>}
      </Bolum>

      <Bolum baslik="Müşteriler">
        <Kutucuk checked={f.yalnizHesap} onChange={v => set('yalnizHesap', v)}>Kampanyadan sadece müşteri hesabı olanlar yararlanabilsin</Kutucuk>
        <p className="text-xs text-gray-400">Müşteri grubu / spesifik müşteri seçimi ikas panelinden yapılır (API'de grup listesi yok).</p>
      </Bolum>

      <Bolum baslik="Ayarlar">
        <Kutucuk checked={f.birlesir} onChange={v => set('birlesir', v)}>Diğer kampanyalarla birleştirilsin</Kutucuk>
        <div className="flex items-center gap-2 text-sm">İndirim şu fiyata uygulanır
          <select value={f.uygulananFiyat} onChange={e => set('uygulananFiyat', e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
            <option value="SELL_PRICE">Satış fiyatı</option><option value="DISCOUNT_PRICE">İndirimli fiyat</option>
          </select>
        </div>
        <div className="text-sm">
          <div className="font-medium mb-1">Satış kanalları <span className="text-xs text-gray-400">(hiçbiri seçili değilse hepsi)</span></div>
          <div className="flex flex-wrap gap-3">
            {(sozlukler?.satisKanallari || []).map(sk => (
              <Kutucuk key={sk.id} checked={f.satisKanallari.includes(sk.id)}
                onChange={v => set('satisKanallari', v ? [...f.satisKanallari, sk.id] : f.satisKanallari.filter(x => x !== sk.id))}>{sk.name}</Kutucuk>
            ))}
          </div>
        </div>
      </Bolum>

      <Bolum baslik="Aktif Tarihler">
        <div className="flex gap-4 text-sm items-center">
          Başlangıç <input type="datetime-local" value={f.baslangic} onChange={e => set('baslangic', e.target.value)} className="border rounded-lg px-2 py-1" />
          Bitiş <input type="datetime-local" value={f.bitis} onChange={e => set('bitis', e.target.value)} className="border rounded-lg px-2 py-1" />
        </div>
      </Bolum>
    </div>
  )
}
