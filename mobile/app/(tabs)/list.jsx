import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { fetchLocations, fetchMeta } from '../../lib/api';

export default function ListScreen() {
  const [meta, setMeta] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['Biletmatik', 'Biletmatik 4']);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        type: selectedTypes.join(','),
        limit: 500
      };
      if (query) params.q = query;
      const [metaData, locData] = await Promise.all([fetchMeta(), fetchLocations(params)]);
      setMeta(metaData);
      setLocations(locData.locations);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="İlçe veya terminal ara..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={loadData}
        />
        <View style={styles.chips}>
          {(meta?.types || ['Biletmatik', 'Biletmatik 4', 'Bayi / Dolum Noktası']).map((type) => (
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
        </View>
        <Pressable style={styles.btn} onPress={loadData}>
          <Text style={styles.btnText}>Listeyi Güncelle</Text>
        </Pressable>
        <Text style={styles.stats}>{locations.length} nokta</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#e30a17" />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.title}>{item.district}</Text>
              {item.address && <Text style={styles.meta}>{item.address}</Text>}
              {item.terminalId && <Text style={styles.meta}>Terminal: {item.terminalId}</Text>}
              <Text style={styles.coords}>
                {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  search: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff'
  },
  chipActive: { backgroundColor: '#e30a17', borderColor: '#e30a17' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#e30a17',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  btnText: { color: '#fff', fontWeight: '700' },
  stats: { marginTop: 8, color: '#6b7280', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  type: { color: '#e30a17', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#6b7280', marginTop: 4, fontSize: 13 },
  coords: { color: '#9ca3af', marginTop: 6, fontSize: 11 }
});
