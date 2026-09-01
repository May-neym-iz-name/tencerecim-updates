# Tencerecim — proje kuralları

## ikas ile ilgili HER iş

**Önce `docs/ikas/` kütüphanesine bak. İnternete çıkma, tahmin etme.**

| Dosya | Ne zaman |
|---|---|
| `docs/ikas/00-INDEX.md` | Giriş — dizin yapısı, uç noktalar, kapsamlar, webhook konuları |
| `docs/ikas/01-OPERASYON-KATALOGU.md` | **106 operasyonun tamamı, işaretli**: hangisini kullanıyoruz, hangisi kullanılabilir, hangisi tehlikeli, API'de ne YOK |
| `docs/ikas/sema/` | Kesin imza: `queries/` `mutations/` `inputs/` `objects/` `enums/` |
| `docs/ikas/api/admin-api/` | Konu anlatımlı rehberler |
| `docs/ikas/tema/` | Storefront tema JS API'si (279 sayfa) |
| `docs/ikas-api-reference.md` | Bizim kullandığımız alt kümenin özeti + canlı API düzeltmeleri |

```bash
grep -rn "<alan-adı>" docs/ikas/sema/        # alan hangi tipte
cat docs/ikas/sema/inputs/<input-adı>.md      # input'un alanları
```

**Tema/tasarım işi Admin API'de değildir** → `~/.claude/skills/ikas-tema` becerisi + `Desktop\IKAS-TEMA-CALISMA\`

### Değişmez uyarılar
- **Doküman ≠ canlı şema.** Kesin cevap gerekiyorsa ikas Playground'a güven. Bilinen sapmalar `01-OPERASYON-KATALOGU.md` sonunda.
- **`saveProduct` gönderilmeyen alanı SİLER** (görseller + fiyat listesi satırları dahil). Toplu işte `bulkUpdateProducts` veya alan-özel mutasyon kullan.
- Yeni bir uç kullanmadan önce ilgili `sema/inputs/*.md` dosyasını aç.
