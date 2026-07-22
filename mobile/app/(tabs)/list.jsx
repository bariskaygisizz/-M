import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { fetchFlights } from '../../lib/api';

export default function ListScreen() {
  const [flights, setFlights] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFlights({ scope: 'both' });
      setFlights(data.flights || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <View style={styles.root}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={flights}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor="#5eb8ff"
          />
        }
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.zone}>{item.zone === 'near' ? 'Eve yakın' : 'Uzak'}</Text>
              <Text style={styles.dist}>{item.groundDistanceKm} km</Text>
            </View>
            <Text style={styles.callsign}>{item.callsign}</Text>
            <Text style={styles.meta}>
              {(item.origin?.iata || item.origin?.city || '—') +
                ' → ' +
                (item.destination?.iata || item.destination?.city || '—')}
            </Text>
            <Text style={styles.meta}>
              {item.groundSpeedKmh} km/s · {item.altitudeFt} ft · {item.category === 'helicopter' ? 'Helikopter' : 'Uçak'}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Trafik yok</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071018' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,186,214,0.14)',
    padding: 12,
    marginBottom: 8
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  zone: { color: '#5eb8ff', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  dist: { color: '#8aa0b5' },
  callsign: { color: '#e8f1f8', fontSize: 18, fontWeight: '800' },
  meta: { color: '#8aa0b5', marginTop: 2 },
  empty: { color: '#8aa0b5', textAlign: 'center', marginTop: 40 },
  error: { color: '#ffc9c0', padding: 12 }
});
