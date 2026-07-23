import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const host =
  Constants.expoConfig?.hostUri?.split(":")?.[0] ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost?.split(":")?.[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (host ? `http://${host}:3001` : "http://localhost:3001");

async function authHeaders() {
  const token = await AsyncStorage.getItem("davetly_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "generic");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),
  templates: () => request("/api/templates"),
  plans: () => request("/api/plans"),
  register: (body) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/me"),
  deleteMe: () => request("/api/me", { method: "DELETE" }),
  invitations: () => request("/api/invitations"),
  createInvitation: (body) =>
    request("/api/invitations", { method: "POST", body: JSON.stringify(body) }),
  updateInvitation: (id, body) =>
    request(`/api/invitations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  subscribe: (body) =>
    request("/api/subscribe", { method: "POST", body: JSON.stringify(body) }),
  restore: (body) =>
    request("/api/restore", { method: "POST", body: JSON.stringify(body) }),
};

export async function setSession(token, user) {
  if (token) await AsyncStorage.setItem("davetly_token", token);
  if (user) await AsyncStorage.setItem("davetly_user", JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.multiRemove(["davetly_token", "davetly_user"]);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem("davetly_user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
