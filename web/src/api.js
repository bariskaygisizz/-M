const API = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("davetly_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
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
  locales: () => request("/api/locales"),
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
  deleteInvitation: (id) =>
    request(`/api/invitations/${id}`, { method: "DELETE" }),
  subscribe: (body) =>
    request("/api/subscribe", { method: "POST", body: JSON.stringify(body) }),
  restore: (body) =>
    request("/api/restore", { method: "POST", body: JSON.stringify(body) }),
  share: (id) => request(`/api/share/${id}`),
};

export function setSession(token, user) {
  if (token) localStorage.setItem("davetly_token", token);
  if (user) localStorage.setItem("davetly_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("davetly_token");
  localStorage.removeItem("davetly_user");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("davetly_user") || "null");
  } catch {
    return null;
  }
}
