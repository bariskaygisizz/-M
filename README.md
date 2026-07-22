# SkyWatch — Ev + Bölgesel Uçuş Takibi (Telefon / Web)

Açık kaynaklı uçuş takip uygulaması. Ev çevresi **ve** bölgesel trafiği haritada gösterir.

## Telefonda açmak

1. Sunucuyu başlat:
```bash
npm run install:all
npm start
```
2. Telefondan aynı Wi‑Fi’de: `http://<bilgisayar-ip>:3001`
3. veya yayınlanan HTTPS linkini (Cloudflare tunnel) Safari/Chrome’da aç
4. **Ana ekrana ekle** (PWA): tarayıcı menüsü → “Ana ekrana ekle”

Expo native uygulama:
```bash
npm run server
cd mobile
EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:3001/api npm start
```

## Bu uygulama neye yarar?

Üstünden/bölgenden geçen uçak-helikopteri görmek: hız, irtifa, mesafe, rota.

### Kimler kullanır?
- Havaalanı / uçuş yolu yakınında oturanlar
- Havacılık meraklıları ve öğrenciler
- Açık kaynak / eğitim

### Uçakta kimler var?
**Bilinemez.** ADS-B yolcu listesi vermez.

## Ücretsiz yayınlarsan / para kazanma

**Ücretsiz yayın:** portföy, kullanıcı kitlesi, geri bildirim, açık kaynak itibarı, iş/CV değeri.

**Para yolları (yasal & gerçekçi):**
- Reklam (düşük gelir, trafik ister)
- Pro abonelik (uyarılar, geçmiş iz, favori rotalar, bildirim)
- Sponsorluk / marka ortaklığı
- B2B: emlak, otel, havaalanı çevresi farkındalık panelleri

**Kazanılamaz:** Yolcu verisi satmak (yoktur ve yasaya aykırı olur).

## Özellikler

- PWA (telefonda ana ekran uygulaması gibi)
- Kapsam: Ev / İkisi / Bölge
- Simülasyon + Canlı ADS-B (OpenSky)
- Hız, irtifa, mesafe, rota, canlı takip

## Çalıştırma

```bash
npm run install:all
npm start          # build + tek port :3001 (telefon için en kolay)
# veya geliştirme:
npm run server
npm run web
```

## Lisans

MIT — Canlı veri: OpenSky Network.
