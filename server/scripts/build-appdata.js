import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// İETT GTFS + Toplu Ulaşım GTFS verilerinden uygulama içi kompakt veri üretir:
//   docs/routes.json  — sohbet botu: hat kodu -> güzergah adı + durak->hatlar eşlemesi
//   docs/lines.json   — araç simülasyonu: metro/tramvay/vapur hat geometrileri + sefer sıklığı
// Kaynak dosyalar /tmp/transit altında önbelleklenir (varsa yeniden indirilmez).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '../../docs');
const CACHE = '/tmp/transit';

const FILES = {
  iettRoutes: {
    url: 'https://data.ibb.gov.tr/dataset/8540e256-6df5-4719-85bc-e64e91508ede/resource/46dbe388-c8c2-45c4-ac72-c06953de56a2/download/routes.csv',
    file: 'iett_routes.csv'
  },
  iettTrips: {
    url: 'https://data.ibb.gov.tr/dataset/8540e256-6df5-4719-85bc-e64e91508ede/resource/7ff49bdd-b0d2-4a6e-9392-b598f77f5070/download/trips.csv',
    file: 'iett_trips.csv'
  },
  iettStopTimesZip: {
    url: 'https://data.ibb.gov.tr/dataset/8540e256-6df5-4719-85bc-e64e91508ede/resource/80401c1c-c240-4a32-8f40-ef697100a681/download/stop_times.zip',
    file: 'iett_stop_times.zip',
    extracted: 'stop_times.txt'
  },
  ptRoutes: {
    url: 'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/36b554c7-cae0-4b7e-978f-fc6a43664e88/download/routes.csv',
    file: 'pt_routes.csv',
    encoding: 'windows-1254'
  },
  ptTrips: {
    url: 'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/dcee1700-e59f-4a5f-8009-f602045a4507/download/trips.csv',
    file: 'pt_trips.csv',
    encoding: 'windows-1254'
  },
  ptShapes: {
    url: 'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/83317085-aa56-41b0-9447-ea579567f2cb/download/shapes.csv',
    file: 'pt_shapes.csv',
    encoding: 'windows-1254'
  },
  ptFrequencies: {
    url: 'https://data.ibb.gov.tr/dataset/121a9892-7945-419a-9b89-49f6083926df/resource/a4c86ce6-64da-41e2-9584-5d83b5fb895c/download/frequencies.csv',
    file: 'pt_frequencies.csv',
    encoding: 'windows-1254'
  }
};

async function ensureFile(spec) {
  const target = path.join(CACHE, spec.file);
  if (!fs.existsSync(target)) {
    console.log(`  İndiriliyor: ${spec.file}`);
    const res = await fetch(spec.url);
    if (!res.ok) throw new Error(`${spec.file} indirilemedi: ${res.status}`);
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  }
  return target;
}

function readText(filePath, encoding = 'utf-8') {
  const buffer = fs.readFileSync(filePath);
  return new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/, '');
}

function parseCSV(text, delimiter) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row = {};
    headers.forEach((h, i) => (row[h] = (values[i] || '').trim()));
    return row;
  });
}

// İETT routes.csv çifte kodlanmış UTF-8 içeriyor (KADIKÃ–Y -> KADIKÖY).
// Düzeltme: UTF-8 olarak okunan metindeki her karakteri cp1252 baytına çevir,
// oluşan bayt dizisini tekrar UTF-8 olarak çöz.
const CP1252_REVERSE = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8a,
  '\u2039': 0x8b, '\u0152': 0x8c, '\u017D': 0x8e, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203A': 0x9b, '\u0153': 0x9c,
  '\u017E': 0x9e, '\u0178': 0x9f
};

function fixDoubleUTF8(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (CP1252_REVERSE[ch] != null) {
      bytes.push(CP1252_REVERSE[ch]);
    } else {
      return text; // cp1252'ye çevrilemiyor: metin zaten düzgün
    }
  }
  const decoded = Buffer.from(bytes).toString('utf8');
  return decoded.includes('\uFFFD') ? text : decoded;
}

async function buildChatData() {
  console.log('Sohbet botu verisi hazırlanıyor...');

  const routesRaw = parseCSV(readText(await ensureFile(FILES.iettRoutes)), ';');
  const routeIdToIdx = new Map();
  const routes = [];
  const seenShort = new Map();

  for (const row of routesRaw) {
    const short = row.route_short_name;
    const long = fixDoubleUTF8(row.route_long_name || '');
    if (!short) continue;
    if (!seenShort.has(short)) {
      seenShort.set(short, routes.length);
      routes.push([fixDoubleUTF8(short), long]);
    }
    routeIdToIdx.set(row.route_id, seenShort.get(short));
  }
  console.log(`  ${routes.length} benzersiz hat`);

  const tripToRoute = new Map();
  for (const row of parseCSV(readText(await ensureFile(FILES.iettTrips)), ';')) {
    const idx = routeIdToIdx.get(row.route_id);
    if (idx != null) tripToRoute.set(row.trip_id, idx);
  }

  // stop_times.txt büyük (144MB) — akış halinde işle
  const zipPath = await ensureFile(FILES.iettStopTimesZip);
  const stopTimesPath = path.join(CACHE, 'stop_times.txt');
  if (!fs.existsSync(stopTimesPath)) {
    const { execSync } = await import('child_process');
    execSync(`unzip -o ${zipPath} -d ${CACHE}`);
  }

  const stopRoutes = new Map();
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(stopTimesPath, { encoding: 'utf8' });
    let remainder = '';
    let isFirst = true;
    stream.on('data', (chunk) => {
      const lines = (remainder + chunk).split('\n');
      remainder = lines.pop();
      for (const line of lines) {
        if (isFirst) {
          isFirst = false;
          continue;
        }
        const comma1 = line.indexOf(',');
        const comma2 = line.indexOf(',', comma1 + 1);
        if (comma1 < 0 || comma2 < 0) continue;
        const tripId = line.slice(0, comma1);
        const stopId = line.slice(comma1 + 1, comma2);
        const routeIdx = tripToRoute.get(tripId);
        if (routeIdx == null) continue;
        let set = stopRoutes.get(stopId);
        if (!set) {
          set = new Set();
          stopRoutes.set(stopId, set);
        }
        set.add(routeIdx);
      }
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  const stopRoutesObj = {};
  for (const [stopId, set] of stopRoutes) {
    stopRoutesObj[stopId] = [...set];
  }

  const payload = { routes, stopRoutes: stopRoutesObj };
  fs.writeFileSync(path.join(DOCS_DIR, 'routes.json'), JSON.stringify(payload));
  console.log(`  ${stopRoutes.size} durak için hat eşlemesi yazıldı (docs/routes.json)`);
}

const MODE_BY_AGENCY_TYPE = (agencyId, routeType) => {
  if (agencyId === '4') return 'marmaray';
  if (agencyId === '11') {
    if (routeType === '0') return 'tram';
    if (routeType === '6') return 'cablecar';
    if (routeType === '7') return 'funicular';
    return 'metro';
  }
  if (['6', '20', '33', '48'].includes(agencyId)) return 'ferry';
  return null;
};

const MODE_SPEED = { metro: 13, marmaray: 16, tram: 8, funicular: 5, cablecar: 4, ferry: 6.5 };

function decimate(points, minMeters = 60) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  let last = points[0];
  for (let i = 1; i < points.length - 1; i++) {
    const d = haversineM(last[1], last[0], points[i][1], points[i][0]);
    if (d >= minMeters) {
      out.push(points[i]);
      last = points[i];
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function buildLines() {
  console.log('Simülasyon hatları hazırlanıyor...');
  const enc = 'windows-1254';

  const routes = new Map();
  for (const row of parseCSV(readText(await ensureFile(FILES.ptRoutes), enc), ',')) {
    routes.set(row.route_id, row);
  }

  // route -> shape (yön 0'dan ilk shape) ve frekans
  const routeShape = new Map();
  const shapeToRoute = new Map();
  const tripToRoute = new Map();
  for (const row of parseCSV(readText(await ensureFile(FILES.ptTrips), enc), ',')) {
    tripToRoute.set(row.trip_id, row.route_id);
    if (row.shape_id && !routeShape.has(row.route_id)) {
      routeShape.set(row.route_id, row.shape_id);
      shapeToRoute.set(row.shape_id, row.route_id);
    }
  }

  const headways = new Map();
  for (const row of parseCSV(readText(await ensureFile(FILES.ptFrequencies), enc), ',')) {
    const routeId = tripToRoute.get(row.trip_id);
    if (!routeId) continue;
    const headway = Number(row.headway_secs);
    if (!Number.isFinite(headway) || headway <= 0) continue;
    if (!headways.has(routeId)) headways.set(routeId, []);
    headways.get(routeId).push(headway);
  }

  const shapePoints = new Map();
  for (const row of parseCSV(readText(await ensureFile(FILES.ptShapes), enc), ',')) {
    if (!shapeToRoute.has(row.shape_id)) continue;
    const lat = Number(row.shape_pt_lat);
    const lng = Number(row.shape_pt_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!shapePoints.has(row.shape_id)) shapePoints.set(row.shape_id, []);
    shapePoints.get(row.shape_id).push([Number(row.shape_pt_sequence), lng, lat]);
  }

  const lines = [];
  for (const [routeId, shapeId] of routeShape) {
    const route = routes.get(routeId);
    if (!route) continue;
    const mode = MODE_BY_AGENCY_TYPE(route.agency_id, route.route_type);
    if (!mode) continue;
    const raw = shapePoints.get(shapeId);
    if (!raw || raw.length < 2) continue;

    raw.sort((a, b) => a[0] - b[0]);
    const points = decimate(
      raw.map(([, lng, lat]) => [Number(lng.toFixed(5)), Number(lat.toFixed(5))]),
      mode === 'ferry' ? 150 : 60
    );
    if (points.length < 2) continue;

    const hw = headways.get(routeId);
    const headway = hw && hw.length ? Math.round(hw.reduce((a, b) => a + b, 0) / hw.length) : 600;

    lines.push({
      id: routeId,
      mode,
      name: route.route_short_name || route.route_long_name || routeId,
      longName: route.route_long_name || '',
      headway: Math.min(Math.max(headway, 180), 1800),
      speed: MODE_SPEED[mode],
      points
    });
  }

  fs.writeFileSync(path.join(DOCS_DIR, 'lines.json'), JSON.stringify({ lines }));
  const byMode = lines.reduce((acc, l) => ((acc[l.mode] = (acc[l.mode] || 0) + 1), acc), {});
  console.log(`  ${lines.length} hat geometrisi yazıldı (docs/lines.json):`, byMode);
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  await buildChatData();
  await buildLines();
  console.log('Tamamlandı.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
