import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';

const TOKEN_KEY = 'ym_token';
const USER_KEY = 'ym_user';

const AuthContext = createContext(null);

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
  storeName: '',
  storeType: 'market',
  district: 'Kadıköy',
  address: ''
};

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function persistSession(nextToken, nextUser) {
  localStorage.setItem(TOKEN_KEY, nextToken);
  localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
}

function demoSession(payload, role, action = 'login') {
  const now = Date.now();
  if (role === 'seller') {
    const registeredStoreName = payload.storeName || 'Güneş Market';
    const knownSeller =
      action === 'register'
        ? {
            id: `seller-local-${now}`,
            name: payload.name || registeredStoreName,
            email: payload.email || 'satici@yakinmarket.demo',
            phone: payload.phone || '0500 000 0000',
            role: 'seller',
            storeId: `store-local-${now}`,
            store: {
              id: `store-local-${now}`,
              name: registeredStoreName,
              type: payload.storeType || 'market',
              district: payload.district || 'Kadıköy',
              address: payload.address || 'Demo adres',
              lat: 40.9848,
              lng: 29.0255,
              ownerId: `seller-local-${now}`,
              rating: 4.8,
              subscriberCount: 0,
              verified: false,
              openHours: '08:00-22:00',
              description: 'Yeni kayıtlı YakınMarket satıcısı.'
            }
          }
        : {
            id: 'seller-ayse',
            name: 'Ayşe Demir',
            email: payload.email || 'ayse@gunesmarket.tr',
            phone: '0532 111 0101',
            role: 'seller',
            storeId: 'store-kadikoy-gunes',
            store: {
              id: 'store-kadikoy-gunes',
              name: 'Güneş Market',
              type: 'market',
              district: 'Kadıköy',
              address: 'Moda Cad. No:42, Kadıköy'
            }
          };
    return { token: `ym-demo-seller-${now}`, user: knownSeller };
  }

  return {
    token: `ym-demo-customer-${now}`,
    user: {
      id: action === 'register' ? `cust-local-${now}` : 'cust-deniz',
      name: payload.name || 'Deniz Aydın',
      email: payload.email || 'deniz@ornek.com',
      phone: payload.phone || '0530 100 2001',
      role: 'customer',
      district: payload.district || 'Kadıköy'
    }
  };
}

function normalizeAuthResponse(data, fallback) {
  const token = data?.token || data?.accessToken || fallback.token;
  const user = data?.user || data?.seller || data?.customer || fallback.user;
  return { token, user };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => readStoredUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState('customer');
  const [authMode, setAuthMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const successRef = useRef(null);

  const setSession = useCallback((nextToken, nextUser) => {
    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    api
      .me()
      .then((data) => {
        const nextUser = data.user || data.seller || data.customer;
        if (nextUser) {
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          setUser(nextUser);
        }
      })
      .catch(() => {
        /* Demo auth remains valid when /auth/me is not implemented. */
      });
  }, [token]);

  const closeAuthModal = useCallback(() => {
    setAuthOpen(false);
    successRef.current = null;
  }, []);

  const openAuthModal = useCallback((role = 'customer', options = {}) => {
    setAuthRole(role);
    setAuthMode(options.mode || (role === 'seller' ? 'register' : 'login'));
    successRef.current = options.onSuccess || null;
    setAuthOpen(true);
  }, []);

  const login = useCallback(
    async (payload, role = 'customer') => {
      setBusy(true);
      try {
        const fallback = demoSession(payload, role, 'login');
        let session;
        try {
          session = normalizeAuthResponse(await api.login({ ...payload, role }), fallback);
        } catch (err) {
          if (err.status && err.status !== 404) throw err;
          session = fallback;
        }
        setSession(session.token, session.user);
        const cb = successRef.current;
        closeAuthModal();
        cb?.(session.user);
        return session.user;
      } finally {
        setBusy(false);
      }
    },
    [closeAuthModal, setSession]
  );

  const register = useCallback(
    async (payload, role = 'customer') => {
      setBusy(true);
      try {
        const fallback = demoSession(payload, role, 'register');
        let session;
        try {
          session = normalizeAuthResponse(await api.register({ ...payload, role }), fallback);
        } catch (err) {
          if (err.status && err.status !== 404) throw err;
          session = fallback;
        }
        setSession(session.token, session.user);
        const cb = successRef.current;
        closeAuthModal();
        cb?.(session.user);
        return session.user;
      } finally {
        setBusy(false);
      }
    },
    [closeAuthModal, setSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* Logout is local when the demo server has no auth route. */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      busy,
      authOpen,
      authRole,
      authMode,
      isAuthenticated: Boolean(token && user),
      openAuthModal,
      closeAuthModal,
      login,
      register,
      logout
    }),
    [authMode, authOpen, authRole, busy, closeAuthModal, login, logout, openAuthModal, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthModal() {
  const { authOpen, authRole, authMode, busy, closeAuthModal, login, register } = useAuth();
  const [role, setRole] = useState(authRole);
  const [mode, setMode] = useState(authMode);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    setRole(authRole);
    setMode(authMode);
    setError('');
  }, [authRole, authMode, authOpen]);

  if (!authOpen) return null;

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(form, role);
      } else {
        await register(form, role);
      }
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || 'Giriş işlemi tamamlanamadı');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeAuthModal}>
      <section className="auth-modal glass-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-close" onClick={closeAuthModal} aria-label="Kapat">
          x
        </button>
        <p className="eyebrow">YakınMarket hesap</p>
        <h2>{role === 'seller' ? 'Satıcı giriş / kayıt' : 'Müşteri giriş / kayıt'}</h2>
        <p className="muted">
          Misafir olarak harita ve stok görülebilir. Yorum, mesaj, sipariş ve satıcı araçları için giriş gerekir.
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={role === 'customer' ? 'active' : ''}
            onClick={() => {
              setRole('customer');
              setMode('login');
            }}
          >
            Müşteri giriş/kayıt
          </button>
          <button
            type="button"
            className={role === 'seller' ? 'active' : ''}
            onClick={() => {
              setRole('seller');
              setMode('register');
            }}
          >
            Satıcı giriş/kayıt
          </button>
        </div>

        <div className="mode-switch">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Giriş
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Kayıt
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Ad Soyad
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Adınız" required />
              </label>
              <label>
                Telefon
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="05xx xxx xx xx" />
              </label>
            </>
          )}
          <label>
            E-posta
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder={role === 'seller' ? 'ayse@gunesmarket.tr' : 'deniz@ornek.com'}
              required
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="demo123"
              required
            />
          </label>

          {role === 'seller' && mode === 'register' && (
            <div className="seller-register-grid">
              <label>
                Mağaza adı
                <input
                  value={form.storeName}
                  onChange={(e) => update('storeName', e.target.value)}
                  placeholder="Mahalle Marketim"
                  required
                />
              </label>
              <label>
                Mağaza tipi
                <select value={form.storeType} onChange={(e) => update('storeType', e.target.value)}>
                  <option value="market">Market</option>
                  <option value="bakkal">Bakkal</option>
                  <option value="sutcu">Sütçü</option>
                </select>
              </label>
              <label>
                İlçe
                <input value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="Kadıköy" required />
              </label>
              <label>
                Adres
                <textarea value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Açık adres" required />
              </label>
            </div>
          )}

          {error && <div className="banner error compact">{error}</div>}

          <button type="submit" className="btn btn-accent btn-wide" disabled={busy}>
            {busy ? 'İşleniyor...' : mode === 'login' ? 'Giriş yap' : 'Kayıt ol ve devam et'}
          </button>
        </form>

        <div className="demo-hint">
          <strong>Demo:</strong> Müşteri <code>deniz@ornek.com</code> / Satıcı <code>ayse@gunesmarket.tr</code> · şifre{' '}
          <code>demo123</code>
        </div>
      </section>
    </div>
  );
}
