import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/locations.json');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'istanbul-kart-harita-api' });
});

app.get('/api/config', (_req, res) => {
  const token = process.env.MAPKIT_JS_TOKEN;
  res.json({
    mapKitJSTokenConfigured: Boolean(token),
    mapKitJSKey: token || null
  });
});

app.get('/api/locations', (req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(503).json({
      error: 'Konum verisi henüz yüklenmedi. Önce npm run sync-data çalıştırın.'
    });
  }

  const { type, district, q, lat, lng, radiusKm = '2', limit = '200' } = req.query;
  let results = data.locations;

  if (type) {
    const types = String(type).split(',').map((t) => t.trim());
    results = results.filter((loc) => types.includes(loc.type));
  }

  if (district) {
    const districtLower = String(district).toLocaleLowerCase('tr');
    results = results.filter((loc) => loc.district.toLocaleLowerCase('tr').includes(districtLower));
  }

  if (q) {
    const query = String(q).toLocaleLowerCase('tr');
    results = results.filter((loc) => {
      const haystack = [loc.district, loc.address, loc.terminalId, loc.type]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return haystack.includes(query);
    });
  }

  const userLat = lat ? Number(lat) : null;
  const userLng = lng ? Number(lng) : null;
  const maxRadius = Number(radiusKm);
  const maxLimit = Math.min(Number(limit) || 200, 1000);

  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    results = results
      .map((loc) => ({
        ...loc,
        distanceKm: haversineKm(userLat, userLng, loc.lat, loc.lng)
      }))
      .filter((loc) => !Number.isFinite(maxRadius) || loc.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  res.json({
    updatedAt: data.updatedAt,
    source: data.source,
    total: results.length,
    summary: data.summary,
    locations: results.slice(0, maxLimit)
  });
});

app.get('/api/meta', (_req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(503).json({ error: 'Veri yok' });
  }

  const districts = [...new Set(data.locations.map((loc) => loc.district))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
  const types = [...new Set(data.locations.map((loc) => loc.type))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );

  res.json({
    updatedAt: data.updatedAt,
    source: data.source,
    total: data.total,
    summary: data.summary,
    districts,
    types
  });
});

const APPLE_WEB = path.join(__dirname, '../Backend/Public');
const WEB_DIST = path.join(__dirname, '../web/dist');
const staticRoot = fs.existsSync(APPLE_WEB) ? APPLE_WEB : WEB_DIST;

if (fs.existsSync(staticRoot)) {
  app.use(express.static(staticRoot));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticRoot, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Uygulama http://localhost:${PORT} üzerinde çalışıyor`);
});
