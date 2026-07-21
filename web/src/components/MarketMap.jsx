import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { STORE_COLORS, STORE_TYPE_LABELS } from '../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function createColoredIcon(color, size = 18, selected = false) {
  return L.divIcon({
    className: `custom-marker ${selected ? 'selected' : ''}`,
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;
      border-radius:50%;
      border:2px solid rgba(255,255,255,.92);
      box-shadow:0 0 0 ${selected ? 8 : 5}px rgba(20,184,166,.18), 0 0 24px ${color}, 0 8px 18px rgba(0,0,0,.45);
    "></div>`,
    iconSize: [size + 18, size + 18],
    iconAnchor: [(size + 18) / 2, (size + 18) / 2]
  });
}

function MapController({ focus, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (focus?.lat != null) {
      map.flyTo([focus.lat, focus.lng], focus.zoom || 14, { duration: 0.75 });
    }
  }, [focus, map]);

  useEffect(() => {
    if (userLocation && !focus) {
      map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 0.75 });
    }
  }, [userLocation, focus, map]);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);

  return null;
}

export default function MarketMap({
  stores = [],
  heatPoints = [],
  selectedId,
  userLocation,
  onSelect,
  focus
}) {
  const selected = stores.find((s) => s.id === selectedId);
  const center = selected
    ? [selected.lat, selected.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [41.015, 28.98];

  return (
    <MapContainer center={center} zoom={12} className="map-container" scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapController focus={focus || selected} userLocation={userLocation} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={10}
          pathOptions={{ color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: 0.95, weight: 3 }}
        >
          <Popup>Konumunuz</Popup>
        </CircleMarker>
      )}

      {heatPoints.map((p) => (
        <CircleMarker
          key={`heat-${p.id}`}
          center={[p.lat, p.lng]}
          radius={8 + Math.min(18, (p.subscriptions || 0) * 3)}
          pathOptions={{
            color: '#22d3ee',
            fillColor: '#14b8a6',
            fillOpacity: 0.22,
            weight: 2
          }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.district}
            <br />
            {p.subscriptions} abonelik · {p.orderCount} sipariş
          </Popup>
        </CircleMarker>
      ))}

      {stores.map((store) => (
        <Marker
          key={store.id}
          position={[store.lat, store.lng]}
          icon={createColoredIcon(
            STORE_COLORS[store.type] || '#14b8a6',
            selectedId === store.id ? 24 : 18,
            selectedId === store.id
          )}
          eventHandlers={{ click: () => onSelect?.(store.id) }}
        >
          <Popup>
            <strong>{store.name}</strong>
            <br />
            {STORE_TYPE_LABELS[store.type] || store.type} · {store.district}
            <br />
            {store.etaMinutes != null ? `~${store.etaMinutes} dk` : store.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
