import { useCallback, useEffect, useMemo, useState } from 'react';
import MarketMap from './MarketMap';
import {
  api,
  formatMoney,
  formatDate,
  stockLabel,
  statusLabel,
  STORE_TYPE_LABELS,
  STORE_COLORS
} from '../api';

const DEMO_CUSTOMER = 'cust-deniz';

export default function CustomerPanel() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [userLocation, setUserLocation] = useState({ lat: 40.988, lng: 29.028 });
  const [located, setLocated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('stores');
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const track = useCallback(
    async (payload) => {
      try {
        await api.trackEvent({
          customerId: DEMO_CUSTOMER,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          district: 'Kadıköy',
          ...payload
        });
      } catch {
        /* analytics best-effort */
      }
    },
    [userLocation]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        lat: String(userLocation.lat),
        lng: String(userLocation.lng),
        radiusKm: '12'
      };
      if (typeFilter) params.type = typeFilter;
      if (query) params.product = query;

      const [storeRes, productRes, orderRes] = await Promise.all([
        api.stores(params),
        api.products({
          q: query || undefined,
          lat: String(userLocation.lat),
          lng: String(userLocation.lng),
          inStock: mode === 'products' ? '1' : undefined
        }),
        api.orders({ customerId: DEMO_CUSTOMER })
      ]);
      setStores(storeRes.stores);
      setProducts(productRes.products);
      setOrders(orderRes.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation, typeFilter, query, mode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    api
      .store(selectedId, { lat: String(userLocation.lat), lng: String(userLocation.lng) })
      .then((data) => {
        setDetail(data);
        track({ type: 'store_view', storeId: selectedId });
      })
      .catch((err) => setError(err.message));
  }, [selectedId, userLocation, track]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcı konum desteklemiyor. Demo konum kullanılıyor.');
      setLocated(true);
      track({ type: 'location_open' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocated(true);
        track({
          type: 'location_open',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        showToast('Konum açıldı — yakındaki stoklar güncellendi');
      },
      () => {
        setLocated(true);
        track({ type: 'location_open' });
        showToast('İzin yok — Kadıköy demo konumu kullanılıyor');
      }
    );
  };

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast(product.restockAt ? `Stok yok · ${formatDate(product.restockAt)} bekleniyor` : 'Stok yok');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          storeId: product.storeId,
          qty: 1
        }
      ];
    });
    showToast(`${product.name} sepete eklendi`);
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    const storeId = cart[0].storeId;
    if (cart.some((i) => i.storeId !== storeId)) {
      showToast('Tek seferde tek mağazadan sipariş verin');
      return;
    }
    try {
      const { order } = await api.createOrder({
        customerId: DEMO_CUSTOMER,
        storeId,
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
        customerLat: userLocation.lat,
        customerLng: userLocation.lng
      });
      setCart([]);
      setMode('orders');
      showToast(`Sipariş alındı · ~${order.etaMinutes} dk`);
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const subscribe = async () => {
    if (!selectedId) return;
    try {
      await api.subscribe({ customerId: DEMO_CUSTOMER, storeId: selectedId });
      showToast('Mağazaya abone olundu — stok bildirimleri açıldı');
      const data = await api.store(selectedId, {
        lat: String(userLocation.lat),
        lng: String(userLocation.lng)
      });
      setDetail(data);
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.qty, 0),
    [cart]
  );

  const search = () => {
    track({ type: 'search', query });
    load();
  };

  return (
    <div className="panel-layout">
      <aside className="panel-side">
        <header className="panel-side-head">
          <p className="eyebrow">Müşteri paneli</p>
          <h2>Yakınımdaki stok</h2>
          <p className="muted">
            Konumunu aç, en yakın market / bakkal / sütçüde ne var gör, süreyi takip et.
          </p>
        </header>

        <div className="toolbar">
          <button type="button" className="btn btn-accent" onClick={handleLocate}>
            {located ? 'Konum güncelle' : 'Konumumu aç'}
          </button>
          <div className="seg">
            {[
              ['stores', 'Mağazalar'],
              ['products', 'Ürünler'],
              ['orders', 'Siparişler']
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={mode === id ? 'active' : ''}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filters">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Ne lazım? süt, ekmek, deterjan..."
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tüm işletmeler</option>
            <option value="market">Market</option>
            <option value="bakkal">Bakkal</option>
            <option value="sutcu">Sütçü</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={search}>
            Ara
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}
        {toast && <div className="banner toast">{toast}</div>}

        {mode === 'stores' && (
          <div className="scroll-list">
            {loading && <p className="muted">Yükleniyor...</p>}
            {!loading &&
              stores.map((store) => (
                <article
                  key={store.id}
                  className={`store-row ${selectedId === store.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(store.id)}
                >
                  <div className="store-row-top">
                    <span
                      className="type-dot"
                      style={{ background: STORE_COLORS[store.type] }}
                    />
                    <strong>{store.name}</strong>
                    <span className="chip">{STORE_TYPE_LABELS[store.type]}</span>
                  </div>
                  <div className="store-meta">
                    <span>{store.district}</span>
                    {store.distanceKm != null && <span>{store.distanceKm.toFixed(1)} km</span>}
                    {store.etaMinutes != null && <span>~{store.etaMinutes} dk</span>}
                    <span>{store.inStockCount} ürün stokta</span>
                  </div>
                </article>
              ))}
          </div>
        )}

        {mode === 'products' && (
          <div className="scroll-list">
            {products.map((p) => {
              const stock = stockLabel(p);
              return (
                <article key={p.id} className="product-row">
                  <div className="product-row-top">
                    <strong>{p.name}</strong>
                    <span>{formatMoney(p.price)}</span>
                  </div>
                  <div className="store-meta">
                    <span>{p.storeName}</span>
                    {p.etaMinutes != null && <span>~{p.etaMinutes} dk</span>}
                    <span className={`stock ${stock.tone}`}>{stock.text}</span>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => addToCart(p)}>
                    Sepete ekle
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {mode === 'orders' && (
          <div className="scroll-list">
            {orders.map((o) => (
              <article key={o.id} className="order-row">
                <div className="product-row-top">
                  <strong>{o.id}</strong>
                  <span className={`status status-${o.status}`}>{statusLabel(o.status)}</span>
                </div>
                <div className="store-meta">
                  <span>{formatDate(o.createdAt)}</span>
                  <span>~{o.etaMinutes} dk</span>
                  <span>{formatMoney(o.total)}</span>
                </div>
                <ul className="item-list">
                  {o.items.map((i) => (
                    <li key={i.productId}>
                      {i.qty}× {i.name}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {!orders.length && <p className="muted">Henüz sipariş yok.</p>}
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-bar">
            <div>
              <strong>{cart.length} kalem</strong>
              <span>{formatMoney(cartTotal)}</span>
            </div>
            <button type="button" className="btn btn-accent" onClick={placeOrder}>
              Sipariş ver
            </button>
          </div>
        )}
      </aside>

      <section className="panel-main">
        <MarketMap
          stores={stores}
          selectedId={selectedId}
          userLocation={userLocation}
          onSelect={setSelectedId}
        />
        {detail && (
          <div className="detail-sheet animate-in">
            <div className="detail-head">
              <div>
                <p className="eyebrow">{STORE_TYPE_LABELS[detail.store.type]}</p>
                <h3>{detail.store.name}</h3>
                <p className="muted">{detail.store.address}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            <div className="detail-stats">
              <div>
                <span>Mesafe</span>
                <strong>
                  {detail.store.distanceKm != null
                    ? `${detail.store.distanceKm.toFixed(1)} km`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>Tahmini süre</span>
                <strong>~{detail.store.etaMinutes ?? '—'} dk</strong>
              </div>
              <div>
                <span>Abone</span>
                <strong>{detail.store.subscriberCount}</strong>
              </div>
              <div>
                <span>Puan</span>
                <strong>{detail.store.rating}</strong>
              </div>
            </div>
            <p className="detail-desc">{detail.store.description}</p>
            <div className="detail-actions">
              <button type="button" className="btn btn-primary" onClick={subscribe}>
                Mağazaya abone ol
              </button>
              {detail.seller && (
                <span className="muted">İşletmeci: {detail.seller.name}</span>
              )}
            </div>
            <h4>Ürünler & stok</h4>
            <div className="product-grid">
              {detail.products.map((p) => {
                const stock = stockLabel(p);
                return (
                  <div key={p.id} className="product-tile">
                    <strong>{p.name}</strong>
                    <span>{formatMoney(p.price)}</span>
                    <span className={`stock ${stock.tone}`}>{stock.text}</span>
                    <button type="button" className="btn btn-sm" onClick={() => addToCart(p)}>
                      Sepete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
