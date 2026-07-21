import { useEffect, useState } from 'react';
import MarketMap from './MarketMap';
import { api, formatDate } from '../api';

export default function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .analytics()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="overlay-page"><div className="banner error glass-panel">{error}</div></div>;
  if (!data) return <div className="overlay-page"><div className="loading-block glass-panel">Analitik yükleniyor...</div></div>;

  const { summary, districts, eventTypes, storeSubs, heatPoints, recentEvents } = data;

  return (
    <div className="overlay-page analytics-layout">
      <header className="section-intro glass-panel">
        <p className="eyebrow">Veri toplama & abone haritası</p>
        <h2>Harita üstü talep radarı</h2>
        <p>
          Müşteri konum açtığında, arama yaptığında, mağaza görüntülediğinde veya abone olduğunda
          sistem olay kaydı tutar. Böylece hangi semtte talep yoğun, hangi mağazanın abonesi nerede
          toplanıyor görülür.
        </p>
      </header>

      <div className="stat-strip">
        <div className="glass-panel">
          <span>Müşteri</span>
          <strong>{summary.customers}</strong>
        </div>
        <div className="glass-panel">
          <span>Abonelik</span>
          <strong>{summary.totalSubscriptions}</strong>
        </div>
        <div className="glass-panel">
          <span>Olay</span>
          <strong>{summary.events}</strong>
        </div>
        <div className="glass-panel">
          <span>Sipariş</span>
          <strong>{summary.orders}</strong>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="soft-block map-block glass-panel">
          <h3>Abone / müşteri konumları</h3>
          <p className="muted">Yeşil daireler müşteri konumlarını; büyüklük abonelik sayısını gösterir.</p>
          <div className="map-frame">
            <MarketMap heatPoints={heatPoints} stores={[]} />
          </div>
        </section>

        <section className="soft-block glass-panel">
          <h3>İlçeye göre yoğunluk</h3>
          <div className="bar-list">
            {districts
              .sort((a, b) => b.events + b.subscribers - (a.events + a.subscribers))
              .map((d) => {
                const score = d.events + d.subscribers * 2;
                const max = Math.max(...districts.map((x) => x.events + x.subscribers * 2), 1);
                return (
                  <div key={d.district} className="bar-row">
                    <div className="bar-label">
                      <strong>{d.district}</strong>
                      <span>
                        {d.customers} müşteri · {d.subscribers} abonelik · {d.events} olay
                      </span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(score / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="soft-block glass-panel">
          <h3>Toplanan olay türleri</h3>
          <ul className="event-type-list">
            {Object.entries(eventTypes).map(([type, count]) => (
              <li key={type}>
                <code>{type}</code>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
          <p className="muted tip">
            `location_open` konum açılışı · `search` arama · `store_view` mağaza bakışı ·
            `subscribe` abonelik · `order_placed` sipariş
          </p>
        </section>

        <section className="soft-block glass-panel">
          <h3>Mağaza abone sıralaması</h3>
          <ol className="rank-list">
            {storeSubs.map((s, i) => (
              <li key={s.id}>
                <span className="rank">{i + 1}</span>
                <div>
                  <strong>{s.name}</strong>
                  <span className="muted">{s.district}</span>
                </div>
                <strong>{s.subscriberCount}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="soft-block full-span glass-panel">
          <h3>Son olaylar (canlı veri akışı)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Tür</th>
                  <th>Müşteri</th>
                  <th>İlçe</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.at)}</td>
                    <td>
                      <code>{e.type}</code>
                    </td>
                    <td>{e.customerId || '—'}</td>
                    <td>{e.district || '—'}</td>
                    <td>
                      {e.query || e.storeId || (e.lat != null ? `${e.lat.toFixed(3)}, ${e.lng.toFixed(3)}` : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
