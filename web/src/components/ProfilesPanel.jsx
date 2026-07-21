import { useEffect, useState } from 'react';
import { api, formatDate, STORE_TYPE_LABELS } from '../api';

export default function ProfilesPanel() {
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.customers(), api.sellers()])
      .then(([c, s]) => {
        setCustomers(c.customers);
        setSellers(s.sellers);
        if (c.customers[0]) setSelectedCustomer(c.customers[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;
    api
      .customer(selectedCustomer)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [selectedCustomer]);

  if (error && !customers.length) return <div className="banner error">{error}</div>;

  return (
    <div className="profiles-layout">
      <header className="section-intro">
        <p className="eyebrow">Profiller</p>
        <h2>Müşteri ve işletme profilleri</h2>
        <p>
          İki taraf ayrı kimliklerle yaşar: müşteri konum + tercihler + abonelikler; işletme mağaza
          bilgisi + stok + abone kitlesi.
        </p>
      </header>

      <div className="profiles-grid">
        <section className="soft-block">
          <h3>Müşteriler</h3>
          <div className="person-list">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`person-row ${selectedCustomer === c.id ? 'selected' : ''}`}
                onClick={() => setSelectedCustomer(c.id)}
              >
                <strong>{c.name}</strong>
                <span>
                  {c.district} · {c.subscribedStoreIds?.length || 0} abonelik
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="soft-block">
          <h3>Seçili müşteri profili</h3>
          {detail ? (
            <>
              <dl className="dl">
                <div>
                  <dt>Ad</dt>
                  <dd>{detail.customer.name}</dd>
                </div>
                <div>
                  <dt>İletişim</dt>
                  <dd>
                    {detail.customer.email}
                    <br />
                    {detail.customer.phone}
                  </dd>
                </div>
                <div>
                  <dt>Konum</dt>
                  <dd>
                    {detail.customer.district}
                    <br />
                    <span className="mono">
                      {detail.customer.lat}, {detail.customer.lng}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Tercihler</dt>
                  <dd>{(detail.customer.preferences || []).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Sipariş / aktiflik</dt>
                  <dd>
                    {detail.customer.orderCount} sipariş · son {formatDate(detail.customer.lastActiveAt)}
                  </dd>
                </div>
              </dl>
              <h4>Abone olduğu mağazalar</h4>
              <ul className="item-list">
                {detail.subscribedStores.map((s) => (
                  <li key={s.id}>
                    {s.name} ({STORE_TYPE_LABELS[s.type]}) — {s.district}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Yükleniyor...</p>
          )}
        </section>

        <section className="soft-block full-span">
          <h3>İşletme / satıcı profilleri</h3>
          <div className="biz-grid">
            {sellers.map((s) => (
              <article key={s.id} className="biz-card">
                <p className="eyebrow">{STORE_TYPE_LABELS[s.store?.type] || 'İşletme'}</p>
                <h4>{s.store?.name}</h4>
                <p className="muted">{s.store?.address}</p>
                <dl className="dl compact">
                  <div>
                    <dt>Satıcı</dt>
                    <dd>{s.name}</dd>
                  </div>
                  <div>
                    <dt>Abone</dt>
                    <dd>{s.store?.subscriberCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt>Puan</dt>
                    <dd>{s.store?.rating}</dd>
                  </div>
                  <div>
                    <dt>Durum</dt>
                    <dd>{s.store?.verified ? 'Onaylı' : 'Beklemede'}</dd>
                  </div>
                </dl>
                <p>{s.bio}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
