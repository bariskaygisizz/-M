import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/locations.json');
const MARKET_FILE = path.join(__dirname, '../data/marketplace.json');
const PORT = process.env.PORT || 3001;

const MARKET_ARRAYS = [
  'users',
  'sessions',
  'posts',
  'comments',
  'messages',
  'chatLogs',
  'orders',
  'events',
  'products',
  'stores',
  'sellers',
  'customers'
];

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function loadMarket() {
  const data = fs.existsSync(MARKET_FILE)
    ? JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'))
    : { updatedAt: null };

  for (const key of MARKET_ARRAYS) {
    if (!Array.isArray(data[key])) data[key] = [];
  }

  if (!Object.prototype.hasOwnProperty.call(data, 'updatedAt')) {
    data.updatedAt = null;
  }

  return data;
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

const haversine = haversineKm;

function estimateEta(distanceKm, baseMinutes) {
  const travel = Math.round(distanceKm * 4 + (baseMinutes || 15));
  return Math.max(8, Math.min(60, travel));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeEmail(email) {
  return cleanText(email).toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(':')) return false;
  const [salt, hashHex] = passwordHash.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function readSessionToken(req) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1].trim();

  const headerToken = req.get('x-session-token');
  return headerToken ? String(headerToken).trim() : null;
}

function getUserFromRequest(req) {
  const token = readSessionToken(req);
  if (!token) return null;

  const market = loadMarket();
  const session = market.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = market.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return { market, session, token, user };
}

function requireAuth(req, res, next) {
  const auth = getUserFromRequest(req);
  if (!auth) return res.status(401).json({ error: 'Oturum gerekli' });
  req.auth = auth;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth || req.auth.user.role !== role) {
      return res.status(403).json({ error: `${role} yetkisi gerekli` });
    }
    next();
  };
}

function createSession(market, user) {
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const session = {
    id: uid('sess'),
    token: crypto.randomBytes(24).toString('hex'),
    userId: user.id,
    role: user.role,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expires.toISOString()
  };
  market.sessions.unshift(session);
  return session;
}

function authPayload(market, user, session = null) {
  const payload = { user: publicUser(user) };

  if (user?.role === 'seller') {
    payload.seller = market.sellers.find((s) => s.id === user.sellerProfileId) || null;
    payload.store = market.stores.find((s) => s.id === user.storeId) || null;
  }

  if (user?.role === 'customer') {
    payload.customer = market.customers.find((c) => c.id === user.customerProfileId) || null;
  }

  if (session) {
    payload.token = session.token;
    payload.expiresAt = session.expiresAt;
  }

  return payload;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sellerUserForStore(market, store) {
  if (!store) return null;
  const seller = market.sellers.find((s) => s.id === store.ownerId || s.storeId === store.id);
  return (
    market.users.find((u) => u.storeId === store.id && u.role === 'seller') ||
    market.users.find((u) => u.sellerProfileId === seller?.id) ||
    null
  );
}

function enrichPost(market, post) {
  const store = market.stores.find((s) => s.id === post.storeId) || null;
  const author = market.users.find((u) => u.id === post.authorUserId) || null;
  const commentCount = market.comments.filter((c) => c.postId === post.id).length;

  return {
    ...post,
    storeName: store?.name || null,
    storeType: store?.type || null,
    district: store?.district || null,
    store,
    author: publicUser(author),
    commentCount
  };
}

function enrichComment(market, comment) {
  const user = market.users.find((u) => u.id === comment.userId) || null;
  return {
    ...comment,
    user: publicUser(user)
  };
}

function chatbotReply(message, { market, store, user }) {
  const text = message.toLocaleLowerCase('tr');
  const storeProducts = store ? market.products.filter((p) => p.storeId === store.id) : [];
  const outOfStock = storeProducts.filter((p) => Number(p.stock) <= 0).length;
  const prefix = store ? `${store.name} için: ` : '';
  const sellerTip =
    user?.role === 'seller'
      ? ''
      : ' Satıcı hesabıyla giriş yaparsan yanıtları mağazana göre daha netleştiririm.';

  if (text.includes('stok') || text.includes('ürün ekle') || text.includes('urun ekle')) {
    return `${prefix}Stok eklemek için ürün adı, kategori, fiyat, stok, birim ve varsa yenilenme tarihini gir. Stok 0 olursa ürün "yok", 1-5 arası "az", üzeri "var" görünür. ${
      store ? `Şu anda ${storeProducts.length} ürünün var, ${outOfStock} üründe stok bitmiş.` : ''
    }${sellerTip}`.trim();
  }

  if (text.includes('fiyat') || text.includes('kampanya') || text.includes('indirim')) {
    return `${prefix}Fiyat güncellerken en çok aranan temel ürünlerde küçük ve anlaşılır indirimler daha iyi çalışır. Ürün kartında fiyatı güncelle, açıklamada eski-yeni fiyatı net yaz ve kampanyayı post olarak paylaş.${sellerTip}`;
  }

  if (
    text.includes('reklam') ||
    text.includes('post') ||
    text.includes('foto') ||
    text.includes('video')
  ) {
    return `${prefix}Reklam veya post için kısa başlık, net ürün görseli ve mahalleye özel çağrı kullan: "Bugün taze geldi", "15 dk teslimat" gibi. Video postlarda ilk 3 saniyede ürün ve avantaj görünsün.${sellerTip}`;
  }

  if (text.includes('sipariş') || text.includes('siparis') || text.includes('hazır')) {
    return `${prefix}Siparişlerde durumu sırayla preparing, on_the_way, delivered veya cancelled yap. Müşteriye hazırlık ve çıkış bilgisini mesajla iletmek tekrar siparişi artırır.${sellerTip}`;
  }

  if (text.includes('abone') || text.includes('abonelik') || text.includes('takip')) {
    return `${prefix}Aboneler yeni stok ve kampanya postlarını daha sık görür. Düzenli ürünler için "abone olanlara ayırıyoruz" mesajı kullanabilir, stok gelince kısa post paylaşabilirsin.${sellerTip}`;
  }

  if (text.includes('teslimat') || text.includes('eta') || text.includes('süre') || text.includes('sure')) {
    return `${prefix}Teslimat süresi mağaza başlangıç dakikası ve mesafeye göre hesaplanır. Yoğun saatlerde gerçekçi süre ver, yakın müşterilere hızlı teslimat vurgusu yap.${sellerTip}`;
  }

  if (text.includes('kayıt') || text.includes('kayit') || text.includes('üye') || text.includes('uye')) {
    return 'Kayıt için rolünü seller veya customer seç. Satıcı kayıt olurken mağaza adı, türü, ilçe, adres, lat ve lng bilgileriyle mağaza da otomatik oluşturulur. Müşteri kayıt sonrası mağazalara abone olabilir.';
  }

  return `${prefix}YakınMarket asistanı stok, fiyat, reklam/post, sipariş, abone, teslimat süresi ve kayıt konularında yardımcı olur. Sorunu bu başlıklardan biriyle yazarsan adım adım öneri verebilirim.${sellerTip}`;
}

// --- Istanbul Kart (mevcut) ---
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'yakinmarket-api',
    features: ['marketplace', 'istanbul-kart', 'auth', 'social-feed', 'business-chatbot'],
    demo: {
      seller: { email: 'ayse@gunesmarket.tr', password: 'satici123' },
      customer: { email: 'deniz@ornek.com', password: 'musteri123' }
    },
    tip: 'Demo seller ayse@gunesmarket.tr / satici123, customer deniz@ornek.com / musteri123'
  });
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
        distanceKm: haversine(userLat, userLng, loc.lat, loc.lng)
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

// --- Auth ---
app.post('/api/auth/register', (req, res) => {
  const market = loadMarket();
  const {
    role,
    name,
    email,
    phone,
    password,
    storeName,
    storeType,
    district,
    address,
    lat,
    lng
  } = req.body || {};

  const normalizedEmail = normalizeEmail(email);
  if (!['seller', 'customer'].includes(role)) {
    return res.status(400).json({ error: 'role seller veya customer olmalı' });
  }
  if (!cleanText(name) || !normalizedEmail || !cleanText(phone) || !cleanText(password)) {
    return res.status(400).json({ error: 'name, email, phone ve password gerekli' });
  }
  if (market.users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
  }

  const now = new Date().toISOString();
  const user = {
    id: uid('user'),
    role,
    name: cleanText(name),
    email: normalizedEmail,
    phone: cleanText(phone),
    passwordHash: hashPassword(password),
    createdAt: now
  };

  if (role === 'seller') {
    const storeLat = Number(lat);
    const storeLng = Number(lng);
    if (
      !cleanText(storeName) ||
      !cleanText(storeType) ||
      !cleanText(district) ||
      !cleanText(address) ||
      !Number.isFinite(storeLat) ||
      !Number.isFinite(storeLng)
    ) {
      return res.status(400).json({
        error: 'Satıcı kaydı için storeName, storeType, district, address, lat ve lng gerekli'
      });
    }

    const seller = {
      id: uid('seller'),
      name: user.name,
      email: user.email,
      phone: user.phone,
      storeId: null,
      role: 'seller',
      joinedAt: now,
      bio: ''
    };
    const store = {
      id: uid('store'),
      name: cleanText(storeName),
      type: cleanText(storeType),
      district: cleanText(district),
      address: cleanText(address),
      phone: user.phone,
      lat: storeLat,
      lng: storeLng,
      openHours: '08:00-22:00',
      deliveryMinutesBase: 20,
      rating: null,
      ownerId: seller.id,
      description: `${cleanText(storeName)} YakınMarket mağazası.`,
      subscriberCount: 0,
      verified: false,
      createdAt: now
    };

    seller.storeId = store.id;
    user.storeId = store.id;
    user.sellerProfileId = seller.id;
    market.sellers.push(seller);
    market.stores.push(store);
  } else {
    const customer = {
      id: uid('cust'),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: 'customer',
      district: cleanText(district),
      address: cleanText(address),
      lat: numberOrNull(lat),
      lng: numberOrNull(lng),
      subscribedStoreIds: [],
      joinedAt: now,
      preferences: [],
      orderCount: 0,
      lastActiveAt: now
    };
    user.customerProfileId = customer.id;
    market.customers.push(customer);
  }

  market.users.push(user);
  const session = createSession(market, user);
  saveMarket(market);

  res.status(201).json(authPayload(market, user, session));
});

app.post('/api/auth/login', (req, res) => {
  const market = loadMarket();
  const { email, password, role } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !cleanText(password)) {
    return res.status(400).json({ error: 'email ve password gerekli' });
  }

  const user = market.users.find(
    (u) => normalizeEmail(u.email) === normalizedEmail && (!role || u.role === role)
  );
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
  }

  const session = createSession(market, user);
  saveMarket(market);
  res.json(authPayload(market, user, session));
});

app.post('/api/auth/logout', (req, res) => {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Oturum token gerekli' });

  const market = loadMarket();
  const before = market.sessions.length;
  market.sessions = market.sessions.filter((s) => s.token !== token);
  if (market.sessions.length !== before) saveMarket(market);

  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  req.auth.session.lastSeenAt = new Date().toISOString();
  saveMarket(req.auth.market);
  res.json(authPayload(req.auth.market, req.auth.user));
});

// --- YakınMarket ---
app.get('/api/market/meta', (_req, res) => {
  const m = loadMarket();
  const types = [...new Set(m.stores.map((s) => s.type).filter(Boolean))];
  const districts = [...new Set(m.stores.map((s) => s.district).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr')
  );
  const categories = [...new Set(m.products.map((p) => p.category).filter(Boolean))].sort((a, b) =>
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
    userCount: m.users.length,
    postCount: m.posts.length,
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
    stores = stores.filter((s) => String(s.district || '').toLocaleLowerCase('tr').includes(d));
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
        .filter((p) => {
          const name = String(p.name || '').toLocaleLowerCase('tr');
          const category = String(p.category || '').toLocaleLowerCase('tr');
          return name.includes(query) || category.includes(query);
        })
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
        const distanceKm = haversine(userLat, userLng, s.lat, s.lng);
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
  const seller = m.sellers.find((s) => s.id === store.ownerId || s.storeId === store.id) || null;
  const subscribers = m.customers.filter((c) => (c.subscribedStoreIds || []).includes(store.id));
  const { lat, lng } = req.query;
  let distanceKm = null;
  let etaMinutes = null;
  if (lat && lng) {
    distanceKm = haversine(Number(lat), Number(lng), store.lat, store.lng);
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
    products = products.filter((p) => {
      const name = String(p.name || '').toLocaleLowerCase('tr');
      const category = String(p.category || '').toLocaleLowerCase('tr');
      return name.includes(query) || category.includes(query);
    });
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
      distanceKm = haversine(userLat, userLng, store.lat, store.lng);
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
      stockStatus: p.stock > 5 ? 'var' : p.stock > 0 ? 'az' : p.restockAt ? 'yakinda' : 'yok'
    };
  });

  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    enriched.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  res.json({ count: enriched.length, products: enriched });
});

app.post('/api/market/products', requireAuth, requireRole('seller'), (req, res) => {
  const m = req.auth.market;
  const user = req.auth.user;
  const store = m.stores.find((s) => s.id === user.storeId);
  if (!store) return res.status(400).json({ error: 'Satıcı mağazası bulunamadı' });

  const { name, category, price, stock, unit, restockAt, imageHint } = req.body || {};
  const productPrice = Number(price);
  const productStock = Math.max(0, Number(stock) || 0);

  if (!cleanText(name) || !cleanText(category) || !Number.isFinite(productPrice)) {
    return res.status(400).json({ error: 'name, category ve geçerli price gerekli' });
  }

  const product = {
    id: uid('p'),
    storeId: store.id,
    name: cleanText(name),
    category: cleanText(category),
    price: Math.max(0, Math.round(productPrice * 100) / 100),
    stock: productStock,
    unit: cleanText(unit) || 'adet',
    restockAt: restockAt || null,
    imageHint: cleanText(imageHint) || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  m.products.unshift(product);
  m.events.push({
    id: uid('ev'),
    type: 'product_created',
    storeId: store.id,
    sellerId: user.sellerProfileId || null,
    productId: product.id,
    at: product.createdAt
  });
  saveMarket(m);
  res.status(201).json({ product });
});

app.patch('/api/market/products/:id', requireAuth, requireRole('seller'), (req, res) => {
  const m = req.auth.market;
  const user = req.auth.user;
  const product = m.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
  if (product.storeId !== user.storeId) {
    return res.status(403).json({ error: 'Sadece kendi mağazanızın ürününü düzenleyebilirsiniz' });
  }

  const { price, stock, name } = req.body || {};
  if (name !== undefined) {
    if (!cleanText(name)) return res.status(400).json({ error: 'name boş olamaz' });
    product.name = cleanText(name);
  }
  if (price !== undefined) {
    const productPrice = Number(price);
    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({ error: 'price geçerli bir sayı olmalı' });
    }
    product.price = Math.round(productPrice * 100) / 100;
  }
  if (stock !== undefined) {
    const productStock = Number(stock);
    if (!Number.isFinite(productStock) || productStock < 0) {
      return res.status(400).json({ error: 'stock geçerli bir sayı olmalı' });
    }
    product.stock = Math.floor(productStock);
  }

  product.updatedAt = new Date().toISOString();
  saveMarket(m);
  res.json({ product });
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
  const subscribers = m.customers.filter((c) => (c.subscribedStoreIds || []).includes(seller.storeId));
  res.json({ seller, store, products, orders, subscribers });
});

app.patch('/api/market/products/:id/stock', (req, res) => {
  const m = loadMarket();
  const product = m.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

  const { stock, restockAt } = req.body || {};
  if (stock != null) product.stock = Math.max(0, Number(stock));
  if (restockAt !== undefined) product.restockAt = restockAt || null;
  product.updatedAt = new Date().toISOString();
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
  const distanceKm = haversine(lat, lng, store.lat, store.lng);
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

app.get('/api/market/posts', (req, res) => {
  const m = loadMarket();
  const { storeId, type } = req.query;
  let posts = [...m.posts];
  if (storeId) posts = posts.filter((p) => p.storeId === storeId);
  if (type) posts = posts.filter((p) => p.type === type);
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: posts.length, posts: posts.map((p) => enrichPost(m, p)) });
});

app.post('/api/market/posts', requireAuth, requireRole('seller'), (req, res) => {
  const m = req.auth.market;
  const user = req.auth.user;
  const store = m.stores.find((s) => s.id === user.storeId);
  const { type, caption, mediaUrl, videoUrl, isAd } = req.body || {};
  const allowed = ['photo', 'video', 'ad'];

  if (!store) return res.status(400).json({ error: 'Satıcı mağazası bulunamadı' });
  if (!allowed.includes(type)) return res.status(400).json({ error: 'type photo, video veya ad olmalı' });
  if (!cleanText(caption) || !cleanText(mediaUrl)) {
    return res.status(400).json({ error: 'caption ve mediaUrl gerekli' });
  }

  const post = {
    id: uid('post'),
    storeId: store.id,
    authorUserId: user.id,
    type,
    caption: cleanText(caption),
    mediaUrl: cleanText(mediaUrl),
    isAd: Boolean(isAd) || type === 'ad',
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString()
  };
  if (videoUrl) post.videoUrl = cleanText(videoUrl);

  m.posts.unshift(post);
  m.events.push({
    id: uid('ev'),
    type: post.isAd ? 'ad_post_created' : 'post_created',
    storeId: store.id,
    sellerId: user.sellerProfileId || null,
    postId: post.id,
    at: post.createdAt
  });
  saveMarket(m);
  res.status(201).json({ post: enrichPost(m, post) });
});

app.post('/api/market/posts/:id/like', (req, res) => {
  const auth = getUserFromRequest(req);
  const m = auth?.market || loadMarket();
  const post = m.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı' });

  post.likes = Number(post.likes) || 0;
  if (auth?.user) {
    post.likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    if (!post.likedBy.includes(auth.user.id)) {
      post.likedBy.push(auth.user.id);
      post.likes += 1;
    }
  } else {
    post.likes += 1;
  }

  saveMarket(m);
  res.json({ post: enrichPost(m, post) });
});

app.get('/api/market/posts/:id/comments', (req, res) => {
  const m = loadMarket();
  const post = m.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı' });

  const comments = m.comments
    .filter((c) => c.postId === post.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((c) => enrichComment(m, c));
  res.json({ count: comments.length, comments });
});

app.post('/api/market/posts/:id/comments', requireAuth, (req, res) => {
  const m = req.auth.market;
  const post = m.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post bulunamadı' });

  const { text } = req.body || {};
  if (!cleanText(text)) return res.status(400).json({ error: 'text gerekli' });

  const comment = {
    id: uid('cmt'),
    postId: post.id,
    userId: req.auth.user.id,
    text: cleanText(text),
    createdAt: new Date().toISOString()
  };
  m.comments.push(comment);
  saveMarket(m);
  res.status(201).json({ comment: enrichComment(m, comment) });
});

app.get('/api/market/messages', (req, res) => {
  const auth = getUserFromRequest(req);
  const m = auth?.market || loadMarket();
  const { storeId } = req.query;

  if (!auth && !storeId) {
    return res.status(400).json({ error: 'storeId gerekli' });
  }

  let messages = [...m.messages];
  if (storeId) messages = messages.filter((msg) => msg.storeId === storeId);

  if (auth?.user?.role === 'seller') {
    const ownStoreId = auth.user.storeId;
    messages = messages.filter((msg) => msg.storeId === ownStoreId || msg.fromUserId === auth.user.id || msg.toUserId === auth.user.id);
  } else if (auth?.user) {
    messages = messages.filter((msg) => msg.fromUserId === auth.user.id || msg.toUserId === auth.user.id);
  }

  messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ count: messages.length, messages });
});

app.post('/api/market/messages', requireAuth, (req, res) => {
  const m = req.auth.market;
  const user = req.auth.user;
  const { storeId, text, toUserId } = req.body || {};
  const store = m.stores.find((s) => s.id === storeId);

  if (!store || !cleanText(text)) {
    return res.status(400).json({ error: 'Geçerli storeId ve text gerekli' });
  }
  if (user.role === 'seller' && user.storeId !== storeId) {
    return res.status(403).json({ error: 'Sadece kendi mağazanız adına mesaj gönderebilirsiniz' });
  }

  const recipient =
    toUserId ||
    (user.role === 'customer'
      ? sellerUserForStore(m, store)?.id
      : null);

  if (recipient && !m.users.some((u) => u.id === recipient)) {
    return res.status(404).json({ error: 'Alıcı kullanıcı bulunamadı' });
  }

  const message = {
    id: uid('msg'),
    storeId,
    fromUserId: user.id,
    toUserId: recipient,
    text: cleanText(text),
    createdAt: new Date().toISOString()
  };

  m.messages.push(message);
  saveMarket(m);
  res.status(201).json({ message });
});

app.post('/api/market/chatbot', (req, res) => {
  const auth = getUserFromRequest(req);
  const m = auth?.market || loadMarket();
  const { message, storeId } = req.body || {};

  if (!cleanText(message)) return res.status(400).json({ error: 'message gerekli' });

  const resolvedStoreId = storeId || (auth?.user?.role === 'seller' ? auth.user.storeId : null);
  const store = resolvedStoreId ? m.stores.find((s) => s.id === resolvedStoreId) || null : null;
  const response = chatbotReply(cleanText(message), { market: m, store, user: auth?.user || null });
  const chatLog = {
    id: uid('chat'),
    userId: auth?.user?.id || null,
    role: auth?.user?.role || null,
    storeId: store?.id || resolvedStoreId || null,
    message: cleanText(message),
    response,
    createdAt: new Date().toISOString()
  };

  m.chatLogs.push(chatLog);
  saveMarket(m);
  res.json({
    response,
    chatLog,
    store,
    user: publicUser(auth?.user || null)
  });
});

app.get('/api/market/analytics', (_req, res) => {
  const m = loadMarket();
  const byDistrict = {};
  for (const c of m.customers) {
    const district = c.district || 'Bilinmiyor';
    byDistrict[district] = byDistrict[district] || {
      district,
      customers: 0,
      subscribers: 0,
      events: 0,
      latSum: 0,
      lngSum: 0,
      geoCount: 0
    };
    byDistrict[district].customers += 1;
    byDistrict[district].subscribers += (c.subscribedStoreIds || []).length;
    if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      byDistrict[district].latSum += c.lat;
      byDistrict[district].lngSum += c.lng;
      byDistrict[district].geoCount += 1;
    }
  }
  for (const e of m.events) {
    if (!e.district) continue;
    byDistrict[e.district] = byDistrict[e.district] || {
      district: e.district,
      customers: 0,
      subscribers: 0,
      events: 0,
      latSum: 0,
      lngSum: 0,
      geoCount: 0
    };
    byDistrict[e.district].events += 1;
  }

  const districts = Object.values(byDistrict).map((d) => ({
    district: d.district,
    customers: d.customers,
    subscribers: d.subscribers,
    events: d.events,
    centerLat: d.geoCount ? d.latSum / d.geoCount : null,
    centerLng: d.geoCount ? d.lngSum / d.geoCount : null
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
      posts: m.posts.length,
      messages: m.messages.length,
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
