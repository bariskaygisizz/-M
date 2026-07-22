import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri;
const lanHost = hostUri ? hostUri.split(':')[0] : null;

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (lanHost ? `http://${lanHost}:3001/api` : 'http://localhost:3001/api');

export async function getHome() {
  const res = await fetch(`${API_BASE}/home`);
  if (!res.ok) throw new Error('Ev konumu alınamadı');
  return res.json();
}

export async function setHome(payload) {
  const res = await fetch(`${API_BASE}/home`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Ev kaydedilemedi');
  return res.json();
}

export async function fetchFlights({ mode = 'simulation', scope = 'both', radiusKm = 80, wideRadiusKm = 900 } = {}) {
  const params = new URLSearchParams({
    mode,
    scope,
    radiusKm: String(radiusKm),
    wideRadiusKm: String(wideRadiusKm)
  });
  const res = await fetch(`${API_BASE}/flights?${params}`);
  if (!res.ok) throw new Error('Uçuşlar alınamadı');
  return res.json();
}

export async function fetchAbout() {
  const res = await fetch(`${API_BASE}/about`);
  if (!res.ok) throw new Error('Bilgi alınamadı');
  return res.json();
}
