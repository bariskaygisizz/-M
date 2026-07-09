import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'transit.json');

// İBB Açık Veri kaynakları
const SOURCES = {
  railStations:
    'https://data.ibb.gov.tr/dataset/04ec9805-2483-46c7-914f-30c50857a846/resource/3dc8203f-3613-48a8-85e9-24fffb7821ad/download/rayli_sistem_istasyon_poi_verisi.geojson',
  iettStops:
    'https://data.ibb.gov.tr/dataset/8540e256-6df5-4719-85bc-e64e91508ede/resource/2299bc82-983b-4bdf-8520-5cef8c555e29/download/stops.csv',
  minibusStops:
    'https://data.ibb.gov.tr/dataset/8b4391c0-e647-4635-aaf7-5baee24c6e81/resource/0d4fbb9f-cd5f-4005-aa57-6bb76db3fc58/download/istanbul_minibus_duraklari.geojson',
  ptStops:
    'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/d1f7c258-bbc1-406f-9ab2-7a7c1797c673/download/stops.csv',
  ptRoutes:
    'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/36b554c7-cae0-4b7e-978f-fc6a43664e88/download/routes.csv',
  ptTrips:
    'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/dcee1700-e59f-4a5f-8009-f602045a4507/download/trips.csv',
  ptStopTimes:
    'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/ac646b83-3b6f-4ca2-afb4-9071ab44d9af/download/stop_times.csv'
};

// GTFS agency_id -> mod eşlemesi (Toplu Ulaşım GTFS veri setinden)
const FERRY_AGENCIES = new Set(['6', '20', '33', '48']); // Şehir Hatları, İDO, Dentur, Turyol

const RAIL_TYPE_MAP = {
  Metro: 'metro',
  Tramvay: 'tram',
  'Banliyö': 'marmaray',
  'Füniküler': 'funicular',
  Teleferik: 'cablecar'
};

async function download(url, label, encoding = 'utf-8') {
  console.log(`  İndiriliyor: ${label}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${label} indirilemedi: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return new TextDecoder(encoding).decode(buffer);
}

function parseCSV(text, delimiter = ',') {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  });
}

// İETT stops.csv'de koordinatlar binlik ayraçla bozulmuş: "410.191.700.005.564" -> 41.0191700005564
function fixIettCoord(value) {
  if (!value) return null;
  const digits = value.replace(/\./g, '');
  if (!/^\d+$/.test(digits)) {
    const plain = Number(value.replace(',', '.'));
    return Number.isFinite(plain) ? plain : null;
  }
  const num = Number(`${digits.slice(0, 2)}.${digits.slice(2)}`);
  return Number.isFinite(num) ? num : null;
}

function inIstanbul(lat, lng) {
  return lat >= 40.7 && lat <= 41.7 && lng >= 27.9 && lng <= 30.0;
}

async function buildRailStations() {
  const geojson = JSON.parse(await download(SOURCES.railStations, 'Raylı sistem istasyonları'));
  const stations = [];
  for (const feature of geojson.features) {
    const props = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    if (!inIstanbul(lat, lng)) continue;
    const mode = RAIL_TYPE_MAP[props.HAT_TURU] || 'metro';
    stations.push({
      id: `rail-${stations.length}`,
      name: props.ISTASYON,
      mode,
      line: props.PROJE_ADI || null,
      status: props.PROJE_ASAMA === 'İnşaat Aşamasında' ? 'construction' : 'active',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  }
  return stations;
}

async function buildBusStops() {
  const csv = await download(SOURCES.iettStops, 'İETT otobüs durakları');
  const rows = parseCSV(csv, ';');
  const stops = [];
  const seen = new Set();
  for (const row of rows) {
    const lat = fixIettCoord(row.stop_lat);
    const lng = fixIettCoord(row.stop_lon);
    if (lat == null || lng == null || !inIstanbul(lat, lng)) continue;
    const key = `${row.stop_code}-${lat.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stops.push({
      id: `bus-${row.stop_id}`,
      code: row.stop_code || null,
      name: row.stop_name,
      direction: (row.stop_desc || '').replace(/^direction:\s*/i, '') || null,
      mode: 'bus',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  }
  return stops;
}

async function buildMinibusStops() {
  const geojson = JSON.parse(await download(SOURCES.minibusStops, 'Minibüs durakları'));
  const stops = [];
  for (const feature of geojson.features) {
    const [lng, lat] = feature.geometry.coordinates;
    if (!inIstanbul(lat, lng)) continue;
    stops.push({
      id: `minibus-${stops.length}`,
      name: feature.properties.DURAK_ADI || 'Minibüs Durağı',
      mode: 'minibus',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  }
  return stops;
}

async function buildFerryPiers() {
  const enc = 'windows-1254';
  const [stopsCsv, routesCsv, tripsCsv, stopTimesCsv] = await Promise.all([
    download(SOURCES.ptStops, 'GTFS duraklar', enc),
    download(SOURCES.ptRoutes, 'GTFS hatlar', enc),
    download(SOURCES.ptTrips, 'GTFS seferler', enc),
    download(SOURCES.ptStopTimes, 'GTFS sefer saatleri (12MB)', enc)
  ]);

  const routes = new Map();
  for (const row of parseCSV(routesCsv)) {
    routes.set(row.route_id, row.agency_id);
  }

  const tripToAgency = new Map();
  for (const row of parseCSV(tripsCsv)) {
    const agency = routes.get(row.route_id);
    if (agency) tripToAgency.set(row.trip_id, agency);
  }

  const stopAgencies = new Map();
  for (const row of parseCSV(stopTimesCsv)) {
    const agency = tripToAgency.get(row.trip_id);
    if (!agency) continue;
    if (!stopAgencies.has(row.stop_id)) stopAgencies.set(row.stop_id, new Set());
    stopAgencies.get(row.stop_id).add(agency);
  }

  const piers = [];
  for (const row of parseCSV(stopsCsv)) {
    const agencies = stopAgencies.get(row.stop_id);
    if (!agencies || ![...agencies].some((a) => FERRY_AGENCIES.has(a))) continue;
    const lat = Number(row.stop_lat);
    const lng = Number(row.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inIstanbul(lat, lng)) continue;
    piers.push({
      id: `ferry-${row.stop_id}`,
      name: row.stop_name,
      mode: 'ferry',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    });
  }
  return piers;
}

async function main() {
  console.log('İstanbul toplu taşıma verisi senkronizasyonu başlıyor...\n');

  const [rail, bus, minibus, ferry] = await Promise.all([
    buildRailStations(),
    buildBusStops(),
    buildMinibusStops(),
    buildFerryPiers()
  ]);

  const stops = [...rail, ...bus, ...minibus, ...ferry];

  const summary = stops.reduce((acc, stop) => {
    acc[stop.mode] = (acc[stop.mode] || 0) + 1;
    return acc;
  }, {});

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'İBB Açık Veri Portalı (İETT GTFS, Raylı Sistem İstasyonları, Toplu Ulaşım GTFS, Minibüs Durakları)',
    total: stops.length,
    summary,
    modes: {
      bus: 'Otobüs (İETT)',
      metro: 'Metro',
      marmaray: 'Marmaray / Banliyö',
      tram: 'Tramvay',
      funicular: 'Füniküler',
      cablecar: 'Teleferik',
      ferry: 'Vapur / Deniz',
      minibus: 'Minibüs'
    },
    stops
  };

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload), 'utf8');

  console.log(`\n${stops.length} durak/istasyon kaydedildi: ${OUTPUT_FILE}`);
  console.log('Özet:', summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
