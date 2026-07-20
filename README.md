# BalıkAtlas

istanbulasim.com tarzı **modern koyu arayüz** + **backend API** + **kamera ile AI balık tanıma**.

## Özellikler

- Kamerayla / galeriden balık tara → AI tür tahmini
- Tür, ağırlık, bölge, kalori, fayda ve zararlar
- Web (Vite React) + Express API + Expo mobil
- Yerel görüntü analizi (renk/şekil). `OPENAI_API_KEY` varsa vision modeli de kullanılır

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

## API

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık |
| `GET /api/fish` | Liste (`q`, `region`) |
| `GET /api/fish/:id` | Detay |
| `POST /api/identify` | `multipart image` veya `imageBase64` |

## App Store

`mobile/STORE_LISTING.md` — kamera izni metinleri `app.json` içinde.
