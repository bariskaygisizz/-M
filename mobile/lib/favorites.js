import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@balikatlas/favorites";

export async function getFavorites() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function isFavorite(id) {
  const list = await getFavorites();
  return list.includes(id);
}

export async function toggleFavorite(id) {
  const list = await getFavorites();
  const next = list.includes(id)
    ? list.filter((x) => x !== id)
    : [...list, id];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next.includes(id);
}
