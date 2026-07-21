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

  if (error) return <div className="banner error">{error}</div>;
  if (!data) return <div className="loading-block">Analitik yükleniyor...</div>;

  const { summary, districts, eventTypes, storeSubs, heatPoints, recentEvents } = data;

  return (
    <div className="analytics-layout">
      <header className="section-intro">
        <p className="eyebrow">Veri toplama & abone haritası</p>
        <h2>Aboneler nerede, nasıl belli olur?</h2>
        <p>
          Müşteri konum açtığında, arama yaptığında, mağaza görüntülediğinde veya abone olduğunda
          sistem olay kaydı tutar. Böylece hangi semtte talep yoğun, hangi mağazanın abonesi nerede
          toplanıyor görülür.
        </p>
      </header>

      <div className="stat-strip">
        <div>
          <span>Müşteri</span>
          <strong>{summary.customers}</strong>
        </div>
        <div>
          <span>Abonelik</span>
          <strong>{summary.totalSubscriptions}</strong>
        </div>
        <div>
          <span>Olay</span>
          <strong>{summary.events}</strong>
        </div>
        <div>
          <span>Sipariş</span>
          <strong>{summary.orders}</strong>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="soft-block map-block">
          <h3>Abone / müşteri konumları</h3>
          <p className="muted">Yeşil daireler müşteri konumlarını; büyüklük abonelik sayısını gösterir.</p>
          <div className="map-frame">
            <MarketMap heatPoints={heatPoints} stores={[]} />
          </div>
        </section>

        <section className="soft-block">
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

        <section className="soft-block">
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

        <section className="soft-block">
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

        <section className="soft-block full-span">
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
