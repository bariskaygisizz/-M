# YakınMarket

Konum tabanlı mahalle ticareti: **market, bakkal, sütçü** stoklarını haritada gör; kaç dakikada gelir takip et; satıcı ve müşteri için ayrı paneller.

Klasik e-ticaretten farkı: önce depo/kargo değil, **fiziksel mağaza + canlı stok + konum** gelir.

## Paneller

| Panel | Ne işe yarar |
|-------|----------------|
| **Müşteri** | Konum aç, yakındaki mağaza/ürün/stok, ETA, sipariş, takip, abonelik |
| **Satıcı** | Stok güncelle, sipariş durumu, aboneler, işletme profili |
| **Profiller** | Müşteri ve işletme kimlikleri |
| **Analitik** | Abone konumları, ilçe yoğunluğu, olay veri toplama |
| **Kılavuz** | Adım adım ekran anlatımı |

Ayrıntılı anlatım: [KULLANIM_KILAVUZU.md](./KULLANIM_KILAVUZU.md)

## Kurulum

```bash
npm run install:all
npm run server   # API :3001
npm run web      # Web :5173
```

Tarayıcı: http://localhost:5173

## API (özet)

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/market/stores` | Yakın mağazalar (`lat`,`lng`,`product`,…) |
| `GET /api/market/products` | Ürün + stok + ETA |
| `POST /api/market/orders` | Sipariş |
| `PATCH /api/market/products/:id/stock` | Stok güncelle |
| `POST /api/market/subscribe` | Mağaza aboneliği |
| `POST /api/market/events` | Veri toplama olayı |
| `GET /api/market/analytics` | Abone / olay özeti |

Örnek veri: `data/marketplace.json`

## Proje yapısı

```
├── data/marketplace.json   # Mağaza, ürün, müşteri, satıcı, olaylar
├── server/                 # Express API
├── web/                    # React + Leaflet
└── KULLANIM_KILAVUZU.md
```

İstanbul Kart harita API uçları (`/api/locations`) korunmuştur.
