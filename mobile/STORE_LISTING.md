# BalıkAtlas — App Store Yayın Rehberi

Bu uygulama App Store incelemelerine uygun şekilde hazırlanmıştır: çevrimdışı içerik, tıbbi uyarı, gizlilik politikası, takip yok, gereksiz izin yok.

## App Store Connect bilgileri (kopyala-yapıştır)

| Alan | Değer |
|------|--------|
| Uygulama adı | BalıkAtlas |
| Alt başlık | Balık türü, kalori ve bölge rehberi |
| Bundle ID | `com.bariskaygisiz.balikatlas` |
| Birincil kategori | Food & Drink |
| İkincil kategori | Reference |
| Yaş derecesi | 4+ |
| Fiyat | Ücretsiz |
| Destek URL | `mailto:kaygisizbaris9@gmail.com` (veya web sayfanız) |
| Gizlilik politikası URL | GitHub’daki `mobile/PRIVACY.md` dosyasını public URL olarak bağlayın |
| Telif / içerik hakları | Orijinal derleme; besin değerleri genel kamuya açık ortalamalar |

### Tanıtım metni (Promotional Text)

Türkiye’nin balıklarını tanı: tür, ağırlık, bölge, kalori, fayda ve dikkat noktaları.

### Açıklama

BalıkAtlas, Türkiye denizleri ve tatlı sularında bilinen balıkları tanıtan çevrimdışı bir rehberdir.

Özellikler:
• 16 popüler balık kaydı (hamsi, levrek, çipura, lüfer, palamut ve daha fazlası)
• Ortalama ağırlık, boy, sezon ve yetiştiği bölgeler
• 100 g için yaklaşık kalori, protein ve yağ
• Olası faydalar ve dikkat edilmesi gerekenler
• Bölge filtresi ve arama
• Favoriler (yalnızca cihazınızda saklanır)
• Reklam ve takip yok; internet zorunlu değil

Önemli: Uygulama bilgilendirme amaçlıdır; tıbbi teşhis veya diyet tedavisi değildir. Sağlık kararları için uzmanınıza danışın.

### Anahtar kelimeler

balik,balik rehberi,kalorı,omega3,deniz,karadeniz,ege,hamsi,levrek,cipura,beslenme

(Apple anahtar kelime limiti: 100 karakter — gerekirse kısaltın.)

### Gizlilik etiketleri (App Privacy)

- Data Not Collected (veri toplanmıyor)
- Tracking: No

### Şifreleme

Standart HTTPS dışında özel şifreleme yok → App Store Connect’te “exemption” / `ITSAppUsesNonExemptEncryption = false` kullanın.

## Teknik yayın adımları

1. Apple Developer Program üyeliği (ücretli) gerekir.
2. `mobile` klasöründe:
   ```bash
   npm install
   npx eas-cli login
   npx eas init
   ```
3. `eas.json` içindeki `ascAppId` ve `appleTeamId` alanlarını App Store Connect’ten doldurun.
4. Production build:
   ```bash
   npx eas build --platform ios --profile production
   ```
5. Gönderim:
   ```bash
   npx eas submit --platform ios --profile production
   ```
6. App Store Connect’te ekran görüntüleri ekleyin (en az iPhone 6.7" ve 6.5"):
   - Keşfet ana ekranı
   - Balık listesi + filtre
   - Balık detayı (kalori / fayda)
   - Favoriler veya Hakkında (gizlilik)

## İnceleme notları (Review Notes)

Reviewer’a yazılacak kısa not:

> BalıkAtlas is an offline educational fish guide for Turkish waters. No account, no location, no tracking, no network required for core features. Nutrition values are approximate public averages; in-app medical disclaimer is shown. Favorites are stored only on-device via AsyncStorage.

## Red risklerini azaltan noktalar

- 1.4.1 Medical: tıbbi iddia yok; “olası”, “yaklaşık”, disclaimer var
- 5.1.1 Privacy: gizlilik politikası + Data Not Collected
- 2.1 App Completeness: boş/placeholder ekran yok
- 4.0 Design: çalışan arama, detay, favori, hakkında
- Minimum functionality: bilgi uygulaması olarak yeterli içerik ve etkileşim (arama, filtre, favori, paylaşım)
