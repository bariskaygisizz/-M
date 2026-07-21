import { useState } from 'react';
import CustomerPanel from './components/CustomerPanel';
import SellerPanel from './components/SellerPanel';
import ProfilesPanel from './components/ProfilesPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import GuidePanel from './components/GuidePanel';

const NAV = [
  { id: 'home', label: 'Ana sayfa' },
  { id: 'customer', label: 'Müşteri' },
  { id: 'seller', label: 'Satıcı' },
  { id: 'profiles', label: 'Profiller' },
  { id: 'analytics', label: 'Analitik' },
  { id: 'guide', label: 'Kılavuz' }
];

function Landing({ onGo }) {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />
      <section className="landing-hero">
        <p className="brand-mark">YakınMarket</p>
        <h1>Yakınındaki stok, dakikalar içinde.</h1>
        <p className="lead">
          Konumunu aç. En yakın market, bakkal ve sütçüde ne var gör. Sipariş kaç dakikada gelir,
          stok ne zaman dolacak — haritada takip et.
        </p>
        <div className="cta-row">
          <button type="button" className="btn btn-accent btn-lg" onClick={() => onGo('customer')}>
            Müşteri olarak başla
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => onGo('seller')}>
            Satıcı paneli
          </button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => onGo('guide')}>
            Kullanım kılavuzu
          </button>
        </div>
      </section>

      <section className="landing-doors">
        {[
          {
            id: 'customer',
            title: 'Müşteri paneli',
            text: 'Harita, yakın stok, ETA, sipariş takibi ve mağaza aboneliği.'
          },
          {
            id: 'seller',
            title: 'Satıcı paneli',
            text: 'Stok güncelle, sipariş yönet, abonelerini ve işletme profilini gör.'
          },
          {
            id: 'profiles',
            title: 'Profiller',
            text: 'Müşteri ve işletme kimlikleri — konum, tercih, abonelik.'
          },
          {
            id: 'analytics',
            title: 'Veri & aboneler',
            text: 'Aboneler nerede? Konum, arama ve sipariş olaylarıyla yoğunluk haritası.'
          }
        ].map((door) => (
          <button key={door.id} type="button" className="door" onClick={() => onGo(door.id)}>
            <h3>{door.title}</h3>
            <p>{door.text}</p>
            <span>Aç →</span>
          </button>
        ))}
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('home');

  return (
    <div className="shell">
      <header className="topnav">
        <button type="button" className="brand" onClick={() => setView('home')}>
          <span className="brand-dot" />
          YakınMarket
        </button>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={`main-view view-${view}`}>
        {view === 'home' && <Landing onGo={setView} />}
        {view === 'customer' && <CustomerPanel />}
        {view === 'seller' && <SellerPanel />}
        {view === 'profiles' && <ProfilesPanel />}
        {view === 'analytics' && <AnalyticsPanel />}
        {view === 'guide' && <GuidePanel />}
      </main>
    </div>
  );
}
