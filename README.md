# BalıkAtlas

Türkiye denizleri ve tatlı sularındaki balıkları tanıtan **App Store uyumlu** mobil rehber.

- Tür / bilimsel ad
- Ortalama ağırlık ve boy
- Yetiştiği bölgeler
- Kalori, protein, yağ, omega-3 (100 g yaklaşık)
- Olası faydalar ve dikkat noktaları
- Arama, bölge filtresi, favoriler (cihaz içi)

## Proje yapısı

```
mobile/          # Expo (React Native) — App Store hedefi
  app/           # Ekranlar (expo-router)
  data/fish.js   # Balık veri seti
  STORE_LISTING.md
  PRIVACY.md
  eas.json
```

## Geliştirme

```bash
cd mobile
npm install
npm start
```

iOS simülatör veya Expo Go ile test edin.

## App Store yayın

Ayrıntılı checklist, metinler ve EAS komutları: [`mobile/STORE_LISTING.md`](mobile/STORE_LISTING.md)

Kısa özet:

```bash
cd mobile
npx eas-cli login
npx eas init
npx eas build --platform ios --profile production
npx eas submit --platform ios --profile production
```

## Önemli uyarı

Uygulama bilgilendirme amaçlıdır; tıbbi teşhis veya tedavi değildir.
