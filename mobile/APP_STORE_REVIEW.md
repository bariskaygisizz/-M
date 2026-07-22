# App Store İnceleme Kontrol Listesi (Onay Mühendisi)

Bu belge, BalıkAtlas’ın **App Store Review Guidelines** ile uyumunu hedefleyen
yayın öncesi kontrol listesidir.

## 1) Para kazanma modeli (onaylı)

| Katman | Ne | Apple kuralı |
|--------|----|--------------|
| Ücretsiz | Atlas, balık detay, organ/bölge/sezon bilgisi | Temel değer ücretsiz erişilebilir |
| Freemium limit | AI tarama günlük hak | Net iletişim |
| Premium | Sınırsız AI + reklamsız | **Yalnızca IAP (3.1.1)** |
| Web | Bilgi sitesi | **iOS aboneliği web’den satılmaz** |

**Product ID (Connect ile aynı):**
- `com.bariskaygisiz.balikatlas.premium.monthly`
- `com.bariskaygisiz.balikatlas.premium.yearly`

Fiyatı **yalnızca App Store Connect → Subscriptions** belirler.

## 2) Reddi engelleyen zorunluluklar

- [x] Gizlilik Politikası (uygulama içi + URL)
- [x] Kullanım Koşulları / EULA (abonelikli uygulamada link şart)
- [x] Satın Alımları Geri Yükle
- [x] Otomatik yenileme / iptal metni paywall’da
- [x] Hesap varsa **Hesabı Sil** (5.1.1v)
- [x] Kamera kullanım açıklaması (`NSCameraUsageDescription`)
- [x] Sağlık/besin **tıbbi disclaimer** (1.4.1)
- [x] `ITSAppUsesNonExemptEncryption = false`
- [x] Takip yok (ATT gerekmez)
- [x] Web’den sahte premium satışı kaldırıldı
- [x] Production’da `source:dev` ile premium açma kapalı (ALLOW_DEV_IAP=1 değilse)

## 3) Göndermeden önce senin yapacakların

1. Apple Developer + App Store Connect uygulaması
2. Subscription Group + 2 ürün (yukarıdaki Product ID)
3. Privacy Policy URL (public HTTPS) — `mobile/privacy.html` veya site
4. Terms URL
5. Banking + Tax anlaşması (ödeme almak için)
6. EAS ile **StoreKit / RevenueCat** native satın alma bağla
7. Sandbox test hesabıyla satın alma + restore test et
8. Ekran görüntüleri (gerçek UI; abonelik fiyatı Connect’ten)
9. Review Notes’a sandbox test bilgisi yaz

## 4) Review Notes (yapıştır)

```
BalıkAtlas is an educational fish guide for Turkish waters with optional AI camera ID.
• Encyclopedia works without login.
• Optional account for sync/scan quota; account deletion is in Account tab.
• Premium unlocks unlimited AI scans via Apple IAP only (no external payment).
• Health/nutrition text is informational with in-app medical disclaimer.
• Camera used only when user starts a scan.
Sandbox: use the provided sandbox Apple ID to test subscription + Restore Purchases.
```

## 5) Bilinçli olarak yapılmayanlar (red riski)

- Harici ödeme linki / WhatsApp’tan abonelik
- Çalışmayan “Abone Ol” + web’den premium açma
- “Tedavi eder / kesin teşhis” iddiası
- Zorunlu kayıt duvarı (atlas kilitli)
- Hesap varken silme olmaması

## 6) Kazanç özeti

Kullanıcı App Store’dan abone olur → Apple tahsil eder → kesinti sonrası
şirket/banka hesabına aylık yatar. Fiyatı Connect’te sen seçersin.
