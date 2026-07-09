import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TYPE_COLORS = {
  Biletmatik: '#2563eb',
  'Biletmatik 4': '#7c3aed',
  'Bayi / Dolum Noktası': '#16a34a',
  'Dolum Merkezi': '#ea580c',
  Diğer: '#6b7280'
};

function badgeClass(type) {
  if (type === 'Biletmatik') return 'badge badge-biletmatik';
  if (type === 'Biletmatik 4') return 'badge badge-biletmatik4';
  if (type === 'Dolum Merkezi') return 'badge badge-dolum';
  return 'badge badge-bayi';
}

export default function App() {
  const [meta, setMeta] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['Biletmatik', 'Biletmatik 4']);
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTypes.length) params.set('type', selectedTypes.join(','));
      if (district) params.set('district', district);
      if (query) params.set('q', query);
      if (nearbyOnly && userLocation) {
        params.set('lat', String(userLocation.lat));
        params.set('lng', String(userLocation.lng));
        params.set('radiusKm', '3');
        params.set('limit', '300');
      } else {
        params.set('limit', '500');
      }

      const [metaRes, locRes] = await Promise.all([
        fetch(`${API_BASE}/meta`),
        fetch(`${API_BASE}/locations?${params}`)
      ]);

      if (!metaRes.ok || !locRes.ok) {
        throw new Error('API bağlantısı kurulamadı. Sunucunun çalıştığından emin olun.');
      }

      const metaJson = await metaRes.json();
      const locJson = await locRes.json();
      setMeta(metaJson);
      setLocations(locJson.locations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, district, query, nearbyOnly, userLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyOnly(true);
      },
      () => setError('Konum izni verilmedi.')
    );
  };

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId) || null,
    [locations, selectedId]
  );

  if (error && !meta) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>İstanbul Kart Harita</h1>
          <p>Biletmatik ve dolum noktalarını haritada keşfedin</p>
        </div>

        <div className="controls">
          <div>
            <label htmlFor="search">Ara</label>
            <input
              id="search"
              placeholder="İlçe, adres veya terminal no..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="district">İlçe</label>
            <select id="district" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">Tüm ilçeler</option>
              {(meta?.districts || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Nokta tipi</label>
            <div className="type-filters">
              {(meta?.types || ['Biletmatik', 'Biletmatik 4', 'Bayi / Dolum Noktası', 'Dolum Merkezi']).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    className={`type-chip ${selectedTypes.includes(type) ? 'active' : ''}`}
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={fetchLocations}>
              Filtrele
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleLocateMe}>
              Yakınımdakiler
            </button>
          </div>
        </div>

        <div className="stats">
          {loading ? 'Yükleniyor...' : `${locations.length} nokta listeleniyor`}
          {meta?.updatedAt && (
            <div>Güncelleme: {new Date(meta.updatedAt).toLocaleDateString('tr-TR')}</div>
          )}
        </div>

        <div className="location-list">
          {locations.map((loc) => (
            <article
              key={loc.id}
              className={`location-card ${selectedId === loc.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(loc.id)}
            >
              <span className={badgeClass(loc.type)}>{loc.type}</span>
              <h3>{loc.district}</h3>
              <div className="meta">
                {loc.address && <div>{loc.address}</div>}
                {loc.terminalId && <div>Terminal: {loc.terminalId}</div>}
                {loc.distanceKm != null && <div>{loc.distanceKm.toFixed(2)} km uzaklıkta</div>}
              </div>
            </article>
          ))}
        </div>

        <div className="footer-note">
          Veri kaynağı: İBB Açık Veri Portalı — BELBİM İstanbulkart Dolum Merkezi Bilgileri
        </div>
      </aside>

      <main className="map-panel">
        <MapView
          locations={locations}
          selectedLocation={selectedLocation}
          userLocation={userLocation}
          typeColors={TYPE_COLORS}
          onSelect={setSelectedId}
        />
      </main>
    </div>
  );
}
