import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function createColoredIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${color};
      width:14px;height:14px;
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

function MapController({ selectedLocation, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 16, { duration: 0.8 });
    }
  }, [selectedLocation, map]);

  useEffect(() => {
    if (userLocation && !selectedLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
    }
  }, [userLocation, selectedLocation, map]);

  return null;
}

export default function MapView({ locations, selectedLocation, userLocation, typeColors, onSelect }) {
  const center = selectedLocation
    ? [selectedLocation.lat, selectedLocation.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : [41.015137, 28.97953];

  return (
    <MapContainer center={center} zoom={11} className="map-container" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController selectedLocation={selectedLocation} userLocation={userLocation} />

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: '#e30a17', fillColor: '#e30a17', fillOpacity: 0.9 }}
        >
          <Popup>Konumunuz</Popup>
        </CircleMarker>
      )}

      {locations.map((loc) => (
        <Marker
          key={loc.id}
          position={[loc.lat, loc.lng]}
          icon={createColoredIcon(typeColors[loc.type] || '#6b7280')}
          eventHandlers={{
            click: () => onSelect(loc.id)
          }}
        >
          <Popup>
            <strong>{loc.type}</strong>
            <br />
            {loc.district}
            <br />
            {loc.address || 'Adres bilgisi yok'}
            {loc.terminalId && (
              <>
                <br />
                Terminal: {loc.terminalId}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
