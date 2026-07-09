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
