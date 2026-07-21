import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/locations.json');
const MARKET_FILE = path.join(__dirname, '../data/marketplace.json');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function loadMarket() {
  if (!fs.existsSync(MARKET_FILE)) {
    return { stores: [], products: [], sellers: [], customers: [], orders: [], events: [], updatedAt: null };
  }
  return JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
}

function saveMarket(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(MARKET_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateEta(distanceKm, baseMinutes) {
  const travel = Math.round(distanceKm * 4 + (baseMinutes || 15));
  return Math.max(8, Math.min(60, travel));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Istanbul Kart (mevcut) ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'yakinmarket-api', features: ['marketplace', 'istanbul-kart'] });
});

app.get('/api/locations', (req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(503).json({
      error: 'Konum verisi henüz yüklenmedi. Önce npm run sync-data çalıştırın.'
    });
  }

  const { type, district, q, lat, lng, radiusKm = '2', limit = '200' } = req.query;
  let results = data.locations;

  if (type) {
    const types = String(type).split(',').map((t) => t.trim());
    results = results.filter((loc) => types.includes(loc.type));
  }

  if (district) {
    const districtLower = String(district).toLocaleLowerCase('tr');
    results = results.filter((loc) => loc.district.toLocaleLowerCase('tr').includes(districtLower));
  }

  if (q) {
    const query = String(q).toLocaleLowerCase('tr');
    results = results.filter((loc) => {
      const haystack = [loc.district, loc.address, loc.terminalId, loc.type]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return haystack.includes(query);
    });
  }

  const userLat = lat ? Number(lat) : null;
  const userLng = lng ? Number(lng) : null;
  const maxRadius = Number(radiusKm);
  const maxLimit = Math.min(Number(limit) || 200, 1000);

  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    results = results
      .map((loc) => ({
        ...loc,
        distanceKm: haversineKm(userLat, userLng, loc.lat, loc.lng)
      }))
      .filter((loc) => !Number.isFinite(maxRadius) || loc.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  res.json({
    count: results.length,
    updatedAt: data.updatedAt,
    locations: results.slice(0, maxLimit)
  });
});

app.get('/api/meta', (_req, res) => {
  const data = loadData();
  if (!data) {
    return res.status(503).json({ error: 'Veri yok' });
  }
  const districts = [...new Set(data.locations.map((l) => l.district))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
  const types = [...new Set(data.locations.map((l) => l.type))];
  res.json({
    districts,
    types,
    count: data.locations.length,
    updatedAt: data.updatedAt
  });
});

// --- YakınMarket ---
app.get('/api/market/meta', (_req, res) => {
  const m = loadMarket();
  const types = [...new Set(m.stores.map((s) => s.type))];
  const districts = [...new Set(m.stores.map((s) => s.district))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
  const categories = [...new Set(m.products.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
  res.json({
    types,
    districts,
    categories,
    storeCount: m.stores.length,
    productCount: m.products.length,
    customerCount: m.customers.length,
    sellerCount: m.sellers.length,
    orderCount: m.orders.length,
    eventCount: m.events.length,
    updatedAt: m.updatedAt
  });
});

app.get('/api/market/stores', (req, res) => {
  const m = loadMarket();
  const { type, district, q, lat, lng, radiusKm = '8', product } = req.query;
  let stores = [...m.stores];

  if (type) {
    const types = String(type).split(',').map((t) => t.trim());
    stores = stores.filter((s) => types.includes(s.type));
  }
  if (district) {
    const d = String(district).toLocaleLowerCase('tr');
    stores = stores.filter((s) => s.district.toLocaleLowerCase('tr').includes(d));
  }
  if (q) {
    const query = String(q).toLocaleLowerCase('tr');
    stores = stores.filter((s) => {
      const hay = [s.name, s.address, s.district, s.description].join(' ').toLocaleLowerCase('tr');
      return hay.includes(query);
    });
  }
  if (product) {
    const query = String(product).toLocaleLowerCase('tr');
    const storeIds = new Set(
      m.products
        .filter((p) => p.name.toLocaleLowerCase('tr').includes(query) || p.category.toLocaleLowerCase('tr').includes(query))
        .map((p) => p.storeId)
    );
    stores = stores.filter((s) => storeIds.has(s.id));
  }

  const userLat = lat ? Number(lat) : null;
  const userLng = lng ? Number(lng) : null;
  const maxRadius = Number(radiusKm);

  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    stores = stores
      .map((s) => {
        const distanceKm = haversineKm(userLat, userLng, s.lat, s.lng);
        return {
          ...s,
          distanceKm,
          etaMinutes: estimateEta(distanceKm, s.deliveryMinutesBase)
        };
      })
      .filter((s) => !Number.isFinite(maxRadius) || s.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const withStock = stores.map((s) => {
    const products = m.products.filter((p) => p.storeId === s.id);
    const inStock = products.filter((p) => p.stock > 0).length;
    return {
      ...s,
      productCount: products.length,
      inStockCount: inStock,
      outOfStockCount: products.length - inStock
    };
  });

  res.json({ count: withStock.length, stores: withStock });
});

app.get('/api/market/stores/:id', (req, res) => {
  const m = loadMarket();
  const store = m.stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ error: 'Mağaza bulunamadı' });

  const products = m.products.filter((p) => p.storeId === store.id);
  const seller = m.sellers.find((s) => s.id === store.ownerId) || null;
  const subscribers = m.customers.filter((c) => (c.subscribedStoreIds || []).includes(store.id));
  const { lat, lng } = req.query;
  let distanceKm = null;
  let etaMinutes = null;
  if (lat && lng) {
    distanceKm = haversineKm(Number(lat), Number(lng), store.lat, store.lng);
    etaMinutes = estimateEta(distanceKm, store.deliveryMinutesBase);
  }

  res.json({
    store: { ...store, distanceKm, etaMinutes },
    products,
    seller,
    subscribers: subscribers.map((c) => ({
      id: c.id,
      name: c.name,
      district: c.district,
      lat: c.lat,
      lng: c.lng,
      lastActiveAt: c.lastActiveAt
    }))
  });
});

app.get('/api/market/products', (req, res) => {
  const m = loadMarket();
  const { q, storeId, inStock, lat, lng } = req.query;
  let products = [...m.products];

  if (storeId) products = products.filter((p) => p.storeId === storeId);
  if (q) {
    const query = String(q).toLocaleLowerCase('tr');
    products = products.filter(
      (p) =>
        p.name.toLocaleLowerCase('tr').includes(query) ||
        p.category.toLocaleLowerCase('tr').includes(query)
    );
  }
  if (inStock === '1' || inStock === 'true') {
    products = products.filter((p) => p.stock > 0);
  }

  const storeMap = Object.fromEntries(m.stores.map((s) => [s.id, s]));
  const userLat = lat ? Number(lat) : null;
  const userLng = lng ? Number(lng) : null;

  const enriched = products.map((p) => {
    const store = storeMap[p.storeId];
    let distanceKm = null;
    let etaMinutes = null;
    if (store && Number.isFinite(userLat) && Number.isFinite(userLng)) {
      distanceKm = haversineKm(userLat, userLng, store.lat, store.lng);
      etaMinutes = estimateEta(distanceKm, store.deliveryMinutesBase);
    }
    return {
      ...p,
      storeName: store?.name,
      storeType: store?.type,
      district: store?.district,
      storeLat: store?.lat,
      storeLng: store?.lng,
      distanceKm,
      etaMinutes,
      stockStatus:
        p.stock > 5 ? 'var' : p.stock > 0 ? 'az' : p.restockAt ? 'yakinda' : 'yok'
    };
  });

  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    enriched.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  res.json({ count: enriched.length, products: enriched });
});

app.get('/api/market/customers', (_req, res) => {
  const m = loadMarket();
  res.json({ count: m.customers.length, customers: m.customers });
});

app.get('/api/market/customers/:id', (req, res) => {
  const m = loadMarket();
  const customer = m.customers.find((c) => c.id === req.params.id);
  if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });
  const orders = m.orders.filter((o) => o.customerId === customer.id);
  const stores = m.stores.filter((s) => (customer.subscribedStoreIds || []).includes(s.id));
  res.json({ customer, orders, subscribedStores: stores });
});

app.get('/api/market/sellers', (_req, res) => {
  const m = loadMarket();
  const enriched = m.sellers.map((seller) => {
    const store = m.stores.find((s) => s.id === seller.storeId);
    return { ...seller, store };
  });
  res.json({ count: enriched.length, sellers: enriched });
});

app.get('/api/market/sellers/:id', (req, res) => {
  const m = loadMarket();
  const seller = m.sellers.find((s) => s.id === req.params.id);
  if (!seller) return res.status(404).json({ error: 'Satıcı bulunamadı' });
  const store = m.stores.find((s) => s.id === seller.storeId);
  const products = m.products.filter((p) => p.storeId === seller.storeId);
  const orders = m.orders.filter((o) => o.storeId === seller.storeId);
  const subscribers = m.customers.filter((c) =>
    (c.subscribedStoreIds || []).includes(seller.storeId)
  );
  res.json({ seller, store, products, orders, subscribers });
});

app.patch('/api/market/products/:id/stock', (req, res) => {
  const m = loadMarket();
  const product = m.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  const { stock, restockAt } = req.body || {};
  if (stock != null) product.stock = Math.max(0, Number(stock));
  if (restockAt !== undefined) product.restockAt = restockAt || null;
  saveMarket(m);
  res.json({ product });
});

app.get('/api/market/orders', (req, res) => {
  const m = loadMarket();
  const { customerId, storeId } = req.query;
  let orders = [...m.orders];
  if (customerId) orders = orders.filter((o) => o.customerId === customerId);
  if (storeId) orders = orders.filter((o) => o.storeId === storeId);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: orders.length, orders });
});

app.post('/api/market/orders', (req, res) => {
  const m = loadMarket();
  const { customerId, storeId, items, customerLat, customerLng } = req.body || {};
  if (!customerId || !storeId || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'customerId, storeId ve items gerekli' });
  }

  const store = m.stores.find((s) => s.id === storeId);
  const customer = m.customers.find((c) => c.id === customerId);
  if (!store || !customer) return res.status(404).json({ error: 'Mağaza veya müşteri yok' });

  const orderItems = [];
  let total = 0;
  for (const item of items) {
    const product = m.products.find((p) => p.id === item.productId && p.storeId === storeId);
    if (!product) return res.status(400).json({ error: `Ürün yok: ${item.productId}` });
    const qty = Math.max(1, Number(item.qty) || 1);
    if (product.stock < qty) {
      return res.status(409).json({
        error: `${product.name} stokta yetersiz (stok: ${product.stock})`,
        restockAt: product.restockAt
      });
    }
    product.stock -= qty;
    orderItems.push({ productId: product.id, name: product.name, qty, price: product.price });
    total += product.price * qty;
  }

  const lat = Number(customerLat ?? customer.lat);
  const lng = Number(customerLng ?? customer.lng);
  const distanceKm = haversineKm(lat, lng, store.lat, store.lng);
  const etaMinutes = estimateEta(distanceKm, store.deliveryMinutesBase);

  const order = {
    id: uid('ord'),
    customerId,
    storeId,
    items: orderItems,
    status: 'preparing',
    createdAt: new Date().toISOString(),
    etaMinutes,
    deliveredAt: null,
    total: Math.round(total * 100) / 100,
    customerLat: lat,
    customerLng: lng
  };
  m.orders.unshift(order);
  customer.orderCount = (customer.orderCount || 0) + 1;
  customer.lastActiveAt = new Date().toISOString();

  m.events.push({
    id: uid('ev'),
    type: 'order_placed',
    customerId,
    storeId,
    lat,
    lng,
    district: customer.district,
    at: new Date().toISOString()
  });

  saveMarket(m);
  res.status(201).json({ order });
});

app.patch('/api/market/orders/:id/status', (req, res) => {
  const m = loadMarket();
  const order = m.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
  const { status } = req.body || {};
  const allowed = ['preparing', 'on_the_way', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Geçersiz durum' });
  order.status = status;
  if (status === 'delivered') order.deliveredAt = new Date().toISOString();
  saveMarket(m);
  res.json({ order });
});

app.post('/api/market/subscribe', (req, res) => {
  const m = loadMarket();
  const { customerId, storeId } = req.body || {};
  const customer = m.customers.find((c) => c.id === customerId);
  const store = m.stores.find((s) => s.id === storeId);
  if (!customer || !store) return res.status(404).json({ error: 'Kayıt bulunamadı' });

  customer.subscribedStoreIds = customer.subscribedStoreIds || [];
  if (!customer.subscribedStoreIds.includes(storeId)) {
    customer.subscribedStoreIds.push(storeId);
    store.subscriberCount = (store.subscriberCount || 0) + 1;
    m.events.push({
      id: uid('ev'),
      type: 'subscribe',
      customerId,
      storeId,
      lat: customer.lat,
      lng: customer.lng,
      district: customer.district,
      at: new Date().toISOString()
    });
    saveMarket(m);
  }
  res.json({ customer, store });
});

app.post('/api/market/events', (req, res) => {
  const m = loadMarket();
  const { type, customerId, storeId, query, lat, lng, district } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type gerekli' });

  const event = {
    id: uid('ev'),
    type,
    customerId: customerId || null,
    storeId: storeId || null,
    query: query || null,
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
    district: district || null,
    at: new Date().toISOString()
  };
  m.events.push(event);

  if (customerId) {
    const customer = m.customers.find((c) => c.id === customerId);
    if (customer) {
      customer.lastActiveAt = event.at;
      if (Number.isFinite(event.lat) && Number.isFinite(event.lng)) {
        customer.lat = event.lat;
        customer.lng = event.lng;
      }
      if (district) customer.district = district;
    }
  }

  saveMarket(m);
  res.status(201).json({ event });
});

app.get('/api/market/analytics', (_req, res) => {
  const m = loadMarket();
  const byDistrict = {};
  for (const c of m.customers) {
    byDistrict[c.district] = byDistrict[c.district] || {
      district: c.district,
      customers: 0,
      subscribers: 0,
      events: 0,
      latSum: 0,
      lngSum: 0
    };
    byDistrict[c.district].customers += 1;
    byDistrict[c.district].subscribers += (c.subscribedStoreIds || []).length;
    byDistrict[c.district].latSum += c.lat;
    byDistrict[c.district].lngSum += c.lng;
  }
  for (const e of m.events) {
    if (!e.district) continue;
    byDistrict[e.district] = byDistrict[e.district] || {
      district: e.district,
      customers: 0,
      subscribers: 0,
      events: 0,
      latSum: 0,
      lngSum: 0
    };
    byDistrict[e.district].events += 1;
  }

  const districts = Object.values(byDistrict).map((d) => ({
    district: d.district,
    customers: d.customers,
    subscribers: d.subscribers,
    events: d.events,
    centerLat: d.customers ? d.latSum / d.customers : null,
    centerLng: d.customers ? d.lngSum / d.customers : null
  }));

  const eventTypes = {};
  for (const e of m.events) {
    eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
  }

  const storeSubs = m.stores
    .map((s) => ({
      id: s.id,
      name: s.name,
      district: s.district,
      subscriberCount: s.subscriberCount || 0,
      lat: s.lat,
      lng: s.lng
    }))
    .sort((a, b) => b.subscriberCount - a.subscriberCount);

  const recentEvents = [...m.events].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);

  const heatPoints = m.customers.map((c) => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    district: c.district,
    subscriptions: (c.subscribedStoreIds || []).length,
    orderCount: c.orderCount || 0,
    lastActiveAt: c.lastActiveAt
  }));

  res.json({
    summary: {
      customers: m.customers.length,
      sellers: m.sellers.length,
      stores: m.stores.length,
      orders: m.orders.length,
      events: m.events.length,
      totalSubscriptions: m.customers.reduce((n, c) => n + (c.subscribedStoreIds || []).length, 0)
    },
    districts,
    eventTypes,
    storeSubs,
    heatPoints,
    recentEvents
  });
});

// Üretim demosu: web build'i API ile aynı porttan sun
const WEB_DIST = path.join(__dirname, '../web/dist');
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YakınMarket http://localhost:${PORT}`);
});
