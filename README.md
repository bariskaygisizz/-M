# Davetly

Düğün, nişan, kına, sünnet, bale, mezuniyet ve diğer etkinlikler için **dijital davetiye** uygulaması.

- **Web sitesi** (`web/`) — pazarlama + editör (Vite React)
- **Mobil app** (`mobile/`) — Expo / App Store & Play uyumlu freemium
- **API** (`server/`) — auth, davetiye, abonelik limitleri
- **Paylaşılan** (`shared/`) — i18n (12 dil), şablonlar, planlar

## Freemium model

| Plan | Davetiye | Düzenleme | Not |
|------|----------|-----------|-----|
| **Free** | 3 | 5 / davetiye | Filigran, temel şablonlar |
| **Plus** | 30 | Sınırsız | Premium şablon, PDF, RSVP |
| **Pro** | Sınırsız | Sınırsız | Müzik, marka kaldırma |

Üretimde iOS ödemeleri **StoreKit / In-App Purchase**, Android **Play Billing**, web **Stripe** ile bağlanmalı. Demo API `/api/subscribe` ve `/api/restore` içerir.

## Diller

`tr`, `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `ru`, `ar`, `az`

## Çalıştırma

```bash
npm run install:all
npm run server   # http://localhost:3001
npm run web      # http://localhost:5173
```

Mobil:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:3001 npm start
```

## App Store uyumu (checklist)

- Gizlilik politikası + kullanım koşulları ekranları
- Hesap silme (`Account → Delete account`)
- Restore Purchases
- Abonelik fiyat / süre / otomatik yenileme metinleri
- Ücretsiz plan limitleri açıkça belirtilir
- `ITSAppUsesNonExemptEncryption: false`
- Privacy Manifest (email yalnızca app functionality)

Detay: `mobile/STORE_LISTING.md`

## Repo gizliliği

Bu agent ortamında GitHub visibility değiştirme yetkisi yok (`403`). Repoyu gizli yapmak için:

GitHub → repo **Settings** → **General** → **Danger Zone** → **Change repository visibility** → **Private**.

## API özeti

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık |
| `GET /api/templates` | Şablonlar |
| `GET /api/plans` | Abonelik planları |
| `POST /api/auth/register` | Kayıt |
| `POST /api/auth/login` | Giriş |
| `GET/DELETE /api/me` | Profil / hesap sil |
| `CRUD /api/invitations` | Davetiyeler + edit limiti |
| `POST /api/subscribe` | Plan yükselt (demo) |
| `POST /api/restore` | Satın alma geri yükle (demo) |
