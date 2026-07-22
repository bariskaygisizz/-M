import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchFlights, setHome } from '../../lib/api';

export default function MapScreen() {
  const [home, setHomeState] = useState(null);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFlights({ scope: 'both' });
      setHomeState(data.home);
      setFlights(data.flights || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [load]);

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Konum izni gerekli');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    await setHome({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      altM: pos.coords.altitude || 40,
      name: 'Evim'
    });
    await load();
  };

  const selected = flights.find((f) => f.id === selectedId);

  if (loading && !home) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5eb8ff" />
        <Text style={styles.muted}>Yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {home && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: home.lat,
            longitude: home.lng,
            latitudeDelta: 1.2,
            longitudeDelta: 1.2
          }}
          customMapStyle={darkMap}
        >
          <Circle
            center={{ latitude: home.lat, longitude: home.lng }}
            radius={80000}
            strokeColor="#5eb8ff"
            fillColor="rgba(94,184,255,0.08)"
          />
          <Marker
            coordinate={{ latitude: home.lat, longitude: home.lng }}
            pinColor="#ff8a5c"
            title={home.name || 'Ev'}
          />
          {flights.map((ac) => (
            <Marker
              key={ac.id}
              coordinate={{ latitude: ac.lat, longitude: ac.lng }}
              pinColor={ac.category === 'helicopter' ? '#3ecf8e' : '#5eb8ff'}
              title={ac.callsign}
              description={`${ac.groundDistanceKm} km · ${ac.groundSpeedKmh} km/s`}
              onPress={() => setSelectedId(ac.id)}
            />
          ))}
        </MapView>
      )}

      <View style={styles.hud}>
        <Pressable style={styles.btn} onPress={useMyLocation}>
          <Text style={styles.btnText}>Konumumu ev yap</Text>
        </Pressable>
        <Text style={styles.stat}>{flights.length} trafik</Text>
      </View>

      {selected && (
        <View style={styles.card}>
          <Text style={styles.callsign}>{selected.callsign}</Text>
          <Text style={styles.meta}>
            {selected.origin?.city || '—'} → {selected.destination?.city || '—'}
          </Text>
          <Text style={styles.meta}>
            {selected.groundSpeedKmh} km/s · {selected.altitudeFt} ft · {selected.groundDistanceKm} km
          </Text>
          <Text style={styles.privacy}>Yolcu listesi görünmez (ADS-B gizliliği).</Text>
        </View>
      )}

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const darkMap = [
  { elementType: 'geometry', stylers: [{ color: '#0b1c2c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8aa0b5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071018' }] }
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071018' },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#071018' },
  muted: { color: '#8aa0b5' },
  hud: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  btn: {
    backgroundColor: 'rgba(10,22,34,0.9)',
    borderColor: 'rgba(148,186,214,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  btnText: { color: '#e8f1f8', fontWeight: '700' },
  stat: {
    color: '#e8f1f8',
    backgroundColor: 'rgba(10,22,34,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: 'hidden'
  },
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    backgroundColor: 'rgba(10,22,34,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,186,214,0.2)',
    padding: 14,
    gap: 4
  },
  callsign: { color: '#e8f1f8', fontSize: 20, fontWeight: '800' },
  meta: { color: '#8aa0b5' },
  privacy: { color: '#f3e2b0', marginTop: 6, fontSize: 12 },
  error: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(80,20,20,0.95)',
    padding: 12,
    borderRadius: 12
  },
  errorText: { color: '#ffc9c0' }
});
