import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT = "http://localhost:3001";
const TOKEN_KEY = "ba_token";
const USER_KEY = "ba_user";

function base() {
  return (process.env.EXPO_PUBLIC_API_URL || DEFAULT).replace(/\/$/, "");
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setSession(token, user) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getCachedUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function authHeaders(extra = {}) {
  const t = await getToken();
  return {
    ...extra,
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export async function register(username, password) {
  const res = await fetch(`${base()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Kayıt başarısız");
  await setSession(json.token, json.user);
  return json;
}

export async function login(username, password) {
  const res = await fetch(`${base()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Giriş başarısız");
  await setSession(json.token, json.user);
  return json;
}

export async function fetchMe() {
  const res = await fetch(`${base()}/api/me`, {
    headers: await authHeaders(),
  });
  if (res.status === 401) {
    await clearSession();
    return null;
  }
  const json = await res.json();
  if (json.user) await setSession(await getToken(), json.user);
  return json.user;
}

export async function fetchMeta() {
  const res = await fetch(`${base()}/api/meta`);
  return res.json();
}

export async function fetchFish({ q = "", region = "Tümü" } = {}) {
  const params = new URLSearchParams({ q, region });
  const res = await fetch(`${base()}/api/fish?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Liste alınamadı");
  return res.json();
}

export async function identifyImage(uri) {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "scan.jpg",
    type: "image/jpeg",
  });
  const res = await fetch(`${base()}/api/identify`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  const json = await res.json();
  if (json.user) await setSession(await getToken(), json.user);
  if (!res.ok || !json.ok) {
    const err = new Error(json.error || "Tanıma başarısız");
    err.code = json.code;
    err.paywall = json.paywall;
    err.user = json.user;
    throw err;
  }
  return json;
}

export async function activatePlan(plan) {
  const res = await fetch(`${base()}/api/subscription/activate`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      plan,
      source: "dev",
      transactionId: `dev_${Date.now()}`,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Abonelik başarısız");
  await setSession(await getToken(), json.user);
  return json;
}
