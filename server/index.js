import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FlightSimulator } from './lib/simulator.js';
import { fetchOpenSkyFlights } from './lib/opensky.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const WEB_DIST = path.join(__dirname, '../web/dist');

const app = express();
app.use(cors());
app.use(express.json());

const state = {
  home: {
    lat: 41.0082,
    lng: 28.9784,
    altM: 40,
    name: 'Ev'
  },
  radiusKm: 80,
  wideRadiusKm: 900,
  scope: 'both', // near | wide | both
  mode: 'simulation' // simulation | live
};

const simulator = new FlightSimulator({
  home: state.home,
  radiusKm: state.radiusKm,
  wideRadiusKm: state.wideRadiusKm,
  planeCount: 36,
  heliCount: 5
});

setInterval(() => simulator.tick(), 1000);

function annotateFlights(flights, homeRadiusKm = state.radiusKm) {
  return flights.map((f) => ({
    ...f,
    zone: f.groundDistanceKm <= homeRadiusKm ? 'near' : 'far',
    passengersVisible: false,
    passengerNote:
      f.passengerNote ||
      'Yolcu listesi görünmez. ADS-B yalnızca uçak konum ve kimliğini yayınlar.'
  }));
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'skywatch-flight-tracker',
    mode: state.mode,
    scope: state.scope,
    aircraft: simulator.aircraft.length
  });
});

app.get('/api/about', (_req, res) => {
  res.json({
    name: 'SkyWatch',
    purpose:
      'Ev çevresi ve bölgesel hava trafiğini haritada izlemek: hız, irtifa, mesafe, rota ve canlı konum.',
    whoUses: [
      'Havaalanı / güzergâh yakınında oturanlar (gürültü ve geçiş farkındalığı)',
      'Havacılık meraklıları ve öğrencilerin öğrenmesi',
      'Açık kaynak / eğitim projeleri',
      'Basit operasyonel farkındalık isteyen küçük ekipler (ADS-B canlı mod)'
    ],
    whyUse: [
      'Üstünden geçen uçağın ne kadar uzakta ve ne yükseklikte olduğunu görmek',
      'Nereden nereye gittiğini anlamak',
      'Helikopter ile uçağı ayırt etmek',
      'Simülasyonla güvenli öğrenmek; canlı modda gerçek ADS-B bakmak'
    ],
    whatYouGain: [
      'Anlık konum, yer hızı, irtifa, yön',
      'Eve yatay / 3B mesafe',
      'Rota (nereden → nereye)',
      'Ev + uzak bölge görünümü'
    ],
    whatYouCannot: [
      'Uçaktaki yolcuların kim olduğu (yolcu listesi gizli / yasal olarak kapalı)',
      'Koltuk, bagaj, bilet veya kişisel veri',
      'Askeri / kapalı/şifreli yayınlar her zaman görünmez'
    ],
    passengers:
      'Hayır — bu uygulama ve ADS-B ile uçakta kimlerin olduğu bilinemez. Görünen şey uçak kimliği (çağrı adı), konum ve hareket verisidir; yolcu manifestosu havayolu/güvenlik verisidir ve kamuya açık değildir.'
  });
});

app.get('/api/home', (_req, res) => {
  res.json({
    home: state.home,
    radiusKm: state.radiusKm,
    wideRadiusKm: state.wideRadiusKm,
    scope: state.scope,
    mode: state.mode
  });
});

app.post('/api/home', (req, res) => {
  const { lat, lng, altM, name, radiusKm, wideRadiusKm, scope, mode } = req.body || {};

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    state.home = {
      lat: Number(lat),
      lng: Number(lng),
      altM: Number.isFinite(Number(altM)) ? Number(altM) : state.home.altM,
      name: typeof name === 'string' && name.trim() ? name.trim() : state.home.name
    };
    simulator.setHome(state.home);
    simulator.seedFleet();
  }

  if (radiusKm != null) {
    state.radiusKm = Math.max(10, Math.min(400, Number(radiusKm)));
    simulator.setRadius(state.radiusKm);
  }

  if (wideRadiusKm != null) {
    state.wideRadiusKm = Math.max(100, Math.min(1500, Number(wideRadiusKm)));
    simulator.setWideRadius(state.wideRadiusKm);
  }

  if (scope === 'near' || scope === 'wide' || scope === 'both') {
    state.scope = scope;
  }

  if (mode === 'simulation' || mode === 'live') {
    state.mode = mode;
  }

  res.json({
    home: state.home,
    radiusKm: state.radiusKm,
    wideRadiusKm: state.wideRadiusKm,
    scope: state.scope,
    mode: state.mode
  });
});

app.get('/api/flights', async (req, res) => {
  const mode = req.query.mode || state.mode;
  const scope = req.query.scope || state.scope;
  const homeRadiusKm = Number(req.query.radiusKm) || state.radiusKm;
  const wideRadiusKm = Number(req.query.wideRadiusKm) || state.wideRadiusKm;
  const category = req.query.category;
  const queryRadius = scope === 'near' ? homeRadiusKm : wideRadiusKm;

  try {
    let flights;
    let source = mode;

    if (mode === 'live') {
      try {
        flights = await fetchOpenSkyFlights(state.home, queryRadius);
        source = 'opensky';
      } catch (err) {
        flights = simulator.getSnapshot(queryRadius, homeRadiusKm);
        source = 'simulation-fallback';
        res.setHeader('X-SkyWatch-Fallback', err.message || 'opensky-error');
      }
    } else {
      flights = simulator.getSnapshot(queryRadius, homeRadiusKm);
      source = 'simulation';
    }

    flights = annotateFlights(flights, homeRadiusKm);

    if (scope === 'near') {
      flights = flights.filter((f) => f.zone === 'near');
    } else if (scope === 'wide') {
      // show all within wide radius (near + far)
    }

    if (category === 'plane' || category === 'helicopter') {
      flights = flights.filter((f) => f.category === category);
    }

    const nearCount = flights.filter((f) => f.zone === 'near').length;
    const farCount = flights.filter((f) => f.zone === 'far').length;

    res.json({
      home: state.home,
      radiusKm: homeRadiusKm,
      wideRadiusKm,
      scope,
      mode: source,
      count: flights.length,
      nearCount,
      farCount,
      updatedAt: new Date().toISOString(),
      flights
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Uçuş verisi alınamadı' });
  }
});

app.get('/api/flights/:id', async (req, res) => {
  const flights = annotateFlights(
    simulator.getSnapshot(state.wideRadiusKm, state.radiusKm),
    state.radiusKm
  );
  const found = flights.find((f) => f.id === req.params.id || f.icao24 === req.params.id);
  if (!found) {
    return res.status(404).json({ error: 'Uçak bulunamadı' });
  }
  res.json(found);
});

// Serve built web app (phone-friendly single URL)
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { maxAge: '1h', extensions: ['html'] }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`SkyWatch API http://localhost:${PORT}`);
  console.log(
    `Mod: ${state.mode} | Kapsam: ${state.scope} | Ev: ${state.home.lat}, ${state.home.lng}`
  );
  if (fs.existsSync(WEB_DIST)) {
    console.log(`Web arayüzü: http://localhost:${PORT}/`);
  }
});
