import { useCallback, useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';
import {
  categoryLabel,
  compassLabel,
  fetchAbout,
  fetchFlights,
  formatRoute,
  getHome,
  phaseLabel,
  setHome,
  zoneLabel
} from './lib/api';

const POLL_MS = 1200;

export default function App() {
  const [home, setHomeState] = useState(null);
  const [radiusKm, setRadiusKm] = useState(80);
  const [wideRadiusKm, setWideRadiusKm] = useState(900);
  const [scope, setScope] = useState('both');
  const [mode, setMode] = useState('simulation');
  const [category, setCategory] = useState('all');
  const [flights, setFlights] = useState([]);
  const [nearCount, setNearCount] = useState(0);
  const [farCount, setFarCount] = useState(0);
  const [dataMode, setDataMode] = useState('simulation');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pickHomeMode, setPickHomeMode] = useState(false);
  const [followSelected, setFollowSelected] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [showAbout, setShowAbout] = useState(false);
  const [about, setAbout] = useState(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(true);

  const loadConfig = useCallback(async () => {
    const cfg = await getHome();
    setHomeState(cfg.home);
    setRadiusKm(cfg.radiusKm);
    setWideRadiusKm(cfg.wideRadiusKm || 900);
    setScope(cfg.scope || 'both');
    setMode(cfg.mode || 'simulation');
  }, []);

  const loadFlights = useCallback(async () => {
    try {
      const data = await fetchFlights({ mode, radiusKm, wideRadiusKm, scope, category });
      setFlights(data.flights || []);
      setNearCount(data.nearCount || 0);
      setFarCount(data.farCount || 0);
      setDataMode(data.mode);
      setUpdatedAt(data.updatedAt);
      setHomeState(data.home);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, radiusKm, wideRadiusKm, scope, category]);

  useEffect(() => {
    loadConfig().catch((err) => setError(err.message));
  }, [loadConfig]);

  useEffect(() => {
    loadFlights();
    const id = setInterval(loadFlights, mode === 'live' ? 5000 : POLL_MS);
    return () => clearInterval(id);
  }, [loadFlights, mode]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedId && !flights.some((f) => f.id === selectedId)) {
      setSelectedId(null);
      setFollowSelected(false);
    }
  }, [flights, selectedId]);

  const selected = useMemo(
    () => flights.find((f) => f.id === selectedId) || null,
    [flights, selectedId]
  );

  const persistHome = async (payload) => {
    const cfg = await setHome(payload);
    setHomeState(cfg.home);
    setRadiusKm(cfg.radiusKm);
    setWideRadiusKm(cfg.wideRadiusKm || wideRadiusKm);
    setScope(cfg.scope || scope);
    setMode(cfg.mode);
    setPickHomeMode(false);
    await loadFlights();
  };

  const handleLocateHome = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await persistHome({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altM: pos.coords.altitude || 40,
            name: 'Evim'
          });
        } catch (err) {
          setError(err.message);
        }
      },
      () => setError('Konum izni verilmedi.')
    );
  };

  const handlePickHome = async (lat, lng) => {
    try {
      await persistHome({ lat, lng, name: 'Ev' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRadius = async (value) => {
    const next = Number(value);
    setRadiusKm(next);
    try {
      await setHome({ radiusKm: next });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWideRadius = async (value) => {
    const next = Number(value);
    setWideRadiusKm(next);
    try {
      await setHome({ wideRadiusKm: next });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMode = async (next) => {
    setMode(next);
    try {
      await setHome({ mode: next });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScope = async (next) => {
    setScope(next);
    try {
      await setHome({ scope: next });
    } catch (err) {
      setError(err.message);
    }
  };

  const openAbout = async () => {
    setShowAbout(true);
    if (!about) {
      try {
        setAbout(await fetchAbout());
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const planes = flights.filter((f) => f.category === 'plane').length;
  const helis = flights.filter((f) => f.category === 'helicopter').length;
  const mapWide = scope === 'near' ? radiusKm : wideRadiusKm;

  return (
    <div className={`app ${pickHomeMode ? 'picking' : ''}`}>
      <div className="sky-glow" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <h1>SkyWatch</h1>
            <p>Ev + bölgesel uçuş takibi</p>
          </div>
        </div>

        <div className="top-meta">
          <button type="button" className="about-btn" onClick={openAbout}>
            Ne işe yarar?
          </button>
          <span className={`live-dot ${dataMode.includes('simulation') ? 'sim' : 'live'}`} />
          <span>
            {dataMode === 'opensky'
              ? 'Canlı ADS-B'
              : dataMode === 'simulation-fallback'
                ? 'Simülasyon (yedek)'
                : 'Simülasyon'}
          </span>
          <span className="sep">·</span>
          <time>{clock.toLocaleTimeString('tr-TR')}</time>
        </div>
      </header>

      <main className="stage">
        <section className="map-stage">
          {home && (
            <MapView
              home={home}
              radiusKm={radiusKm}
              wideRadiusKm={mapWide}
              flights={flights}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setMobileSheetOpen(true);
              }}
              pickHomeMode={pickHomeMode}
              onPickHome={handlePickHome}
              followSelected={followSelected}
            />
          )}

          <div className="hud-left">
            <div className={`hud-panel controls-panel ${controlsCollapsed ? 'collapsed' : ''}`}>
              <label className="field">
                <span className="mobile-toggle-row">
                  Kapsam
                  <button
                    type="button"
                    className="about-btn"
                    onClick={() => setControlsCollapsed((v) => !v)}
                  >
                    {controlsCollapsed ? 'Aç' : 'Gizle'}
                  </button>
                </span>
                <div className="seg">
                  {[
                    ['near', 'Ev'],
                    ['both', 'İkisi'],
                    ['wide', 'Bölge']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={scope === value ? 'on' : ''}
                      onClick={() => handleScope(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="field">
                <span>Mod</span>
                <div className="seg">
                  <button
                    type="button"
                    className={mode === 'simulation' ? 'on' : ''}
                    onClick={() => handleMode('simulation')}
                  >
                    Simülasyon
                  </button>
                  <button
                    type="button"
                    className={mode === 'live' ? 'on' : ''}
                    onClick={() => handleMode('live')}
                  >
                    Canlı
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Tür</span>
                <div className="seg">
                  {[
                    ['all', 'Tümü'],
                    ['plane', 'Uçak'],
                    ['helicopter', 'Helikopter']
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={category === value ? 'on' : ''}
                      onClick={() => setCategory(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="field">
                <span>Ev yarıçapı: {radiusKm} km</span>
                <input
                  type="range"
                  min="15"
                  max="250"
                  step="5"
                  value={radiusKm}
                  onChange={(e) => handleRadius(e.target.value)}
                />
              </label>

              {scope !== 'near' && (
                <label className="field">
                  <span>Bölge yarıçapı: {wideRadiusKm} km</span>
                  <input
                    type="range"
                    min="200"
                    max="1200"
                    step="50"
                    value={wideRadiusKm}
                    onChange={(e) => handleWideRadius(e.target.value)}
                  />
                </label>
              )}

              <div className="btn-row">
                <button type="button" className="btn" onClick={handleLocateHome}>
                  Konumumu ev yap
                </button>
                <button
                  type="button"
                  className={`btn ghost ${pickHomeMode ? 'active' : ''}`}
                  onClick={() => setPickHomeMode((v) => !v)}
                >
                  {pickHomeMode ? 'Haritadan seç…' : 'Haritadan ev seç'}
                </button>
              </div>
            </div>

            <div className="hud-panel stats-panel four">
              <div className="stat">
                <strong>{loading ? '—' : flights.length}</strong>
                <span>toplam</span>
              </div>
              <div className="stat">
                <strong>{nearCount}</strong>
                <span>yakın</span>
              </div>
              <div className="stat">
                <strong>{farCount}</strong>
                <span>uzak</span>
              </div>
              <div className="stat">
                <strong>{planes}/{helis}</strong>
                <span>uçak/heli</span>
              </div>
            </div>
          </div>

          {pickHomeMode && (
            <div className="pick-banner">Haritada yeni ev konumuna tıklayın</div>
          )}

          {error && <div className="toast error">{error}</div>}
        </section>

        <aside className={`side ${mobileSheetOpen ? 'open' : ''}`}>
          <div
            className="side-head"
            onClick={() => setMobileSheetOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setMobileSheetOpen((v) => !v);
            }}
            role="button"
            tabIndex={0}
            aria-expanded={mobileSheetOpen}
          >
            <h2>Trafik listesi · {loading ? '…' : flights.length}</h2>
            <p>
              {home
                ? `${home.name} · yakın ${radiusKm} km · bölge ${wideRadiusKm} km · dokunarak aç`
                : 'Yükleniyor…'}
            </p>
          </div>

          <div className="flight-list">
            {flights.map((ac) => (
              <button
                key={ac.id}
                type="button"
                className={`flight-item ${selectedId === ac.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(ac.id)}
              >
                <div className="fi-top">
                  <span className="badge-row">
                    <span className={`cat ${ac.category}`}>{categoryLabel(ac.category)}</span>
                    <span className={`zone ${ac.zone}`}>{zoneLabel(ac.zone)}</span>
                  </span>
                  <span className="dist">{ac.groundDistanceKm} km</span>
                </div>
                <strong className="callsign">{ac.callsign}</strong>
                <div className="fi-meta">{formatRoute(ac.origin, ac.destination)}</div>
                <div className="fi-metrics">
                  <span>{ac.groundSpeedKmh} km/s</span>
                  <span>{ac.altitudeFt.toLocaleString('tr-TR')} ft</span>
                  <span>{ac.heading}°</span>
                </div>
              </button>
            ))}
            {!loading && flights.length === 0 && (
              <div className="empty">Bu kapsamda trafik yok. Yarıçapı artırın.</div>
            )}
          </div>

          {selected && (
            <div className="detail-panel animate-in">
              <div className="detail-head">
                <div>
                  <span className="badge-row">
                    <span className={`cat ${selected.category}`}>
                      {categoryLabel(selected.category)}
                    </span>
                    <span className={`zone ${selected.zone}`}>{zoneLabel(selected.zone)}</span>
                  </span>
                  <h3>{selected.callsign}</h3>
                  <p>
                    {selected.airline} · {selected.aircraftType}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-close"
                  onClick={() => {
                    setSelectedId(null);
                    setFollowSelected(false);
                  }}
                  aria-label="Kapat"
                >
                  ×
                </button>
              </div>

              <div className="route-line">
                <div>
                  <small>Nereden</small>
                  <strong>{selected.origin.iata || selected.origin.city}</strong>
                  <span>{selected.origin.name}</span>
                </div>
                <div className="route-arrow" aria-hidden="true">
                  →
                </div>
                <div>
                  <small>Nereye</small>
                  <strong>{selected.destination.iata || selected.destination.city}</strong>
                  <span>{selected.destination.name}</span>
                </div>
              </div>

              <div className="metrics-grid">
                <div>
                  <small>Yer hızı</small>
                  <strong>{selected.groundSpeedKmh} km/s</strong>
                  <span>{selected.groundSpeedKt} kt</span>
                </div>
                <div>
                  <small>İrtifa</small>
                  <strong>{selected.altitudeFt.toLocaleString('tr-TR')} ft</strong>
                  <span>{selected.altitudeM.toLocaleString('tr-TR')} m</span>
                </div>
                <div>
                  <small>Eve yatay mesafe</small>
                  <strong>{selected.groundDistanceKm} km</strong>
                  <span>
                    {compassLabel(selected.bearingFromHome)} {selected.bearingFromHome}°
                  </span>
                </div>
                <div>
                  <small>3B mesafe</small>
                  <strong>{selected.distance3dKm} km</strong>
                  <span>eğik menzil</span>
                </div>
                <div>
                  <small>Yerden yükseklik</small>
                  <strong>{selected.heightAboveHomeM.toLocaleString('tr-TR')} m</strong>
                  <span>eve göre</span>
                </div>
                <div>
                  <small>Dikey hız</small>
                  <strong>
                    {selected.verticalSpeedFpm > 0 ? '+' : ''}
                    {selected.verticalSpeedFpm} fpm
                  </strong>
                  <span>{phaseLabel(selected.phase)}</span>
                </div>
              </div>

              <div className="privacy-note">
                <strong>Yolcular:</strong> Bilinemez. ADS-B yolcu listesi vermez; yalnızca uçak
                konum/kimlik yayınlar.
              </div>

              <div className="detail-actions">
                <button
                  type="button"
                  className={`btn ${followSelected ? 'on-btn' : ''}`}
                  onClick={() => setFollowSelected((v) => !v)}
                >
                  {followSelected ? 'Takibi bırak' : 'Canlı takip et'}
                </button>
                <div className="coords">
                  {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                </div>
              </div>
            </div>
          )}

          <footer className="side-foot">
            Açık kaynak · OpenSky ADS-B ·{' '}
            {updatedAt ? new Date(updatedAt).toLocaleTimeString('tr-TR') : '—'}
          </footer>
        </aside>
      </main>

      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)} role="presentation">
          <div
            className="about-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
          >
            <div className="about-head">
              <h2 id="about-title">SkyWatch ne işe yarar?</h2>
              <button type="button" className="icon-close" onClick={() => setShowAbout(false)}>
                ×
              </button>
            </div>
            {about ? (
              <div className="about-body">
                <p>{about.purpose}</p>

                <h3>Kimler kullanır?</h3>
                <ul>
                  {about.whoUses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3>Neden kullanır?</h3>
                <ul>
                  {about.whyUse.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3>Sen ne kazanırsın?</h3>
                <ul>
                  {about.whatYouGain.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3>Uçakta kimler var?</h3>
                <p className="warn-text">{about.passengers}</p>

                <h3>Ne göremezsin?</h3>
                <ul>
                  {about.whatYouCannot.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="about-body">Yükleniyor…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
