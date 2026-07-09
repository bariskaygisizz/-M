import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchLocations, fetchMeta, TYPE_COLORS } from '../../lib/api';

const ISTANBUL_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35
};

export default function MapScreen() {
  const mapRef = useRef(null);
  const [meta, setMeta] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['Biletmatik', 'Biletmatik 4']);
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        type: selectedTypes.join(','),
        limit: userLocation ? 300 : 500
      };
      if (query) params.q = query;
      if (userLocation) {
        params.lat = userLocation.latitude;
        params.lng = userLocation.longitude;
        params.radiusKm = 3;
      }

      const [metaData, locData] = await Promise.all([fetchMeta(), fetchLocations(params)]);
      setMeta(metaData);
      setLocations(locData.locations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, query, userLocation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedLocation = useMemo(
    () => locations.find((loc) => loc.id === selectedId),
    [locations, selectedId]
  );

  const handleLocate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Konum izni verilmedi.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    const coords = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    };
    setUserLocation(coords);
    mapRef.current?.animateToRegion({
      ...coords,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04
    });
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TextInput
          style={styles.search}
          placeholder="Ara: ilçe, terminal..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={loadData}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {(meta?.types || ['Biletmatik', 'Biletmatik 4']).map((type) => (
            <Pressable
              key={type}
              style={[styles.chip, selectedTypes.includes(type) && styles.chipActive]}
              onPress={() => toggleType(type)}
            >
              <Text style={[styles.chipText, selectedTypes.includes(type) && styles.chipTextActive]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.btn} onPress={loadData}>
            <Text style={styles.btnText}>Filtrele</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={handleLocate}>
            <Text style={styles.btnTextSecondary}>Yakınım</Text>
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#e30a17" />
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={ISTANBUL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={3000}
            strokeColor="rgba(227,10,23,0.4)"
            fillColor="rgba(227,10,23,0.08)"
          />
        )}

        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            pinColor={TYPE_COLORS[loc.type] || '#6b7280'}
            title={loc.type}
            description={`${loc.district}${loc.terminalId ? ` • ${loc.terminalId}` : ''}`}
            onPress={() => {
              setSelectedId(loc.id);
              mapRef.current?.animateToRegion({
                latitude: loc.lat,
                longitude: loc.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              });
            }}
          />
        ))}
      </MapView>

      {selectedLocation && (
        <View style={styles.detailCard}>
          <Text style={styles.detailType}>{selectedLocation.type}</Text>
          <Text style={styles.detailTitle}>{selectedLocation.district}</Text>
          {selectedLocation.address && (
            <Text style={styles.detailMeta}>{selectedLocation.address}</Text>
          )}
          {selectedLocation.terminalId && (
            <Text style={styles.detailMeta}>Terminal: {selectedLocation.terminalId}</Text>
          )}
          {selectedLocation.distanceKm != null && (
            <Text style={styles.detailMeta}>{selectedLocation.distanceKm.toFixed(2)} km</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 2
  },
  search: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  chips: { marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    backgroundColor: '#fff'
  },
  chipActive: { backgroundColor: '#e30a17', borderColor: '#e30a17' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: '#e30a17',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  btnSecondary: { backgroundColor: '#eef2f7' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnTextSecondary: { color: '#1f2937', fontWeight: '700' },
  map: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.35)'
  },
  errorBox: {
    position: 'absolute',
    top: 140,
    left: 12,
    right: 12,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 10,
    zIndex: 11
  },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  detailCard: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  detailType: { color: '#e30a17', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  detailTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  detailMeta: { color: '#6b7280', fontSize: 13, marginTop: 2 }
});
