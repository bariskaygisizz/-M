export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const TYPE_COLORS = {
  Biletmatik: '#2563eb',
  'Biletmatik 4': '#7c3aed',
  'Bayi / Dolum Noktası': '#16a34a',
  'Dolum Merkezi': '#ea580c',
  Diğer: '#6b7280'
};

export async function fetchMeta() {
  const res = await fetch(`${API_BASE}/meta`);
  if (!res.ok) throw new Error('Meta verisi alınamadı');
  return res.json();
}

export async function fetchLocations(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') search.set(key, String(value));
  });
  const res = await fetch(`${API_BASE}/locations?${search}`);
  if (!res.ok) throw new Error('Konum verisi alınamadı');
  return res.json();
}
