const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

export const api = {
  meta: () => request('/market/meta'),
  stores: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/market/stores?${q}`);
  },
  store: (id, params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/market/stores/${id}?${q}`);
  },
  products: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/market/products?${q}`);
  },
  customers: () => request('/market/customers'),
  customer: (id) => request(`/market/customers/${id}`),
  sellers: () => request('/market/sellers'),
  seller: (id) => request(`/market/sellers/${id}`),
  orders: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/market/orders?${q}`);
  },
  createOrder: (body) => request('/market/orders', { method: 'POST', body: JSON.stringify(body) }),
  updateOrderStatus: (id, status) =>
    request(`/market/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateStock: (id, body) =>
    request(`/market/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify(body) }),
  subscribe: (body) => request('/market/subscribe', { method: 'POST', body: JSON.stringify(body) }),
  trackEvent: (body) => request('/market/events', { method: 'POST', body: JSON.stringify(body) }),
  analytics: () => request('/market/analytics')
};

export function formatMoney(n) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
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
  if (product.stock > 5) return { text: `Stokta ${product.stock}`, tone: 'ok' };
  if (product.stock > 0) return { text: `Az kaldı (${product.stock})`, tone: 'warn' };
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
  market: '#0f5c4c',
  bakkal: '#c45c26',
  sutcu: '#1d6a9f'
};
