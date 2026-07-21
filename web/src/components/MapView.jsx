import { useEffect, useMemo } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';

function aircraftSvg(category, heading, selected) {
  const fill = selected ? '#ffd166' : category === 'helicopter' ? '#3ecf8e' : '#5eb8ff';
  const stroke = selected ? '#1a1a1a' : '#0b1c2c';

  if (category === 'helicopter') {
    return `
      <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg"
        style="transform: rotate(${heading}deg)">
        <g fill="${fill}" stroke="${stroke}" stroke-width="1.2">
          <ellipse cx="17" cy="17" rx="5" ry="7"/>
          <rect x="5" y="15.5" width="24" height="2.2" rx="1"/>
          <rect x="15.5" y="23" width="3" height="6" rx="1"/>
          <rect x="12" y="28" width="10" height="2" rx="1"/>
        </g>
      </svg>`;
  }

  return `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg"
      style="transform: rotate(${heading}deg)">
      <path d="M18 3 L22 14 L33 16 L22 18 L20 30 L18 27 L16 30 L14 18 L3 16 L14 14 Z"
        fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>`;
}

function createAircraftIcon(category, heading, selected) {
  return L.divIcon({
    className: `ac-icon ${selected ? 'selected' : ''}`,
    html: aircraftSvg(category, heading, selected),
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function createHomeIcon() {
  return L.divIcon({
    className: 'home-icon',
    html: `<div class="home-pin" title="Ev"><span></span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function MapController({ home, selected, followSelected, pickHomeMode, onPickHome }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (pickHomeMode) onPickHome?.(e.latlng.lat, e.latlng.lng);
    }
  });

  useEffect(() => {
    if (home?.lat != null) {
      map.setView([home.lat, home.lng], map.getZoom() || 10, { animate: true });
    }
    // only re-center when home coordinates change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home?.lat, home?.lng]);

  useEffect(() => {
    if (followSelected && selected?.lat != null) {
      map.panTo([selected.lat, selected.lng], { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followSelected, selected?.lat, selected?.lng, selected?.id]);

  return null;
}

export default function MapView({
  home,
  radiusKm,
  wideRadiusKm = 0,
  flights,
  selectedId,
  onSelect,
  pickHomeMode,
  onPickHome,
  followSelected
}) {
  const selected = useMemo(
    () => flights.find((f) => f.id === selectedId) || null,
    [flights, selectedId]
  );

  const center = home ? [home.lat, home.lng] : [41.0082, 28.9784];

  return (
    <MapContainer center={center} zoom={10} className="map-container" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapController
        home={home}
        selected={selected}
        followSelected={followSelected}
        pickHomeMode={pickHomeMode}
        onPickHome={onPickHome}
      />

      {home && (
        <>
          <Circle
            center={[home.lat, home.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#5eb8ff',
              weight: 1.5,
              dashArray: '6 8',
              fillColor: '#5eb8ff',
              fillOpacity: 0.06
            }}
          />
          {wideRadiusKm > radiusKm && (
            <Circle
              center={[home.lat, home.lng]}
              radius={wideRadiusKm * 1000}
              pathOptions={{
                color: '#3ecf8e',
                weight: 1,
                dashArray: '2 10',
                fillColor: '#3ecf8e',
                fillOpacity: 0.03
              }}
            />
          )}
          <Marker position={[home.lat, home.lng]} icon={createHomeIcon()}>
            <Popup>
              <strong>{home.name || 'Ev'}</strong>
              <br />
              {home.lat.toFixed(5)}, {home.lng.toFixed(5)}
            </Popup>
          </Marker>
        </>
      )}

      {flights.map((ac) => {
        const isSelected = ac.id === selectedId;
        return (
          <Marker
            key={ac.id}
            position={[ac.lat, ac.lng]}
            icon={createAircraftIcon(ac.category, ac.heading, isSelected)}
            eventHandlers={{ click: () => onSelect(ac.id) }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              <span className="tip">
                <strong>{ac.callsign}</strong> · {ac.groundSpeedKmh} km/s · {ac.groundDistanceKm} km
              </span>
            </Tooltip>
          </Marker>
        );
      })}

      {selected?.trail?.length > 1 && (
        <Polyline
          positions={selected.trail.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#ffd166', weight: 2.5, opacity: 0.85 }}
        />
      )}

      {selected && home && (
        <Polyline
          positions={[
            [home.lat, home.lng],
            [selected.lat, selected.lng]
          ]}
          pathOptions={{ color: '#ff8a5c', weight: 1.5, dashArray: '4 6', opacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}
