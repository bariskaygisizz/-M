# SkyWatch — Ev + Bölgesel Uçuş Takibi

Açık kaynaklı uçuş takip uygulaması. Ev çevresi **ve** bölgesel (uzak) hava trafiğini haritada gösterir; hız, irtifa, mesafe ve rota bilgilerini canlı günceller.

## Bu uygulama neye yarar?

Üstünden veya bölgenden geçen uçak/helikopterleri görmek; ne kadar uzakta ve yüksekte olduklarını, nereden nereye gittiklerini izlemek için.

### Kimler kullanır?
- Havaalanı / uçuş yolu yakınında oturanlar
- Havacılık meraklıları ve öğrenciler
- Açık kaynak / eğitim projeleri

### Ne kazanırsın?
- Anlık konum, yer hızı, irtifa, yön
- Eve yatay ve 3B mesafe
- Rota (nereden → nereye)
- Ev yakını + uzak bölge görünümü

### Uçakta kimler var?
**Bilinemez.** ADS-B yolcu listesi vermez; yalnızca uçak konum ve kimliğini (çağrı adı) yayınlar. Yolcu verisi havayolu/güvenlik verisidir ve kamuya açık değildir.

## Özellikler

- **Kapsam:** Ev / İkisi / Bölge
- **Simülasyon** ve **Canlı ADS-B** (OpenSky; erişilemezse simülasyon yedeği)
- Ev konumu (GPS veya haritadan seçim)
- Yer hızı, irtifa, yatay/3B mesafe, rota, canlı takip

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
npm run server   # API :3001
npm run web      # http://localhost:5173
```

## API

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü |
| `GET /api/about` | Amaç, kullanıcılar, sınırlar |
| `GET /api/home` | Ev, yarıçaplar, kapsam, mod |
| `POST /api/home` | Ev / yarıçap / kapsam / mod güncelle |
| `GET /api/flights` | Uçuş listesi (`scope`, `radiusKm`, `wideRadiusKm`, `mode`, `category`) |

`scope`: `near` | `wide` | `both`

## Lisans

MIT — Canlı veri: OpenSky Network.
