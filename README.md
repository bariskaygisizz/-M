# SkyWatch — Ev Çevresi Uçuş Takibi

Açık kaynaklı, simülasyonlu (ve isteğe bağlı canlı ADS-B) uçak / helikopter takip uygulaması. Ev konumunuzun çevresindeki trafiği haritada gösterir; hız, mesafe, irtifa ve rota bilgilerini canlı günceller.

## Özellikler

- **Simülasyon modu** — Ev çevresinde gerçekçi uçak ve helikopter trafiği
- **Canlı mod** — [OpenSky Network](https://opensky-network.org/) ADS-B verisi (erişilemezse simülasyona düşer)
- **Ev konumu** — Tarayıcı konumu veya haritadan seçim
- **Yer hızı** — km/s ve knot
- **İrtifa** — feet / metre ve eve göre yerden yükseklik
- **Mesafe** — Yatay mesafe, 3B eğik menzil, yön (pusula)
- **Rota** — Nereden → nereye
- **Canlı takip** — Seçili uçağı haritada izleme ve iz (trail)

## Proje yapısı

```
├── server/          # Express API + uçuş simülatörü + OpenSky proxy
└── web/             # React + Leaflet harita arayüzü
```

## Kurulum

```bash
npm run install:all
```

## Çalıştırma

```bash
# API (port 3001)
npm run server

# Web (port 5173) — ayrı terminal
npm run web
```

Tarayıcı: http://localhost:5173

## API

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü |
| `GET /api/home` | Ev konumu, yarıçap, mod |
| `POST /api/home` | Ev / yarıçap / mod güncelle |
| `GET /api/flights` | Uçuş listesi (`mode`, `radiusKm`, `category`) |

### `POST /api/home` gövdesi

```json
{
  "lat": 41.0082,
  "lng": 28.9784,
  "altM": 40,
  "name": "Evim",
  "radiusKm": 80,
  "mode": "simulation"
}
```

`mode`: `simulation` | `live`

## Notlar

- Varsayılan ev konumu İstanbul merkezidir; “Konumumu ev yap” veya haritadan seçerek değiştirin.
- OpenSky anonim erişimi hız sınırlıdır; yoğun kullanımda simülasyon yedeği devreye girer.
- Mobil klasörü bu sürümde güncellenmemiştir; birincil deneyim web üzerindedir.

## Lisans

MIT — Veri kaynağı (canlı mod): OpenSky Network.
