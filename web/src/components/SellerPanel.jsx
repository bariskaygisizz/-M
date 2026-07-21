import { useEffect, useState } from 'react';
import { api, formatMoney, formatDate, stockLabel, statusLabel, STORE_TYPE_LABELS } from '../api';

const DEMO_SELLER = 'seller-ayse';

export default function SellerPanel() {
  const [sellerId, setSellerId] = useState(DEMO_SELLER);
  const [sellers, setSellers] = useState([]);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('stock');
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [restockDraft, setRestockDraft] = useState({});

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = async (id = sellerId) => {
    setError(null);
    try {
      const [list, detail] = await Promise.all([api.sellers(), api.seller(id)]);
      setSellers(list.sellers);
      setData(detail);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load(sellerId);
  }, [sellerId]);

  const updateStock = async (productId, stock) => {
    try {
      const restockAt = restockDraft[productId] || null;
      await api.updateStock(productId, {
        stock: Number(stock),
        restockAt: Number(stock) === 0 ? restockAt : null
      });
      showToast('Stok güncellendi');
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  const setStatus = async (orderId, status) => {
    try {
      await api.updateOrderStatus(orderId, status);
      showToast('Sipariş durumu güncellendi');
      load();
    } catch (err) {
      showToast(err.message);
    }
  };

  if (error && !data) return <div className="banner error">{error}</div>;
  if (!data) return <div className="loading-block">Satıcı paneli yükleniyor...</div>;

  const { seller, store, products, orders, subscribers } = data;

  return (
    <div className="seller-layout">
      <header className="seller-hero">
        <div>
          <p className="eyebrow">Satıcı paneli</p>
          <h2>{store?.name || 'İşletme'}</h2>
          <p className="muted">
            {STORE_TYPE_LABELS[store?.type]} · {store?.district} · {store?.openHours}
          </p>
        </div>
        <div className="seller-switch">
          <label htmlFor="seller-select">Demo satıcı</label>
          <select
            id="seller-select"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          >
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.store?.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {toast && <div className="banner toast">{toast}</div>}

      <div className="stat-strip">
        <div>
          <span>Abone</span>
          <strong>{store?.subscriberCount ?? 0}</strong>
        </div>
        <div>
          <span>Ürün</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span>Aktif sipariş</span>
          <strong>{orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length}</strong>
        </div>
        <div>
          <span>Puan</span>
          <strong>{store?.rating}</strong>
        </div>
      </div>

      <div className="seg wide">
        {[
          ['stock', 'Stok yönetimi'],
          ['orders', 'Siparişler'],
          ['subs', 'Aboneler'],
          ['profile', 'İşletme profili']
        ].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>Fiyat</th>
                <th>Stok</th>
                <th>Durum</th>
                <th>Gelme tarihi (yoksa)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = stockLabel(p);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{formatMoney(p.price)}</td>
                    <td>
                      <input
                        className="stock-input"
                        type="number"
                        min="0"
                        defaultValue={p.stock}
                        id={`stock-${p.id}`}
                      />
                    </td>
                    <td>
                      <span className={`stock ${stock.tone}`}>{stock.text}</span>
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        value={restockDraft[p.id] || (p.restockAt ? p.restockAt.slice(0, 16) : '')}
                        onChange={(e) =>
                          setRestockDraft((prev) => ({
                            ...prev,
                            [p.id]: e.target.value ? new Date(e.target.value).toISOString() : null
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          const el = document.getElementById(`stock-${p.id}`);
                          updateStock(p.id, el?.value ?? p.stock);
                        }}
                      >
                        Kaydet
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card-grid">
          {orders.map((o) => (
            <article key={o.id} className="soft-block">
              <div className="product-row-top">
                <strong>{o.id}</strong>
                <span className={`status status-${o.status}`}>{statusLabel(o.status)}</span>
              </div>
              <p className="muted">{formatDate(o.createdAt)} · ETA ~{o.etaMinutes} dk</p>
              <ul className="item-list">
                {o.items.map((i) => (
                  <li key={i.productId}>
                    {i.qty}× {i.name}
                  </li>
                ))}
              </ul>
              <strong>{formatMoney(o.total)}</strong>
              <div className="row-actions">
                {o.status === 'preparing' && (
                  <button type="button" className="btn btn-sm" onClick={() => setStatus(o.id, 'on_the_way')}>
                    Yola çıktı
                  </button>
                )}
                {o.status === 'on_the_way' && (
                  <button type="button" className="btn btn-sm btn-accent" onClick={() => setStatus(o.id, 'delivered')}>
                    Teslim edildi
                  </button>
                )}
              </div>
            </article>
          ))}
          {!orders.length && <p className="muted">Sipariş yok.</p>}
        </div>
      )}

      {tab === 'subs' && (
        <div className="card-grid">
          <p className="full-span muted">
            Aboneler bu mağazayı takip eder. Haritada ve analitikte konumları görünür — nerede
            yoğunlaştıkları burada netleşir.
          </p>
          {subscribers.map((c) => (
            <article key={c.id} className="soft-block">
              <strong>{c.name}</strong>
              <p className="muted">
                {c.district} · son aktif {formatDate(c.lastActiveAt)}
              </p>
              <p className="mono">
                {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
              </p>
            </article>
          ))}
          {!subscribers.length && <p className="muted">Henüz abone yok.</p>}
        </div>
      )}

      {tab === 'profile' && (
        <div className="profile-grid">
          <article className="soft-block">
            <h3>İşletme profili</h3>
            <dl className="dl">
              <div>
                <dt>İşletme</dt>
                <dd>{store.name}</dd>
              </div>
              <div>
                <dt>Tür</dt>
                <dd>{STORE_TYPE_LABELS[store.type]}</dd>
              </div>
              <div>
                <dt>Adres</dt>
                <dd>{store.address}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{store.phone}</dd>
              </div>
              <div>
                <dt>Çalışma</dt>
                <dd>{store.openHours}</dd>
              </div>
              <div>
                <dt>Açıklama</dt>
                <dd>{store.description}</dd>
              </div>
              <div>
                <dt>Doğrulama</dt>
                <dd>{store.verified ? 'Onaylı işletme' : 'Beklemede'}</dd>
              </div>
            </dl>
          </article>
          <article className="soft-block">
            <h3>Satıcı profili</h3>
            <dl className="dl">
              <div>
                <dt>Ad</dt>
                <dd>{seller.name}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>{seller.email}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{seller.phone}</dd>
              </div>
              <div>
                <dt>Katılım</dt>
                <dd>{formatDate(seller.joinedAt)}</dd>
              </div>
              <div>
                <dt>Bio</dt>
                <dd>{seller.bio}</dd>
              </div>
            </dl>
          </article>
        </div>
      )}
    </div>
  );
}
