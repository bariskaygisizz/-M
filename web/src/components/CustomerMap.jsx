import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatDate, formatMoney, statusLabel, stockLabel, STORE_COLORS, STORE_TYPE_LABELS } from '../api';
import { useAuth } from '../auth';
import MarketMap from './MarketMap';

const DEMO_LOCATION = { lat: 40.988, lng: 29.028 };

export default function CustomerMap() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [mode, setMode] = useState('stores');
  const [userLocation, setUserLocation] = useState(DEMO_LOCATION);
  const [focus, setFocus] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState('Misafir keşif açık: stokları giriş yapmadan görebilirsin.');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const customerLoggedIn = isAuthenticated && user?.role === 'customer';
  const customerId = customerLoggedIn && !user.id?.startsWith('cust-local') ? user.id : 'cust-deniz';

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.t);
    showToast.t = window.setTimeout(() => setToast(''), 3200);
  };

  const track = useCallback(
    async (payload) => {
      try {
        await api.trackEvent({
          customerId: customerLoggedIn ? customerId : null,
          lat: userLocation.lat,
          lng: userLocation.lng,
          district: user?.district || 'Kadıköy',
          ...payload
        });
      } catch {
        /* analytics is best-effort */
      }
    },
    [customerId, customerLoggedIn, user, userLocation]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusKm: 18,
        product: query,
        type: typeFilter
      };
      const [storeRes, productRes, orderRes] = await Promise.all([
        api.stores(params),
        api.products({ q: query, lat: userLocation.lat, lng: userLocation.lng, inStock: mode === 'products' ? '1' : '' }),
        customerLoggedIn ? api.orders({ customerId }) : Promise.resolve({ orders: [] })
      ]);
      setStores(storeRes.stores || []);
      setProducts(productRes.products || []);
      setOrders(orderRes.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerId, customerLoggedIn, mode, query, typeFilter, userLocation]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    api
      .store(selectedId, { lat: userLocation.lat, lng: userLocation.lng })
      .then((data) => {
        setDetail(data);
        setFocus({ lat: data.store.lat, lng: data.store.lng, zoom: 15 });
        track({ type: 'store_view', storeId: selectedId });
      })
      .catch((err) => setError(err.message));
  }, [selectedId, track, userLocation]);

  const locateMe = () => {
    if (!navigator.geolocation) {
      showToast('Tarayıcı konum desteklemiyor, Kadıköy demo konumu kullanılıyor.');
      track({ type: 'location_open' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(next);
        setFocus({ ...next, zoom: 14 });
        showToast('Konum açıldı, yakındaki stoklar yenileniyor.');
        track({ type: 'location_open', ...next });
      },
      () => {
        showToast('Konum izni verilmedi, Kadıköy demo konumu aktif.');
        track({ type: 'location_open' });
      }
    );
  };

  const search = () => {
    setMode(query ? 'products' : 'stores');
    track({ type: 'search', query });
    load();
  };

  const addToCart = (product) => {
    if ((product.stock || 0) <= 0) {
      showToast(product.restockAt ? `Stok yok; ${formatDate(product.restockAt)} bekleniyor.` : 'Bu ürün stokta yok.');
      return;
    }
    setCart((prev) => {
      const currentStore = prev[0]?.storeId;
      if (currentStore && currentStore !== product.storeId) {
        showToast('Tek sipariş sepeti tek mağazadan hazırlanır.');
        return prev;
      }
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => (item.productId === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [
        ...prev,
        {
          productId: product.id,
          storeId: product.storeId,
          name: product.name,
          price: product.price,
          qty: 1
        }
      ];
    });
    showToast(`${product.name} sepete eklendi.`);
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    if (!customerLoggedIn) {
      openAuthModal('customer', { mode: 'login' });
      showToast('Sipariş için müşteri girişi gerekir.');
      return;
    }
    try {
      const { order } = await api.createOrder({
        customerId,
        storeId: cart[0].storeId,
        items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
        customerLat: userLocation.lat,
        customerLng: userLocation.lng
      });
      setCart([]);
      setMode('orders');
      showToast(`Sipariş alındı. Tahmini teslimat ~${order.etaMinutes} dk.`);
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const messageSeller = () => {
    if (!isAuthenticated) {
      openAuthModal('customer', { mode: 'login' });
      return;
    }
    api
      .messages({ storeId: detail?.store.id, sellerId: detail?.seller?.id, text: 'Merhaba, ürün hakkında bilgi almak istiyorum.' })
      .catch(() => null);
    showToast('Satıcıya demo mesaj isteği gönderildi.');
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  return (
    <div className="map-stage">
      <MarketMap stores={stores} selectedId={selectedId} userLocation={userLocation} onSelect={setSelectedId} focus={focus} />

      <section className="floating-search glass-panel">
        <div>
          <p className="eyebrow">Misafir keşif</p>
          <strong>Ürün, stok ve ETA ara</strong>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="süt, ekmek, deterjan..."
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tüm mağazalar</option>
          <option value="market">Market</option>
          <option value="bakkal">Bakkal</option>
          <option value="sutcu">Sütçü</option>
        </select>
        <button type="button" className="btn btn-accent" onClick={search}>
          Ara
        </button>
        <button type="button" className="btn btn-ghost" onClick={locateMe}>
          Konumum
        </button>
      </section>

      <aside className="map-dock glass-panel">
        <div className="dock-head">
          <div>
            <p className="eyebrow">Yakındaki canlı stok</p>
            <h2>{mode === 'products' ? 'Ürünler' : mode === 'orders' ? 'Siparişler' : 'Mağazalar'}</h2>
          </div>
          <span className="session-pill">{customerLoggedIn ? user.name : 'Misafir'}</span>
        </div>

        <div className="seg dark">
          {[
            ['stores', 'Mağazalar'],
            ['products', 'Ürünler'],
            ['orders', 'Siparişler']
          ].map(([id, label]) => (
            <button key={id} type="button" className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="banner error compact">{error}</div>}
        {toast && <div className="banner toast compact">{toast}</div>}

        <div className="dock-scroll">
          {loading && <p className="muted">Harita verisi yükleniyor...</p>}

          {mode === 'stores' &&
            stores.map((store) => (
              <button
                type="button"
                key={store.id}
                className={`store-card ${selectedId === store.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(store.id)}
              >
                <span className="type-dot" style={{ background: STORE_COLORS[store.type] }} />
                <span>
                  <strong>{store.name}</strong>
                  <small>
                    {STORE_TYPE_LABELS[store.type]} · {store.district} · {store.inStockCount} stokta
                  </small>
                </span>
                <em>{store.etaMinutes != null ? `~${store.etaMinutes} dk` : 'Haritada'}</em>
              </button>
            ))}

          {mode === 'products' &&
            products.map((product) => {
              const stock = stockLabel(product);
              return (
                <article key={product.id} className="product-card">
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {product.storeName} · {product.district} · ~{product.etaMinutes ?? '?'} dk
                    </small>
                  </div>
                  <div className="product-card-actions">
                    <span>{formatMoney(product.price)}</span>
                    <span className={`stock ${stock.tone}`}>{stock.text}</span>
                    <button type="button" className="btn btn-sm" onClick={() => addToCart(product)}>
                      Sepete
                    </button>
                  </div>
                </article>
              );
            })}

          {mode === 'orders' && !customerLoggedIn && (
            <div className="empty-state">
              <strong>Sipariş takibi için giriş yap</strong>
              <p>Harita ve stok misafire açık; sepeti siparişe çevirmek müşteri hesabı gerektirir.</p>
              <button type="button" className="btn btn-accent" onClick={() => openAuthModal('customer', { mode: 'login' })}>
                Müşteri girişi
              </button>
            </div>
          )}

          {mode === 'orders' &&
            customerLoggedIn &&
            orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="product-row-top">
                  <strong>{order.id}</strong>
                  <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <small>
                  {formatDate(order.createdAt)} · ~{order.etaMinutes} dk · {formatMoney(order.total)}
                </small>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.productId}>
                      {item.qty}x {item.name}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
      </aside>

      {detail && (
        <section className="store-sheet glass-panel animate-in">
          <button type="button" className="icon-btn sheet-close" onClick={() => setSelectedId(null)} aria-label="Kapat">
            x
          </button>
          <p className="eyebrow">{STORE_TYPE_LABELS[detail.store.type]}</p>
          <h2>{detail.store.name}</h2>
          <p className="muted">{detail.store.address}</p>
          <div className="metric-row">
            <span>~{detail.store.etaMinutes ?? '?'} dk</span>
            <span>{detail.store.distanceKm != null ? `${detail.store.distanceKm.toFixed(1)} km` : 'Yakında'}</span>
            <span>{detail.store.rating} puan</span>
            <span>{detail.store.subscriberCount} abone</span>
          </div>
          <p>{detail.store.description}</p>
          <div className="detail-actions">
            <button type="button" className="btn btn-ghost" onClick={messageSeller}>
              Mesaj
            </button>
            <button type="button" className="btn btn-accent" onClick={() => setMode('products')}>
              Ürünleri gör
            </button>
          </div>
          <div className="mini-product-grid">
            {detail.products.map((product) => {
              const stock = stockLabel(product);
              return (
                <article key={product.id}>
                  <strong>{product.name}</strong>
                  <span>{formatMoney(product.price)}</span>
                  <small className={`stock ${stock.tone}`}>{stock.text}</small>
                  <button type="button" className="btn btn-sm" onClick={() => addToCart({ ...product, storeName: detail.store.name })}>
                    Sepete ekle
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {cart.length > 0 && (
        <section className="cart-float glass-panel">
          <div>
            <strong>{cart.length} kalem</strong>
            <span>{formatMoney(cartTotal)}</span>
          </div>
          <button type="button" className="btn btn-accent" onClick={placeOrder}>
            Sipariş ver
          </button>
        </section>
      )}
    </div>
  );
}
