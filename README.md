# İstanbul Kart Harita

İstanbul Kart **Biletmatik** ve **dolum noktalarını** haritada gösteren web ve mobil uygulama.

Veriler [İBB Açık Veri Portalı](https://data.ibb.gov.tr/dataset/istanbulkart-dolum-merkezi-bilgileri) üzerinden BELBİM tarafından yayınlanan İstanbulkart dolum merkezi bilgilerinden alınır.

## Özellikler

- Haritada Biletmatik, Biletmatik 4, bayi ve dolum merkezi noktaları
- İlçe ve anahtar kelime ile arama
- Nokta tipine göre filtreleme
- Konumunuza göre yakındaki noktaları listeleme
- Web (masaüstü/mobil tarayıcı) ve React Native (Expo) mobil uygulama

## Proje yapısı

```
├── data/locations.json      # Senkronize edilmiş konum verisi
├── server/                  # Express API
├── web/                     # React + Leaflet web uygulaması
└── mobile/                  # Expo React Native mobil uygulama
```

## Kurulum

```bash
# Bağımlılıkları yükle
npm run install:all

# İBB'den güncel veriyi çek
npm run sync-data

# API sunucusunu başlat (port 3001)
npm run server
```

Ayrı bir terminalde web uygulaması:

```bash
npm run web
```

Tarayıcıda: http://localhost:5173

## Mobil uygulama

API sunucusu çalışırken:

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://<bilgisayar-ip>:3001/api npm start
```

Fiziksel cihazda test ederken `localhost` yerine bilgisayarınızın yerel IP adresini kullanın.

## API uç noktaları

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü |
| `GET /api/meta` | İlçe listesi, tipler, özet |
| `GET /api/locations` | Filtrelenmiş konum listesi |

### `/api/locations` parametreleri

- `type` — Virgülle ayrılmış tipler (ör. `Biletmatik,Biletmatik 4`)
- `district` — İlçe adı
- `q` — Arama metni
- `lat`, `lng`, `radiusKm` — Yakındaki noktalar
- `limit` — Maksimum sonuç (varsayılan 200)

## Veri güncelleme

```bash
npm run sync-data
```

Script, İBB CKAN API üzerinden 2023–2025 veri setlerini birleştirir ve `data/locations.json` dosyasını oluşturur.

## Lisans

Konum verisi: İstanbul Büyükşehir Belediyesi Açık Veri Lisansı (BELBİM / İBB).
