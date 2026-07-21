import cors from 'cors';
import express from 'express';
import { FlightSimulator } from './lib/simulator.js';
import { fetchOpenSkyFlights } from './lib/opensky.js';

const PORT = process.env.PORT || 3001;

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
  mode: 'simulation' // simulation | live
};

const simulator = new FlightSimulator({
  home: state.home,
  radiusKm: state.radiusKm
});

// Keep simulation warm even without clients
setInterval(() => simulator.tick(), 1000);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'skywatch-flight-tracker',
    mode: state.mode,
    aircraft: simulator.aircraft.length
  });
});

app.get('/api/home', (_req, res) => {
  res.json({ home: state.home, radiusKm: state.radiusKm, mode: state.mode });
});

app.post('/api/home', (req, res) => {
  const { lat, lng, altM, name, radiusKm, mode } = req.body || {};

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
    state.radiusKm = Math.max(10, Math.min(300, Number(radiusKm)));
    simulator.setRadius(state.radiusKm);
  }

  if (mode === 'simulation' || mode === 'live') {
    state.mode = mode;
  }

  res.json({ home: state.home, radiusKm: state.radiusKm, mode: state.mode });
});

app.get('/api/flights', async (req, res) => {
  const mode = req.query.mode || state.mode;
  const radiusKm = Number(req.query.radiusKm) || state.radiusKm;
  const category = req.query.category; // plane | helicopter | all

  try {
    let flights;
    let source = mode;

    if (mode === 'live') {
      try {
        flights = await fetchOpenSkyFlights(state.home, radiusKm);
        source = 'opensky';
      } catch (err) {
        // Fall back to simulation if OpenSky is rate-limited or unreachable
        flights = simulator.getSnapshot(radiusKm);
        source = 'simulation-fallback';
        res.setHeader('X-SkyWatch-Fallback', err.message || 'opensky-error');
      }
    } else {
      flights = simulator.getSnapshot(radiusKm);
      source = 'simulation';
    }

    if (category === 'plane' || category === 'helicopter') {
      flights = flights.filter((f) => f.category === category);
    }

    res.json({
      home: state.home,
      radiusKm,
      mode: source,
      count: flights.length,
      updatedAt: new Date().toISOString(),
      flights
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Uçuş verisi alınamadı' });
  }
});

app.get('/api/flights/:id', async (req, res) => {
  const radiusKm = Number(req.query.radiusKm) || state.radiusKm;
  const flights = simulator.getSnapshot(radiusKm * 2.5);
  const found = flights.find((f) => f.id === req.params.id || f.icao24 === req.params.id);
  if (!found) {
    return res.status(404).json({ error: 'Uçak bulunamadı' });
  }
  res.json(found);
});

app.listen(PORT, () => {
  console.log(`SkyWatch API http://localhost:${PORT}`);
  console.log(`Mod: ${state.mode} | Ev: ${state.home.lat}, ${state.home.lng} | Yarıçap: ${state.radiusKm} km`);
});
