const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
  if (!res.ok) throw new Error('Ev konumu kaydedilemedi');
  return res.json();
}

export async function fetchAbout() {
  const res = await fetch(`${API_BASE}/about`);
  if (!res.ok) throw new Error('Bilgi alınamadı');
  return res.json();
}

export async function fetchFlights({ mode, radiusKm, wideRadiusKm, scope, category } = {}) {
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (radiusKm) params.set('radiusKm', String(radiusKm));
  if (wideRadiusKm) params.set('wideRadiusKm', String(wideRadiusKm));
  if (scope) params.set('scope', scope);
  if (category && category !== 'all') params.set('category', category);

  const res = await fetch(`${API_BASE}/flights?${params}`);
  if (!res.ok) throw new Error('Uçuş verisi alınamadı');
  return res.json();
}

export function phaseLabel(phase) {
  switch (phase) {
    case 'climb':
      return 'Tırmanış';
    case 'descent':
      return 'Alçalış';
    case 'cruise':
      return 'Seyir';
    case 'ground':
      return 'Yerde';
    default:
      return phase || '—';
  }
}

export function categoryLabel(category) {
  return category === 'helicopter' ? 'Helikopter' : 'Uçak';
}

export function zoneLabel(zone) {
  return zone === 'near' ? 'Eve yakın' : 'Uzak';
}

export function formatRoute(origin, destination) {
  const from = origin?.iata || origin?.city || origin?.name || '—';
  const to = destination?.iata || destination?.city || destination?.name || '—';
  return `${from} → ${to}`;
}

export function compassLabel(deg) {
  const dirs = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
