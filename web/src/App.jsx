import { useEffect, useState } from 'react';
import { AuthModal, useAuth } from './auth';
import CustomerMap from './components/CustomerMap';
import SellerMap from './components/SellerMap';
import Feed from './components/Feed';
import ProfilesPanel from './components/ProfilesPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import GuidePanel from './components/GuidePanel';

const NAV = [
  { id: 'explore', label: 'Misafir Keşif' },
  { id: 'customer-auth', label: 'Müşteri Giriş' },
  { id: 'seller', label: 'Satıcı Giriş/Kayıt' },
  { id: 'feed', label: 'Keşfet (feed)' },
  { id: 'analytics', label: 'Analitik' },
  { id: 'guide', label: 'Kılavuz' },
  { id: 'profiles', label: 'Profiller' }
];

export default function App() {
  const [view, setView] = useState('explore');
  const [welcome, setWelcome] = useState(true);
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setWelcome(false), 4200);
    return () => clearTimeout(t);
  }, []);

  const go = (id) => {
    if (id === 'customer-auth') {
      if (user?.role === 'customer') {
        setView('explore');
      } else {
        openAuthModal('customer', { mode: 'login' });
      }
      return;
    }
    if (id === 'seller') {
      if (user?.role === 'seller') {
        setView('seller');
      } else {
        openAuthModal('seller', {
          mode: 'register',
          onSuccess: (nextUser) => {
            if (nextUser?.role === 'seller') setView('seller');
          }
        });
      }
      return;
    }
    setView(id);
  };

  return (
    <div className="shell">
      <header className="brand-bar glass-panel">
        <button type="button" className="brand" onClick={() => setView('explore')}>
          <span className="brand-dot" />
          YakınMarket
        </button>
        <nav className="mode-nav" aria-label="YakınMarket modları">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={(view === item.id || (item.id === 'explore' && view === 'auth')) ? 'active' : ''}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account-chip">
          {isAuthenticated ? (
            <>
              <span>{user.role === 'seller' ? 'Satıcı' : 'Müşteri'} · {user.name}</span>
              <button type="button" onClick={logout}>
                Çıkış
              </button>
            </>
          ) : (
            <span>Misafir</span>
          )}
        </div>
      </header>

      <main className="main-view">
        {view === 'explore' && <CustomerMap />}
        {view === 'seller' && <SellerMap />}
        {view === 'feed' && <Feed />}
        {view === 'analytics' && <AnalyticsPanel />}
        {view === 'guide' && <GuidePanel />}
        {view === 'profiles' && <ProfilesPanel />}
      </main>

      {welcome && view === 'explore' && (
        <div className="welcome-toast glass-panel">
          <strong>YakınMarket</strong>
          <span>Haritada yakın stok, ETA ve mahalle mağazaları. Misafir keşif açık.</span>
        </div>
      )}

      <AuthModal />
    </div>
  );
}
