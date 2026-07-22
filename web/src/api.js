const API = "";

function token() {
  return localStorage.getItem("ba_token") || "";
}

function authHeaders(extra = {}) {
  const t = token();
  return {
    ...extra,
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export function setSession(tok, user) {
  if (tok) localStorage.setItem("ba_token", tok);
  if (user) localStorage.setItem("ba_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("ba_token");
  localStorage.removeItem("ba_user");
}

export function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem("ba_user") || "null");
  } catch {
    return null;
  }
}

export async function register(username, password) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Kayıt başarısız");
  setSession(json.token, json.user);
  return json;
}

export async function login(username, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Giriş başarısız");
  setSession(json.token, json.user);
  return json;
}

export async function fetchMe() {
  const res = await fetch(`${API}/api/me`, { headers: authHeaders() });
  if (res.status === 401) {
    clearSession();
    return null;
  }
  const json = await res.json();
  if (json.user) setSession(token(), json.user);
  return json.user;
}

export async function fetchMeta() {
  const res = await fetch(`${API}/api/meta`);
  return res.json();
}

export async function fetchFish({ q = "", region = "Tümü" } = {}) {
  const params = new URLSearchParams({ q, region });
  const res = await fetch(`${API}/api/fish?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Balık listesi alınamadı");
  return res.json();
}

export async function identifyImage(blob) {
  const body = new FormData();
  body.append("image", blob, "scan.jpg");
  const res = await fetch(`${API}/api/identify`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  const json = await res.json();
  if (json.user) setSession(token(), json.user);
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
  const res = await fetch(`${API}/api/subscription/activate`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ plan, source: "dev", transactionId: `dev_${Date.now()}` }),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error || "Abonelik başarısız");
  setSession(token(), json.user);
  return json;
}

export async function health() {
  const res = await fetch(`${API}/api/health`);
  return res.json();
}
