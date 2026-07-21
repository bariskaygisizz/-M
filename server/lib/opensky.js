import {
  bearingDeg,
  haversineKm,
  metersToFeet,
  slantRangeKm
} from './geo.js';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

/**
 * Fetch live ADS-B states from OpenSky Network around a bounding box.
 * Anonymous access is rate-limited; failures fall back gracefully.
 */
export async function fetchOpenSkyFlights(home, radiusKm = 80) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((home.lat * Math.PI) / 180));

  const lamin = home.lat - latDelta;
  const lamax = home.lat + latDelta;
  const lomin = home.lng - lngDelta;
  const lomax = home.lng + lngDelta;

  const url = `${OPENSKY_URL}?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const err = new Error(`OpenSky HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const states = data.states || [];
    const homeAlt = home.altM || 0;

    return states
      .map((s) => mapState(s, home, homeAlt))
      .filter((ac) => ac && ac.groundDistanceKm <= radiusKm)
      .sort((a, b) => a.groundDistanceKm - b.groundDistanceKm);
  } finally {
    clearTimeout(timer);
  }
}

function mapState(s, home, homeAlt) {
  // OpenSky state vector:
  // 0 icao24, 1 callsign, 2 origin_country, 5 lon, 6 lat, 7 baro_altitude,
  // 8 on_ground, 9 velocity (m/s), 10 true_track, 11 vertical_rate (m/s),
  // 13 geo_altitude, 14 squawk
  const lng = s[5];
  const lat = s[6];
  if (lat == null || lng == null) return null;

  const altM = s[13] ?? s[7] ?? 0;
  const velocityMs = s[9] ?? 0;
  const groundSpeedKmh = velocityMs * 3.6;
  const groundSpeedKt = groundSpeedKmh / 1.852;
  const verticalMs = s[11] ?? 0;
  const groundDistanceKm = haversineKm(home.lat, home.lng, lat, lng);
  const distance3dKm = slantRangeKm(home.lat, home.lng, homeAlt, lat, lng, altM);
  const callsign = (s[1] || '').trim() || s[0];
  const category = inferCategory(altM, groundSpeedKmh);

  return {
    id: `live-${s[0]}`,
    icao24: s[0],
    callsign,
    airline: s[2] || 'Bilinmiyor',
    category,
    aircraftType: category === 'helicopter' ? 'Helikopter / düşük irtifa' : 'Ticari / genel havacılık',
    typeCode: null,
    origin: { icao: null, iata: null, name: s[2] || '—', city: s[2] || '—' },
    destination: { icao: null, iata: null, name: 'Canlı ADS-B', city: '—' },
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    altitudeFt: Math.round(metersToFeet(altM)),
    altitudeM: Math.round(altM),
    heightAboveHomeM: Math.round(altM - homeAlt),
    groundSpeedKt: Math.round(groundSpeedKt),
    groundSpeedKmh: Math.round(groundSpeedKmh),
    verticalSpeedFpm: Math.round(verticalMs * 196.85),
    heading: Math.round(((s[10] ?? 0) + 360) % 360),
    squawk: s[14] || null,
    onGround: Boolean(s[8]),
    phase: s[8] ? 'ground' : verticalMs > 1.5 ? 'climb' : verticalMs < -1.5 ? 'descent' : 'cruise',
    groundDistanceKm: Number(groundDistanceKm.toFixed(2)),
    distance3dKm: Number(distance3dKm.toFixed(2)),
    bearingFromHome: Math.round(bearingDeg(home.lat, home.lng, lat, lng)),
    trail: [],
    source: 'opensky',
    updatedAt: Date.now()
  };
}

function inferCategory(altM, speedKmh) {
  if (altM < 1500 && speedKmh < 280) return 'helicopter';
  return 'plane';
}
