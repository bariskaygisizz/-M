const MODE_STYLE = {
  bus: { label: 'Otobüs', color: '#0071e3', icon: 'B' },
  metro: { label: 'Metro', color: '#e30a17', icon: 'M' },
  marmaray: { label: 'Marmaray', color: '#008c95', icon: 'MR' },
  tram: { label: 'Tramvay', color: '#af52de', icon: 'T' },
  funicular: { label: 'Füniküler', color: '#ff9500', icon: 'F' },
  cablecar: { label: 'Teleferik', color: '#a2845e', icon: 'TF' },
  ferry: { label: 'Vapur', color: '#004f9f', icon: 'V' },
  minibus: { label: 'Minibüs', color: '#34c759', icon: 'D' }
};

const KART_COLOR = '#ff2d55';

// Otobüs/minibüs çok yoğun: ancak yakınlaştırınca görünür
const DENSE_MODES = new Set(['bus', 'minibus']);
const DENSE_MIN_ZOOM = 13;

const state = {
  map: null,
  selectedModes: new Set(['metro', 'marmaray', 'tram', 'ferry']),
  showKart: false,
  stops: [],
  kartLocations: [],
  userCoord: null,
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

  state.map.on('load', () => {
    setupLayers();
    loadMeta();
    refreshStops();
  });

  state.map.on('moveend', () => {
    clearTimeout(state.moveTimer);
    state.moveTimer = setTimeout(refreshStops, 250);
  });

  document.getElementById('btn-search').addEventListener('click', searchStops);
  document.getElementById('btn-nearby').addEventListener('click', locateNearby);
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchStops();
  });
  els.chipKart.addEventListener('click', () => {
    state.showKart = !state.showKart;
    els.chipKart.classList.toggle('active', state.showKart);
    refreshStops();
  });
}

function setupLayers() {
  state.map.addSource('stops', {
    type: 'geojson',
    data: emptyGeoJSON()
  });
  state.map.addSource('kart', {
    type: 'geojson',
    data: emptyGeoJSON()
  });

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
  const rows = [];
  rows.push(`<strong>${props.name}</strong>`);
  if (props.modeLabel) rows.push(props.modeLabel);
  if (props.line && props.line !== 'null') rows.push(props.line);
  if (props.direction && props.direction !== 'null') rows.push(`Yön: ${props.direction}`);
  if (props.code && props.code !== 'null') rows.push(`Durak kodu: ${props.code}`);
  if (props.district && props.district !== 'null') rows.push(props.district);
  if (props.address && props.address !== 'null') rows.push(props.address);
  return `<div class="popup">${rows.join('<br>')}</div>`;
}

function emptyGeoJSON() {
  return { type: 'FeatureCollection', features: [] };
}

async function loadMeta() {
  try {
    const res = await fetch('/api/transit/meta');
    if (!res.ok) throw new Error('Toplu taşıma verisi yüklenemedi');
    const meta = await res.json();

    els.modeFilters.innerHTML = '';
    Object.entries(MODE_STYLE).forEach(([mode, style]) => {
      const count = meta.summary[mode];
      if (!count) return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `chip ${state.selectedModes.has(mode) ? 'active' : ''}`;
      chip.innerHTML = `<span class="dot" style="background:${style.color}"></span>${style.label} <small>${count.toLocaleString('tr-TR')}</small>`;
      chip.addEventListener('click', () => {
        if (state.selectedModes.has(mode)) state.selectedModes.delete(mode);
        else state.selectedModes.add(mode);
        chip.classList.toggle('active');
        refreshStops();
      });
      els.modeFilters.appendChild(chip);
    });
  } catch (error) {
    els.stats.textContent = error.message;
  }
}

function currentBBox() {
  const bounds = state.map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',');
}

async function refreshStops() {
  const zoom = state.map.getZoom();
  const activeModes = [...state.selectedModes].filter(
    (mode) => !DENSE_MODES.has(mode) || zoom >= DENSE_MIN_ZOOM
  );
  const hiddenDense = [...state.selectedModes].some(
    (mode) => DENSE_MODES.has(mode) && zoom < DENSE_MIN_ZOOM
  );
  els.zoomHint.classList.toggle('hidden', !hiddenDense);

  try {
    let stops = [];
    if (activeModes.length) {
      const params = new URLSearchParams({
        mode: activeModes.join(','),
        bbox: currentBBox(),
        limit: '3000'
      });
      const res = await fetch(`/api/transit/stops?${params}`);
      if (res.ok) {
        stops = (await res.json()).stops;
      }
    }
    state.stops = stops;
    state.map.getSource('stops').setData(stopsToGeoJSON(stops));

    let kart = [];
    if (state.showKart) {
      const params = new URLSearchParams({ limit: '1000' });
      const kartRes = await fetch(`/api/locations?${params}`);
      if (kartRes.ok) {
        const bounds = state.map.getBounds();
        kart = (await kartRes.json()).locations.filter(
          (l) =>
            l.lng >= bounds.getWest() && l.lng <= bounds.getEast() &&
            l.lat >= bounds.getSouth() && l.lat <= bounds.getNorth()
        );
      }
    }
    state.kartLocations = kart;
    state.map.getSource('kart').setData(kartToGeoJSON(kart));

    const total = stops.length + kart.length;
    els.stats.textContent = `Görünümde ${total.toLocaleString('tr-TR')} nokta`;
    renderList([...stops.slice(0, 60), ...kart.slice(0, 20)]);
  } catch (error) {
    els.stats.textContent = error.message;
  }
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
        district: loc.district,
        address: loc.address || null
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
        ${item.address ? `<div>${item.address}</div>` : ''}
        ${item.distanceKm != null ? `<div>${item.distanceKm.toFixed(2)} km</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => {
      state.map.flyTo({ center: [item.lng, item.lat], zoom: 16 });
    });
    els.list.appendChild(card);
  });
}

async function searchStops() {
  const query = els.search.value.trim();
  if (!query) {
    refreshStops();
    return;
  }
  const params = new URLSearchParams({ q: query, limit: '100' });
  if (state.selectedModes.size) params.set('mode', [...state.selectedModes].join(','));

  const res = await fetch(`/api/transit/stops?${params}`);
  if (!res.ok) return;
  const data = await res.json();
  state.stops = data.stops;
  state.map.getSource('stops').setData(stopsToGeoJSON(data.stops));
  els.stats.textContent = `"${query}" için ${data.total.toLocaleString('tr-TR')} sonuç`;
  renderList(data.stops.slice(0, 80));

  if (data.stops.length) {
    const bounds = new maplibregl.LngLatBounds();
    data.stops.forEach((s) => bounds.extend([s.lng, s.lat]));
    state.map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }
}

function locateNearby() {
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum servisini desteklemiyor.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      state.userCoord = pos.coords;
      const params = new URLSearchParams({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radiusKm: '1',
        limit: '100'
      });
      if (state.selectedModes.size) params.set('mode', [...state.selectedModes].join(','));

      const res = await fetch(`/api/transit/stops?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      renderList(data.stops);
      els.stats.textContent = `1 km içinde ${data.total} durak`;
      state.map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
    },
    () => alert('Konum izni verilmedi.')
  );
}
