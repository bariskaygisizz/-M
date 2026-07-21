export const API_BASE = import.meta.env.VITE_API_URL || '/api';

function token() {
  return localStorage.getItem('ym_token');
}

function queryString(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  });
  const text = q.toString();
  return text ? `?${text}` : '';
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'İstek başarısız');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  request,
  meta: () => request('/market/meta'),
  stores: (params = {}) => request(`/market/stores${queryString(params)}`),
  store: (id, params = {}) => request(`/market/stores/${id}${queryString(params)}`),
  products: (params = {}) => request(`/market/products${queryString(params)}`),
  customers: () => request('/market/customers'),
  customer: (id) => request(`/market/customers/${id}`),
  sellers: () => request('/market/sellers'),
  seller: (id) => request(`/market/sellers/${id}`),
  orders: (params = {}) => request(`/market/orders${queryString(params)}`),
  createOrder: (body) => request('/market/orders', { method: 'POST', body: JSON.stringify(body) }),
  updateOrderStatus: (id, status) =>
    request(`/market/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateStock: (id, body) =>
    request(`/market/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify(body) }),
  createProduct: (body) => request('/market/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/market/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  subscribe: (body) => request('/market/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  trackEvent: (body) => request('/market/events', { method: 'POST', body: JSON.stringify(body) }),
  analytics: () => request('/market/analytics'),
  register: (body) => request('/market/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/market/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/market/auth/logout', { method: 'POST' }),
  me: () => request('/market/auth/me'),
  posts: (params = {}) => request(`/market/posts${queryString(params)}`),
  createPost: (body) => request('/market/posts', { method: 'POST', body: JSON.stringify(body) }),
  likePost: (postId) => request(`/market/posts/${postId}/like`, { method: 'POST' }),
  comments: (postId) => request(`/market/posts/${postId}/comments`),
  createComment: (postId, body) =>
    request(`/market/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  messages: (body) => request('/market/messages', { method: 'POST', body: JSON.stringify(body) }),
  chatbot: (body) => request('/market/chatbot', { method: 'POST', body: JSON.stringify(body) })
};

export function formatMoney(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n || 0));
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function stockLabel(product) {
  if ((product.stock || 0) > 5) return { text: `Stokta ${product.stock} ${product.unit || ''}`.trim(), tone: 'ok' };
  if ((product.stock || 0) > 0) return { text: `Az kaldı (${product.stock})`, tone: 'warn' };
  if (product.restockAt) {
    return { text: `Yok · ${formatDate(product.restockAt)} gelir`, tone: 'soon' };
  }
  return { text: 'Stokta yok · tarih belirsiz', tone: 'out' };
}

export function statusLabel(status) {
  const map = {
    preparing: 'Hazırlanıyor',
    on_the_way: 'Yolda',
    delivered: 'Teslim edildi',
    cancelled: 'İptal'
  };
  return map[status] || status;
}

export const STORE_TYPE_LABELS = {
  market: 'Market',
  bakkal: 'Bakkal',
  sutcu: 'Sütçü'
};

export const STORE_COLORS = {
  market: '#16c79a',
  bakkal: '#f59e0b',
  sutcu: '#38bdf8'
};
