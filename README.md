# İstanbul Kart Harita (Apple)

İstanbul Kart **Biletmatik** ve **dolum noktalarını** haritada gösteren **native Apple** web sitesi ve iOS uygulaması.

| Platform | Teknoloji |
|----------|-----------|
| **Web sitesi** | Vapor (Swift) + MapKit JS + Apple tasarım dili |
| **iOS uygulaması** | SwiftUI + MapKit + CoreLocation |
| **Veri** | İBB Açık Veri (BELBİM) |

## Proje yapısı

```
├── Backend/          # Vapor Swift API + Apple tasarımlı web sitesi
├── ios/              # SwiftUI iOS uygulaması (Xcode)
├── data/             # Konum verisi (JSON)
└── server/scripts/   # Veri senkronizasyon scripti (Node)
```

## Gereksinimler

- macOS 13+ (Vapor sunucu ve iOS geliştirme için)
- Xcode 15+ (iOS uygulaması)
- Swift 5.9+
- Node.js (yalnızca veri senkronizasyonu için)

## Kurulum

### 1. Veriyi indir

```bash
npm run sync-data
```

### 2. Vapor sunucusunu başlat

```bash
cd Backend
swift build
swift run App serve --hostname 0.0.0.0 --port 8080
```

Web sitesi: http://localhost:8080  
API: http://localhost:8080/api

### 3. iOS uygulamasını çalıştır

1. `ios/IstanbulKartHarita.xcodeproj` dosyasını Xcode ile açın
2. Simulator veya fiziksel iPhone seçin
3. Run (⌘R)

Simulator varsayılan API adresi: `http://localhost:8080/api`

Fiziksel cihazda Mac IP adresinizi kullanın. Uygulama içinde `UserDefaults` ile `apiBaseURL` ayarlanabilir veya `APIClient.swift` dosyasını güncelleyin.

## MapKit JS (Web haritası)

Web sitesi Apple **MapKit JS** kullanır. Haritanın çalışması için Apple Developer hesabından Maps token almanız gerekir:

1. [Apple Developer Maps](https://developer.apple.com/account/resources/services/maps) üzerinden Maps Identifier oluşturun
2. JWT token üretin
3. Sunucuyu token ile başlatın:

```bash
MAPKIT_JS_TOKEN="your-mapkit-js-token" swift run App serve --port 8080
```

Token yoksa site açılır ancak harita alanı yapılandırma uyarısı gösterir; liste ve filtreler çalışmaya devam eder.

## API uç noktaları

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü |
| `GET /api/config` | MapKit JS yapılandırması |
| `GET /api/meta` | İlçe/tip listesi |
| `GET /api/locations` | Filtrelenmiş konumlar |

### `/api/locations` parametreleri

- `type` — Virgülle ayrılmış tipler
- `district` — İlçe
- `q` — Arama
- `lat`, `lng`, `radiusKm` — Yakınlık sorgusu
- `limit` — Sonuç limiti

## iOS özellikleri

- SwiftUI + native MapKit harita
- CoreLocation ile yakındaki noktalar
- Apple Haritalar'da yol tarifi linki
- İlçe/tip filtreleme ve arama
- Harita ve liste sekmeleri

## Veri kaynağı

[İBB — İstanbulkart Dolum Merkezi Bilgileri](https://data.ibb.gov.tr/dataset/istanbulkart-dolum-merkezi-bilgileri)

## Eski sürüm

Önceki React/Expo sürümü `web/` ve `mobile/` klasörlerinde duruyor. Yeni geliştirme **Backend/** ve **ios/** üzerinden yapılmalıdır.
