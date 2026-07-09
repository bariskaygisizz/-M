const TYPE_COLORS = {
  'Biletmatik': '#0071e3',
  'Biletmatik 4': '#5856d6',
  'Bayi / Dolum Noktası': '#34c759',
  'Dolum Merkezi': '#ff9500',
  'Diğer': '#8e8e93'
};

const state = {
  meta: null,
  locations: [],
  selectedTypes: new Set(['Biletmatik', 'Biletmatik 4']),
  selectedId: null,
  map: null,
  annotations: [],
  userCoordinate: null,
  mapKitReady: false
};

const els = {
  search: document.getElementById('search'),
  district: document.getElementById('district'),
  typeFilters: document.getElementById('type-filters'),
  stats: document.getElementById('stats'),
  list: document.getElementById('location-list'),
  map: document.getElementById('map'),
  mapFallback: document.getElementById('map-fallback')
};

window.initMapKit = function initMapKit() {
  state.mapKitReady = true;
  bootstrap();
};

async function bootstrap() {
  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();

    if (config.mapKitJSTokenConfigured && window.mapkit) {
      mapkit.init({
        authorizationCallback: (done) => done(config.mapKitJSKey)
      });
      state.map = new mapkit.Map('map', {
        center: new mapkit.Coordinate(41.015137, 28.97953),
        region: new mapkit.CoordinateRegion(
          new mapkit.Coordinate(41.015137, 28.97953),
          new mapkit.CoordinateSpan(0.25, 0.25)
        ),
        showsUserLocation: true,
        showsUserLocationControl: true
      });
    } else {
      showMapFallback();
    }

    await loadMeta();
    await loadLocations();
    bindEvents();
  } catch (error) {
    els.stats.textContent = error.message;
    showMapFallback();
  }
}

function showMapFallback() {
  els.mapFallback.classList.remove('hidden');
}

function bindEvents() {
  document.getElementById('btn-filter').addEventListener('click', loadLocations);
  document.getElementById('btn-nearby').addEventListener('click', locateNearby);
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadLocations();
  });
}

async function loadMeta() {
  const res = await fetch('/api/meta');
  if (!res.ok) throw new Error('Meta verisi alınamadı');
  state.meta = await res.json();

  els.district.innerHTML = '<option value="">Tüm ilçeler</option>';
  state.meta.districts.forEach((district) => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    els.district.appendChild(option);
  });

  els.typeFilters.innerHTML = '';
  state.meta.types.forEach((type) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${state.selectedTypes.has(type) ? 'active' : ''}`;
    chip.textContent = type;
    chip.addEventListener('click', () => {
      if (state.selectedTypes.has(type)) state.selectedTypes.delete(type);
      else state.selectedTypes.add(type);
      chip.classList.toggle('active');
    });
    els.typeFilters.appendChild(chip);
  });
}

async function loadLocations() {
  const params = new URLSearchParams();
  if (state.selectedTypes.size) params.set('type', [...state.selectedTypes].join(','));
  if (els.district.value) params.set('district', els.district.value);
  if (els.search.value.trim()) params.set('q', els.search.value.trim());
  if (state.userCoordinate) {
    params.set('lat', state.userCoordinate.latitude);
    params.set('lng', state.userCoordinate.longitude);
    params.set('radiusKm', '3');
    params.set('limit', '300');
  } else {
    params.set('limit', '500');
  }

  const res = await fetch(`/api/locations?${params}`);
  if (!res.ok) throw new Error('Konum verisi alınamadı');
  const data = await res.json();
  state.locations = data.locations;
  renderList();
  renderMapAnnotations();
  els.stats.textContent = `${data.locations.length} nokta listeleniyor`;
}

function renderList() {
  els.list.innerHTML = '';
  state.locations.forEach((loc) => {
    const card = document.createElement('article');
    card.className = `location-card ${state.selectedId === loc.id ? 'selected' : ''}`;
    card.innerHTML = `
      <span class="badge">${loc.type}</span>
      <h3>${loc.district}</h3>
      <div class="meta">
        ${loc.address ? `<div>${loc.address}</div>` : ''}
        ${loc.terminalId ? `<div>Terminal: ${loc.terminalId}</div>` : ''}
        ${loc.distanceKm != null ? `<div>${loc.distanceKm.toFixed(2)} km</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => selectLocation(loc));
    els.list.appendChild(card);
  });
}

function selectLocation(loc) {
  state.selectedId = loc.id;
  renderList();
  if (state.map) {
    state.map.setCenterAnimated(new mapkit.Coordinate(loc.lat, loc.lng));
    state.map.region = new mapkit.CoordinateRegion(
      new mapkit.Coordinate(loc.lat, loc.lng),
      new mapkit.CoordinateSpan(0.02, 0.02)
    );
  }
}

function renderMapAnnotations() {
  if (!state.map) return;
  state.map.removeAnnotations(state.annotations);
  state.annotations = state.locations.map((loc) => {
    const annotation = new mapkit.MarkerAnnotation(
      new mapkit.Coordinate(loc.lat, loc.lng),
      {
        title: loc.type,
        subtitle: `${loc.district}${loc.terminalId ? ' • ' + loc.terminalId : ''}`,
        color: TYPE_COLORS[loc.type] || '#8e8e93'
      }
    );
    annotation.addEventListener('select', () => selectLocation(loc));
    return annotation;
  });
  state.map.addAnnotations(state.annotations);
}

function locateNearby() {
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum servisini desteklemiyor.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userCoordinate = pos.coords;
      loadLocations();
      if (state.map) {
        state.map.setCenterAnimated(new mapkit.Coordinate(pos.coords.latitude, pos.coords.longitude));
      }
    },
    () => alert('Konum izni verilmedi.')
  );
}

if (!window.initMapKit) {
  setTimeout(() => {
    if (!state.mapKitReady) bootstrap();
  }, 2500);
}
