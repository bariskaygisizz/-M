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

function createColoredIcon(color, size = 16) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${color};
      width:${size}px;height:${size}px;
      border-radius:50%;
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.28);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
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
      : [41.02, 29.0];

  return (
    <MapContainer center={center} zoom={12} className="map-container" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController focus={focus || selected} userLocation={userLocation} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={9}
          pathOptions={{ color: '#e8a317', fillColor: '#e8a317', fillOpacity: 0.95, weight: 2 }}
        >
          <Popup>Konumunuz</Popup>
        </CircleMarker>
      )}

      {heatPoints.map((p) => (
        <CircleMarker
          key={`heat-${p.id}`}
          center={[p.lat, p.lng]}
          radius={6 + Math.min(10, (p.subscriptions || 0) * 2)}
          pathOptions={{
            color: '#0f5c4c',
            fillColor: '#2a9d8f',
            fillOpacity: 0.35,
            weight: 1
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
          icon={createColoredIcon(STORE_COLORS[store.type] || '#0f5c4c', selectedId === store.id ? 20 : 16)}
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
