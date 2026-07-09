// İstanbul Ulaşım Haritası — koyu tema (istanbulasim.com tarzı)
const MODE_STYLE = {
  bus: { label: 'Otobüs', color: '#4da3ff' },
  metro: { label: 'Metro', color: '#ff5d5d' },
  marmaray: { label: 'Marmaray', color: '#53eafd' },
  tram: { label: 'Tramvay', color: '#c792ea' },
  funicular: { label: 'Füniküler', color: '#ffd236' },
  cablecar: { label: 'Teleferik', color: '#d7a97a' },
  ferry: { label: 'Vapur', color: '#5ee9b5' },
  minibus: { label: 'Minibüs', color: '#9ee37d' },
  kart: { label: 'İstanbulkart', color: '#ff2d78' }
};

const DENSE_MODES = new Set(['bus', 'minibus', 'kart']);
const DENSE_MIN_ZOOM = 13;

const state = {
  map: null,
  allStops: [],
  kartAll: null,
  kartLoading: false,
  selectedModes: new Set(['metro', 'marmaray', 'tram', 'ferry']),
  searchResults: null,
  userCoord: null,
  watching: false,
  moveTimer: null
};

const els = {
  search: document.getElementById('search'),
  clear: document.getElementById('btn-clear'),
  modeFilters: document.getElementById('mode-filters'),
  stats: document.getElementById('stats'),
  list: document.getElementById('location-list'),
  zoomHint: document.getElementById('zoom-hint'),
  sheet: document.getElementById('sheet'),
  sheetHandle: document.getElementById('sheet-handle'),
  locate: document.getElementById('btn-locate')
};

const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
});

init();

function startClock() {
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const tick = () => {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    dateEl.textContent = `${days[now.getDay()]} ${now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}`;
  };
  tick();
  setInterval(tick, 15000);
}

function init() {
  startClock();
  state.map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap © CARTO'
        }
      },
      layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
    },
    center: [28.97953, 41.015137],
    zoom: 11,
    attributionControl: false
  });

  state.map.addControl(new maplibregl.AttributionControl({ compact: true }));
  state.map.addControl(geolocate);

  geolocate.on('geolocate', (e) => {
    state.userCoord = { lat: e.coords.latitude, lng: e.coords.longitude };
    els.locate.classList.add('active');
  });
  geolocate.on('trackuserlocationend', () => {
    els.locate.classList.remove('active');
  });

  state.map.on('load', async () => {
    setupLayers();
    await loadTransitData();
    refreshView();
    initSimulation();
    initPlanes();
    initChat();
    // Mobilde açılışta konum iste ve yakın durakları göster
    setTimeout(() => geolocate.trigger(), 600);
  });

  state.map.on('moveend', () => {
    clearTimeout(state.moveTimer);
    state.moveTimer = setTimeout(() => {
      if (!state.searchResults) refreshView();
    }, 200);
  });

  els.locate.addEventListener('click', () => {
    geolocate.trigger();
    showNearby();
  });

  els.sheetHandle.addEventListener('click', () => {
    els.sheet.classList.toggle('collapsed');
  });

  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      doSearch();
      els.search.blur();
    }
  });
  els.search.addEventListener('input', () => {
    els.clear.classList.toggle('hidden', !els.search.value);
    if (!els.search.value.trim()) {
      state.searchResults = null;
      refreshView();
    }
  });
  els.clear.addEventListener('click', () => {
    els.search.value = '';
    els.clear.classList.add('hidden');
    state.searchResults = null;
    refreshView();
  });
}

async function loadTransitData() {
  els.stats.textContent = 'VERİ YÜKLENİYOR...';
  const res = await fetch('transit.json');
  if (!res.ok) {
    els.stats.textContent = 'VERİ YÜKLENEMEDİ';
    return;
  }
  const data = await res.json();
  state.allStops = data.stops;
  buildChips(data.summary || {});
}

async function ensureKartData() {
  if (state.kartAll || state.kartLoading) return;
  state.kartLoading = true;
  try {
    const res = await fetch('locations.json');
    if (res.ok) {
      const data = await res.json();
      state.kartAll = data.locations.map((loc) => ({
        id: loc.id,
        name: loc.type,
        mode: 'kart',
        line: loc.district,
        direction: loc.address || null,
        lat: loc.lat,
        lng: loc.lng
      }));
    }
  } finally {
    state.kartLoading = false;
  }
}

function buildChips(summary) {
  els.modeFilters.innerHTML = '';
  const counts = { ...summary, kart: 30317 };
  Object.entries(MODE_STYLE).forEach(([mode, style]) => {
    const count = counts[mode];
    if (!count) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${state.selectedModes.has(mode) ? 'active' : ''}`;
    chip.innerHTML = `<span class="dot" style="background:${style.color}"></span>${style.label}`;
    chip.addEventListener('click', async () => {
      if (state.selectedModes.has(mode)) {
        state.selectedModes.delete(mode);
      } else {
        state.selectedModes.add(mode);
        if (mode === 'kart') await ensureKartData();
      }
      chip.classList.toggle('active');
      state.searchResults = null;
      refreshView();
      if (sim.started) {
        drawLineGeometries();
        updateVehicles();
      }
    });
    els.modeFilters.appendChild(chip);
  });
}

function setupLayers() {
  state.map.addSource('stops', { type: 'geojson', data: emptyGeoJSON() });
  // Neon parlama efekti: alt katman geniş yarı saydam halka
  state.map.addLayer({
    id: 'stops-glow',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 13, 17, 20],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.25,
      'circle-blur': 0.9
    }
  });

  state.map.addLayer({
    id: 'stops-circles',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 14, 6, 17, 10],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': 'rgba(10,10,10,0.9)'
    }
  });

  state.map.on('click', 'stops-circles', (e) => {
    const props = e.features[0].properties;
    new maplibregl.Popup({ offset: 10, closeButton: false })
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(popupHTML(props))
      .addTo(state.map);
  });

  // ---- Hat çizgileri (simülasyon rotaları) ----
  state.map.addSource('lines', { type: 'geojson', data: emptyGeoJSON() });
  state.map.addLayer(
    {
      id: 'lines-glow',
      type: 'line',
      source: 'lines',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 5,
        'line-opacity': 0.12,
        'line-blur': 3
      }
    },
    'stops-glow'
  );
  state.map.addLayer(
    {
      id: 'lines-core',
      type: 'line',
      source: 'lines',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.6,
        'line-opacity': 0.5
      }
    },
    'stops-glow'
  );

  // ---- Simüle araçlar ----
  state.map.addSource('vehicles', { type: 'geojson', data: emptyGeoJSON() });
  state.map.addLayer({
    id: 'vehicles-glow',
    type: 'circle',
    source: 'vehicles',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 7, 14, 12],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.4,
      'circle-blur': 0.8
    }
  });
  state.map.addLayer({
    id: 'vehicles-core',
    type: 'circle',
    source: 'vehicles',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 5.5],
      'circle-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-stroke-color': ['get', 'color']
    }
  });
  state.map.on('click', 'vehicles-core', (e) => {
    const props = e.features[0].properties;
    new maplibregl.Popup({ offset: 10, closeButton: false })
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(
        `<div class="popup"><strong>${props.name}</strong><br>${props.longName || ''}<br>${props.modeLabel} · simülasyon</div>`
      )
      .addTo(state.map);
  });

  // ---- Canlı uçaklar ----
  state.map.addSource('planes', { type: 'geojson', data: emptyGeoJSON() });
  state.map.addLayer({
    id: 'planes-symbols',
    type: 'symbol',
    source: 'planes',
    layout: {
      'text-field': '✈',
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 16, 13, 26],
      'text-rotate': ['get', 'track'],
      'text-allow-overlap': true,
      'text-rotation-alignment': 'map'
    },
    paint: {
      'text-color': '#ffd236',
      'text-halo-color': 'rgba(10,10,10,0.9)',
      'text-halo-width': 1.5
    }
  });
  state.map.on('click', 'planes-symbols', (e) => {
    const props = e.features[0].properties;
    new maplibregl.Popup({ offset: 10, closeButton: false })
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(
        `<div class="popup"><strong>✈ ${props.flight || 'Bilinmeyen'}</strong><br>` +
          `${props.alt ? `İrtifa: ${props.alt} ft<br>` : ''}` +
          `${props.speed ? `Hız: ${props.speed} kt<br>` : ''}CANLI ADS-B verisi</div>`
      )
      .addTo(state.map);
  });
}

function popupHTML(props) {
  const rows = [`<strong>${props.name}</strong>`];
  if (props.modeLabel) rows.push(props.modeLabel);
  if (props.line && props.line !== 'null') rows.push(props.line);
  if (props.direction && props.direction !== 'null') rows.push(props.direction);
  if (props.code && props.code !== 'null') rows.push(`Durak: ${props.code}`);
  rows.push(
    `<a href="https://maps.apple.com/?daddr=${props.lat},${props.lng}" target="_blank" rel="noopener">Yol tarifi al</a>`
  );
  return `<div class="popup">${rows.join('<br>')}</div>`;
}

function emptyGeoJSON() {
  return { type: 'FeatureCollection', features: [] };
}

function activeStops() {
  const pool = [...state.allStops];
  if (state.selectedModes.has('kart') && state.kartAll) pool.push(...state.kartAll);
  return pool;
}

function visibleStops() {
  if (state.searchResults) return state.searchResults;

  const zoom = state.map.getZoom();
  const bounds = state.map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  const hiddenDense = [...state.selectedModes].some(
    (mode) => DENSE_MODES.has(mode) && zoom < DENSE_MIN_ZOOM
  );
  els.zoomHint.classList.toggle('hidden', !hiddenDense);

  const results = [];
  for (const stop of activeStops()) {
    if (!state.selectedModes.has(stop.mode)) continue;
    if (DENSE_MODES.has(stop.mode) && zoom < DENSE_MIN_ZOOM) continue;
    if (stop.lng < west || stop.lng > east || stop.lat < south || stop.lat > north) continue;
    results.push(stop);
    if (results.length >= 4000) break;
  }
  return results;
}

function refreshView() {
  const stops = visibleStops();
  state.map.getSource('stops').setData(stopsToGeoJSON(stops));

  els.stats.textContent = state.searchResults
    ? `${stops.length.toLocaleString('tr-TR')} SONUÇ`
    : `GÖRÜNÜMDE ${stops.length.toLocaleString('tr-TR')} NOKTA`;
  renderList(stops.slice(0, 80));
}

function stopsToGeoJSON(stops) {
  return {
    type: 'FeatureCollection',
    features: stops.map((stop) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
      properties: {
        name: stop.name,
        modeLabel: MODE_STYLE[stop.mode]?.label || stop.mode,
        color: MODE_STYLE[stop.mode]?.color || '#8e8e93',
        line: stop.line || null,
        direction: stop.direction || null,
        code: stop.code || null,
        lat: stop.lat,
        lng: stop.lng
      }
    }))
  };
}

function renderList(items) {
  els.list.innerHTML = '';
  items.forEach((item) => {
    const style = MODE_STYLE[item.mode] || { label: item.mode, color: '#8e8e93' };
    const card = document.createElement('article');
    card.className = 'location-card';
    card.innerHTML = `
      <span class="badge" style="background:${style.color}1a;color:${style.color}">${style.label}</span>
      <h3>${item.name}</h3>
      <div class="meta">
        ${item.line ? `<div>${item.line}</div>` : ''}
        ${item.direction ? `<div>${item.direction}</div>` : ''}
        ${item.code ? `<div>Durak kodu: ${item.code}</div>` : ''}
        ${item.distanceKm != null ? `<div><strong>${formatDistance(item.distanceKm)}</strong></div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      els.sheet.classList.add('collapsed');
      state.map.flyTo({ center: [item.lng, item.lat], zoom: 16.5 });
    });
    els.list.appendChild(card);
  });
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function turkishLower(text) {
  return (text || '').toLocaleLowerCase('tr-TR');
}

function doSearch() {
  const query = turkishLower(els.search.value.trim());
  if (!query) {
    state.searchResults = null;
    refreshView();
    return;
  }

  const results = [];
  for (const stop of activeStops()) {
    if (state.selectedModes.size && !state.selectedModes.has(stop.mode)) continue;
    const haystack = turkishLower(
      [stop.name, stop.line, stop.direction, stop.code].filter(Boolean).join(' ')
    );
    if (haystack.includes(query)) {
      results.push(stop);
      if (results.length >= 300) break;
    }
  }

  state.searchResults = results;
  refreshView();
  els.sheet.classList.remove('collapsed');

  if (results.length) {
    const bounds = new maplibregl.LngLatBounds();
    results.forEach((s) => bounds.extend([s.lng, s.lat]));
    state.map.fitBounds(bounds, { padding: 70, maxZoom: 15.5 });
  }
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

// ============================================================
// ARAÇ SİMÜLASYONU — GTFS hat geometrileri + sefer sıklığı
// Araçlar hat üzerinde gidiş-dönüş yapar (istanbulasim tarzı)
// ============================================================
const sim = { lines: [], started: false };

async function initSimulation() {
  try {
    const res = await fetch('lines.json');
    if (!res.ok) return;
    const data = await res.json();

    for (const line of data.lines) {
      // Kümülatif mesafe tablosu (metre)
      const cum = [0];
      for (let i = 1; i < line.points.length; i++) {
        const [lng1, lat1] = line.points[i - 1];
        const [lng2, lat2] = line.points[i];
        cum.push(cum[i - 1] + haversineKm(lat1, lng1, lat2, lng2) * 1000);
      }
      const length = cum[cum.length - 1];
      if (length < 300) continue;

      const roundTrip = (2 * length) / line.speed; // saniye
      const vehicleCount = Math.max(1, Math.min(12, Math.round(roundTrip / line.headway)));

      sim.lines.push({ ...line, cum, length, vehicleCount });
    }

    drawLineGeometries();
    if (!sim.started) {
      sim.started = true;
      setInterval(updateVehicles, 1000);
      updateVehicles();
    }
  } catch {
    /* simülasyon isteğe bağlı */
  }
}

function drawLineGeometries() {
  const features = sim.lines
    .filter((line) => state.selectedModes.has(line.mode))
    .map((line) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: line.points },
      properties: { color: MODE_STYLE[line.mode]?.color || '#8e8e93' }
    }));
  state.map.getSource('lines')?.setData({ type: 'FeatureCollection', features });
}

function positionAlong(line, distM) {
  const { points, cum, length } = line;
  // Gidiş-dönüş: 0..L ileri, L..2L geri
  let d = distM % (2 * length);
  if (d > length) d = 2 * length - d;

  // İkili arama yerine doğrusal ilerleme yeterli (noktalar seyreltildi)
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / segLen;
  const [lng1, lat1] = points[i - 1];
  const [lng2, lat2] = points[i];
  return [lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t];
}

function updateVehicles() {
  if (!sim.lines.length) return;
  const now = Date.now() / 1000;
  const features = [];

  for (const line of sim.lines) {
    if (!state.selectedModes.has(line.mode)) continue;
    for (let v = 0; v < line.vehicleCount; v++) {
      // Her araca hat üzerinde eşit aralıklı faz kaydırması
      const offset = (v * 2 * line.length) / line.vehicleCount;
      const dist = now * line.speed + offset;
      const [lng, lat] = positionAlong(line, dist);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          name: line.name,
          longName: line.longName,
          modeLabel: MODE_STYLE[line.mode]?.label || line.mode,
          color: MODE_STYLE[line.mode]?.color || '#8e8e93'
        }
      });
    }
  }

  state.map.getSource('vehicles')?.setData({ type: 'FeatureCollection', features });
  const counter = document.getElementById('count-vehicles');
  if (counter) counter.textContent = `◆ ${features.length}`;
}

// ============================================================
// CANLI UÇAKLAR — airplanes.live ADS-B (gerçek canlı veri)
// ============================================================
function initPlanes() {
  const fetchPlanes = async () => {
    try {
      const res = await fetch('https://api.airplanes.live/v2/point/41.0/28.9/80');
      if (!res.ok) return;
      const data = await res.json();
      const aircraft = data.ac || [];

      const features = aircraft
        .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon))
        .map((a) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
          properties: {
            flight: (a.flight || '').trim() || a.r || null,
            track: Number.isFinite(a.track) ? a.track : 0,
            alt: a.alt_baro === 'ground' ? 0 : a.alt_baro || null,
            speed: Math.round(a.gs || 0) || null
          }
        }));

      state.map.getSource('planes')?.setData({ type: 'FeatureCollection', features });
      const counter = document.getElementById('count-planes');
      if (counter) counter.textContent = `✈ ${features.length}`;
    } catch {
      /* ağ hatasında bir sonraki denemeyi bekle */
    }
  };

  fetchPlanes();
  setInterval(fetchPlanes, 12000);
}

// ============================================================
// SOHBET BOTU — hat/durak bilgisi (İETT GTFS'ten yerel yanıt)
// ============================================================
const chat = { data: null, loading: false, routeStops: null };

function initChat() {
  const panel = document.getElementById('chat-panel');
  const btn = document.getElementById('btn-chat');
  const closeBtn = document.getElementById('chat-close');
  const input = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');

  btn.addEventListener('click', async () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      await ensureChatData();
      input.focus();
    }
  });
  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage(text, 'user');
    setTimeout(() => answer(text), 150);
  };
  send.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

async function ensureChatData() {
  if (chat.data || chat.loading) return;
  chat.loading = true;
  try {
    const res = await fetch('routes.json');
    if (res.ok) chat.data = await res.json();
  } finally {
    chat.loading = false;
  }
}

function addMessage(html, who) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${who}`;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;

  // Hat etiketlerine tıklama: hattın duraklarını haritada göster
  div.querySelectorAll('.route-tag').forEach((tag) => {
    tag.addEventListener('click', () => showRouteOnMap(tag.dataset.route));
  });
}

function routeTag(code) {
  return `<span class="route-tag" data-route="${code}">${code}</span>`;
}

function normalize(text) {
  return turkishLower(text)
    .replace(/['''´`]/g, "'")
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "kadıköy'e" -> "kadıköy" gibi ek temizliği
function stripSuffix(word) {
  return word.replace(/'(e|a|ye|ya|de|da|den|dan|te|ta|ten|tan|nin|nın|nun|nün|in|ın|un|ün)$/i, '');
}

const STOP_WORDS = new Set([
  'hangi', 'otobüs', 'otobüsler', 'otobüsü', 'hat', 'hatlar', 'hattı', 'hatları',
  'gider', 'gidiyor', 'giden', 'geçer', 'geçiyor', 'geçen', 'kalkar', 'kalkıyor',
  'nasıl', 'giderim', 'gidilir', 'var', 'mı', 'mi', 'mu', 'mü', 'acaba', 'peki',
  'durak', 'durağı', 'durağından', 'duraktan', 'durakta', 'istasyon', 'istasyonu',
  'nereden', 'nereye', 'nerede', 'ile', 've', 'için', 'en', 'bana', 'lütfen'
]);

function extractQuery(text) {
  return normalize(text)
    .split(' ')
    .map(stripSuffix)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

function answer(rawText) {
  if (!chat.data) {
    addMessage('Hat verisi henüz yüklenemedi, birazdan tekrar dene.', 'bot');
    return;
  }

  const text = normalize(rawText);
  const { routes } = chat.data;

  // 1) "en yakın X" → konumdan en yakın durak/istasyon
  const nearestMatch = text.match(/en yak[ıi]n\s+(\S+)/);
  if (nearestMatch) {
    answerNearest(nearestMatch[1]);
    return;
  }

  // 2) Hat kodu sorgusu: "34 nereye gider", "15F", "M4 hattı"
  const codeCandidate = extractQuery(rawText).toLocaleUpperCase('tr-TR').split(' ')[0];
  const routeIdx = routes.findIndex(([code]) => code.toLocaleUpperCase('tr-TR') === codeCandidate);
  if (routeIdx >= 0 && /\d|^[A-Z]{1,3}\d/.test(codeCandidate)) {
    const [code, longName] = routes[routeIdx];
    addMessage(
      `${routeTag(code)} hattı: <em>${longName || 'güzergah bilgisi yok'}</em><br>` +
        `Durakları haritada görmek için hat koduna dokun.`,
      'bot'
    );
    return;
  }

  // 3) "X durağından hangi otobüsler geçer" → durak bazlı
  if (/(dura[kğ]|geç|kalk)/.test(text)) {
    answerStop(extractQuery(rawText));
    return;
  }

  // 4) Varsayılan: "X'e hangi otobüs gider" → hedef bazlı
  answerDestination(extractQuery(rawText));
}

function answerDestination(query) {
  if (!query) {
    addMessage('Nereye gitmek istediğini yazar mısın? Örn: <em>Taksim\'e hangi otobüs gider?</em>', 'bot');
    return;
  }

  const q = turkishLower(query);
  const matches = chat.data.routes.filter(([, longName]) => turkishLower(longName).includes(q));

  if (!matches.length) {
    addMessage(
      `"<em>${query}</em>" için hat bulamadım. Semtin/durağın tam adını yazmayı dene (örn. Mecidiyeköy, Üsküdar).`,
      'bot'
    );
    return;
  }

  const tags = matches.slice(0, 25).map(([code]) => routeTag(code)).join(' ');
  const more = matches.length > 25 ? `<br><small>+${matches.length - 25} hat daha</small>` : '';
  addMessage(
    `<em>${query}</em> güzergahında ${matches.length} hat buldum:<br>${tags}${more}<br>` +
      `<small>Hat koduna dokununca duraklar haritada gösterilir.</small>`,
    'bot'
  );
}

function answerStop(query) {
  if (!query) {
    addMessage('Hangi durağı soruyorsun? Örn: <em>Kadıköy durağından hangi otobüsler geçer?</em>', 'bot');
    return;
  }

  const q = turkishLower(query);
  const stops = state.allStops.filter(
    (s) => s.mode === 'bus' && turkishLower(s.name).includes(q)
  );

  if (!stops.length) {
    addMessage(`"<em>${query}</em>" adında otobüs durağı bulamadım.`, 'bot');
    return;
  }

  const routeSet = new Set();
  for (const stop of stops.slice(0, 40)) {
    const stopId = stop.id.replace('bus-', '');
    for (const idx of chat.data.stopRoutes[stopId] || []) routeSet.add(idx);
  }

  if (!routeSet.size) {
    addMessage(`<em>${stops[0].name}</em> durağı için hat bilgisi bulunamadı.`, 'bot');
    return;
  }

  const codes = [...routeSet].map((i) => chat.data.routes[i][0]).sort();
  const tags = codes.slice(0, 30).map(routeTag).join(' ');
  const more = codes.length > 30 ? `<br><small>+${codes.length - 30} hat daha</small>` : '';
  addMessage(
    `<em>${stops[0].name}</em> (${stops.length} peron/durak) duraklarından geçen ${codes.length} hat:<br>${tags}${more}`,
    'bot'
  );
}

function answerNearest(modeWord) {
  const modeMap = {
    metro: 'metro', metroya: 'metro', metrosu: 'metro',
    marmaray: 'marmaray', tramvay: 'tram', tren: 'marmaray',
    vapur: 'ferry', iskele: 'ferry', otobüs: 'bus', durak: 'bus',
    minibüs: 'minibus', dolmuş: 'minibus', füniküler: 'funicular', teleferik: 'cablecar'
  };
  const mode = modeMap[stripSuffix(modeWord)] || null;

  if (!state.userCoord) {
    addMessage('Önce konumuna izin vermelisin — sağ üstteki konum düğmesine dokun, sonra tekrar sor.', 'bot');
    geolocate.trigger();
    return;
  }

  const { lat, lng } = state.userCoord;
  const candidates = state.allStops
    .filter((s) => (mode ? s.mode === mode : true))
    .map((s) => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  if (!candidates.length) {
    addMessage('Yakında uygun bir nokta bulamadım.', 'bot');
    return;
  }

  const label = mode ? MODE_STYLE[mode].label.toLocaleLowerCase('tr-TR') : 'durak';
  const list = candidates
    .map((c) => `• <em>${c.name}</em> — ${formatDistance(c.distanceKm)}`)
    .join('<br>');
  addMessage(`Sana en yakın ${label} noktaları:<br>${list}`, 'bot');

  const first = candidates[0];
  state.map.flyTo({ center: [first.lng, first.lat], zoom: 15.5 });
}

function buildRouteStopsIndex() {
  if (chat.routeStops) return;
  chat.routeStops = new Map();
  for (const [stopId, idxList] of Object.entries(chat.data.stopRoutes)) {
    for (const idx of idxList) {
      if (!chat.routeStops.has(idx)) chat.routeStops.set(idx, []);
      chat.routeStops.get(idx).push(stopId);
    }
  }
}

function showRouteOnMap(code) {
  if (!chat.data) return;
  buildRouteStopsIndex();

  const routeIdx = chat.data.routes.findIndex(([c]) => c === code);
  if (routeIdx < 0) return;

  const stopIds = new Set(chat.routeStops.get(routeIdx) || []);
  const stops = state.allStops.filter(
    (s) => s.mode === 'bus' && stopIds.has(s.id.replace('bus-', ''))
  );
  if (!stops.length) {
    addMessage(`${routeTag(code)} hattının durakları haritada bulunamadı.`, 'bot');
    return;
  }

  state.searchResults = stops;
  state.map.getSource('stops').setData(stopsToGeoJSON(stops));
  els.stats.textContent = `${code} HATTI · ${stops.length} DURAK`;
  renderList(stops.slice(0, 80));

  const bounds = new maplibregl.LngLatBounds();
  stops.forEach((s) => bounds.extend([s.lng, s.lat]));
  state.map.fitBounds(bounds, { padding: 70, maxZoom: 14.5 });

  document.getElementById('chat-panel').classList.add('hidden');
  els.sheet.classList.remove('collapsed');
}

function showNearby() {
  const attempt = () => {
    if (!state.userCoord) return false;
    const { lat, lng } = state.userCoord;
    const nearby = activeStops()
      .filter((s) => state.selectedModes.has(s.mode))
      .map((s) => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
      .filter((s) => s.distanceKm <= 1.5)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 100);

    state.searchResults = nearby;
    state.map.flyTo({ center: [lng, lat], zoom: 15 });
    els.stats.textContent = `1,5 KM İÇİNDE ${nearby.length} DURAK`;
    renderList(nearby.slice(0, 80));
    state.map.getSource('stops').setData(stopsToGeoJSON(nearby));
    els.sheet.classList.remove('collapsed');
    return true;
  };

  if (!attempt()) {
    // Konum henüz gelmediyse kısa süre bekle
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attempt() || tries > 20) clearInterval(timer);
    }, 500);
  }
}
