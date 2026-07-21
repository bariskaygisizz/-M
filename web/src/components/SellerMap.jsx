import { useCallback, useEffect, useState } from 'react';
import { api, formatDate, formatMoney, statusLabel, stockLabel, STORE_TYPE_LABELS } from '../api';
import { useAuth } from '../auth';
import ChatBot from './ChatBot';
import MarketMap from './MarketMap';

const POST_KEY = 'ym_posts';

function readPosts() {
  try {
    return JSON.parse(localStorage.getItem(POST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalPost(post) {
  const next = [post, ...readPosts()];
  localStorage.setItem(POST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('ym_posts_changed'));
}

function localProduct(form, storeId) {
  return {
    id: `p-local-${Date.now()}`,
    storeId,
    name: form.name,
    category: form.category,
    price: Number(form.price || 0),
    stock: Number(form.stock || 0),
    unit: form.unit || 'adet',
    restockAt: null,
    imageHint: 'local'
  };
}

export default function SellerMap() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('products');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Temel Gıda',
    price: '',
    stock: '',
    unit: 'adet'
  });
  const [postForm, setPostForm] = useState({ caption: '', photoUrl: '', videoUrl: '', ad: false });
  const [drafts, setDrafts] = useState({});

  const sellerAllowed = isAuthenticated && user?.role === 'seller';

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.t);
    showToast.t = window.setTimeout(() => setToast(''), 2800);
  };

  const load = useCallback(async () => {
    if (!sellerAllowed) return;
    setError('');
    try {
      if (user.store?.id?.startsWith('store-local')) {
        setData({
          seller: user,
          store: user.store,
          products: [],
          orders: [],
          subscribers: []
        });
        return;
      }
      const detail = await api.seller(user.id);
      setData(detail);
      setDrafts(
        Object.fromEntries(
          (detail.products || []).map((p) => [
            p.id,
            { stock: p.stock, price: p.price, restockAt: p.restockAt ? p.restockAt.slice(0, 16) : '' }
          ])
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }, [sellerAllowed, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sellerAllowed) {
    return (
      <div className="map-stage auth-required-stage">
        <div className="auth-required glass-panel">
          <p className="eyebrow">Satıcı alanı kilitli</p>
          <h2>Harita araçları için satıcı girişi/kayıt gerekli</h2>
          <p>
            Ürün yükleme, stok/fiyat yönetimi, reklam postu, sipariş ve AI destek araçları yalnızca satıcı hesabıyla açılır.
          </p>
          <button type="button" className="btn btn-accent" onClick={() => openAuthModal('seller', { mode: 'register' })}>
            Satıcı giriş/kayıt
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="map-stage auth-required-stage">
        <div className="loading-block glass-panel">Satıcı haritası yükleniyor...</div>
      </div>
    );
  }

  const { seller, store, products, orders, subscribers } = data;

  const updateProductForm = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProduct = async (event) => {
    event.preventDefault();
    const optimistic = localProduct(productForm, store.id);
    try {
      let saved = optimistic;
      try {
        const res = await api.createProduct(optimistic);
        saved = res.product || optimistic;
      } catch (err) {
        if (err.status && err.status !== 404) throw err;
      }
      setData((prev) => ({ ...prev, products: [saved, ...prev.products] }));
      setDrafts((prev) => ({ ...prev, [saved.id]: { stock: saved.stock, price: saved.price, restockAt: '' } }));
      setProductForm({ name: '', category: 'Temel Gıda', price: '', stock: '', unit: 'adet' });
      showToast('Ürün eklendi.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const updateDraft = (productId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value }
    }));
  };

  const saveProduct = async (product) => {
    const draft = drafts[product.id] || {};
    const stock = Number(draft.stock ?? product.stock);
    const price = Number(draft.price ?? product.price);
    const restockAt = draft.restockAt ? new Date(draft.restockAt).toISOString() : null;
    try {
      if (!product.id.startsWith('p-local')) {
        await api.updateStock(product.id, { stock, restockAt: stock === 0 ? restockAt : null });
        try {
          await api.updateProduct(product.id, { price });
        } catch (err) {
          if (err.status && err.status !== 404) throw err;
        }
      }
      setData((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === product.id ? { ...p, stock, price, restockAt: stock === 0 ? restockAt : null } : p
        )
      }));
      showToast('Stok/fiyat güncellendi.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const publishPost = async (event) => {
    event.preventDefault();
    const mediaUrl = postForm.videoUrl || postForm.photoUrl;
    const post = {
      id: `post-${Date.now()}`,
      storeId: store.id,
      sellerId: seller.id,
      storeName: store.name,
      storeType: store.type,
      district: store.district,
      caption: postForm.caption,
      mediaUrl,
      mediaType: postForm.videoUrl ? 'video' : 'photo',
      ad: postForm.ad,
      likes: 0,
      comments: [],
      createdAt: new Date().toISOString()
    };
    try {
      let saved = post;
      try {
        const res = await api.createPost(post);
        saved = res.post || post;
      } catch (err) {
        if (err.status && err.status !== 404) throw err;
      }
      saveLocalPost(saved);
      setPostForm({ caption: '', photoUrl: '', videoUrl: '', ad: false });
      showToast('Post feed akışına yayınlandı.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const setOrderStatus = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
      setData((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => (order.id === orderId ? { ...order, status } : order))
      }));
      showToast('Sipariş durumu güncellendi.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const stats = {
    stock: products.reduce((sum, p) => sum + Number(p.stock || 0), 0),
    low: products.filter((p) => Number(p.stock || 0) <= 5).length,
    activeOrders: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length
  };

  return (
    <div className="map-stage seller-stage">
      <MarketMap stores={[store]} selectedId={store.id} focus={{ lat: store.lat, lng: store.lng, zoom: 15 }} />

      <section className="seller-hud glass-panel">
        <div>
          <p className="eyebrow">Satıcı kontrol haritası</p>
          <h2>{store.name}</h2>
          <p className="muted">
            {STORE_TYPE_LABELS[store.type]} · {store.district} · {store.address}
          </p>
        </div>
        <div className="metric-row">
          <span>{products.length} ürün</span>
          <span>{stats.stock} stok</span>
          <span>{stats.low} düşük</span>
          <span>{stats.activeOrders} aktif sipariş</span>
        </div>
      </section>

      <aside className="seller-tools glass-panel">
        <div className="seg dark">
          {[
            ['products', 'Ürün/Stok'],
            ['post', 'Post/Reklam'],
            ['orders', 'Sipariş'],
            ['subs', 'Abone']
          ].map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {error && <div className="banner error compact">{error}</div>}
        {toast && <div className="banner toast compact">{toast}</div>}

        {tab === 'products' && (
          <div className="seller-tab">
            <form className="tool-form" onSubmit={addProduct}>
              <h3>Yeni ürün ekle</h3>
              <div className="form-grid">
                <label>
                  Ürün adı
                  <input value={productForm.name} onChange={(e) => updateProductForm('name', e.target.value)} required />
                </label>
                <label>
                  Kategori
                  <input value={productForm.category} onChange={(e) => updateProductForm('category', e.target.value)} required />
                </label>
                <label>
                  Fiyat
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => updateProductForm('price', e.target.value)}
                    required
                  />
                </label>
                <label>
                  Stok
                  <input type="number" value={productForm.stock} onChange={(e) => updateProductForm('stock', e.target.value)} required />
                </label>
                <label>
                  Birim
                  <input value={productForm.unit} onChange={(e) => updateProductForm('unit', e.target.value)} />
                </label>
              </div>
              <button type="submit" className="btn btn-accent btn-wide">
                Ürünü yayınla
              </button>
            </form>

            <div className="seller-product-list">
              {products.map((product) => {
                const stock = stockLabel(product);
                const draft = drafts[product.id] || { stock: product.stock, price: product.price, restockAt: '' };
                return (
                  <article key={product.id} className="seller-product-row">
                    <div>
                      <strong>{product.name}</strong>
                      <small>
                        {product.category} · <span className={`stock ${stock.tone}`}>{stock.text}</span>
                      </small>
                    </div>
                    <label>
                      Fiyat
                      <input type="number" step="0.01" value={draft.price} onChange={(e) => updateDraft(product.id, 'price', e.target.value)} />
                    </label>
                    <label>
                      Stok
                      <input type="number" value={draft.stock} onChange={(e) => updateDraft(product.id, 'stock', e.target.value)} />
                    </label>
                    <label>
                      Geliş tarihi
                      <input
                        type="datetime-local"
                        value={draft.restockAt || ''}
                        onChange={(e) => updateDraft(product.id, 'restockAt', e.target.value)}
                      />
                    </label>
                    <button type="button" className="btn btn-sm" onClick={() => saveProduct(product)}>
                      Kaydet
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'post' && (
          <form className="tool-form" onSubmit={publishPost}>
            <h3>Instagram benzeri post yayınla</h3>
            <label>
              Açıklama
              <textarea value={postForm.caption} onChange={(e) => setPostForm((p) => ({ ...p, caption: e.target.value }))} required />
            </label>
            <label>
              Fotoğraf URL
              <input value={postForm.photoUrl} onChange={(e) => setPostForm((p) => ({ ...p, photoUrl: e.target.value }))} />
            </label>
            <label>
              Video URL
              <input value={postForm.videoUrl} onChange={(e) => setPostForm((p) => ({ ...p, videoUrl: e.target.value }))} />
            </label>
            <label className="check-row">
              <input type="checkbox" checked={postForm.ad} onChange={(e) => setPostForm((p) => ({ ...p, ad: e.target.checked }))} />
              Reklam / kampanya rozeti göster
            </label>
            <button type="submit" className="btn btn-accent btn-wide">
              Feed'e gönder
            </button>
          </form>
        )}

        {tab === 'orders' && (
          <div className="seller-tab">
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="product-row-top">
                  <strong>{order.id}</strong>
                  <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <small>
                  {formatDate(order.createdAt)} · {formatMoney(order.total)} · ~{order.etaMinutes} dk
                </small>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.productId}>
                      {item.qty}x {item.name}
                    </li>
                  ))}
                </ul>
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => setOrderStatus(order.id, 'on_the_way')}>
                    Yola çıktı
                  </button>
                  <button type="button" className="btn btn-sm btn-accent" onClick={() => setOrderStatus(order.id, 'delivered')}>
                    Teslim edildi
                  </button>
                </div>
              </article>
            ))}
            {!orders.length && <p className="muted">Henüz sipariş yok.</p>}
          </div>
        )}

        {tab === 'subs' && (
          <div className="seller-tab">
            {subscribers.map((subscriber) => (
              <article key={subscriber.id} className="subscriber-card">
                <strong>{subscriber.name}</strong>
                <span>{subscriber.district}</span>
                <small>Son aktif {formatDate(subscriber.lastActiveAt)}</small>
              </article>
            ))}
            {!subscribers.length && <p className="muted">Abone listesi boş. Feed ve reklam postlarıyla mağazayı görünür yap.</p>}
          </div>
        )}
      </aside>

      <ChatBot store={store} products={products} />
    </div>
  );
}
