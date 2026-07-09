// İstanbul Ulaşım Haritası — statik sürüm (GitHub Pages)
// Tüm veri tarayıcıda yüklenir ve istemci tarafında filtrelenir.

const MODE_STYLE = {
  bus: { label: 'Otobüs', color: '#0071e3' },
  metro: { label: 'Metro', color: '#e30a17' },
  marmaray: { label: 'Marmaray', color: '#008c95' },
  tram: { label: 'Tramvay', color: '#af52de' },
  funicular: { label: 'Füniküler', color: '#ff9500' },
  cablecar: { label: 'Teleferik', color: '#a2845e' },
  ferry: { label: 'Vapur', color: '#004f9f' },
  minibus: { label: 'Minibüs', color: '#34c759' }
};

const KART_COLOR = '#ff2d55';
const DENSE_MODES = new Set(['bus', 'minibus']);
const DENSE_MIN_ZOOM = 13;

const state = {
  map: null,
  allStops: [],
  kartAll: null,
  selectedModes: new Set(['metro', 'marmaray', 'tram', 'ferry']),
  showKart: false,
  searchResults: null,
  moveTimer: null
};

const els = {
  search: document.getElementById('search'),
  modeFilters: document.getElementById('mode-filters'),
  chipKart: document.getElementById('chip-istanbulkart'),
  stats: document.getElementById('stats'),
  list: document.getElementById('location-list'),
  zoomHint: document.getElementById('zoom-hint')
};

init();

async function init() {
  state.map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap katkıda bulunanlar'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center: [28.97953, 41.015137],
    zoom: 11
  });

  state.map.addControl(new maplibregl.NavigationControl(), 'top-right');
  state.map.addControl(
    new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true
    }),
    'top-right'
  );

  state.map.on('load', async () => {
    setupLayers();
    await loadTransitData();
    refreshView();
  });

  state.map.on('moveend', () => {
    clearTimeout(state.moveTimer);
    state.moveTimer = setTimeout(refreshView, 200);
  });

  document.getElementById('btn-search').addEventListener('click', doSearch);
  document.getElementById('btn-nearby').addEventListener('click', locateNearby);
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  els.search.addEventListener('input', () => {
    if (!els.search.value.trim()) {
      state.searchResults = null;
      refreshView();
    }
  });
  els.chipKart.addEventListener('click', async () => {
    state.showKart = !state.showKart;
    els.chipKart.classList.toggle('active', state.showKart);
    if (state.showKart && !state.kartAll) await loadKartData();
    refreshView();
  });
}

async function loadTransitData() {
  els.stats.textContent = 'Toplu taşıma verisi yükleniyor...';
  const res = await fetch('transit.json');
  if (!res.ok) {
    els.stats.textContent = 'Veri yüklenemedi.';
    return;
  }
  const data = await res.json();
  state.allStops = data.stops;

  const summary = data.summary || {};
  els.modeFilters.innerHTML = '';
  Object.entries(MODE_STYLE).forEach(([mode, style]) => {
    const count = summary[mode];
    if (!count) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${state.selectedModes.has(mode) ? 'active' : ''}`;
    chip.innerHTML = `<span class="dot" style="background:${style.color}"></span>${style.label} <small>${count.toLocaleString('tr-TR')}</small>`;
    chip.addEventListener('click', () => {
      if (state.selectedModes.has(mode)) state.selectedModes.delete(mode);
      else state.selectedModes.add(mode);
      chip.classList.toggle('active');
      refreshView();
    });
    els.modeFilters.appendChild(chip);
  });
}

async function loadKartData() {
  els.stats.textContent = 'İstanbulkart verisi yükleniyor...';
  const res = await fetch('locations.json');
  if (!res.ok) return;
  const data = await res.json();
  state.kartAll = data.locations;
}

function setupLayers() {
  state.map.addSource('stops', { type: 'geojson', data: emptyGeoJSON() });
  state.map.addSource('kart', { type: 'geojson', data: emptyGeoJSON() });

  state.map.addLayer({
    id: 'stops-circles',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6, 17, 9],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff'
    }
  });

  state.map.addLayer({
    id: 'kart-circles',
    type: 'circle',
    source: 'kart',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6, 17, 9],
      'circle-color': KART_COLOR,
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#ffffff'
    }
  });

  for (const layerId of ['stops-circles', 'kart-circles']) {
    state.map.on('click', layerId, (e) => {
      const props = e.features[0].properties;
      new maplibregl.Popup({ offset: 8 })
        .setLngLat(e.features[0].geometry.coordinates)
        .setHTML(popupHTML(props))
        .addTo(state.map);
    });
    state.map.on('mouseenter', layerId, () => {
      state.map.getCanvas().style.cursor = 'pointer';
    });
    state.map.on('mouseleave', layerId, () => {
      state.map.getCanvas().style.cursor = '';
    });
  }
}

function popupHTML(props) {
  const rows = [`<strong>${props.name}</strong>`];
  if (props.modeLabel) rows.push(props.modeLabel);
  if (props.line && props.line !== 'null') rows.push(props.line);
  if (props.direction && props.direction !== 'null') rows.push(`Yön: ${props.direction}`);
  if (props.code && props.code !== 'null') rows.push(`Durak kodu: ${props.code}`);
  if (props.district && props.district !== 'null') rows.push(props.district);
  return `<div class="popup">${rows.join('<br>')}</div>`;
}

function emptyGeoJSON() {
  return { type: 'FeatureCollection', features: [] };
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
  for (const stop of state.allStops) {
    if (!state.selectedModes.has(stop.mode)) continue;
    if (DENSE_MODES.has(stop.mode) && zoom < DENSE_MIN_ZOOM) continue;
    if (stop.lng < west || stop.lng > east || stop.lat < south || stop.lat > north) continue;
    results.push(stop);
    if (results.length >= 4000) break;
  }
  return results;
}

function visibleKart() {
  if (!state.showKart || !state.kartAll) return [];
  const bounds = state.map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const zoom = state.map.getZoom();
  if (zoom < DENSE_MIN_ZOOM - 1) return [];

  const results = [];
  for (const loc of state.kartAll) {
    if (loc.lng < west || loc.lng > east || loc.lat < south || loc.lat > north) continue;
    results.push(loc);
    if (results.length >= 2000) break;
  }
  return results;
}

function refreshView() {
  const stops = visibleStops();
  const kart = visibleKart();

  state.map.getSource('stops').setData(stopsToGeoJSON(stops));
  state.map.getSource('kart').setData(kartToGeoJSON(kart));

  const total = stops.length + kart.length;
  els.stats.textContent = state.searchResults
    ? `Arama: ${stops.length.toLocaleString('tr-TR')} sonuç`
    : `Görünümde ${total.toLocaleString('tr-TR')} nokta`;
  renderList([...stops.slice(0, 60), ...kart.slice(0, 20)]);
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
        code: stop.code || null
      }
    }))
  };
}

function kartToGeoJSON(locations) {
  return {
    type: 'FeatureCollection',
    features: locations.map((loc) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: {
        name: loc.type,
        modeLabel: 'İstanbulkart Dolum',
        district: loc.district
      }
    }))
  };
}

function renderList(items) {
  els.list.innerHTML = '';
  items.forEach((item) => {
    const isKart = !item.mode;
    const style = isKart
      ? { label: 'İstanbulkart', color: KART_COLOR }
      : MODE_STYLE[item.mode] || { label: item.mode, color: '#8e8e93' };

    const card = document.createElement('article');
    card.className = 'location-card';
    card.innerHTML = `
      <span class="badge" style="background:${style.color}1a;color:${style.color}">${style.label}</span>
      <h3>${item.name || item.district}</h3>
      <div class="meta">
        ${item.line ? `<div>${item.line}</div>` : ''}
        ${item.direction ? `<div>Yön: ${item.direction}</div>` : ''}
        ${item.code ? `<div>Durak kodu: ${item.code}</div>` : ''}
        ${item.distanceKm != null ? `<div>${item.distanceKm.toFixed(2)} km</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      state.map.flyTo({ center: [item.lng, item.lat], zoom: 16 });
    });
    els.list.appendChild(card);
  });
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
  for (const stop of state.allStops) {
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

  if (results.length) {
    const bounds = new maplibregl.LngLatBounds();
    results.forEach((s) => bounds.extend([s.lng, s.lat]));
    state.map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
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

function locateNearby() {
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum servisini desteklemiyor.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const nearby = state.allStops
        .filter((s) => !state.selectedModes.size || state.selectedModes.has(s.mode))
        .map((s) => ({ ...s, distanceKm: haversineKm(latitude, longitude, s.lat, s.lng) }))
        .filter((s) => s.distanceKm <= 1)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 100);

      state.searchResults = nearby;
      refreshView();
      els.stats.textContent = `1 km içinde ${nearby.length} durak`;
      state.map.flyTo({ center: [longitude, latitude], zoom: 15 });
    },
    () => alert('Konum izni verilmedi.')
  );
}
